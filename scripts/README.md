# Sandbox Cleanup Scripts

This directory contains scripts for automatically cleaning up the sandbox environment.

## 🔒 Privacy & Security Notice

**IMPORTANT**: The sandbox cleanup automatically logs out WhatsApp instances after 30 minutes for privacy protection. This is designed for demonstration environments only.

- ✅ **Sandbox Mode**: Instances are logged out after 30 minutes
- ✅ **Privacy Compliant**: User sessions don't persist indefinitely
- ✅ **Demo Appropriate**: Perfect for "try it" sandboxes
- ⚠️ **Production**: Should be disabled in production environments

## Scripts

* `sandbox-cleanup.js`: The main cleanup script that removes old data
* `sandbox-cleanup.service`: Systemd service file for running the cleanup
* `sandbox-cleanup.timer`: Systemd timer file for scheduling the cleanup  
* `setup-sandbox-cleanup.sh`: Setup script to automate the installation of the cleanup service

## 🚀 Usage

### Sandbox/Demo Environment (Default)

To set up the automated cleanup for sandbox:

```bash
./scripts/setup-sandbox-cleanup.sh
```

To run the cleanup manually:

```bash
node scripts/sandbox-cleanup.js
```

### 🏭 Production Environment

**To disable cleanup in production**, set one of these environment variables:

```bash
# Option 1: Set NODE_ENV to production
export NODE_ENV=production

# Option 2: Explicitly disable sandbox mode
export SANDBOX_MODE=false
```

**Production deployment example:**

```bash
# In your production .env file
NODE_ENV=production
SANDBOX_MODE=false

# Or in your process manager/systemd service
Environment=NODE_ENV=production
Environment=SANDBOX_MODE=false
```

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | When set to `production`, disables cleanup unless `SANDBOX_MODE=true` |
| `SANDBOX_MODE` | `true` | When set to `false`, disables all cleanup operations |

### Cleanup Behavior

**What gets cleaned (every 10 minutes):**
- 🗄️ Database records older than 30 minutes:
  - Messages
  - Webhooks and webhook history  
  - Instance logs
  - **WhatsApp instances** (for privacy)
- 📁 File system artifacts older than 30 minutes:
  - Session files
  - QR code images
  - Temp/upload files
  - Log files

## 🛡️ Safety Features

- **Production Protection**: Automatically disabled when `NODE_ENV=production`
- **Explicit Control**: Can be disabled with `SANDBOX_MODE=false`
- **Warning Logs**: Alerts when running in production mode
- **Graceful Handling**: Continues on individual cleanup failures

## 📋 Logging

Logs are written to:
- **Console**: Real-time output
- **File**: `logs/sandbox-cleanup.log` (5MB max, 5 files rotated)

## 🔧 Management Commands

### Systemd (Root Installation)

```bash
# Check timer status
sudo systemctl status sandbox-cleanup.timer

# View cleanup logs
sudo journalctl -u sandbox-cleanup.service -f

# Stop/start timer
sudo systemctl stop sandbox-cleanup.timer
sudo systemctl start sandbox-cleanup.timer
```

### Cron (User Installation)

```bash
# View scheduled jobs
crontab -l

# Edit cron jobs
crontab -e

# View cron logs
tail -f logs/cron-cleanup.log
```

## 🚨 Important Notes

1. **Never run in production** without explicitly understanding the data deletion implications
2. **30-minute session limit** is enforced for privacy in sandbox mode
3. **All user data** older than 30 minutes gets permanently deleted
4. **No recovery** - deleted data cannot be restored
5. **Cascade deletion** - removing instances also removes related messages/webhooks

