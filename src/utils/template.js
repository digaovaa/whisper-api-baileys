const fs = require('fs');

const templateUtils = {
    parseTemplate: (body) => {
        try {
            let html = fs.readFileSync('./public/docs-template.html', 'utf8');
            html = html.replace(/{{body}}/g, body);
            return html;
        } catch (error) {
            throw new Error(`Failed to load template: ${error.message}`);
        }
    },
    getDocs: () => {
        try {
            return fs.readFileSync('./README.md', 'utf8');
        } catch (error) {
            throw new Error(`Failed to load README.md: ${error.message}`);
        }
    },
    getApiDocs: () => {
        try {
            return fs.readFileSync('./api-collections/README.md', 'utf8');
        } catch (error) {
            throw new Error(`Failed to load API docs: ${error.message}`);
        }
    }
}

module.exports = templateUtils;
