const marked = require('marked');
const logger = require('../utils/logger');
const template = require('../utils/template');
const hljs = require('highlight.js');

// Configure marked with enhanced options
marked.setOptions({
    highlight: function(code, lang) {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext';
        return hljs.highlight(code, { language }).value;
    },
    langPrefix: 'hljs language-',
    breaks: false,
    gfm: true
});

// Function to generate slug from text
function generateSlug(text) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

// Function to post-process HTML with minimal adjustments - let CSS handle styling
function enhanceMarkdownHTML(html) {
    // Add IDs to headings for navigation
    html = html.replace(/<(h[1-6])>([^<]+)<\/h[1-6]>/g, (match, tag, text) => {
        const slug = generateSlug(text);
        return `<${tag} id="${slug}">${text}</${tag}>`;
    });
    // Fix Installation section - reconstruct ordered list with nested code blocks
    html = html.replace(/<h2>Installation<\/h2>([\s\S]*?)(?=<h2>|$)/g, (match) => {
        let content = match;
        
        // Remove all OL tags to clean the structure
        content = content.replace(/<ol[^>]*>/g, '');
        content = content.replace(/<\/ol>/g, '');
        
        // Match list items and their following code blocks
        const stepPattern = /<li>(.*?)<\/li>\s*(<pre[\s\S]*?<\/pre>)?/g;
        let stepMatch;
        const steps = [];
        
        while ((stepMatch = stepPattern.exec(content)) !== null) {
            const stepText = stepMatch[1];
            const codeBlock = stepMatch[2] || '';
            steps.push(`<li>${stepText}${codeBlock}</li>`);
        }
        
        if (steps.length > 0) {
            return `<h2>Installation</h2>\n<ol>\n${steps.join('\n')}\n</ol>`;
        }
        return match;
    });
    
    // Handle code blocks with copy functionality (AFTER Installation section fix)
    html = html.replace(/<pre><code class="language-([^"]*)">([\s\S]*?)<\/code><\/pre>/g, (match, lang, codeText) => {
        const language = lang || 'text';
        const codeId = Math.random().toString(36).substr(2, 9);
        return `<div class="code-container">
            <div class="code-header">
                <span class="code-language">${language}</span>
                <button class="copy-btn"><i class="fas fa-copy"></i> Copy</button>
            </div>
            <pre class="code-block"><code id="${codeId}" class="language-${language}">${codeText}</code></pre>
        </div>`;
    });
    
    // Wrap tables for responsive design
    html = html.replace(/<table>/g, '<div class="table-container"><table>');
    html = html.replace(/<\/table>/g, '</table></div>');
    
    return html;
}

const docsController = {
    // Main documentation (README.md)
    index: async (req, res) => {
        try {
            // Get docs content 
            let docs = template.getDocs();
            docs = marked.parse(docs);
            // Enhance the HTML with minimal processing
            docs = enhanceMarkdownHTML(docs);
            let html = template.parseTemplate(docs);
            res.send(html);
        } catch (error) {
            logger.error(`❌ Error getting docs:`, error);

            res.status(500).json({
                success: false,
                error: 'Failed to retrieve docs',
                message: error.message
            });
        }
    },

    // API Collections documentation (api-collections/README.md)
    apiDocs: async (req, res) => {
        try {
            // Get API collections docs content
            let docs = template.getApiDocs();
            docs = marked.parse(docs);
            // Enhance the HTML with minimal processing
            docs = enhanceMarkdownHTML(docs);
            let html = template.parseTemplate(docs);
            res.send(html);
        } catch (error) {
            logger.error(`❌ Error getting API docs:`, error);

            res.status(500).json({
                success: false,
                error: 'Failed to retrieve API docs',
                message: error.message
            });
        }
    }
}

module.exports = docsController;
