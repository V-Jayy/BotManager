![Discord Bot Manager]([https://via.placeholder.com/1200x400/1A1A2E/FFFFFF?text=Discord+Bot+Manager](https://i.postimg.cc/TwTP4drC/u2939295587-A-vast-starfield-in-deep-space-with-countless-tin-35149212-4975-4961-b744-b7e198b51abe-2.png))

# Discord Bot Manager

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-16%2B-green?style=for-the-badge&logo=node.js" alt="Node.js">
  <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey?style=for-the-badge" alt="Platform">
  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="License">
</p>

A production-ready Node.js application for managing multiple Discord bots with automatic restart, intelligent logging, and comprehensive monitoring. Features YAML configuration, process isolation, and zero external dependencies.

## Features

- 🔄 **Smart Restart System** - Configurable restart attempts with automatic attempt reset
- 📝 **Flexible Logging** - Optional normal/error logging with date-organized folders  
- ⚙️ **YAML Configuration** - Complete settings control via config file
- 🛡️ **Process Isolation** - Each bot runs in its own secure process
- 📊 **Live Monitoring** - Real-time status updates and memory usage alerts
- ⚡ **Zero Dependencies** - Uses only built-in Node.js modules

## Installation

**Prerequisites:**
- Node.js 16.0+ 
- Discord bot tokens

**Setup:**
1. Download/clone this repository
2. Configure `config.yaml` (optional - defaults provided)
3. Add your bots to `bots/` folder
4. Run `node bot-manager.js`

**No external dependencies required** - uses only built-in Node.js modules.

## Configuration

Edit `config.yaml` to customize behavior:

```yaml
# Restart Settings
restart:
  max_attempts: 5              # Max restart attempts (0 = infinite)
  restart_delay: 3             # Seconds before restart
  autostart: true              # Auto-start bots on manager start
  reset_counter_after_minutes: 30  # Reset attempts after successful runtime

# Logging Settings  
logging:
  log_normal_operations: true  # Log normal bot operations
  log_errors: true            # Log errors and crashes
  max_log_files: 10           # Keep N recent logs (0 = unlimited)
  console_timestamps: true     # Show timestamps in console
  date_organized: true        # Organize logs in date folders

# Monitoring Settings
monitoring:
  status_interval: 60         # Status report interval in seconds
  memory_warning_threshold: 500  # Memory warning threshold (MB)
  performance_logging: true   # Enable performance metrics

# Advanced Settings
advanced:
  shutdown_grace_period: 5    # Graceful shutdown timeout
  force_kill_timeout: 10      # Force kill timeout
  startup_delay: 500          # Delay between bot starts (ms)
  debug_mode: false           # Enable debug logging
```

## Adding Bots

1. **Create bot folder** in `bots/` directory
2. **Add `package.json`** with main field pointing to your bot file
3. **Add your bot code** (Discord.js recommended)
4. **Install dependencies** (`npm install`)
5. **Set Discord token** via environment variables

**Example bot structure:**
```
bots/my-bot/
├── package.json
├── index.js
└── node_modules/
```

**Environment variables:**
```bash
# Windows: set DISCORD_TOKEN=your_token
# Linux/Mac: export DISCORD_TOKEN=your_token
```

## Usage

**Start the manager:**
```bash
node bot-manager.js
```

**Stop the manager:**
Press `Ctrl+C` for graceful shutdown of all bots.

**Expected output:**
```
🚀 Starting bot: my-bot
[my-bot] ✅ Bot ready! Logged in as MyBot#1234

📊 === Bot Manager Status ===
✅ my-bot: Running (uptime: 1h 23m 45s, PID: 12345)
============================
```

**Log structure:**
```
logs/bot-name/2024-01-15/10-30-45.log
```

## Troubleshooting

**Bot won't start:**
- Install dependencies: `cd bots/bot-name && npm install`
- Check Discord token is valid
- Verify `package.json` has `main` field

**Too many restarts:**
- Check bot logs in `logs/` folder
- Increase `max_attempts` in config
- Fix bot code issues

**Memory warnings:**
- Adjust `memory_warning_threshold` in config
- Check for memory leaks in bot code

## License

MIT License 
