const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '..', '..', '.github', 'agents', 'dab-developer');
const mainAgentFile = path.join(__dirname, '..', '..', '.github', 'agents', 'dab-developer.agent.md');
const outputDir = path.join(__dirname, '..', 'resources', 'agents');
const outputFile = path.join(outputDir, 'dab-developer.agent.md');

fs.mkdirSync(outputDir, { recursive: true });

const filesToMerge = fs.readdirSync(sourceDir)
    .filter(file => file.endsWith('.md'))
    .sort();

console.log(`Merging ${filesToMerge.length} files...`);

let mainContent = fs.readFileSync(mainAgentFile, 'utf8');
mainContent = mainContent.replace(/---\n\n## Included Documentation[\s\S]*$/m, '');

let mergedContent = mainContent;
mergedContent += '\n\n---\n\n# APPENDIX: Extended Documentation\n\n';

filesToMerge.forEach((filename, index) => {
    console.log(`  ${filename}`);
    const content = fs.readFileSync(path.join(sourceDir, filename), 'utf8');
    mergedContent += `\n\n---\n\n# SECTION ${index + 1}: ${filename.replace('.md', '').replace(/-/g, ' ').toUpperCase()}\n\n${content}`;
});

fs.writeFileSync(outputFile, mergedContent, 'utf8');
console.log(`\n✓ Created ${outputFile} (${Math.round(mergedContent.length / 1024)}KB)`);
