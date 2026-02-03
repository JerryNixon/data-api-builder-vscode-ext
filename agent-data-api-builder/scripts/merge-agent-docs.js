const fs = require('fs');
const path = require('path');

// Source and destination paths
const sourceDir = path.join(__dirname, '..', '..', '.github', 'agents', 'dab-developer');
const mainAgentFile = path.join(__dirname, '..', '..', '.github', 'agents', 'dab-developer.base.md');
const outputDir = path.join(__dirname, '..', 'resources', 'agents');
const outputFile = path.join(outputDir, 'dab-developer.agent.md');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Dynamically read all .md files from the source directory
let filesToMerge = [];
if (fs.existsSync(sourceDir)) {
    filesToMerge = fs.readdirSync(sourceDir)
        .filter(file => file.endsWith('.md'))
        .sort(); // Sort alphabetically
}

console.log(`Found ${filesToMerge.length} markdown files in ${sourceDir}`);

console.log(`Found ${filesToMerge.length} markdown files in ${sourceDir}`);
console.log('Merging agent documentation files...');

// Read the main agent file as the base
let mainContent = fs.readFileSync(mainAgentFile, 'utf8');

// Remove the INCLUDE statements we added earlier
mainContent = mainContent.replace(/---\n\n## Included Documentation[\s\S]*$/m, '');

// Start building the merged content
let mergedContent = mainContent;

// Add separator and start appending files
mergedContent += '\n\n---\n\n# APPENDIX: Extended Documentation\n\n';
mergedContent += '*The following sections provide detailed reference documentation for Data API Builder commands and configuration.*\n\n';

// Append each file
filesToMerge.forEach((filename, index) => {
    const filePath = path.join(sourceDir, filename);
    
    console.log(`  Adding ${filename}...`);
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Add a clear separator between sections
    mergedContent += `\n\n---\n\n`;
    mergedContent += `# SECTION ${index + 1}: ${filename.replace('.md', '').replace(/-/g, ' ').toUpperCase()}\n\n`;
    mergedContent += content;
});

// Write the merged file
fs.writeFileSync(outputFile, mergedContent, 'utf8');

console.log(`\n✓ Successfully merged ${filesToMerge.length + 1} files into ${outputFile}`);
console.log(`  Total size: ${Math.round(mergedContent.length / 1024)}KB`);
