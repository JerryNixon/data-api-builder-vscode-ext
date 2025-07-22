import * as vscode from 'vscode';

export interface MermaidInput {
    generatedPOCOs: string[];
    generatedRepositories: string[];
    generatedConsoleApp: boolean;
    entities: Record<string, any>;
}

export async function generateDiagram(input: MermaidInput, outputPath: string): Promise<void> {
    const mermaidText = buildMermaidDiagram(input);
    await vscode.workspace.fs.writeFile(vscode.Uri.file(outputPath), Buffer.from(mermaidText, 'utf8'));
    await openMarkdownPreview(outputPath);
}

function buildMermaidDiagram(input: MermaidInput): string {
    const { generatedPOCOs, generatedRepositories, generatedConsoleApp, entities } = input;

    const lines: string[] = [];
    lines.push('```mermaid');
    lines.push('graph LR');

    lines.push('  subgraph Library.Models');
    addPocoNodes(lines, generatedPOCOs, entities);
    lines.push('  end');

    lines.push('  subgraph Library.Repositories');
    addRepositoryNodes(lines, generatedRepositories);
    lines.push('  end');

    if (generatedConsoleApp) {
        lines.push('  subgraph Client');
        lines.push('    ConsoleApp["Program.cs"]');
        lines.push('  end');
    }

    addPocoToRepositoryLinks(lines, generatedPOCOs, generatedRepositories);
    addConsoleAppNode(lines, generatedConsoleApp, generatedRepositories);
    addEntityRelationships(lines, entities);

    lines.push('```');
    return lines.join('\n');
}

function addPocoNodes(lines: string[], pocos: string[], entities: Record<string, any>): void {
    for (const poco of pocos) {
        console.log('Entity properties for', poco, entities[poco]?.properties, entities[poco]?.columns, entities[poco]?.fields);

        const entity = entities[poco];
        let propsText = '';
        const propsObj = entity?.properties ?? entity?.columns ?? entity?.fields ?? {};
        if (propsObj && Object.keys(propsObj).length > 0) {
            const props = Object.entries(propsObj)
                .map(([prop, def]) => {
                    const type = (def && typeof def === 'object' && 'type' in def)
                        ? (def as any).type
                        : typeof def === 'string'
                        ? def
                        : 'unknown';
                    return `${prop}: ${type}`;
                })
                .join('\\n');
            propsText = `\\n${props}`;
        }
        lines.push(`    POCO_${sanitize(poco)}["${poco}${propsText}"]`);
    }
}

function addRepositoryNodes(lines: string[], repos: string[]): void {
    for (const repo of repos) {
        lines.push(`    Repo_${sanitize(repo)}["${repo}Repository"]`);
    }
}

function addPocoToRepositoryLinks(lines: string[], pocos: string[], repos: string[]): void {
    for (const poco of pocos) {
        if (repos.includes(poco)) {
            lines.push(`  POCO_${sanitize(poco)} --> Repo_${sanitize(poco)}`);
        }
    }
}

function addConsoleAppNode(lines: string[], hasConsoleApp: boolean, repos: string[]): void {
    if (!hasConsoleApp) { return; }
    for (const repo of repos) {
        lines.push(`  Repo_${sanitize(repo)} --> ConsoleApp`);
    }
}

function addEntityRelationships(lines: string[], entities: Record<string, any>): void {
    for (const [name, entity] of Object.entries(entities)) {
        if (!entity.relationships) { continue; }
        for (const rel of entity.relationships) {
            if (entities[rel.targetEntity]) {
                lines.push(`  POCO_${sanitize(name)} -->|${rel.type}| POCO_${sanitize(rel.targetEntity)}`);
            }
        }
    }
}

async function openMarkdownPreview(filePath: string): Promise<void> {
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
    await vscode.commands.executeCommand('markdown.showPreviewToSide', doc.uri);
}

function sanitize(name: string): string {
    return name.replace(/\W/g, '_');
}
