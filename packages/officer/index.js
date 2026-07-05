import { execSync, spawn } from 'node:child_process';
import { existsSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { showBanner } from '../shared/banners.js';

const KIRO_CLI = resolve(process.env.HOME, '.local/bin/kiro-cli');
const TREEHOUSE_BIN = findTreehouse();

function findTreehouse() {
  try {
    return execSync('which treehouse', { encoding: 'utf8' }).trim();
  } catch {
    const paths = [
      `${process.env.HOME}/.local/bin/treehouse`,
      `${process.env.HOME}/homebrew/bin/treehouse`,
      '/usr/local/bin/treehouse',
    ];
    for (const p of paths) {
      if (existsSync(p)) return p;
    }
    return null;
  }
}

function ensureEngine() {
  if (!TREEHOUSE_BIN) {
    console.error('❌ treehouse not found. Install it:');
    console.error('   curl -fsSL https://raw.githubusercontent.com/kunchenguid/treehouse/main/docs/install.sh | sh');
    process.exit(1);
  }
}

export function officer(args) {
  const [subcommand, ...rest] = args;

  const subcommands = {
    dispatch: () => dispatch(rest),
    status: () => showStatus(),
    stop: () => stopAll(),
  };

  if (!subcommand || subcommand === '--help') {
    console.log(`
  ship officer — Talk to one agent. Ship with a crew.

  Commands:
    dispatch <task>      Split task and dispatch to parallel agents
    status               Show all running agents and their progress
    stop                 Stop all running agents

  Options:
    --agents <n>         Number of parallel agents (default: auto-split)
    --visual, -v         Open tmux panes — watch agents work live
    --no-split           Don't split — run the same task in one agent

  Examples:
    ship officer dispatch "Add Redis caching to eligibility endpoint"
    ship officer dispatch "Build auth" --agents 3 --visual
    ship officer dispatch "Fix all lint errors" --no-split

  How it works:
    1. Kiro splits your task into independent subtasks
    2. Each subtask gets its own hangar (worktree)
    3. A Kiro agent works each subtask in parallel
    4. When done, results are ready for shield push

  Engines: treehouse (${TREEHOUSE_BIN || 'not installed'}) + kiro-cli
`);
    return;
  }

  const handler = subcommands[subcommand];
  if (!handler) {
    // Treat as dispatch prompt
    dispatch(args);
    return;
  }

  handler();
}

// ─── Dispatch ────────────────────────────────────────────────────────────────

async function dispatch(args) {
  ensureEngine();
  showBanner('officer');

  // Parse options
  const noSplit = args.includes('--no-split');
  const visual = args.includes('--visual') || args.includes('-v');
  const agentsIdx = args.indexOf('--agents');
  const maxAgents = agentsIdx !== -1 ? parseInt(args[agentsIdx + 1]) : null;
  
  // Get the prompt (everything that's not a flag)
  const prompt = args
    .filter((a, i) => !a.startsWith('--') && !a.startsWith('-') && (i === 0 || !args[i-1]?.startsWith('--')))
    .join(' ');

  if (!prompt) {
    console.error('  ❌ No task provided. Usage: ship officer dispatch "your task"');
    process.exit(1);
  }

  console.log(`  📋 Task: ${prompt}`);
  console.log('');

  let subtasks;
  if (noSplit) {
    subtasks = [{ name: 'Task', spec: prompt }];
  } else {
    console.log('  🧠 Splitting task into subtasks...\n');
    subtasks = await splitTask(prompt, maxAgents);
  }

  console.log(`  👥 Dispatching ${subtasks.length} agent${subtasks.length > 1 ? 's' : ''}:\n`);
  subtasks.forEach((t, i) => {
    console.log(`    ${i + 1}. ${t.name}`);
  });
  console.log('');

  if (visual) {
    await dispatchVisual(subtasks);
  } else {
    await dispatchBackground(subtasks);
  }
}

// ─── Visual Dispatch (opens new terminal tabs — works from inside Kiro) ─────

async function dispatchVisual(subtasks) {
  // Check if wezterm cli is available (preferred) or fall back to tmux
  let useWezterm = false;
  try {
    execSync('wezterm cli list', { stdio: 'pipe' });
    useWezterm = true;
  } catch {}

  if (!useWezterm) {
    try {
      execSync('which tmux', { stdio: 'pipe' });
    } catch {
      console.error('  ❌ Neither WezTerm nor tmux found.');
      console.error('     Install WezTerm or tmux for visual mode.');
      process.exit(1);
    }
  }

  // Acquire hangars first
  const hangars = [];
  for (let i = 0; i < subtasks.length; i++) {
    console.log(`  🏗️  [${i + 1}/${subtasks.length}] Acquiring hangar for: ${subtasks[i].name}`);
    const hangarPath = acquireHangar(`officer-${i + 1}`);
    if (!hangarPath) {
      console.error(`  ❌ Failed to acquire hangar for task ${i + 1}`);
      continue;
    }
    console.log(`  ✓  Hangar: ${hangarPath}`);
    hangars.push({ ...subtasks[i], path: hangarPath, index: i + 1 });
  }

  if (hangars.length === 0) {
    console.error('  ❌ No hangars acquired. Aborting.');
    process.exit(1);
  }

  // Write launcher scripts for each agent
  const scriptDir = join(process.cwd(), '.ship', 'officer');
  mkdirSync(scriptDir, { recursive: true });

  for (let i = 0; i < hangars.length; i++) {
    const h = hangars[i];
    const script = join(scriptDir, `launch-agent-${i + 1}.sh`);
    const content = `#!/bin/bash\ncd "${h.path}"\n# Pre-accept tool trust\nmkdir -p .kiro\necho '{"chat.disableTrustAllConfirmation": true}' > .kiro/settings.json\necho "🤖 Agent ${i + 1}: ${h.name}"\necho "📂 Hangar: ${h.path}"\necho "────────────────────────────────────────"\necho ""\nexec kiro-cli chat "${h.spec.replace(/"/g, '\\"').replace(/'/g, "'\\''")}" -a --no-interactive\n`;
    writeFileSync(script, content, { mode: 0o755 });
  }

  if (useWezterm) {
    // WezTerm: spawn new tabs (works from INSIDE a Kiro session!)
    console.log(`\n  🚀 Deploying ${hangars.length} crew in new WezTerm tabs...\n`);
    
    for (let i = 0; i < hangars.length; i++) {
      const script = join(scriptDir, `launch-agent-${i + 1}.sh`);
      try {
        const paneId = execSync(`wezterm cli spawn --cwd "${hangars[i].path}" -- bash "${script}"`, { encoding: 'utf8' }).trim();
        execSync(`wezterm cli set-tab-title --pane-id ${paneId} "🤖 Crew ${i + 1}: ${hangars[i].name}"`, { stdio: 'pipe' });
        console.log(`  ✓ Crew ${i + 1} deployed → Tab "${hangars[i].name}"`);
      } catch (e) {
        console.error(`  ❌ Failed to spawn crew ${i + 1}`);
      }
    }

    console.log(`
  ────────────────────────────────────────
  All crew deployed in separate tabs.
  Switch tabs to watch them work.
  
  When done:
    ship hangar status    → see results
    ship shield push      → validate and push
  ────────────────────────────────────────
`);
  } else {
    // Fallback: tmux
    const sessionName = `ship-crew-${Date.now()}`;
    execSync(`tmux new-session -d -s "${sessionName}" -n "crew-1" "bash ${scriptDir}/launch-agent-1.sh"`, { stdio: 'pipe' });
    for (let i = 1; i < hangars.length; i++) {
      execSync(`tmux split-window -t "${sessionName}" "bash ${scriptDir}/launch-agent-${i + 1}.sh"`, { stdio: 'pipe' });
      execSync(`tmux select-layout -t "${sessionName}" tiled`, { stdio: 'pipe' });
    }
    try {
      execSync(`tmux set-option -t "${sessionName}" pane-border-status top`, { stdio: 'pipe' });
    } catch {}

    console.log(`
  🚀 Crew deployed in tmux: ${sessionName}
  Attach: tmux attach -t ${sessionName}
`);
    spawn('tmux', ['attach', '-t', sessionName], { stdio: 'inherit' }).on('close', () => {});
  }
}

// ─── Background Dispatch (original headless mode) ────────────────────────────

async function dispatchBackground(subtasks) {
  // Acquire hangars and spawn agents
  const agents = [];
  for (let i = 0; i < subtasks.length; i++) {
    const task = subtasks[i];
    console.log(`  🏗️  [${i + 1}/${subtasks.length}] Acquiring hangar for: ${task.name}`);
    
    const hangarPath = acquireHangar(`officer-${i + 1}`);
    if (!hangarPath) {
      console.error(`  ❌ Failed to acquire hangar for task ${i + 1}`);
      continue;
    }

    console.log(`  ✓  Hangar: ${hangarPath}`);
    const agent = spawnAgent(hangarPath, task.spec, i + 1);
    agents.push({ ...task, hangarPath, process: agent, index: i + 1, status: 'running' });
  }

  console.log(`\n  🚀 All ${agents.length} agents dispatched. Monitoring...\n`);

  // Monitor agents
  await monitorAgents(agents);
}

function splitTask(prompt, maxAgents) {
  return new Promise((resolve) => {
    const splitPrompt = `You are a task splitter. Break this task into ${maxAgents || '2-4'} independent subtasks that can be worked on in parallel by separate coding agents. Each subtask should be completable independently without depending on the others.

Task: "${prompt}"

Respond with ONLY a JSON array, no markdown fences, no explanation:
[{"name": "short name", "spec": "detailed spec for the agent"}]`;

    const kiro = spawn(KIRO_CLI, [
      'chat', splitPrompt,
      '--no-interactive', '--trust-all-tools', '--wrap', 'never',
    ], {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, TERM: 'dumb', NO_COLOR: '1' },
    });

    let output = '';
    kiro.stdout.on('data', (chunk) => { output += chunk.toString(); });
    kiro.stderr.on('data', () => {});
    
    kiro.on('close', () => {
      // Strip ANSI and try to parse JSON
      const clean = output
        .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
        .replace(/\x1b\[\?[0-9]*[hl]/g, '')
        .replace(/^> /gm, '')
        .trim();

      // Try to extract JSON array from output
      const jsonMatch = clean.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          const tasks = JSON.parse(jsonMatch[0]);
          if (Array.isArray(tasks) && tasks.length > 0) {
            resolve(tasks);
            return;
          }
        } catch {}
      }

      // Fallback: couldn't parse, run as single task
      console.log('  ⚠️  Could not split task. Running as single agent.');
      resolve([{ name: 'Full task', spec: prompt }]);
    });

    // Timeout for splitting
    setTimeout(() => {
      kiro.kill('SIGTERM');
      resolve([{ name: 'Full task', spec: prompt }]);
    }, 60000);
  });
}

