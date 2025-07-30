const postmanToOpenApi = require('postman-to-openapi');

async function convertPostmanToOpenApi() {
  try {
    const outputFile = 'api-collections/openapi.json';
    
    await postmanToOpenApi('api-collections/postman_collection.json', outputFile, {
      defaultTag: 'General'
    });
    
    console.log('✅ OpenAPI spec generated successfully at:', outputFile);
  } catch (error) {
    console.error('❌ Error converting Postman collection:', error);
  }
}

convertPostmanToOpenApi();
