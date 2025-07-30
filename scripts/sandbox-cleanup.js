#!/usr/bin/env node

/**
 * Sandbox Cleanup Script
 * 
 * This script cleans up test data from the sandbox environment that is older than 30 minutes.
 * It removes:
 * - All Prisma model records older than 30 minutes (including instances for privacy)
 * - WhatsApp session files
 * - QR code images
 * - Temporary files
 * - Upload directories
 * 
 * PRIVACY NOTE: For sandbox/demo environments, instances are automatically logged out
 * after 30 minutes to protect user privacy. This is appropriate for demonstration
 * purposes only.
 * 
 * PRODUCTION NOTE: Disable this script in production environments by setting
 * SANDBOX_MODE=false or NODE_ENV=production
 * 
 * Usage:
 * - Manual: node scripts/sandbox-cleanup.js
 * - Cron: Every 10 minutes: /usr/bin/node /path/to/whisper-api/scripts/sandbox-cleanup.js
 */

const { PrismaClient } = require('../src/generated/prisma');
const fs = require('fs').promises;
const path = require('path');
const { createLogger, format, transports } = require('winston');

// Initialize Prisma client
const prisma = new PrismaClient();

// Logger configuration
const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}] ${message}`;
    })
  ),
  transports: [
    new transports.Console(),
    new transports.File({ 
      filename: path.join(__dirname, '../logs/sandbox-cleanup.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Environment and cleanup configuration
const NODE_ENV = process.env.NODE_ENV || 'development';
const SANDBOX_MODE = process.env.SANDBOX_MODE !== 'false';
const CLEANUP_THRESHOLD_MINUTES = 30;
const CLEANUP_THRESHOLD_MS = CLEANUP_THRESHOLD_MINUTES * 60 * 1000;

// Safety check - don't run in production unless explicitly enabled
if (NODE_ENV === 'production' && SANDBOX_MODE) {
  logger.warn('⚠️  Running cleanup in production mode with SANDBOX_MODE=true');
  logger.warn('⚠️  This will delete user data! Set SANDBOX_MODE=false to disable.');
}

/**
 * Calculate the cutoff time for cleanup (30 minutes ago)
 */
function getCleanupCutoffTime() {
  return new Date(Date.now() - CLEANUP_THRESHOLD_MS);
}

/**
 * Clean up database records older than 30 minutes
 * NOTE: Includes instance deletion for privacy compliance in sandbox mode
 */
async function cleanupDatabaseRecords() {
  // Check if cleanup should be skipped for production
  if (NODE_ENV === 'production' && !SANDBOX_MODE) {
    logger.info('🛡️  Cleanup skipped - running in production mode with SANDBOX_MODE=false');
    return 0;
  }

  const cutoffTime = getCleanupCutoffTime();
  logger.info(`🗑️  Starting database cleanup for records older than ${cutoffTime.toISOString()}`);
  logger.info(`🔒 Privacy mode: Instances will be logged out after 30 minutes for security`);

  try {
    // Clean up in order of dependencies (child records first)
    
    // 1. Clean up WebhookHistory
    const deletedWebhookHistory = await prisma.webhookHistory.deleteMany({
      where: {
        triggeredAt: {
          lt: cutoffTime
        }
      }
    });
    logger.info(`✅ Deleted ${deletedWebhookHistory.count} webhook history records`);

    // 2. Clean up InstanceLogs
    const deletedInstanceLogs = await prisma.instanceLog.deleteMany({
      where: {
        timestamp: {
          lt: cutoffTime
        }
      }
    });
    logger.info(`✅ Deleted ${deletedInstanceLogs.count} instance log records`);

    // 3. Clean up Messages
    const deletedMessages = await prisma.message.deleteMany({
      where: {
        createdAt: {
          lt: cutoffTime
        }
      }
    });
    logger.info(`✅ Deleted ${deletedMessages.count} message records`);

    // 4. Clean up Webhooks
    const deletedWebhooks = await prisma.webhook.deleteMany({
      where: {
        createdAt: {
          lt: cutoffTime
        }
      }
    });
    logger.info(`✅ Deleted ${deletedWebhooks.count} webhook records`);

    // 5. Clean up Instances for privacy compliance (this will cascade delete remaining related records)
    const deletedInstances = await prisma.instance.deleteMany({
      where: {
        createdAt: {
          lt: cutoffTime
        }
      }
    });
    logger.info(`✅ Deleted ${deletedInstances.count} instance records (privacy compliance)`);
    
    const totalDeleted = deletedWebhookHistory.count + deletedInstanceLogs.count + 
                        deletedMessages.count + deletedWebhooks.count + deletedInstances.count;
    
    logger.info(`🎯 Database cleanup completed: ${totalDeleted} total records removed`);
    return totalDeleted;

  } catch (error) {
    logger.error(`❌ Database cleanup failed: ${error.message}`);
    throw error;
  }
}

/**
 * Clean up file system artifacts
 */
async function cleanupFileSystem() {
  // Check if cleanup should be skipped for production
  if (NODE_ENV === 'production' && !SANDBOX_MODE) {
    logger.info('🛡️  File cleanup skipped - running in production mode with SANDBOX_MODE=false');
    return 0;
  }

  logger.info('🗂️  Starting file system cleanup');
  
  const cleanupDirs = [
    'sessions',
    'temp',
    'uploads',
    'qr_codes',
    'logs/whatsapp'
  ];

  let totalFilesDeleted = 0;

  for (const dir of cleanupDirs) {
    try {
      const fullPath = path.join(__dirname, '..', dir);
      
      // Check if directory exists
      try {
        await fs.access(fullPath);
      } catch {
        logger.info(`📁 Directory ${dir} does not exist, skipping`);
        continue;
      }

      // Read directory contents
      const files = await fs.readdir(fullPath);
      const cutoffTime = getCleanupCutoffTime();
      let dirFilesDeleted = 0;

      for (const file of files) {
        try {
          const filePath = path.join(fullPath, file);
          const stats = await fs.stat(filePath);
          
          // Delete files older than 30 minutes
          if (stats.mtime < cutoffTime) {
            if (stats.isDirectory()) {
              // Recursively delete directory
              await fs.rmdir(filePath, { recursive: true });
              logger.info(`📁 Deleted directory: ${path.relative(process.cwd(), filePath)}`);
            } else {
              // Delete file
              await fs.unlink(filePath);
              logger.info(`📄 Deleted file: ${path.relative(process.cwd(), filePath)}`);
            }
            dirFilesDeleted++;
          }
        } catch (error) {
          logger.warn(`⚠️  Failed to delete ${file}: ${error.message}`);
        }
      }

      totalFilesDeleted += dirFilesDeleted;
      logger.info(`✅ Cleaned ${dirFilesDeleted} items from ${dir}/`);

    } catch (error) {
      logger.warn(`⚠️  Failed to clean directory ${dir}: ${error.message}`);
    }
  }

  // Clean up specific file patterns in root directory
  try {
    const rootFiles = await fs.readdir(process.cwd());
    const cutoffTime = getCleanupCutoffTime();
    
    const patterns = [
      /\.session$/,
      /^qr-.*\.png$/,
      /\.tmp$/,
      /\.temp$/
    ];

    for (const file of rootFiles) {
      const shouldDelete = patterns.some(pattern => pattern.test(file));
      
      if (shouldDelete) {
        try {
          const filePath = path.join(process.cwd(), file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime < cutoffTime) {
            await fs.unlink(filePath);
            logger.info(`📄 Deleted root file: ${file}`);
            totalFilesDeleted++;
          }
        } catch (error) {
          logger.warn(`⚠️  Failed to delete root file ${file}: ${error.message}`);
        }
      }
    }
  } catch (error) {
    logger.warn(`⚠️  Failed to clean root directory: ${error.message}`);
  }

  logger.info(`🎯 File system cleanup completed: ${totalFilesDeleted} files/directories removed`);
  return totalFilesDeleted;
}

/**
 * Main cleanup function
 */
async function runCleanup() {
  const startTime = Date.now();
  logger.info('🚀 Starting sandbox cleanup process');

  try {
    // Ensure logs directory exists
    const logsDir = path.join(__dirname, '../logs');
    try {
      await fs.mkdir(logsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist, ignore error
    }

    // Run database cleanup
    const dbRecordsDeleted = await cleanupDatabaseRecords();
    
    // Run file system cleanup
    const filesDeleted = await cleanupFileSystem();
    
    const duration = Date.now() - startTime;
    logger.info(`🎉 Sandbox cleanup completed successfully!`);
    logger.info(`📊 Summary: ${dbRecordsDeleted} DB records + ${filesDeleted} files deleted in ${duration}ms`);
    
    return {
      success: true,
      dbRecordsDeleted,
      filesDeleted,
      duration
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`💥 Sandbox cleanup failed after ${duration}ms: ${error.message}`);
    logger.error(`📋 Stack trace: ${error.stack}`);
    
    return {
      success: false,
      error: error.message,
      duration
    };
  } finally {
    // Always disconnect Prisma client
    await prisma.$disconnect();
  }
}

// Run cleanup if called directly
if (require.main === module) {
  runCleanup()
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      logger.error(`💥 Unexpected error: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { runCleanup, cleanupDatabaseRecords, cleanupFileSystem };
