# Logs Directory

This directory contains organized log files for all your Discord bots.

## Structure

```
logs/
├── bot-name-1/
│   ├── 2024-01-15/
│   │   ├── 10-30-45.log    # Bot started at 10:30:45
│   │   └── 14-22-10.log    # Bot restarted at 14:22:10
│   └── 2024-01-16/
│       └── 09-15-30.log
└── bot-name-2/
    └── 2024-01-15/
        └── 11-45-20.log
```

## Log Content

Each log file contains:
- **Startup messages** - When the bot starts/restarts
- **Bot output** - Console logs from your bot (if `log_normal_operations: true`)
- **Error messages** - Crashes and errors (if `log_errors: true`)
- **Exit messages** - When the bot stops with exit codes

## Configuration

Control logging behavior in `config.yaml`:

```yaml
logging:
  log_normal_operations: true   # Log normal bot output
  log_errors: true             # Log errors and crashes
  date_organized: true         # Organize in date folders
  max_log_files: 10           # Keep only recent logs
```

## Log Levels

- **Normal operations**: Bot startup, Discord events, command usage
- **Errors**: Crashes, API errors, unhandled exceptions
- **System**: Bot manager restart attempts and status

## Automatic Cleanup

- Old log files are automatically removed based on `max_log_files` setting
- Set to `0` for unlimited log retention
- Cleanup happens when new log files are created

## File Naming

- **Date folders**: `YYYY-MM-DD/` format
- **Log files**: `HH-MM-SS.log` (time when bot started)
- **One log per bot session** (startup to shutdown)

Logs help you troubleshoot bot issues and monitor performance over time. 