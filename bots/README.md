# Bots Directory

This directory contains your Discord bot projects. Each bot should be in its own subfolder.

## Structure

```
bots/
├── my-bot-1/
│   ├── package.json    # Required - defines main entry point
│   ├── index.js        # Your bot code
│   └── node_modules/   # Dependencies
└── my-bot-2/
    ├── package.json
    └── index.js
```

## Requirements

Each bot folder must have:
- **`package.json`** with a `main` field pointing to your bot file
- **Bot code file** (typically `index.js`)
- **Dependencies installed** (`npm install`)

## Example package.json

```json
{
  "name": "my-discord-bot",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "discord.js": "^14.14.1"
  }
}
```

## Environment Variables

Set your Discord tokens as environment variables:
```bash
# Windows
set DISCORD_TOKEN=your_token_here

# Linux/Mac  
export DISCORD_TOKEN=your_token_here
```

## Auto-Discovery

The bot manager automatically:
- Scans this directory for subfolders
- Validates each folder has a proper `package.json`
- Starts bots using `node .` command
- Monitors and restarts crashed bots

Just add your bot folder and the manager will handle the rest! 