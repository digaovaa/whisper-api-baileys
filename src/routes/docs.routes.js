const express = require('express');
const path = require('path');
const fs = require('fs');
const swaggerUi = require('swagger-ui-express');
const docsController = require('../controllers/docs.controller');
const openApiSpec = require('../../api-collections/openapi-processed.json');

const router = express.Router();

// Documentation routes
router.get('/docs', docsController.index);
router.get('/docs-api', docsController.apiDocs);

// Load Swagger UI HTML template
const swaggerHtmlPath = path.join(__dirname, '../templates/swagger-ui.html');
let swaggerHtml;
try {
  swaggerHtml = fs.readFileSync(swaggerHtmlPath, 'utf8');
} catch (error) {
  console.error('Failed to load Swagger UI template:', error);
  swaggerHtml = '<html><body><h1>Error: Swagger UI template not found</h1></body></html>';
}

// Custom route for try-api with warning
router.get('/try-api', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(swaggerHtml);
});

// Handle trailing slash redirect
router.get('/try-api/', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(swaggerHtml);
});

// Serve swagger assets
router.get('/try-api/swagger.json', (req, res) => {
  res.json(openApiSpec);
});

// Serve swagger UI assets
router.use('/try-api', swaggerUi.serve);

module.exports = router;
