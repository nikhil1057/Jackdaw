# Ship ⛵

**Multi-Agent SDLC Command Center for Kiro CLI**

One command. Your brand. Parallel agents, push validation, overnight work — all from your terminal.

```
███████╗██╗  ██╗██╗██████╗
██╔════╝██║  ██║██║██╔══██╗
███████╗███████║██║██████╔╝
╚════██║██╔══██║██║██╔═══╝
███████║██║  ██║██║██║
╚══════╝╚═╝  ╚═╝╚═╝╚═╝
```

## What is Ship?

Ship is a unified CLI that orchestrates multiple AI coding agents. You talk to one agent (Kiro), and it dispatches crew members to work in parallel — each in their own isolated workspace.

```bash
ship officer dispatch "Add auth, caching, and tests" --visual
# → 3 Kiro agents open in separate WezTerm tabs
# → Each works independently in its own git worktree
# → You watch them build in real time
```

## Components

| Command | What it does | Engine |
|---------|-------------|--------|
| `ship hangar` | Workspace isolation (git worktrees) | treehouse |
| `ship shield` | AI code review before push | no-mistakes + Kiro |
| `ship nightshift` | Agents work while you sleep | gnhf + Kiro |
| `ship officer` | Split task → parallel agents | treehouse + Kiro |

## Install

### Prerequisites

```bash
# Kiro CLI (your main AI agent)
# Install from: https://kiro.dev

# Homebrew (for engines)
brew install tmux
```

### Install Engines

```bash
# Workspace isolation
curl -fsSL https://raw.githubusercontent.com/kunchenguid/treehouse/main/docs/install.sh | sh

# Push validation
curl -fsSL https://raw.githubusercontent.com/kunchenguid/no-mistakes/main/docs/install.sh | sh

# Overnight runner
brew install gnhf
```

### Install Ship

```bash
git clone https://github.com/nikhil1057/Jackdaw.git ~/CodeRepo/ship
cd ~/CodeRepo/ship
ln -sf ~/CodeRepo/ship/bin/ship ~/.local/bin/ship
ln -sf ~/CodeRepo/ship/bin/ship-kiro-bridge ~/.local/bin/ship-kiro-bridge
ln -sf ~/.local/bin/ship-kiro-bridge ~/.local/bin/acpx
```

### Install Skills (teaches Kiro how to use Ship)

```bash
mkdir -p ~/.kiro/skills
ln -sf ~/CodeRepo/ship/skills/hangar ~/.kiro/skills/hangar
ln -sf ~/CodeRepo/ship/skills/shield ~/.kiro/skills/shield
ln -sf ~/CodeRepo/ship/skills/nightshift ~/.kiro/skills/nightshift
ln -sf ~/CodeRepo/ship/skills/officer ~/.kiro/skills/officer
ln -sf ~/CodeRepo/ship/skills/ship ~/.kiro/skills/ship
```

### Configure Shield (Kiro as AI reviewer)

Edit `~/.no-mistakes/config.yaml`:
```yaml
agent: acp:kiro
acp_registry_overrides:
  kiro: ship-kiro-bridge
acpx_path: ship-kiro-bridge
```

### Optional: WezTerm (visual multi-agent tabs)

```bash
brew install --cask wezterm --appdir=~/Applications
cp ~/.wezterm.lua ~/.wezterm.lua  # config included in repo
```

### Optional: Shell Aliases

Add to `~/.zshrc`:
```bash
alias h="ship hangar"
alias s="ship shield"
alias n="ship nightshift"
alias o="ship officer"
alias sp="ship shield push"
alias od="ship officer dispatch"
alias ns="ship nightshift start"
alias hs="ship hangar status"
```

## Usage

### Quick Push (with AI review)

```bash
git commit -m "feat: add caching"
ship shield push
```

Shield validates your code with Kiro AI review before pushing to origin.

### Parallel Agents

```bash
ship officer dispatch "Add auth, caching, and monitoring" --visual
```

Opens 3 WezTerm tabs — one Kiro agent per subtask, each in its own worktree.

### Overnight Work

```bash
ship nightshift start "Add unit tests for all modules" --max-iterations 5
```

Agent works while you sleep. Wake up to commits ready for review.

### Workspace Isolation

```bash
ship hangar get          # get a clean worktree
# ... work freely ...
ship shield push         # validate and push
exit                     # return worktree to pool
```

## Daily Workflow

### Morning
```bash
kiro-cli chat
> "Deploy 3 crew: add caching, fix parser, write tests"
# → Officer splits task, opens 3 agent tabs in WezTerm
# → You watch them work, review when done
# → ship shield push (validates each)
```

### Afternoon
```bash
> "Push this through shield"
# → Kiro reviews code, finds bugs
# → ship shield approve
# → Pushed to origin
```

### Evening
```bash
> "Queue the backlog for nightshift"
# → Creates tasks.toml, starts nightshift
# → Agents grind overnight
```

### Next Morning
```bash
ship nightshift status
# → 4/5 shipped, 1 needs review
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  YOU (Captain)                                       │
│  Talk to Kiro naturally                             │
└───────────────────┬─────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│  KIRO (Officer — your main agent)                    │
│  Skills loaded: hangar, shield, nightshift, officer │
│  Runs ship commands on your behalf                  │
└───────────────────┬─────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│  SHIP CLI                                            │
│  ├── officer  → splits tasks, spawns agents         │
│  ├── hangar   → workspace isolation (worktrees)     │
│  ├── shield   → AI review gate before push          │
│  └── nightshift → overnight agent loop              │
└───────────────────┬─────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│  CREW (parallel Kiro agents in WezTerm tabs)         │
│  Each agent: own worktree, own task, independent    │
└─────────────────────────────────────────────────────┘
```

## Project Structure

```
ship/
├── bin/
│   ├── ship                  ← CLI entry point
│   └── ship-kiro-bridge      ← ACP protocol bridge (Kiro ↔ engines)
├── packages/
│   ├── hangar/index.js       ← wraps treehouse
│   ├── shield/index.js       ← wraps no-mistakes
│   ├── nightshift/index.js   ← wraps gnhf
│   ├── officer/index.js      ← multi-agent dispatcher
│   └── shared/banners.js     ← ASCII art banners
├── skills/
│   ├── hangar/SKILL.md       ← teaches Kiro about worktrees
│   ├── shield/SKILL.md       ← teaches Kiro about push validation
│   ├── nightshift/SKILL.md   ← teaches Kiro about overnight work
│   ├── officer/SKILL.md      ← Officer persona (calls you Captain)
│   └── ship/SKILL.md         ← unified workflow guide
├── config/
│   └── tasks.example.toml    ← nightshift task template
├── .no-mistakes.yaml         ← shield config for this repo
├── .wezterm.lua              ← WezTerm config (in ~/)
├── package.json
├── PLAN.md
└── README.md
```

## How Ship Compares

| Feature | Manual workflow | Ship |
|---------|---------------|------|
| Code review | PR → wait → reviewer → comments | `ship shield push` (instant AI review) |
| Parallel work | One task at a time | `ship officer dispatch` (N agents) |
| Overnight | Nothing happens | `ship nightshift start` (agents grind) |
| Workspace | `git stash` / branch switching | `ship hangar get` (isolated worktree) |
| Visibility | Background processes | WezTerm tabs (watch live) |

## License

MIT
