#!/bin/bash

# Setup script for Whisper API Sandbox Cleanup
# This script configures automated cleanup for the demo environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}🚀 Whisper API Sandbox Cleanup Setup${NC}"
echo "===================================="

# Function to print status messages
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running as root for systemd setup
if [[ $EUID -eq 0 ]]; then
    print_warning "Running as root - will setup systemd services"
    SETUP_SYSTEMD=true
else
    print_warning "Not running as root - will setup cron job only"
    SETUP_SYSTEMD=false
fi

# Check Node.js installation
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if project dependencies are installed
if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
    print_warning "Node modules not found. Installing dependencies..."
    cd "$PROJECT_ROOT"
    npm install
fi

# Make cleanup script executable
chmod +x "$SCRIPT_DIR/sandbox-cleanup.js"
print_status "Made cleanup script executable"

# Create logs directory
mkdir -p "$PROJECT_ROOT/logs"
print_status "Created logs directory"

# Test the cleanup script
echo -e "${BLUE}🧪 Testing cleanup script...${NC}"
cd "$PROJECT_ROOT"
if node scripts/sandbox-cleanup.js; then
    print_status "Cleanup script test successful"
else
    print_error "Cleanup script test failed"
    exit 1
fi

if [ "$SETUP_SYSTEMD" = true ]; then
    # Setup systemd service and timer
    echo -e "${BLUE}⚡ Setting up systemd service and timer...${NC}"
    
    # Update service file with correct paths
    sed "s|/path/to/whisper-api|$PROJECT_ROOT|g" "$SCRIPT_DIR/sandbox-cleanup.service" > /tmp/sandbox-cleanup.service
    
    # Install service and timer files
    cp /tmp/sandbox-cleanup.service /etc/systemd/system/
    cp "$SCRIPT_DIR/sandbox-cleanup.timer" /etc/systemd/system/
    
    # Reload systemd and enable timer
    systemctl daemon-reload
    systemctl enable sandbox-cleanup.timer
    systemctl start sandbox-cleanup.timer
    
    print_status "Systemd timer enabled - cleanup will run every 10 minutes"
    
    # Show timer status
    echo -e "${BLUE}📊 Timer Status:${NC}"
    systemctl status sandbox-cleanup.timer --no-pager
    
else
    # Setup cron job
    echo -e "${BLUE}⏰ Setting up cron job...${NC}"
    
    # Create cron job entry
    CRON_JOB="*/10 * * * * /usr/bin/node $PROJECT_ROOT/scripts/sandbox-cleanup.js >> $PROJECT_ROOT/logs/cron-cleanup.log 2>&1"
    
    # Add to current user's crontab
    (crontab -l 2>/dev/null || true; echo "$CRON_JOB") | crontab -
    
    print_status "Cron job added - cleanup will run every 10 minutes"
    
    # Show current crontab
    echo -e "${BLUE}📊 Current Crontab:${NC}"
    crontab -l | grep sandbox-cleanup || echo "No sandbox cleanup jobs found"
fi

# Create a manual cleanup alias/script
cat > "$PROJECT_ROOT/cleanup-now.sh" << EOF
#!/bin/bash
# Manual cleanup script for immediate execution
cd "$PROJECT_ROOT"
node scripts/sandbox-cleanup.js
EOF

chmod +x "$PROJECT_ROOT/cleanup-now.sh"
print_status "Created manual cleanup script: ./cleanup-now.sh"

# Display summary
echo ""
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo "==================="
echo ""
echo -e "${BLUE}📋 Summary:${NC}"
echo "• Cleanup script: $SCRIPT_DIR/sandbox-cleanup.js"
echo "• Logs directory: $PROJECT_ROOT/logs/"
echo "• Manual cleanup: $PROJECT_ROOT/cleanup-now.sh"

if [ "$SETUP_SYSTEMD" = true ]; then
    echo "• Systemd timer: sandbox-cleanup.timer (every 10 minutes)"
    echo ""
    echo -e "${BLUE}🔧 Management Commands:${NC}"
    echo "• Check timer status: systemctl status sandbox-cleanup.timer"
    echo "• View logs: journalctl -u sandbox-cleanup.service"
    echo "• Stop timer: systemctl stop sandbox-cleanup.timer"
    echo "• Start timer: systemctl start sandbox-cleanup.timer"
else
    echo "• Cron job: runs every 10 minutes"
    echo ""
    echo -e "${BLUE}🔧 Management Commands:${NC}"
    echo "• View cron jobs: crontab -l"
    echo "• Edit cron jobs: crontab -e"
    echo "• View cron logs: tail -f $PROJECT_ROOT/logs/cron-cleanup.log"
fi

echo ""
echo -e "${BLUE}⏱️  Next cleanup will run within 10 minutes${NC}"
echo -e "${YELLOW}🧪 Test manual cleanup: ./cleanup-now.sh${NC}"

print_status "Sandbox cleanup automation is now active!"
