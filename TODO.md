# Ship — Tomorrow's TODO

## Pick up here:

### 1. Install engines
```bash
brew install treehouse
brew install gnhf
# no-mistakes: check install method at https://no-mistakes.dev
```

### 2. Initialize the monorepo
```bash
cd ~/CodeRepo/ship
npm init -y
mkdir -p bin packages/hangar packages/shield packages/nightshift packages/officer
mkdir -p skills/hangar skills/shield skills/nightshift skills/officer
mkdir -p config
```

### 3. Start with hangar (simplest wrapper)
- Write `bin/ship` CLI entry point
- Write `packages/hangar/index.js` 
- Just shells out to `treehouse` with your defaults
- Test: `./bin/ship hangar get` in PolicyCompiler repo

### 4. Then shield, then nightshift, then officer

## Key Command to Spawn Kiro Headlessly
```bash
kiro-cli chat "task description" --no-interactive --trust-all-tools --agent mnemo-enhanced
```

## Repos Already Cloned
- ~/CodeRepo/ToolSkills/treehouse/ (hangar engine)
- ~/CodeRepo/ToolSkills/no-mistakes/ (shield engine)
