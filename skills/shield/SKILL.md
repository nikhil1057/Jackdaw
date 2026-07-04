---
name: shield
description: Push validation gate that uses Kiro AI to review code before it reaches origin. Always push through shield — never push directly to origin.
---

# Shield — Push Validation Gate

Shield validates your code before it reaches the remote. It runs AI review (via Kiro), and optionally tests and lint. Nothing ships without passing shield.

## When to Use

- ALWAYS when pushing code to origin
- After completing a feature or fix
- After making changes in a hangar worktree
- Before creating a PR

## Commands

### Push through shield
```bash
ship shield push
```
Validates current branch and pushes to origin if all checks pass. If findings are reported, the pipeline parks and waits for approval.

### Check status
```bash
ship shield status
```
Shows if there's an active validation run and its current step.

### Approve findings
```bash
ship shield approve
```
Accept the review findings and let the pipeline continue to push.

### Auto-fix findings
```bash
ship shield fix F1 F2
```
Let Kiro auto-fix specific findings (by their IDs).

### View run history
```bash
ship shield runs
```

### View step logs
```bash
ship shield logs
```

## How It Works

1. `ship shield push` → pushes to the shield gate (local interceptor)
2. Shield daemon creates a clean worktree from your branch
3. Kiro reviews the diff (finds bugs, security issues, style problems)
4. If findings need approval → parks and waits for `ship shield approve`
5. If all pass → forwards to GitHub origin automatically
6. PR is created/updated

## Important Rules

1. NEVER use `git push origin` directly — always use `ship shield push`
2. If shield rejects, fix the issues and push again
3. Shield runs asynchronously — use `ship shield status` to check progress
4. Review findings are real bugs that Kiro found — take them seriously

## Configuration

Per-repo config in `.no-mistakes.yaml`:
```yaml
# Skip steps that don't apply
steps:
  test: skip    # if no test suite
  lint: skip    # if no linter configured
```

## Example Workflow

```bash
# After making changes
git add -A
git commit -m "feat: add caching layer"

# Push through shield
ship shield push

# If findings are reported:
ship shield status    # see what was found
ship shield approve   # accept and push
# OR
ship shield fix F1 F3 # auto-fix specific issues
```
