const fs = require('fs');
const path = require('path');

// Paths
const sourceAgentFile = path.join(__dirname, '..', 'resources', 'agents', 'dab-developer.agent.md');
const refDocsDir = path.join(__dirname, '..', 'resources', 'agents', 'dab-developer');
const outputDir = path.join(__dirname, '..', 'out', 'agents');
const outputFile = path.join(outputDir, 'dab-developer.agent.md');

// Ensure output directory exists
fs.mkdirSync(outputDir, { recursive: true });

// Validate source agent file exists
if (!fs.existsSync(sourceAgentFile)) {
    console.error(`Error: Agent file not found: ${sourceAgentFile}`);
    process.exit(1);
}

// Helper to remove a UTF-8 BOM if it sneaks in
const stripBom = (text) => text.replace(/^\uFEFF/, '');

// Read main agent file
let mergedContent = stripBom(fs.readFileSync(sourceAgentFile, 'utf8'));
const mainLines = mergedContent.split('\n').length;

// Get reference docs (skip archive folder and non-md files)
const refDocs = [];
if (fs.existsSync(refDocsDir)) {
    const items = fs.readdirSync(refDocsDir);
    for (const item of items) {
        const itemPath = path.join(refDocsDir, item);
        const stat = fs.statSync(itemPath);
        
        // Skip directories (like 'archive' and 'scripts')
        if (stat.isDirectory()) continue;
        
        // Only include .md files
        if (!item.endsWith('.md')) continue;
        
        refDocs.push(item);
    }
    refDocs.sort();
}

// Append reference docs
if (refDocs.length > 0) {
    mergedContent += '\n\n---\n\n# APPENDIX: Reference Documentation\n\n';
    mergedContent += 'The following sections provide detailed reference information.\n\n';
    
    for (const filename of refDocs) {
        const filePath = path.join(refDocsDir, filename);
        const content = stripBom(fs.readFileSync(filePath, 'utf8'));
        const sectionName = filename.replace('.md', '').replace(/-/g, ' ').toUpperCase();
        
        mergedContent += `\n\n---\n\n## ${sectionName}\n\n${content}`;
        console.log(`  + ${filename}`);
    }
}

// Write merged file
fs.writeFileSync(outputFile, mergedContent, 'utf8');

// Stats
const finalLines = mergedContent.split('\n').length;
const sizeKB = Math.round(mergedContent.length / 1024);

console.log('');
console.log('DAB Agent Build Complete');
console.log('========================');
console.log(`Source: ${sourceAgentFile}`);
console.log(`  Main agent: ${mainLines} lines`);
console.log(`  Reference docs: ${refDocs.length} files`);
console.log(`Output: ${outputFile}`);
console.log(`  Total: ${finalLines} lines, ${sizeKB}KB`);

