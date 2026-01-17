import * as vscode from 'vscode';
import * as fs from 'fs';
import { EntityInfo } from './generators';

export interface MermaidInput {
  entities: EntityInfo[];
  tableViewEntities: string[];
  procEntities: string[];
  relationships: Map<string, { target: string; cardinality: string }[]>;
  configFileName?: string;
}

export function generateMermaidDiagram(input: MermaidInput): string {
  const { entities, tableViewEntities, procEntities, relationships, configFileName } = input;

  const lines: string[] = [];

  // Header
  lines.push(`# Data API Builder - Generated Solution`);
  lines.push('');
  if (configFileName) {
    lines.push(`> Generated from \`${configFileName}\``);
    lines.push('');
  }

  // Getting Started section
  lines.push('## Getting Started');
  lines.push('');
  lines.push('### Run the Console Client');
  lines.push('');
  lines.push('1. Start Data API Builder:');
  lines.push('   ```bash');
  lines.push('   dab start');
  lines.push('   ```');
  lines.push('');
  lines.push('2. Run the client (in a separate terminal):');
  lines.push('   ```bash');
  lines.push('   dotnet run --project Gen/Client');
  lines.push('   ```');
  lines.push('');
  lines.push('### Run the Web Explorer');
  lines.push('');
  lines.push('The Web Explorer provides a browser-based UI to explore your DAB entities.');
  lines.push('');
  lines.push('1. **Enable CORS in DAB** - Add to your DAB config under `runtime.host`:');
  lines.push('   ```json');
  lines.push('   "cors": {');
  lines.push('     "origins": ["http://localhost:5001"],');
  lines.push('     "allow-credentials": false');
  lines.push('   }');
  lines.push('   ```');
  lines.push('');
  lines.push('2. Start DAB and the Web Explorer:');
  lines.push('   ```bash');
  lines.push('   dab start                           # Terminal 1');
  lines.push('   dotnet run --project Gen/Web        # Terminal 2');
  lines.push('   ```');
  lines.push('');
  lines.push('3. Open http://localhost:5001 in your browser.');
  lines.push('');
  lines.push('> **Tip:** Press **F5** in VS Code and select "Launch Web Explorer" to debug.');
  lines.push('');
  lines.push('### Quick Start');
  lines.push('');
  lines.push('```csharp');
  lines.push('using Models;');
  lines.push('using Repositories;');
  lines.push('');
  lines.push('// Initialize the REST client');
  lines.push('RestRepository.BaseUrl = "http://localhost:5000/api";');
  lines.push('');
  lines.push('// Verify DAB is running');
  lines.push('if (!await RestRepository.IsAvailableAsync())');
  lines.push('{');
  lines.push('    Console.WriteLine("DAB is not available. Run: dab start");');
  lines.push('    return;');
  lines.push('}');
  lines.push('```');
  lines.push('');

  // Add sample code for first table/view entity
  const firstTableView = entities.find(e => e.entityType === 'table' || e.entityType === 'view');
  if (firstTableView) {
    const entityName = firstTableView.name;
    const keyProps = firstTableView.columns.filter(c => c.isKey);
    const nonKeyProps = firstTableView.columns.filter(c => !c.isKey);
    
    lines.push(`### Example: Working with ${entityName}`);
    lines.push('');
    lines.push('```csharp');
    
    // Read all
    lines.push(`// Read all ${entityName} records`);
    lines.push(`var all${entityName}s = await RestRepository.${entityName}.ReadAsync();`);
    lines.push(`Console.WriteLine($"Found {all${entityName}s.Length} ${entityName.toLowerCase()}(s)");`);
    lines.push('');
    
    // Read by key
    if (keyProps.length > 0) {
      const keyParams = keyProps.map(k => `${k.name.charAt(0).toLowerCase()}${k.name.slice(1)}`).join(', ');
      const keyParamsWithValues = keyProps.map(k => getDefaultValue(k.type)).join(', ');
      lines.push(`// Read by key`);
      lines.push(`var single = await RestRepository.${entityName}.ReadByKeyAsync(${keyParamsWithValues});`);
      lines.push('');
    }
    
    // Create
    lines.push(`// Create a new ${entityName}`);
    lines.push(`var new${entityName} = new ${entityName}(`);
    const allProps = firstTableView.columns;
    for (let i = 0; i < allProps.length; i++) {
      const prop = allProps[i];
      const comma = i < allProps.length - 1 ? ',' : '';
      const comment = prop.isKey ? ' // Key' : '';
      lines.push(`    ${prop.name}: ${getDefaultValue(prop.type)}${comma}${comment}`);
    }
    lines.push(');');
    lines.push(`var created = await RestRepository.${entityName}.CreateAsync(new${entityName});`);
    lines.push('');
    
    // Update
    lines.push(`// Update an existing ${entityName}`);
    lines.push(`var updated = await RestRepository.${entityName}.UpdateAsync(created);`);
    lines.push('');
    
    // Delete
    lines.push(`// Delete by key`);
    if (keyProps.length > 0) {
      const keyArgs = keyProps.map(k => `created.${k.name}`).join(', ');
      lines.push(`await RestRepository.${entityName}.DeleteAsync(${keyArgs});`);
    } else {
      lines.push(`await RestRepository.${entityName}.DeleteAsync(/* keys */);`);
    }
    
    lines.push('```');
    lines.push('');
  }

  // Add sample code for first stored procedure
  const firstProc = entities.find(e => e.entityType === 'stored-procedure');
  if (firstProc) {
    const procName = firstProc.name;
    
    lines.push(`### Example: Calling ${procName}`);
    lines.push('');
    lines.push('```csharp');
    lines.push(`// Execute stored procedure`);
    
    if (firstProc.columns.length > 0) {
      // Has parameters - show with named parameters
      const paramList = firstProc.columns
        .map(c => `${c.name.charAt(0).toLowerCase()}${c.name.slice(1)}: ${getDefaultValue(c.type)}`)
        .join(', ');
      lines.push(`var results = await RestRepository.${procName}.ExecuteAsync(${paramList});`);
    } else {
      lines.push(`var results = await RestRepository.${procName}.ExecuteAsync();`);
    }
    
    lines.push(`foreach (var item in results)`);
    lines.push(`{`);
    lines.push(`    Console.WriteLine(item);`);
    lines.push(`}`);
    lines.push('```');
    lines.push('');
  }

  // Summary
  const tableCount = entities.filter(e => e.entityType === 'table').length;
  const viewCount = entities.filter(e => e.entityType === 'view').length;
  const procCount = entities.filter(e => e.entityType === 'stored-procedure').length;
  lines.push(`## Summary`);
  lines.push('');
  lines.push(`| Type | Count |`);
  lines.push(`|------|-------|`);
  lines.push(`| 📋 Tables | ${tableCount} |`);
  lines.push(`| 👁️ Views | ${viewCount} |`);
  lines.push(`| ⚙️ Stored Procedures | ${procCount} |`);
  lines.push(`| **Total Entities** | **${entities.length}** |`);
  lines.push('');

  // Architecture Diagram - simplified high-level view
  lines.push('## Architecture');
  lines.push('');
  lines.push('```mermaid');
  lines.push('flowchart LR');
  lines.push('');

  // Simple 4-layer architecture
  lines.push('  subgraph Client["💻 Client"]');
  lines.push('    Program["Program.cs"]');
  lines.push('  end');
  lines.push('');
  lines.push('  subgraph Generated["📦 Generated Code"]');
  lines.push('    RestRepo["RestRepository"]');
  lines.push(`    Repos["${entities.length} Entity Repositories"]`);
  lines.push(`    Models["${entities.length} Models"]`);
  lines.push('  end');
  lines.push('');
  lines.push('  subgraph DAB["🌐 Data API Builder"]');
  lines.push('    API["REST API"]');
  lines.push('  end');
  lines.push('');
  lines.push('  subgraph DB["🗄️ Database"]');
  if (tableCount > 0) {
    lines.push(`    Tables["${tableCount} Tables"]`);
  }
  if (viewCount > 0) {
    lines.push(`    Views["${viewCount} Views"]`);
  }
  if (procCount > 0) {
    lines.push(`    Procs["${procCount} Procedures"]`);
  }
  lines.push('  end');
  lines.push('');

  // Simple left-to-right flow
  lines.push('  Program --> RestRepo');
  lines.push('  RestRepo --> Repos');
  lines.push('  Repos --> Models');
  lines.push('  RestRepo -->|HTTP| API');
  if (tableCount > 0) {
    lines.push('  API --> Tables');
  }
  if (viewCount > 0) {
    lines.push('  API --> Views');
  }
  if (procCount > 0) {
    lines.push('  API --> Procs');
  }
  lines.push('');

  lines.push('```');
  lines.push('');

  // Entity Relationship Diagram (if relationships exist)
  if (relationships.size > 0) {
    lines.push('## Entity Relationships');
    lines.push('');
    lines.push('```mermaid');
    lines.push('erDiagram');

    // Define entities with their columns
    for (const entity of entities.filter(e => e.entityType !== 'stored-procedure')) {
      lines.push(`  ${sanitize(entity.name)} {`);
      for (const col of entity.columns) {
        const pkMarker = col.isKey ? 'PK' : '';
        // Simplify type for ER diagram
        const simpleType = col.type.replace('?', '').toLowerCase();
        lines.push(`    ${simpleType} ${col.name} ${pkMarker}`);
      }
      lines.push(`  }`);
    }

    // Relationships
    for (const [source, rels] of relationships) {
      for (const rel of rels) {
        const arrow = rel.cardinality === 'many' ? '}o--||' : '||--||';
        lines.push(`  ${sanitize(source)} ${arrow} ${sanitize(rel.target)} : "${rel.cardinality}"`);
      }
    }

    lines.push('```');
    lines.push('');
  }

  // Class Diagram
  lines.push('## Class Details');
  lines.push('');
  lines.push('```mermaid');
  lines.push('classDiagram');
  lines.push('');

  // Direction
  lines.push('  direction LR');
  lines.push('');

  // Model classes with full details
  for (const entity of entities) {
    const stereotype = entity.entityType === 'table' ? '«Table»' :
      entity.entityType === 'view' ? '«View»' : '«Procedure»';
    lines.push(`  class ${sanitize(entity.name)} {`);
    lines.push(`    ${stereotype}`);
    for (const col of entity.columns) {
      const keyMarker = col.isKey ? '🔑' : '';
      const visibility = '+';
      lines.push(`    ${visibility}${col.type} ${col.name} ${keyMarker}`);
    }
    // Methods
    if (entity.entityType !== 'stored-procedure') {
      const hasNonKeyProps = entity.columns.some(c => !c.isKey);
      if (hasNonKeyProps) {
        lines.push(`    +WithoutKeys() object`);
      }
    }
    lines.push(`  }`);
    lines.push('');
  }

  // Repository classes
  for (const name of tableViewEntities) {
    lines.push(`  class ${sanitize(name)}Repository {`);
    lines.push(`    «Repository»`);
    lines.push(`    +CreateAsync(${name}) Task~${name}~`);
    lines.push(`    +ReadAsync() Task~${name}[]~`);
    lines.push(`    +ReadByKeyAsync(...) Task~${name}~`);
    lines.push(`    +UpdateAsync(${name}) Task~${name}~`);
    lines.push(`    +DeleteAsync(${name}) Task`);
    lines.push(`  }`);
    lines.push(`  ${sanitize(name)}Repository ..> ${sanitize(name)} : uses`);
    lines.push('');
  }

  for (const name of procEntities) {
    const entity = entities.find(e => e.name === name);
    lines.push(`  class ${sanitize(name)}Repository {`);
    lines.push(`    «Procedure Repository»`);
    lines.push(`    +ExecuteAsync(...) Task~${name}[]~`);
    lines.push(`  }`);
    lines.push(`  ${sanitize(name)}Repository ..> ${sanitize(name)} : uses`);
    lines.push('');
  }

  // RestRepository
  lines.push(`  class RestRepository {`);
  lines.push(`    «Facade»`);
  lines.push(`    +HttpClient HttpClient$`);
  lines.push(`    +IsAvailableAsync() Task~bool~`);
  for (const entity of entities) {
    lines.push(`    +${entity.name} ${sanitize(entity.name)}Repository`);
  }
  lines.push(`  }`);
  lines.push('');

  // RestRepository dependencies
  for (const entity of entities) {
    lines.push(`  RestRepository --> ${sanitize(entity.name)}Repository`);
  }

  lines.push('```');
  lines.push('');

  // Entities Table
  lines.push('## Entities Reference');
  lines.push('');
  lines.push('| Entity | Type | Key Fields | Columns |');
  lines.push('|--------|------|------------|---------|');
  for (const entity of entities) {
    const icon = entity.entityType === 'table' ? '📋' :
      entity.entityType === 'view' ? '👁️' : '⚙️';
    const keyFields = entity.columns.filter(c => c.isKey).map(c => c.name).join(', ') || '-';
    const colCount = entity.columns.length;
    lines.push(`| ${icon} ${entity.name} | ${entity.entityType} | ${keyFields} | ${colCount} |`);
  }
  lines.push('');

  return lines.join('\n');
}

