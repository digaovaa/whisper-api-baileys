# Sandbox Cleanup Scripts

This directory contains scripts for automatically cleaning up the sandbox environment.

## Scripts

* `sandbox-cleanup.js`: The main cleanup script that removes old data.
* `sandbox-cleanup.service`: Systemd service file for running the cleanup.
* `sandbox-cleanup.timer`: Systemd timer file for scheduling the cleanup.
* `setup-sandbox-cleanup.sh`: Setup script to automate the installation of the cleanup service.

## Usage

To set up the automated cleanup, run the setup script:

```bash
./scripts/setup-sandbox-cleanup.sh
```

To run the cleanup manually:

```bash
./scripts/sandbox-cleanup.js
```

