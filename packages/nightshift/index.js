import { execSync, spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { showBanner } from '../shared/banners.js';

const GNHF_BIN = findGnhf();

function findGnhf() {
  try {
    return execSync('which gnhf', { encoding: 'utf8' }).trim();
  } catch {
    const paths = [
      `${process.env.HOME}/homebrew/bin/gnhf`,
      `${process.env.HOME}/.local/bin/gnhf`,
      '/usr/local/bin/gnhf',
    ];
    for (const p of paths) {
      if (existsSync(p)) return p;
    }
    return null;
  }
}

function ensureEngine() {
  if (!GNHF_BIN) {
    console.error('❌ gnhf not found. Install it:');
    console.error('   brew install gnhf');
    process.exit(1);
  }
}

function run(args) {
  ensureEngine();
  const result = spawn(GNHF_BIN, args, {
    stdio: 'inherit',
    cwd: process.cwd(),
  });
  result.on('close', (code) => process.exit(code));
}

export function nightshift(args) {
  const [subcommand, ...rest] = args;

  const subcommands = {
    start: () => startNightshift(rest),
    status: () => {
      // gnhf doesn't have a status command — check if running
      try {
        const result = execSync('pgrep -f gnhf', { encoding: 'utf8' }).trim();
        if (result) {
          console.log('  🌙 Nightshift is running (PIDs: ' + result.replace(/\n/g, ', ') + ')');
        }
      } catch {
        console.log('  💤 Nightshift is not running.');
      }
    },
    stop: () => {
      try {
        execSync('pkill -f gnhf');
        console.log('  ⏹️  Nightshift stopped.');
      } catch {
        console.log('  💤 Nightshift was not running.');
      }
    },
  };

  if (!subcommand || subcommand === '--help') {
    console.log(`
  ship nightshift — Agents work while you sleep

  Commands:
    start [prompt]           Start overnight agent loop
    start --tasks <file>     Run multiple tasks from a TOML file
    status                   Check if nightshift is running
    stop                     Stop the overnight run

  Options (passed to start):
    --max-iterations <n>     Max iterations before stopping
    --max-tokens <n>         Max tokens before stopping
    --worktree               Run in isolated worktree (recommended)
    --push                   Auto-push after each successful iteration

  Examples:
    ship nightshift start "Add unit tests for auth module"
    ship nightshift start --tasks backlog.toml --worktree --push
    ship nightshift start "Fix all TODO comments" --max-iterations 10

  Engine: gnhf (${GNHF_BIN || 'not installed'})
`);
    return;
  }

  const handler = subcommands[subcommand];
  if (!handler) {
    // If not a known subcommand, treat as a prompt for start
    startNightshift(args);
    return;
  }

  handler();
}

function startNightshift(args) {
  ensureEngine();
  showBanner('nightshift');

  // Check if --tasks flag is used
  const tasksIdx = args.indexOf('--tasks');
  if (tasksIdx !== -1 && args[tasksIdx + 1]) {
    const tasksFile = args[tasksIdx + 1];
    runTasksFromFile(tasksFile, args.filter((_, i) => i !== tasksIdx && i !== tasksIdx + 1));
    return;
  }

  // Single prompt mode — pass everything to gnhf with kiro as agent
  const gnhfArgs = ['--agent', 'acp:ship-kiro-bridge', ...args];

  // Add --worktree by default if not specified
  if (!args.includes('--worktree') && !args.includes('--current-branch')) {
    gnhfArgs.unshift('--worktree');
  }

  // Add --push by default
  if (!args.includes('--push')) {
    gnhfArgs.push('--push');
  }

  console.log('  🌙 Starting nightshift...');
  console.log(`  📋 Task: ${args.filter(a => !a.startsWith('--')).join(' ')}`);
  console.log('  🤖 Agent: Kiro CLI');
  console.log('  ⏰ Press Ctrl+C to stop\n');

  run(gnhfArgs);
}

function runTasksFromFile(tasksFile, extraArgs) {
  if (!existsSync(tasksFile)) {
    console.error(`❌ Tasks file not found: ${tasksFile}`);
    process.exit(1);
  }

  const content = readFileSync(tasksFile, 'utf8');
  // Simple TOML parser for [[task]] blocks
  const tasks = [];
  let current = null;

  for (const line of content.split('\n')) {
    if (line.trim() === '[[task]]') {
      if (current) tasks.push(current);
      current = {};
    } else if (current && line.includes('=')) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      current[key.trim()] = value;
    }
  }
  if (current) tasks.push(current);

  if (tasks.length === 0) {
    console.error('❌ No tasks found in ' + tasksFile);
    process.exit(1);
  }

  console.log(`  🌙 Starting nightshift with ${tasks.length} tasks...\n`);
  tasks.forEach((t, i) => {
    console.log(`  ${i + 1}. ${t.name || t.spec || 'Unnamed task'}`);
  });
  console.log('');

  // Run tasks sequentially
  runNextTask(tasks, 0, extraArgs);
}

function runNextTask(tasks, index, extraArgs) {
  if (index >= tasks.length) {
    console.log('\n  ✓ All nightshift tasks completed.\n');
    process.exit(0);
  }

  const task = tasks[index];
  const prompt = task.spec || task.name;
  console.log(`\n  ⏳ [${index + 1}/${tasks.length}] ${task.name || 'Task ' + (index + 1)}`);

  const gnhfArgs = [
    '--agent', 'acp:ship-kiro-bridge',
    '--worktree',
    '--push',
    ...extraArgs,
    prompt,
  ];

  const proc = spawn(GNHF_BIN, gnhfArgs, {
    stdio: 'inherit',
    cwd: process.cwd(),
  });

  proc.on('close', (code) => {
    if (code === 0) {
      console.log(`  ✓ Task ${index + 1} completed.`);
    } else {
      console.log(`  ✗ Task ${index + 1} failed (exit ${code}). Moving to next.`);
    }
    runNextTask(tasks, index + 1, extraArgs);
  });
}