export function generateClassDiagram(input: MermaidInput): string {
  const { entities, tableViewEntities, procEntities, relationships } = input;

  const lines: string[] = [];
  lines.push('```mermaid');
  lines.push('classDiagram');

  // Model classes
  for (const entity of entities) {
    lines.push(`  class ${entity.name} {`);
    for (const col of entity.columns) {
      const keyMarker = col.isKey ? '🔑 ' : '';
      lines.push(`    +${col.type} ${keyMarker}${col.name}`);
    }
    if (entity.entityType !== 'stored-procedure') {
      lines.push(`    +WithoutKeys() object`);
    }
    lines.push(`  }`);
  }

  // Repository classes for tables/views
  for (const name of tableViewEntities) {
    lines.push(`  class ${name}Repository {`);
    lines.push(`    +CreateAsync(${name}) ${name}`);
    lines.push(`    +ReadAsync() ${name}[]`);
    lines.push(`    +UpdateAsync(${name}) ${name}`);
    lines.push(`    +DeleteAsync(${name}) void`);
    lines.push(`  }`);
    lines.push(`  ${name}Repository ..> ${name} : uses`);
  }

  // Repository classes for procedures
  for (const name of procEntities) {
    lines.push(`  class ${name}Repository {`);
    lines.push(`    +ExecuteAsync() ${name}[]`);
    lines.push(`  }`);
    lines.push(`  ${name}Repository ..> ${name} : uses`);
  }

  // RestRepository
  lines.push(`  class RestRepository {`);
  lines.push(`    +HttpClient$ HttpClient`);
  lines.push(`    +IsAvailableAsync() bool`);
  for (const entity of entities) {
    const isTableView = tableViewEntities.includes(entity.name);
    const interfaceType = isTableView ? 'ITableRepository' : 'IProcedureRepository';
    lines.push(`    +${interfaceType}~${entity.name}~ ${entity.name}Repository`);
  }
  lines.push(`  }`);

  // RestRepository uses all repositories
  for (const entity of entities) {
    lines.push(`  RestRepository --> ${entity.name}Repository`);
  }

  // Entity relationships
  for (const [source, rels] of relationships) {
    for (const rel of rels) {
      const arrow = rel.cardinality === 'many' ? '--o' : '-->';
      lines.push(`  ${source} ${arrow} ${rel.target} : ${rel.cardinality}`);
    }
  }

  lines.push('```');
  return lines.join('\n');
}

