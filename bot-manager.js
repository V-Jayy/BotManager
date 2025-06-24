const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class BotManager {
  constructor() {
    this.bots = new Map(); // Map of botName -> process info
    this.botsDir = path.join(__dirname, 'bots');
    this.logsDir = path.join(__dirname, 'logs');
    this.shuttingDown = false;
    this.restartAttempts = new Map(); // Track restart attempts per bot
    
    // Load configuration
    this.config = this.loadConfig();
    
    // Ensure logs directory exists
    this.ensureLogsDir();
    
    // Handle graceful shutdown
    this.setupGracefulShutdown();
  }

  loadConfig() {
    const configPath = path.join(__dirname, 'config.yaml');
    const defaultConfig = {
      restart: {
        max_attempts: 5,
        restart_delay: 3,
        autostart: true,
        reset_counter_after_minutes: 30
      },
      logging: {
        log_normal_operations: true,
        log_errors: true,
        max_log_files: 10,
        log_level: 'info',
        console_timestamps: true,
        date_organized: true
      },
      monitoring: {
        status_interval: 60,
        memory_warning_threshold: 500,
        performance_logging: true
      },
      advanced: {
        shutdown_grace_period: 5,
        force_kill_timeout: 10,
        startup_delay: 500,
        debug_mode: false
      }
    };

    try {
      if (fs.existsSync(configPath)) {
        const yamlContent = fs.readFileSync(configPath, 'utf8');
        const config = this.parseYaml(yamlContent);
        console.log('✅ Configuration loaded from config.yaml');
        return { ...defaultConfig, ...config };
      } else {
        console.log('⚠️  No config.yaml found, using default configuration');
        return defaultConfig;
      }
    } catch (error) {
      console.error('❌ Error loading config.yaml:', error.message);
      console.log('📋 Using default configuration');
      return defaultConfig;
    }
  }

  // Simple YAML parser for basic structure (avoids external dependencies)
  parseYaml(yamlContent) {
    const lines = yamlContent.split('\n');
    const result = {};
    let currentSection = null;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      // Section headers (no indentation)
      if (!line.startsWith(' ') && trimmed.endsWith(':')) {
        currentSection = trimmed.slice(0, -1);
        result[currentSection] = {};
        continue;
      }
      
      // Key-value pairs (with indentation)
      if (line.startsWith(' ') && trimmed.includes(':')) {
        const [key, ...valueParts] = trimmed.split(':');
        let value = valueParts.join(':').trim();
        
        // Parse different value types
        if (value === 'true') value = true;
        else if (value === 'false') value = false;
        else if (!isNaN(value) && value !== '') value = Number(value);
        else if (value.startsWith('#')) continue; // Skip inline comments
        
        if (currentSection) {
          result[currentSection][key.trim()] = value;
        }
      }
    }
    
    return result;
  }

  ensureLogsDir() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
      console.log('✓ Created logs directory');
    }
  }

  setupGracefulShutdown() {
    process.on('SIGINT', () => {
      console.log('\n🛑 Received SIGINT (Ctrl+C), shutting down gracefully...');
      this.stopAllBots();
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
      this.stopAllBots();
    });
  }

  async discoverBots() {
    if (!fs.existsSync(this.botsDir)) {
      console.log('📁 No bots directory found. Creating one...');
      fs.mkdirSync(this.botsDir, { recursive: true });
      return [];
    }

    console.log('🔍 Scanning bots directory for subfolders...');
    const items = fs.readdirSync(this.botsDir);
    const botFolders = [];
    const skippedItems = [];

    for (const item of items) {
      const itemPath = path.join(this.botsDir, item);
      
      try {
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          console.log(`📂 Found subfolder: ${item}`);
          const packageJsonPath = path.join(itemPath, 'package.json');
          
          if (fs.existsSync(packageJsonPath)) {
            // Validate package.json has required fields
            try {
              const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
              if (packageJson.main || packageJson.scripts?.start) {
                botFolders.push(item);
                console.log(`✅ Valid bot found: ${item} (main: ${packageJson.main || 'from start script'})`);
              } else {
                console.log(`⚠️  Warning: ${item} has package.json but no 'main' field or 'start' script`);
                skippedItems.push(`${item} (missing main/start)`);
              }
            } catch (parseErr) {
              console.log(`⚠️  Warning: ${item} has invalid package.json: ${parseErr.message}`);
              skippedItems.push(`${item} (invalid package.json)`);
            }
          } else {
            console.log(`⚠️  Warning: Subfolder '${item}' has no package.json - skipping`);
            skippedItems.push(`${item} (no package.json)`);
          }
        } else {
          console.log(`📄 Ignoring file: ${item} (not a directory)`);
          skippedItems.push(`${item} (not a directory)`);
        }
      } catch (err) {
        console.log(`⚠️  Warning: Could not read ${item}: ${err.message}`);
        skippedItems.push(`${item} (read error)`);
      }
    }

    // Summary of discovery
    console.log(`\n📊 Bot discovery summary:`);
    console.log(`   Valid bots found: ${botFolders.length}`);
    console.log(`   Items skipped: ${skippedItems.length}`);
    
    if (botFolders.length > 0) {
      console.log(`   Bot subfolders: ${botFolders.join(', ')}`);
    }
    
    if (skippedItems.length > 0) {
      console.log(`   Skipped items: ${skippedItems.join(', ')}`);
    }
    
    console.log(''); // Empty line for spacing

    return botFolders;
  }

  createLogPaths(botName) {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
    
    let botLogDir, logFileName;
    
    if (this.config.logging.date_organized) {
      botLogDir = path.join(this.logsDir, botName, dateStr);
      logFileName = `${timeStr}.log`;
    } else {
      botLogDir = path.join(this.logsDir, botName);
      logFileName = `${dateStr}-${timeStr}.log`;
    }
    
    // Ensure bot log directory exists
    if (!fs.existsSync(botLogDir)) {
      fs.mkdirSync(botLogDir, { recursive: true });
    }
    
    // Cleanup old logs if max_log_files is set
    this.cleanupOldLogs(botLogDir, botName);
    
    return {
      logFile: path.join(botLogDir, logFileName)
    };
  }

  cleanupOldLogs(botLogDir, botName) {
    if (this.config.logging.max_log_files <= 0) return;
    
    try {
      const files = fs.readdirSync(botLogDir)
        .filter(file => file.endsWith('.log'))
        .map(file => ({
          name: file,
          path: path.join(botLogDir, file),
          time: fs.statSync(path.join(botLogDir, file)).mtime
        }))
        .sort((a, b) => b.time - a.time);
      
      // Keep only the most recent files
      const filesToDelete = files.slice(this.config.logging.max_log_files);
      
      for (const file of filesToDelete) {
        fs.unlinkSync(file.path);
        if (this.config.advanced.debug_mode) {
          console.log(`🗑️  Cleaned up old log: ${file.name}`);
        }
      }
    } catch (error) {
      console.error(`⚠️  Warning: Could not cleanup logs for ${botName}:`, error.message);
    }
  }

  checkRestartAttempts(botName) {
    const maxAttempts = this.config.restart.max_attempts;
    if (maxAttempts <= 0) return true; // Infinite attempts
    
    const attempts = this.restartAttempts.get(botName) || 0;
    return attempts < maxAttempts;
  }

  incrementRestartAttempts(botName) {
    const current = this.restartAttempts.get(botName) || 0;
    this.restartAttempts.set(botName, current + 1);
  }

  resetRestartAttempts(botName) {
    this.restartAttempts.delete(botName);
  }

  startBot(botName, isRestart = false) {
    const botPath = path.join(this.botsDir, botName);
    const logPaths = this.createLogPaths(botName);

    const timestamp = this.config.logging.console_timestamps 
      ? `[${new Date().toLocaleTimeString()}] ` 
      : '';
    
    console.log(`${timestamp}🚀 Starting bot: ${botName}${isRestart ? ' (restart)' : ''}`);

    const childProcess = spawn('node', ['.'], {
      cwd: botPath,
      stdio: 'pipe',
      detached: false // Ensure child dies when parent dies
    });

    // Create log stream only if logging is enabled
    const shouldLog = this.config.logging.log_normal_operations || this.config.logging.log_errors;
    const logStream = shouldLog ? fs.createWriteStream(logPaths.logFile, { flags: 'a' }) : null;
    
    // Log startup
    if (logStream) {
      const startupTimestamp = new Date().toISOString();
      const startupMessage = `\n=== Bot ${botName} started at ${startupTimestamp} ${isRestart ? '(RESTART)' : '(INITIAL)'} ===\n`;
      logStream.write(startupMessage);
    }

    // Handle stdout (normal operations)
    childProcess.stdout.on('data', (data) => {
      const output = data.toString();
      
      // Log to file if normal operations logging is enabled
      if (logStream && this.config.logging.log_normal_operations) {
        logStream.write(output);
      }
      
      // Always log to console
      const cleanOutput = output.trim();
      if (cleanOutput) {
        console.log(`${timestamp}[${botName}] ${cleanOutput}`);
      }
    });

    // Handle stderr (errors)
    childProcess.stderr.on('data', (data) => {
      const output = data.toString();
      
      // Log to file if error logging is enabled
      if (logStream && this.config.logging.log_errors) {
        logStream.write(output);
      }
      
      // Always log errors to console
      const cleanOutput = output.trim();
      if (cleanOutput) {
        console.error(`${timestamp}[${botName}] ❌ ERROR: ${cleanOutput}`);
      }
    });

    childProcess.on('close', (code, signal) => {
      const exitTimestamp = new Date().toISOString();
      const exitMessage = `=== Bot ${botName} exited with code ${code} (signal: ${signal}) at ${exitTimestamp} ===\n`;
      
      // Log exit message if error logging is enabled (for crashes) or normal logging (for clean exits)
      if (logStream && ((code !== 0 && this.config.logging.log_errors) || (code === 0 && this.config.logging.log_normal_operations))) {
        logStream.write(exitMessage);
      }
      
      if (logStream) {
        logStream.end();
      }
      
      console.log(`${timestamp}🔄 ${exitMessage.trim()}`);

      // Remove from active bots
      this.bots.delete(botName);

      // Handle restart logic
      this.handleBotExit(botName, code, signal);
    });

    childProcess.on('error', (err) => {
      const errorTimestamp = new Date().toISOString();
      const errorMessage = `=== Bot ${botName} process error at ${errorTimestamp}: ${err.message} ===\n`;
      
      // Log process errors if error logging is enabled
      if (logStream && this.config.logging.log_errors) {
        logStream.write(errorMessage);
      }
      
      console.error(`${timestamp}❌ ${errorMessage.trim()}`);

      // Remove from active bots
      this.bots.delete(botName);

      // Handle restart logic
      this.handleBotExit(botName, 1, 'ERROR');
    });

    // Set up automatic reset of restart attempts after successful runtime
    const resetTimer = setTimeout(() => {
      if (this.bots.has(botName)) {
        this.resetRestartAttempts(botName);
        if (this.config.advanced.debug_mode) {
          console.log(`${timestamp}✅ Reset restart attempts for ${botName} after successful runtime`);
        }
      }
    }, this.config.restart.reset_counter_after_minutes * 60 * 1000);

    this.bots.set(botName, {
      process: childProcess,
      logStream: logStream,
      startTime: new Date(),
      resetTimer: resetTimer
    });
  }

  handleBotExit(botName, code, signal) {
    if (this.shuttingDown) return;
    
    // Check if we should restart
    const shouldRestart = (code !== 0 || signal === 'SIGKILL' || signal === 'ERROR');
    
    if (shouldRestart) {
      if (this.checkRestartAttempts(botName)) {
        this.incrementRestartAttempts(botName);
        const currentAttempts = this.restartAttempts.get(botName);
        const maxAttempts = this.config.restart.max_attempts;
        
        const attemptsText = maxAttempts > 0 
          ? ` (attempt ${currentAttempts}/${maxAttempts})`
          : ` (attempt ${currentAttempts})`;
        
        console.log(`⏰ Restarting ${botName} in ${this.config.restart.restart_delay} seconds${attemptsText}...`);
        
        setTimeout(() => {
          if (!this.shuttingDown) {
            this.startBot(botName, true);
          }
        }, this.config.restart.restart_delay * 1000);
      } else {
        console.error(`💀 Bot ${botName} has exceeded maximum restart attempts (${this.config.restart.max_attempts}). Giving up.`);
        console.log(`📋 To restart manually, fix the issue and restart the bot manager.`);
      }
    } else {
      console.log(`✅ Bot ${botName} exited gracefully (code 0). Not restarting.`);
    }
  }

  stopBot(botName) {
    const botInfo = this.bots.get(botName);
    if (botInfo) {
      console.log(`🛑 Stopping bot: ${botName}`);
      
      // Clear reset timer
      if (botInfo.resetTimer) {
        clearTimeout(botInfo.resetTimer);
      }
      
      // Try graceful shutdown first
      botInfo.process.kill('SIGTERM');
      
      // Force kill after configured timeout if it doesn't stop gracefully
      setTimeout(() => {
        if (this.bots.has(botName)) {
          console.log(`💀 Force killing bot: ${botName}`);
          botInfo.process.kill('SIGKILL');
        }
      }, this.config.advanced.force_kill_timeout * 1000);
    }
  }

  stopAllBots() {
    this.shuttingDown = true;
    console.log('🛑 Stopping all bots...');
    
    const botNames = Array.from(this.bots.keys());
    
    if (botNames.length === 0) {
      console.log('✅ No bots to stop. Bot manager stopped.');
      process.exit(0);
      return;
    }
    
    for (const botName of botNames) {
      this.stopBot(botName);
    }

    // Exit after giving time for graceful shutdown
    setTimeout(() => {
      console.log('✅ Bot manager stopped.');
      process.exit(0);
    }, (this.config.advanced.shutdown_grace_period + this.config.advanced.force_kill_timeout) * 1000);
  }

  async start() {
    console.log('🤖 Discord Bot Manager Starting...');
    console.log('📋 Press Ctrl+C to stop all bots and exit\n');
    
    const botFolders = await this.discoverBots();
    
    if (botFolders.length === 0) {
      console.log('📭 No bots found in the bots/ directory.');
      console.log('💡 Please add bot folders with package.json files to get started.');
      console.log('📖 See README.md for setup instructions.\n');
      return;
    }

    console.log(`🔍 Found ${botFolders.length} bot(s): ${botFolders.join(', ')}\n`);
    
    // Start all bots (if autostart is enabled)
    if (this.config.restart.autostart) {
      for (const botName of botFolders) {
        this.startBot(botName);
        // Configurable delay between starts to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, this.config.advanced.startup_delay));
      }
    } else {
      console.log('⏸️  Autostart is disabled. Bots will not start automatically.');
      console.log('📋 Use the start command or restart the manager with autostart: true');
    }
    
    console.log('\n✅ All bots started! Monitoring for crashes...\n');
  }

  getStatus() {
    console.log('\n📊 === Bot Manager Status ===');
    if (this.bots.size === 0) {
      console.log('💤 No bots currently running.');
    } else {
      for (const [botName, botInfo] of this.bots) {
        const uptime = Math.floor((Date.now() - botInfo.startTime.getTime()) / 1000);
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = uptime % 60;
        const uptimeStr = `${hours}h ${minutes}m ${seconds}s`;
        
        console.log(`✅ ${botName}: Running (uptime: ${uptimeStr}, PID: ${botInfo.process.pid})`);
      }
    }
    console.log('============================\n');
  }
}

// Create and start the bot manager
const manager = new BotManager();
manager.start().catch(err => {
  console.error('❌ Failed to start bot manager:', err);
  process.exit(1);
});

// Show status based on configuration
if (manager.config.monitoring.status_interval > 0) {
  setInterval(() => {
    if (!manager.shuttingDown && manager.bots.size > 0) {
      manager.getStatus();
    }
  }, manager.config.monitoring.status_interval * 1000);
} 