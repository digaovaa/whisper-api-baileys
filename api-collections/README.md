
# WhatsApp API Collections

This directory contains organized HTTP collections for testing the WhatsApp API across different operational modes.

## 📁 Folder Structure

```
api-collections/
├── global/
│   └── global-endpoints.http       # Mode information and global endpoints
├── single-instance/
│   └── legacy-endpoints.http       # Legacy single-instance endpoints
├── multi-instance/
│   └── multi-endpoints.http        # Multi-instance management endpoints
├── postman_collection.json         # Postman collection for GUI testing
├── http-client.env.json            # Environment variables for HTTP clients
├── integration-tests.http          # Complete workflow testing
└── README.md                       # This file
```

## 🎯 Operational Modes

The API supports three operational modes configured via the `WHATSAPP_MODE` environment variable:

### 1. Single Instance Mode (`WHATSAPP_MODE=single`)
- **Endpoints Available**: Global + Single Instance (Legacy)
- **Use Case**: Simple single WhatsApp instance operation
- **Test Files**: `global/` + `single-instance/`

### 2. Multi-Instance Mode (`WHATSAPP_MODE=multi`) - Default
- **Endpoints Available**: Global + Multi-Instance
- **Use Case**: Managing multiple WhatsApp instances
- **Test Files**: `global/` + `multi-instance/`

### 3. Hybrid Mode (`WHATSAPP_MODE=both`)
- **Endpoints Available**: All endpoints
- **Use Case**: Full flexibility with both legacy and multi-instance support
- **Test Files**: All collections

## 🚀 Quick Start

### 1. Check Current Mode
Start by checking which mode is currently active:
```http
GET http://localhost:3000/api/v1/mode
```

### 2. Test Based on Mode

**For Single Instance Mode:**
1. Use `global/global-endpoints.http`
2. Use `single-instance/legacy-endpoints.http`

**For Multi-Instance Mode:**
1. Use `global/global-endpoints.http`
2. Use `multi-instance/multi-endpoints.http`

**For Hybrid Mode:**
1. Use all collections
2. Run `integration-tests.http` for complete workflow testing

## 📝 Using the Collections

### Visual Studio Code / IntelliJ IDEA
1. Install the REST Client extension
2. Open any `.http` file
3. Click "Send Request" above each HTTP request
4. Variables from `http-client.env.json` will be automatically loaded

### Postman
1. Import the `postman_collection.json` file into Postman
2. The collection includes:
   - 🌐 Global Endpoints (available in all modes)
   - 🔀 Single Instance (Legacy) endpoints
   - 🏢 Multi-Instance Management endpoints
3. Set up the environment variables (`base_url`, `phone_number`, etc.)
4. The collection automatically organizes requests by operational mode

### Thunder Client
1. Import the requests manually or use the Postman collection
2. Set up environment variables as needed

## 🔧 Environment Variables

The `http-client.env.json` file contains environment-specific variables:

```json
{
  "development": {
    "base_url": "http://localhost:3000",
    "phone_number": "628123456789",
    "test_phone": "628111222333",
    "test_group_id": "120363042123456789@g.us"
  }
}
```

### Available Variables:
- `{{base_url}}` - API base URL
- `{{phone_number}}` - Primary instance phone number
- `{{test_phone}}` - Test recipient phone number
- `{{test_group_id}}` - Test WhatsApp group ID
- `{{webhook_id}}` - Webhook ID for webhook management endpoints

## 📋 Testing Workflows

### Basic Testing Flow:
1. **Check Mode**: Run global endpoint to verify current mode
2. **Health Check**: Test ping/status endpoints
3. **Core Functionality**: Test messaging endpoints
4. **Error Handling**: Test invalid requests
5. **Cleanup**: Remove test data

### Integration Testing:
Run the `integration-tests.http` file which includes:
- Mode verification
- Complete single-instance workflow
- Complete multi-instance workflow
- Error handling tests
- Cleanup procedures

## 🛠️ Customization

### Adding New Tests:
1. Choose the appropriate folder based on the endpoint's mode availability
2. Follow the existing format and naming conventions
3. Add proper comments and error test cases
4. Update environment variables if needed

### Switching Modes:
1. Update `WHATSAPP_MODE` in your `.env` file
2. Restart the application
3. Verify the mode change using the global endpoint
4. Use the appropriate collection files for testing

## 🎨 Collection Features

- **Clear Organization**: Endpoints grouped by functionality and mode
- **Comprehensive Coverage**: All endpoints with examples and error cases
- **Environment Support**: Variables for easy configuration
- **Integration Testing**: Complete workflow validation
- **Error Testing**: Comprehensive error scenario coverage

## 📚 Additional Resources

- Postman Collection: `./postman_collection.json`
- Application Configuration: `../.env`
- Mode Configuration: `../src/config/mode.config.js`