// ─── Hangar Management ──────────────────────────────────────────────────────

function acquireHangar(holder) {
  try {
    // treehouse get --lease prints path to stdout, banners to stderr
    const result = execSync(
      `${TREEHOUSE_BIN} get --lease --lease-holder "${holder}"`,
      { encoding: 'utf8', cwd: process.cwd() }
    ).trim();
    // The path is the last non-empty line of stdout
    const lines = result.split('\n').filter(l => l.trim());
    const path = lines[lines.length - 1]?.trim();
    return path && path.startsWith('/') ? path : null;
  } catch (e) {
    return null;
  }
}

function releaseHangar(hangarPath) {
  try {
    execSync(`${TREEHOUSE_BIN} return`, { cwd: hangarPath, stdio: 'pipe' });
  } catch {}
}

// ─── Agent Spawning ─────────────────────────────────────────────────────────

function spawnAgent(cwd, prompt, index) {
  const proc = spawn(KIRO_CLI, [
    'chat', prompt,
    '--no-interactive', '--trust-all-tools', '--wrap', 'never',
  ], {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, TERM: 'dumb', NO_COLOR: '1' },
    detached: false,
  });

  // Log output to file
  const logDir = join(process.cwd(), '.ship', 'officer');
  mkdirSync(logDir, { recursive: true });
  const logFile = join(logDir, `agent-${index}.log`);
  
  proc.stdout.on('data', (chunk) => {
    const clean = chunk.toString()
      .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
      .replace(/\x1b\[\?[0-9]*[hl]/g, '')
      .replace(/^> /gm, '');
    writeFileSync(logFile, clean, { flag: 'a' });
  });

  proc.stderr.on('data', (chunk) => {
    writeFileSync(logFile, chunk.toString(), { flag: 'a' });
  });

  return proc;
}

