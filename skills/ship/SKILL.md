---
name: ship
description: "Ship is your Multi-Agent SDLC Command Center. Use it to orchestrate parallel agents, validate code before pushing, and run overnight tasks. This skill ties hangar, shield, nightshift, and officer together into one workflow."
---

# Ship — Your SDLC Command Center

You have 4 tools at your disposal. Use them together to ship fast.

## Quick Reference

| Command | What it does |
|---------|-------------|
| `ship officer dispatch "task"` | Split task → parallel agents |
| `ship shield push` | Validate + push (AI reviews your code) |
| `ship nightshift start "task"` | Agent works in background/overnight |
| `ship hangar get` | Get isolated worktree |
| `ship hangar status` | See all worktrees |

## Workflow Patterns

### Pattern 1: Big Feature (use officer)
```bash
ship officer dispatch "Build the notification system with email, SMS, and webhooks"
# Wait for agents to finish...
ship hangar status                    # see results
cd ~/.treehouse/<repo>/1/<repo>       # inspect work
ship shield push                      # validate and push
```

### Pattern 2: Quick Fix (direct work + shield)
```bash
# Make your changes directly
git add -A && git commit -m "fix: handle null case"
ship shield push                      # validates before pushing
```

### Pattern 3: Overnight Batch (use nightshift)
```bash
ship nightshift start --tasks backlog.toml
# Or single task:
ship nightshift start "Refactor all callbacks to async/await" --max-iterations 5
```

### Pattern 4: Isolated Experiment (use hangar)
```bash
ship hangar get                       # get clean worktree
# ... experiment freely ...
exit                                  # return it when done
```

## Decision Guide

- **Is it one small task?** → Just do it, then `ship shield push`
- **Is it a big feature with parts?** → `ship officer dispatch`
- **Can it run overnight?** → `ship nightshift start`
- **Need isolation?** → `ship hangar get`
- **ALWAYS before pushing** → `ship shield push`

## Rules

1. **Never `git push origin` directly** — always go through shield
2. **Officer for parallel, nightshift for serial** — pick based on task independence
3. **Review agent work before shipping** — agents are good but not perfect
4. **Shield findings are real bugs** — don't dismiss them blindly
