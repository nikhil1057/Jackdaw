import { execSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const NO_MISTAKES_BIN = findNoMistakes();

function findNoMistakes() {
  try {
    return execSync('which no-mistakes', { encoding: 'utf8' }).trim();
  } catch {
    const paths = [
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
    push: () => run(['push', ...rest]),
    status: () => run(['status', ...rest]),
    runs: () => run(['runs', ...rest]),
    stats: () => run(['stats', ...rest]),
    doctor: () => run(['doctor', ...rest]),
  };

  if (!subcommand || subcommand === '--help') {
    console.log(`
  ship shield — Push validation gate (nothing ships without passing)

  Commands:
    init       Initialize shield for this repo (creates .no-mistakes.yaml)
    push       Validate current branch and push if all checks pass
    status     Show current shield daemon status
    runs       Show history of validation runs
    stats      Show pass/fail statistics
    doctor     Diagnose shield configuration issues

  How it works:
    1. You run 'ship shield push'
    2. Shield creates a clean worktree from your branch
    3. Runs validation pipeline (tests, lint, AI review)
    4. If ALL pass → pushes to origin
    5. If ANY fail → rejects with feedback

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
