---
name: nightshift
description: Overnight agent runner that executes tasks while the user sleeps. Use for long-running tasks, batch operations, or when the user says goodnight.
---

# Nightshift — Agents Work While You Sleep

Nightshift runs coding agents overnight on a task queue. You define what needs to be done, nightshift handles execution, iteration, and progress tracking.

## When to Use

- User wants work done overnight or in the background
- Multiple sequential tasks need to be completed
- A task requires many iterations (refactoring, large feature)
- User says "do this while I sleep" or "queue this up"

## Commands

### Start with a single task
```bash
ship nightshift start "Add unit tests for the auth module"
```

### Start with a task file
```bash
ship nightshift start --tasks backlog.toml
```

### Check if running
```bash
ship nightshift status
```

### Stop
```bash
ship nightshift stop
```

## Options

```bash
--max-iterations <n>    # Stop after N iterations (default: unlimited)
--max-tokens <n>        # Stop after N tokens consumed
--worktree              # Run in isolated worktree (default: enabled)
--push                  # Auto-push after each iteration (default: enabled)
```

## Task File Format (.tasks.toml)

```toml
[[task]]
name = "Add Redis caching"
spec = "Implement Redis caching for the eligibility endpoint. Add connection config, cache layer, and invalidation on policy update."

[[task]]
name = "Fix ICD10 edge case"
spec = "The attestation tree generation fails when a code has no parent. Add null check and fallback logic."
```

## How It Works

1. Nightshift acquires a worktree (hangar)
2. Spawns a Kiro agent with the task spec
3. Agent works, makes changes, commits
4. If `--push` is set, pushes the branch
5. Moves to next task (or iterates if not done)
6. Reports results when finished

## Important Rules

1. Always use `--max-iterations` for safety — prevent runaway agents
2. Check results in the morning with `ship hangar status`
3. Nightshift creates branches — review before merging
4. Logs are saved to the worktree's `.nightshift/runs/` directory
5. Use `ship shield push` to validate nightshift's output before merging

## Example

```bash
# Queue up overnight work
ship nightshift start "Refactor the payment service to use async/await instead of callbacks" --max-iterations 5

# Or batch tasks
ship nightshift start --tasks tonight.toml

# Check in the morning
ship nightshift status
ship hangar status
```
