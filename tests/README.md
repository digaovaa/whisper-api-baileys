# Database Testing Setup

## MongoDB Replica Set Setup

Prisma with MongoDB requires a replica set for transactions and most write operations. Here's how to set it up:

### 1. Stop MongoDB
```bash
sudo systemctl stop mongod
```

### 2. Create MongoDB configuration for replica set
Create `/etc/mongod-replica.conf`:
```yaml
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true

systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log

net:
  port: 27017
  bindIp: 127.0.0.1

processManagement:
  fork: true

replication:
  replSetName: "rs0"
```

### 3. Start MongoDB with replica set config
```bash
sudo mongod --config /etc/mongod-replica.conf
```

### 4. Initialize the replica set
```bash
mongosh --eval "rs.initiate()"
```

### 5. Verify replica set status
```bash
mongosh --eval "rs.status()"
```

## Alternative: Simple MongoDB Setup (Development Only)

For development/testing without full replica set features:

### Use MongoDB directly (without Prisma services)
```javascript
const { MongoClient } = require('mongodb');

const client = new MongoClient('mongodb://localhost:27017');
// Use MongoDB driver directly for simple operations
```

## Running Tests

### Basic connectivity test:
```bash
npx yarn jest tests/database-simple.test.js
```

### Full database tests (requires replica set):
```bash
npx yarn jest tests/database.test.js
```

## Environment Variables

Make sure your `.env` file has:
```
DATABASE_URL="mongodb://localhost:27017/whisper-api"
```

For replica set:
```
DATABASE_URL="mongodb://localhost:27017/whisper-api?replicaSet=rs0"
```
