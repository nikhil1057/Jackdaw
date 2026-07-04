import { execSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const NO_MISTAKES_BIN = findNoMistakes();

function findNoMistakes() {
  try {
    return execSync('which shield', { encoding: 'utf8' }).trim();
  } catch {
    try {
      return execSync('which no-mistakes', { encoding: 'utf8' }).trim();
    } catch {
      const paths = [
        `${process.env.HOME}/.local/bin/shield`,
        `${process.env.HOME}/.local/bin/no-mistakes`,
        `${process.env.HOME}/.no-mistakes/bin/no-mistakes`,
        `${process.env.HOME}/homebrew/bin/no-mistakes`,
        '/usr/local/bin/no-mistakes',
      ];
      for (const p of paths) {
        if (existsSync(p)) return p;
      }
      return null;
    }
  }
}

function ensureEngine() {
  if (!NO_MISTAKES_BIN) {
    console.error('❌ no-mistakes not found. Install it:');
    console.error('   curl -fsSL https://raw.githubusercontent.com/kunchenguid/no-mistakes/main/docs/install.sh | sh');
    process.exit(1);
  }
}

function run(args) {
  ensureEngine();
  const result = spawn(NO_MISTAKES_BIN, args, {
    stdio: 'inherit',
    cwd: process.cwd(),
  });
  result.on('close', (code) => process.exit(code));
}

export function shield(args) {
  const [subcommand, ...rest] = args;

  const subcommands = {
    init: () => run(['init', ...rest]),
    push: () => {
      // Push through the shield gate (renamed remote)
      const branch = rest[0] || getCurrentBranch();
      console.log('🛡️  Shield — validating before push...\n');
      const result = spawn('git', ['push', 'shield', branch], {
        stdio: ['inherit', 'pipe', 'pipe'],
        cwd: process.cwd(),
      });
      // Filter out no-mistakes ASCII banner, show clean output
      result.stdout.on('data', (chunk) => {
        const lines = chunk.toString().split('\n');
        for (const line of lines) {
          const clean = line.replace(/^remote:\s*/, '');
          // Skip ASCII art banner lines
          if (clean.match(/[|\\/_\[\]]{3,}/) || clean.trim() === '') continue;
          if (clean.includes('Pipeline started')) console.log('  ⚡ Pipeline started');
          else if (clean.includes('Run no-mistakes')) console.log('  🔍 Kiro reviewing your code...');
          else if (clean.trim()) console.log('  ' + clean);
        }
      });
      result.stderr.on('data', (chunk) => {
        const lines = chunk.toString().split('\n');
        for (const line of lines) {
          const clean = line.replace(/^remote:\s*/, '');
          if (clean.match(/[|\\/_\[\]]{3,}/) || clean.trim() === '') continue;
          if (clean.includes('Pipeline started')) console.log('  ⚡ Pipeline started');
          else if (clean.includes('Run no-mistakes')) console.log('  🔍 Kiro reviewing your code...');
          else if (clean.trim()) console.log('  ' + clean);
        }
      });
      result.on('close', (code) => {
        if (code === 0) console.log('\n🛡️  Shield passed. Code shipped.');
        process.exit(code);
      });
    },
    status: () => run(['status', ...rest]),
    runs: () => run(['runs', ...rest]),
    stats: () => run(['stats', ...rest]),
    approve: () => run(['axi', 'respond', '--action', 'approve', ...rest]),
    fix: () => run(['axi', 'respond', '--action', 'fix', ...rest]),
    logs: () => run(['axi', 'logs', ...rest]),
    doctor: () => run(['doctor', ...rest]),
  };

  function getCurrentBranch() {
    try {
      return execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    } catch {
      return 'main';
    }
  }

  if (!subcommand || subcommand === '--help') {
    console.log(`
  ship shield — Push validation gate (nothing ships without passing)

  Commands:
    init       Initialize shield for this repo
    push       Validate current branch and push if all checks pass
    status     Show current shield status and active runs
    runs       Show history of validation runs
    approve    Approve current review findings and continue pipeline
    fix        Auto-fix specific findings (e.g., ship shield fix F1 F2)
    logs       Show log output of a pipeline step
    stats      Show pass/fail statistics
    doctor     Diagnose shield configuration issues

  How it works:
    1. You run 'ship shield push'
    2. Shield creates a clean worktree from your branch
    3. Kiro reviews your code (finds bugs, security issues)
    4. If findings need approval → 'ship shield approve'
    5. If ALL pass → pushes to origin
    6. If ANY fail → rejects with feedback

  Engine: no-mistakes (${NO_MISTAKES_BIN || 'not installed'})
`);
    return;
  }

  const handler = subcommands[subcommand];
  if (!handler) {
    console.error(`Unknown shield command: ${subcommand}`);
    console.error(`Run 'ship shield --help' for usage.`);
    process.exit(1);
  }

  handler();
}