// ─── Monitoring ─────────────────────────────────────────────────────────────

function monitorAgents(agents) {
  return new Promise((resolve) => {
    let completed = 0;

    agents.forEach((agent) => {
      agent.process.on('close', (code) => {
        completed++;
        agent.status = code === 0 ? 'done' : 'failed';
        
        const icon = code === 0 ? '✅' : '❌';
        console.log(`  ${icon} [${agent.index}/${agents.length}] ${agent.name} — ${agent.status}`);

        // Check if agent made changes
        try {
          const diff = execSync('git status --porcelain', { cwd: agent.hangarPath, encoding: 'utf8' });
          if (diff.trim()) {
            console.log(`     📝 Has uncommitted changes in ${agent.hangarPath}`);
          }
        } catch {}

        if (completed === agents.length) {
          printSummary(agents);
          resolve();
        }
      });
    });

    // Safety timeout: kill all after 10 minutes
    setTimeout(() => {
      agents.forEach((a) => {
        if (a.status === 'running') {
          a.process.kill('SIGTERM');
          a.status = 'timeout';
        }
      });
    }, 600000);
  });
}

function printSummary(agents) {
  const done = agents.filter(a => a.status === 'done').length;
  const failed = agents.filter(a => a.status === 'failed').length;
  const timeout = agents.filter(a => a.status === 'timeout').length;

  console.log(`
  ────────────────────────────────────
  Officer Summary
  ────────────────────────────────────
  ✅ Completed: ${done}
  ❌ Failed:    ${failed}
  ⏱️  Timeout:   ${timeout}
  ────────────────────────────────────
  
  Next steps:
    ship hangar status        — see worktrees
    ship shield push          — validate and push
    cd <hangar-path>          — inspect agent work
`);
}

// ─── Status & Stop ──────────────────────────────────────────────────────────

function showStatus() {
  try {
    const result = execSync('ps aux | grep "kiro-cli.*no-interactive" | grep -v grep', { encoding: 'utf8' });
    const lines = result.trim().split('\n');
    console.log(`  👥 ${lines.length} agent(s) running:\n`);
    lines.forEach((line, i) => {
      const parts = line.split(/\s+/);
      const pid = parts[1];
      console.log(`    ${i + 1}. PID ${pid}`);
    });
  } catch {
    console.log('  💤 No agents running.');
  }
}

function stopAll() {
  try {
    execSync('pkill -f "kiro-cli.*no-interactive"');
    console.log('  ⏹️  All agents stopped.');
  } catch {
    console.log('  💤 No agents were running.');
  }
}