export async function writeDiagram(content: string, filePath: string): Promise<void> {
  await vscode.workspace.fs.writeFile(vscode.Uri.file(filePath), Buffer.from(content, 'utf8'));
}

export async function openDiagramPreview(filePath: string): Promise<void> {
  const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
  await vscode.commands.executeCommand('markdown.showPreviewToSide', doc.uri);
}

function sanitize(name: string): string {
  return name.replace(/\W/g, '_');
}
function getDefaultValue(csharpType: string): string {
  // Remove nullable marker for type checking
  const baseType = csharpType.replace('?', '');
  
  switch (baseType.toLowerCase()) {
    case 'int':
    case 'long':
    case 'short':
    case 'byte':
      return '1';
    case 'decimal':
    case 'double':
    case 'float':
      return '1.0m';
    case 'bool':
      return 'true';
    case 'string':
      return '"sample"';
    case 'datetime':
    case 'datetimeoffset':
      return 'DateTime.Now';
    case 'timespan':
      return 'TimeSpan.Zero';
    case 'guid':
      return 'Guid.NewGuid()';
    case 'byte[]':
      return 'Array.Empty<byte>()';
    default:
      // Handle nullable types
      if (csharpType.endsWith('?')) {
        return 'null';
      }
      return '"value"';
  }
}