// Wait for MongoDB to be ready
sleep(5000);

// Initialize replica set
rs.initiate({
  _id: "rs0",
  members: [
    {
      _id: 0,
      host: "mongo:27017"
    }
  ]
});

// Wait for replica set to be ready
sleep(10000);

print("Replica set initialized successfully!");
