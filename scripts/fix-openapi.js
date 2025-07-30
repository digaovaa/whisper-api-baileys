const fs = require('fs');
const yaml = require('js-yaml');

// Path to the OpenAPI spec file
const openApiPath = 'api-collections/openapi.json'; // Actually YAML despite the extension
const jsonOutputPath = 'api-collections/openapi-processed.json';

// Read the file
try {
  // Read the file as text and parse it (it's actually YAML)
  const content = fs.readFileSync(openApiPath, 'utf8');
  const spec = yaml.load(content);

  // Fix the servers array
  spec.servers = [
    {
      url: 'http://localhost:3000',
      description: 'Development server'
    },
    {
      url: 'https://your-domain.com',
      description: 'Production server'
    }
  ];

  // Add response schemas for better documentation
  for (const path in spec.paths) {
    for (const method in spec.paths[path]) {
      const operation = spec.paths[path][method];
      
      if (operation.responses && operation.responses['200']) {
        // Add a standard success response schema if not defined
        if (!operation.responses['200'].content?.['application/json']?.schema) {
          operation.responses['200'].content = {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                    description: 'Indicates if the request was successful',
                    example: true
                  },
                  message: {
                    type: 'string',
                    description: 'Human-readable message about the result',
                    example: 'Operation completed successfully'
                  },
                  data: {
                    type: 'object',
                    description: 'Response data object'
                  }
                }
              }
            }
          };
        }
      }
    }
  }

  // Write the updated spec back to a JSON file
  fs.writeFileSync(jsonOutputPath, JSON.stringify(spec, null, 2));
  console.log(`✅ Successfully converted YAML to JSON and enhanced the OpenAPI spec at: ${jsonOutputPath}`);
} catch (error) {
  console.error('❌ Error processing OpenAPI spec:', error);
}
