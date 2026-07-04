# Ship — Nikhil's Multi-Agent SDLC Command Center

> "One command. Your brand. Their engines."

## What Is Ship?

A unified CLI that wraps proven open-source agent orchestration tools under your namespace, configured for your workflow (PolicyCompiler, Databricks, personal projects, future company).

## Components

| Your Name | Engine (Under the Hood) | What It Does |
|-----------|------------------------|--------------|
| **hangar** | treehouse (Go binary) | Workspace isolation — git worktrees for parallel agents |
| **shield** | no-mistakes (Go binary) | Push validation — AI + tests gate before code reaches origin |
| **nightshift** | gnhf (Go binary) | Overnight agent runner — tasks grind while you sleep |
| **officer** | firstmate (Node) | Multi-agent dispatch — split task, fan out, collect results |

Unified under: **`ship`** CLI (Node.js)

## Architecture

```
ship (Node CLI)
├── ship hangar get/status/return     → calls treehouse
├── ship shield push/status           → calls no-mistakes
├── ship nightshift start/status      → calls gnhf
├── ship officer dispatch/status      → spawns multiple kiro-cli sessions
└── ship status                       → unified dashboard
```

Each component also ships a **Kiro Skill** (SKILL.md) so Kiro agents know how to use ship autonomously.

## How It Works (Mechanically)

### Spawning Agents (Key Discovery)

Kiro CLI supports headless agent spawning:

```bash
kiro-cli chat "task description" \
  --no-interactive \
  --trust-all-tools \
  --agent mnemo-enhanced
```

This is what officer and nightshift use to spawn agents in worktrees.

### The Flow

```
1. officer dispatch "big feature"
   → AI splits into N subtasks

2. For each subtask:
   → hangar get (treehouse acquires worktree with lease)
   → spawn kiro-cli in that worktree (--no-interactive)

3. Each agent works independently in isolation

4. When agent finishes:
   → shield push (no-mistakes validates: tests + lint + AI review)
   → If pass: pushed to origin, PR created
   → If fail: feedback to agent, retry (up to 3x)

5. hangar return (release worktree back to pool)

6. nightshift: same flow but runs serially overnight from a task queue
```

## Project Structure

```
~/CodeRepo/ship/
├── bin/
│   └── ship                    ← Entry point CLI
├── packages/
│   ├── hangar/
│   │   ├── index.js            ← Wrapper around treehouse binary
│   │   └── defaults.js         ← Your default configs per repo
│   ├── shield/
│   │   ├── index.js            ← Wrapper around no-mistakes
│   │   └── policies/           ← Your validation policies per project
│   ├── nightshift/
│   │   ├── index.js            ← Wrapper around gnhf
│   │   └── templates/          ← Task spec templates
│   └── officer/
│       ├── index.js            ← Multi-agent dispatcher
│       └── splitter.js         ← Task splitting logic
├── skills/
│   ├── hangar/SKILL.md         ← Teaches Kiro how to use hangar
│   ├── shield/SKILL.md         ← Teaches Kiro how to use shield
│   ├── nightshift/SKILL.md     ← Teaches Kiro about overnight runs
│   └── officer/SKILL.md        ← Teaches Kiro about dispatching
├── config/
│   ├── repos.json              ← Your repos and their configs
│   └── defaults.json           ← Global defaults
├── package.json
└── README.md
```

## Dependencies (Engines to Install)

```bash
# Install via Homebrew (no sudo needed)
brew install treehouse         # hangar engine
brew install gnhf              # nightshift engine
# no-mistakes via install script:
curl -fsSL https://no-mistakes.dev/install.sh | bash

# Already available:
# - Node v25.2.1 (for ship CLI)
# - npx (for gh-axi, skills CLI)
# - kiro-cli (for agent spawning)
# - git 2.50.1 (for worktrees)
```

## Per-Project Config

Each repo in ~/CodeRepo/ gets:

```toml
# treehouse.toml (hangar config)
max_trees = 8

[hooks]
post_create = ["npm install"]  # or "pip install -r requirements.txt"
```

```yaml
# .no-mistakes.yaml (shield config)
checks:
  - name: tests
    command: pytest
  - name: lint
    command: ruff check .
  - name: ai-review
    prompt: "Review for security, logic errors, and policy compliance"
```

```toml
# .tasks.toml (nightshift task queue)
[[task]]
name = "Add Redis caching to eligibility"
spec = "..."

[[task]]
name = "Fix ICD10 edge case"
spec = "..."
```

## Your Daily Workflow

### Morning — Dispatch parallel work
```bash
ship officer dispatch "Add Redis caching to eligibility endpoint"
# → 3 agents in 3 hangars, working in parallel
ship officer status
```

### Midday — Push completed work through shield
```bash
ship shield push   # validates, pushes, creates PR
```

### Evening — Queue overnight work
```bash
ship nightshift start --tasks backlog.toml
# → Agents grind your backlog while you sleep
```

### Next Morning — Review results
```bash
ship nightshift status
# → 4/5 shipped, 1 needs your decision
```

## Implementation Phases

### Phase 1: Foundation (Day 1)
- [ ] Create ship monorepo structure
- [ ] Install engines (brew install treehouse, gnhf, no-mistakes)
- [ ] Write `ship hangar` wrapper (simplest — just calls treehouse)
- [ ] Test: `ship hangar get` → worktree acquired

### Phase 2: Shield (Day 2)
- [ ] Write `ship shield` wrapper
- [ ] Create .no-mistakes.yaml for PolicyCompiler
- [ ] Test: `ship shield push` → validates and pushes

### Phase 3: Nightshift (Day 3)
- [ ] Write `ship nightshift` wrapper
- [ ] Create task templates for your projects
- [ ] Test: `ship nightshift start` → runs one task overnight

### Phase 4: Officer (Day 4-5)
- [ ] Write `ship officer` dispatcher
- [ ] Task splitting logic (uses Kiro to split tasks)
- [ ] Spawn multiple kiro-cli sessions in hangars
- [ ] Monitor and collect results
- [ ] Test: `ship officer dispatch` → 3 parallel agents

### Phase 5: Skills + Polish (Day 6)
- [ ] Write SKILL.md for each component
- [ ] Install skills into ~/.kiro/skills/
- [ ] Kiro can now autonomously use ship
- [ ] Unified `ship status` dashboard

## Key Decisions

1. **Language:** Node.js (you have v25.2.1, matches your ecosystem)
2. **Not rebuilding engines:** Wrap treehouse/no-mistakes/gnhf, don't rewrite
3. **Skills for autonomy:** Each component has a SKILL.md so Kiro agents self-serve
4. **Per-project config:** Each repo gets its own treehouse.toml + .no-mistakes.yaml
5. **Kiro-native spawning:** Uses `kiro-cli chat --no-interactive -a` for headless agents

## Reference Code (Cloned)

- `~/CodeRepo/ToolSkills/treehouse/` — hangar engine source
- `~/CodeRepo/ToolSkills/no-mistakes/` — shield engine source
- Key files to reference:
  - `treehouse/internal/pool/pool.go` — workspace acquire/release pattern
  - `treehouse/internal/git/git.go` — git worktree operations
  - `no-mistakes/internal/gate/gate.go` — validation gate logic
  - `no-mistakes/internal/pipeline/executor.go` — step execution
  - `no-mistakes/internal/agent/agent.go` — agent spawning patterns

## Future (Company Scale)

- ship becomes your company's default dev workflow
- New engineers install ship, get your workflow instantly
- Skills encode your team's standards
- Shield policies enforce code quality across all repos
- Nightshift handles backlog grooming
- Officer enables any engineer to fan out work
