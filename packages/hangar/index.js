import { execSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { showBanner } from '../shared/banners.js';

const TREEHOUSE_BIN = findTreehouse();

function findTreehouse() {
  try {
    return execSync('which treehouse', { encoding: 'utf8' }).trim();
  } catch {
    // Check common locations
    const paths = [
      `${process.env.HOME}/homebrew/bin/treehouse`,
      `${process.env.HOME}/.local/bin/treehouse`,
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
    console.error('   brew install treehouse');
    process.exit(1);
  }
}

function run(args) {
  ensureEngine();
  const result = spawn(TREEHOUSE_BIN, args, {
    stdio: 'inherit',
    cwd: process.cwd(),
  });
  result.on('close', (code) => process.exit(code));
}

export function hangar(args) {
  const [subcommand, ...rest] = args;

  const subcommands = {
    get: () => run(['get', ...rest]),
    status: () => run(['status', ...rest]),
    return: () => run(['return', ...rest]),
    init: () => run(['init', ...rest]),
    destroy: () => run(['destroy', ...rest]),
    prune: () => run(['prune', ...rest]),
  };

  if (!subcommand || subcommand === '--help') {
    console.log(`
  ship hangar — Workspace isolation for parallel agents

  Commands:
    get        Acquire a clean worktree (agent docks here)
    status     Show all worktrees and their status
    return     Release current worktree back to pool
    init       Initialize treehouse for this repo
    destroy    Remove a specific worktree
    prune      Clean up merged/stale worktrees

  Engine: treehouse (${TREEHOUSE_BIN || 'not installed'})
`);
    return;
  }

  const handler = subcommands[subcommand];
  if (!handler) {
    console.error(`Unknown hangar command: ${subcommand}`);
    console.error(`Run 'ship hangar --help' for usage.`);
    process.exit(1);
  }

  handler();
}
