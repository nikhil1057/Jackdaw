---
name: officer
description: Multi-agent dispatcher that splits a large task into subtasks and runs them in parallel across isolated worktrees. Use for features that can be decomposed into independent parts.
---

# Officer — Talk to One Agent, Ship With a Crew

Officer splits a large task into independent subtasks and dispatches parallel Kiro agents, each working in their own hangar (worktree).

## When to Use

- A feature has multiple independent parts that can be built in parallel
- User says "split this" or "do these in parallel"
- Task is too large for a single agent pass
- You want to speed up delivery by parallelizing work

## Commands

### Dispatch with auto-split
```bash
ship officer dispatch "Add user authentication with login, signup, and password reset"
```
Kiro splits the task into subtasks and spawns agents for each.

### Dispatch with fixed agent count
```bash
ship officer dispatch "Refactor the API layer" --agents 3
```

### Dispatch without splitting (single agent in hangar)
```bash
ship officer dispatch "Fix the login bug" --no-split
```

### Check running agents
```bash
ship officer status
```

### Stop all agents
```bash
ship officer stop
```

## How It Works

1. You give officer a task description
2. Kiro analyzes the task and splits into 2-4 independent subtasks
3. For each subtask:
   - Acquires a hangar (leased worktree via treehouse)
   - Spawns a Kiro CLI agent in non-interactive mode
   - Agent works independently in isolation
4. Officer monitors all agents
5. Reports results when all complete
6. You review each hangar's work, then `ship shield push`

## Important Rules

1. Only split into INDEPENDENT subtasks — no cross-dependencies
2. Each agent works in its own worktree — they can't see each other's changes
3. After completion, manually review each hangar before pushing
4. Agent logs are saved to `.ship/officer/agent-N.log`
5. Release hangars when done: `treehouse return <path>`

## Example Workflow

```bash
# Dispatch a multi-part feature
ship officer dispatch "Build a notification system with email, SMS, and in-app channels"

# Officer splits into:
#   1. Email notification channel
#   2. SMS notification channel  
#   3. In-app notification channel

# Wait for completion...
# Then review each hangar:
cd ~/.treehouse/myrepo-abc123/1/myrepo
# ... inspect, test, commit final touches

# Push through shield
ship shield push

# Return the hangar
treehouse return ~/.treehouse/myrepo-abc123/1/myrepo
```

## Output

Officer provides real-time status:
```
  👥 Dispatching 3 agents:
    1. Email channel
    2. SMS channel
    3. In-app channel

  🚀 All 3 agents dispatched. Monitoring...

  ✅ [1/3] Email channel — done
  ✅ [2/3] SMS channel — done
  ✅ [3/3] In-app channel — done

  Officer Summary
  ✅ Completed: 3
  ❌ Failed:    0
```
