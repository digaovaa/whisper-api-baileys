const express = require('express');
const path = require('path');
const fs = require('fs');
const swaggerUi = require('swagger-ui-express');
const docsController = require('../controllers/docs.controller');
const openApiSpec = require('../../api-collections/openapi-processed.json');

const router = express.Router();

// Environment configuration
const SANDBOX_MODE = process.env.SANDBOX_MODE !== 'false';

// Documentation routes
router.get('/docs', docsController.index);
router.get('/docs-api', docsController.apiDocs);

// Load Swagger UI HTML template
const swaggerHtmlPath = path.join(__dirname, '../templates/swagger-ui.html');
let swaggerHtmlTemplate;
try {
  swaggerHtmlTemplate = fs.readFileSync(swaggerHtmlPath, 'utf8');
} catch (error) {
  console.error('Failed to load Swagger UI template:', error);
  swaggerHtmlTemplate = '<html><body><h1>Error: Swagger UI template not found</h1></body></html>';
}

/**
 * Generate HTML for /try-api route based on sandbox mode
 */
function generateTryApiHtml() {
  if (!SANDBOX_MODE) {
    // Remove sandbox warning banner and timer for production mode
    let html = swaggerHtmlTemplate;
    
    // Remove CSS for sandbox warning (including responsive styles)
    html = html.replace(/\/\* Persistent warning banner \*\/[\s\S]*?\/\* Container for Swagger UI \*\//s, 
                       '/* Container for Swagger UI */');
    
    // Remove any remaining sandbox-warning CSS references in responsive styles
    html = html.replace(/\s*\.sandbox-warning[^}]*\}[^}]*\}/g, '');
    
    // Remove warning banner HTML
    html = html.replace(/\s*<!-- Persistent warning banner -->[\s\S]*?<\/div>\s*<\/div>\s*/, '\n  ');
    
    // Only remove the update timer call but preserve onload
    html = html.replace(/\n\s+updateTimer\(\);/, '');
    
    // Fix the window.onload function to only initialize Swagger UI
    html = html.replace(/window\.onload = function\(\) \{[\s\S]*?\};/s, 
      `window.onload = function() {
        // Initialize Swagger UI
        const ui = SwaggerUIBundle({
          url: './try-api/swagger.json',
          dom_id: '#swagger-ui',
          deepLinking: true,
          presets: [
            SwaggerUIBundle.presets.apis,
            SwaggerUIStandalonePreset
          ],
          plugins: [
            SwaggerUIBundle.plugins.DownloadUrl
          ],
          layout: "StandaloneLayout",
          docExpansion: 'list',
          filter: true,
          showRequestHeaders: true,
          tryItOutEnabled: true,
          requestInterceptor: (req) => {
            req.headers['Content-Type'] = 'application/json';
            return req;
          }
        });
      };`);
    
    return html;
  }
  
  // Return template as-is for sandbox mode (includes warning)
  return swaggerHtmlTemplate;
}

// Custom route for try-api with conditional warning
router.get('/try-api', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(generateTryApiHtml());
});

// Handle trailing slash redirect
router.get('/try-api/', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(generateTryApiHtml());
});

// Serve swagger assets
router.get('/try-api/swagger.json', (req, res) => {
  res.json(openApiSpec);
});

// Serve swagger UI assets
router.use('/try-api', swaggerUi.serve);

module.exports = router;
