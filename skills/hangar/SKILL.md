---
name: hangar
description: Workspace isolation for parallel agents using git worktrees. Use when you need to work in an isolated environment or when multiple agents need separate workspaces.
---

# Hangar — Workspace Isolation

Use hangar to acquire isolated git worktrees when you need a clean workspace that won't interfere with the main repo or other agents.

## When to Use

- You need to work on a feature without affecting the main working directory
- Multiple agents need to work in parallel on the same repo
- You want a clean slate based on the default branch
- You're doing destructive experiments and want isolation

## Commands

### Acquire a worktree
```bash
ship hangar get
```
Opens a subshell in a clean worktree. Type `exit` to return it to the pool.

### Acquire with a lease (for automation, no subshell)
```bash
ship hangar get --lease --lease-holder "my-task"
```
Returns just the path. The worktree stays reserved until you release it.

### Check status
```bash
ship hangar status
```
Shows all worktrees and their status (available, in-use, leased, dirty).

### Return a worktree
```bash
ship hangar return
```
Releases the current worktree back to the pool. Resets it to clean state.

### Return a specific leased worktree
```bash
treehouse return /path/to/worktree
```

## Important Rules

1. Always return worktrees when done — don't leave them leased forever
2. Uncommitted changes in a worktree block return — commit or discard first
3. Worktrees are detached HEAD at the default branch — create a branch if you need to push
4. Maximum pool size is configured in `treehouse.toml` (default: 16)

## Example Workflow

```bash
# Get isolated workspace
ship hangar get

# Do your work...
git checkout -b feature/my-change
# ... make changes, commit ...

# Push through shield
ship shield push

# Return hangar
exit  # (or ship hangar return)
```
