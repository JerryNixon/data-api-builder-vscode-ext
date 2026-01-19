import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as sql from 'mssql';
import { EntityDefinition } from '../readConfig';
import {
  EntityInfo,
  ColumnMetadata,
  generateModel,
  generateTableRepository,
  generateProcedureRepository,
  generateRestRepository,
  generateProgramCs,
  generateWebProgramCs,
  generateWebIndexHtml,
  generateSolution,
  getCsharpPropertyName,
  mapSqlTypeToCSharp,
  WebEntityInfo
} from './generators';
import { setupProjectStructure, writeFile } from './fileWriter';
import {
  MermaidInput,
  generateMermaidDiagram,
  generateClassDiagram,
  writeDiagram,
  openDiagramPreview
} from './mermaidGenerator';

export interface GenerationResult {
  success: boolean;
  modelsGenerated: string[];
  repositoriesGenerated: string[];
  errors: string[];
}

export async function generateCSharpCode(
  context: vscode.ExtensionContext,
  pool: sql.ConnectionPool,
  entities: Record<string, EntityDefinition>,
  configPath: string
): Promise<GenerationResult> {
  const result: GenerationResult = {
    success: true,
    modelsGenerated: [],
    repositoriesGenerated: [],
    errors: []
  };

  const configDir = path.dirname(configPath);
  const configFileName = path.basename(configPath);
  const genFolder = path.join(configDir, 'Gen');

  // Setup project structure (copy static files)
  const setupResults = await setupProjectStructure(context, genFolder, configFileName);
  for (const r of setupResults) {
    if (!r.success) {
      result.errors.push(r.error || `Failed: ${r.path}`);
    }
  }

  // Collect entity info
  const entityInfos: EntityInfo[] = [];
  const tableViewEntities: string[] = [];
  const procEntities: string[] = [];
  const relationships = new Map<string, { target: string; cardinality: string }[]>();

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Generating C# Code',
      cancellable: false
    },
    async (progress) => {
      const entityNames = Object.keys(entities);

      for (let i = 0; i < entityNames.length; i++) {
        const entityName = entityNames[i];
        const entityDef = entities[entityName];
        const entityType = entityDef.source.type as 'table' | 'view' | 'stored-procedure';

        progress.report({
          message: `Processing ${entityName} (${i + 1}/${entityNames.length})...`,
          increment: (100 / entityNames.length)
        });

        try {
          // Get column metadata
          const columns = await getColumnMetadata(pool, entityDef, entityName);

          const entityInfo: EntityInfo = {
            name: entityName,
            entityDef,
            columns,
            entityType
          };
          entityInfos.push(entityInfo);

          // Categorize entities
          if (entityType === 'table' || entityType === 'view') {
            tableViewEntities.push(entityName);
          } else {
            procEntities.push(entityName);
          }

          // Generate model
          const modelContent = generateModel(entityInfo);
          const modelPath = path.join(genFolder, 'Models', `${entityName}.cs`);
          const modelResult = writeFile(modelPath, modelContent);
          if (modelResult.success) {
            result.modelsGenerated.push(entityName);
          } else {
            result.errors.push(modelResult.error || `Failed to write model: ${entityName}`);
          }

          // Generate repository
          let repoContent: string;
          if (entityType === 'table' || entityType === 'view') {
            repoContent = generateTableRepository(entityName);
          } else {
            const procParams = await getProcedureParameters(pool, entityDef.source.object);
            const httpMethods = entityDef.rest?.methods || ['GET'];
            repoContent = generateProcedureRepository(entityName, procParams, httpMethods);
          }

          const repoPath = path.join(genFolder, 'Repositories', `${entityName}Repository.cs`);
          const repoResult = writeFile(repoPath, repoContent);
          if (repoResult.success) {
            result.repositoriesGenerated.push(entityName);
          } else {
            result.errors.push(repoResult.error || `Failed to write repository: ${entityName}`);
          }

          // Collect relationships
          if (entityDef.relationships) {
            const rels: { target: string; cardinality: string }[] = [];
            for (const [relName, rel] of Object.entries(entityDef.relationships)) {
              const targetEntity = (rel as any)['target.entity'];
              const cardinality = (rel as any).cardinality || 'one';
              if (targetEntity && entities[targetEntity]) {
                rels.push({ target: targetEntity, cardinality });
              }
            }
            if (rels.length > 0) {
              relationships.set(entityName, rels);
            }
          }

        } catch (error) {
          result.errors.push(`Error processing ${entityName}: ${error}`);
        }
      }

      // Generate RestRepository
      progress.report({ message: 'Generating RestRepository...' });
      const restRepoContent = generateRestRepository(tableViewEntities, procEntities);
      const restRepoPath = path.join(genFolder, 'Repositories', 'RestRepository.cs');
      writeFile(restRepoPath, restRepoContent);

      // Generate Program.cs (Console Client)
      progress.report({ message: 'Generating Client...' });
      const apiPath = getApiPath(entities);
      const programContent = generateProgramCs(tableViewEntities, procEntities, apiPath);
      const programPath = path.join(genFolder, 'Client', 'Program.cs');
      writeFile(programPath, programContent);

      // Generate Web Explorer
      progress.report({ message: 'Generating Web Explorer...' });
      const webEntities: WebEntityInfo[] = entityInfos.map(e => ({
        name: e.name,
        type: e.entityType
      }));
      const webProgramContent = generateWebProgramCs(webEntities, apiPath);
      const webProgramPath = path.join(genFolder, 'Web', 'Program.cs');
      writeFile(webProgramPath, webProgramContent);

      // Generate index.html with entities baked in
      const templatePath = path.join(context.extensionPath, 'resources', 'csharp', 'Web', 'wwwroot', 'index.html');
      if (fs.existsSync(templatePath)) {
        const templateHtml = fs.readFileSync(templatePath, 'utf8');
        const indexHtmlContent = generateWebIndexHtml(webEntities, apiPath, templateHtml);
        const indexHtmlPath = path.join(genFolder, 'Web', 'wwwroot', 'index.html');
        writeFile(indexHtmlPath, indexHtmlContent);
      } else {
        result.errors.push(`Web template not found: ${templatePath}`);
      }

      // Generate solution file
      progress.report({ message: 'Generating Solution...' });
      const solutionContent = generateSolution(configFileName);
      const solutionPath = path.join(genFolder, 'Gen.sln');
      writeFile(solutionPath, solutionContent);

      // Generate Mermaid diagram
      progress.report({ message: 'Generating Diagram...' });
      const mermaidInput: MermaidInput = {
        entities: entityInfos,
        tableViewEntities,
        procEntities,
        relationships,
        configFileName
      };
      const diagramContent = generateMermaidDiagram(mermaidInput);
      const diagramPath = path.join(genFolder, 'diagram.md');
      await writeDiagram(diagramContent, diagramPath);
      await openDiagramPreview(diagramPath);

      // Configure CORS for Web Explorer
      progress.report({ message: 'Configuring CORS for Web Explorer...' });
      await configureCors(configDir);
    }
  );

  result.success = result.errors.length === 0;
  return result;
}

async function configureCors(configDir: string): Promise<void> {
  const terminal = vscode.window.createTerminal({
    name: 'DAB Configure CORS',
    cwd: configDir
  });
  terminal.sendText('dab configure --runtime.host.cors.origins "http://localhost:5001"');
  terminal.show();
}

async function getColumnMetadata(
  pool: sql.ConnectionPool,
  entityDef: EntityDefinition,
  entityName: string
): Promise<ColumnMetadata[]> {
  const entityType = entityDef.source.type;
  const objectName = entityDef.source.object;
  const { schemaName, pureName } = extractSchemaName(objectName);

  let rawColumns: { COLUMN_NAME: string; DATA_TYPE: string; IS_NULLABLE: string }[];

  if (entityType === 'stored-procedure') {
    rawColumns = await queryProcedureMetadata(pool, schemaName, pureName);
  } else {
    rawColumns = await queryTableOrViewMetadata(pool, schemaName, pureName);
  }

  // Get key fields
  const keyFieldsFromConfig = entityDef.source['key-fields'] || [];
  const keyFieldsFromFields = entityDef.fields
    ?.filter(f => f['primary-key'] === true)
    .map(f => f.name) || [];
  const keyFields = keyFieldsFromFields.length > 0 ? keyFieldsFromFields : keyFieldsFromConfig;
  const keyFieldsLower = keyFields.map(k => k.toLowerCase());

  // Get mappings
  const mappings = entityDef.mappings || {};

  // Track property names for collision detection
  const usedNames = new Map<string, number>();

  return rawColumns.map(col => {
    const colName = col.COLUMN_NAME;
    const alias = mappings[colName];
    const jsonName = alias ?? colName;
    let propName = getCsharpPropertyName(colName);
    const isKey = keyFieldsLower.includes(colName.toLowerCase());
    const isNullable = col.IS_NULLABLE === 'YES';

    // Handle property name collisions by appending a number
    const baseName = propName;
    let count = usedNames.get(baseName.toLowerCase()) || 0;
    if (count > 0) {
      propName = `${baseName}${count + 1}`;
    }
    usedNames.set(baseName.toLowerCase(), count + 1);

    return {
      name: propName,
      type: mapSqlTypeToCSharp(col.DATA_TYPE, isNullable),
      isKey,
      jsonName
    };
  });
}

async function getProcedureParameters(
  pool: sql.ConnectionPool,
  procName: string
): Promise<{ name: string; type: string }[]> {
  const { schemaName, pureName } = extractSchemaName(procName);

  // Query sys.parameters for nullable info (INFORMATION_SCHEMA.PARAMETERS lacks it)
  const query = `
    SELECT 
      p.name AS PARAMETER_NAME,
      t.name AS DATA_TYPE,
      CASE WHEN t.name IN ('int', 'bigint', 'smallint', 'tinyint', 'bit', 'decimal', 'numeric', 
                           'money', 'smallmoney', 'float', 'real', 'datetime', 'datetime2', 
                           'smalldatetime', 'date', 'time', 'datetimeoffset', 'uniqueidentifier')
           THEN 1 ELSE 0 END AS is_value_type
    FROM sys.parameters p
    INNER JOIN sys.types t ON p.user_type_id = t.user_type_id
    INNER JOIN sys.objects o ON p.object_id = o.object_id
    INNER JOIN sys.schemas s ON o.schema_id = s.schema_id
    WHERE s.name = @schemaName AND o.name = @pureName AND p.parameter_id > 0
    ORDER BY p.parameter_id;
  `;

  const result = await pool.request()
    .input('schemaName', sql.NVarChar, schemaName)
    .input('pureName', sql.NVarChar, pureName)
    .query(query);

  // Procedure parameters are always nullable (caller can omit them)
  return result.recordset.map(row => ({
    name: row.PARAMETER_NAME.replace('@', ''),
    type: mapSqlTypeToCSharp(row.DATA_TYPE, row.is_value_type === 1)
  }));
}

async function queryTableOrViewMetadata(
  pool: sql.ConnectionPool,
  schemaName: string,
  pureName: string
): Promise<{ COLUMN_NAME: string; DATA_TYPE: string; IS_NULLABLE: string }[]> {
  const query = `
    SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @schemaName AND TABLE_NAME = @pureName
    ORDER BY ORDINAL_POSITION;
  `;

  const result = await pool.request()
    .input('schemaName', sql.NVarChar, schemaName)
    .input('pureName', sql.NVarChar, pureName)
    .query(query);

  return result.recordset;
}

async function queryProcedureMetadata(
  pool: sql.ConnectionPool,
  schemaName: string,
  pureName: string
): Promise<{ COLUMN_NAME: string; DATA_TYPE: string; IS_NULLABLE: string }[]> {
  const result = await pool.request()
    .input('procedureName', sql.NVarChar, `[${schemaName}].[${pureName}]`)
    .execute('sp_describe_first_result_set');

  return result.recordset.map((row: any) => ({
    COLUMN_NAME: row.name,
    DATA_TYPE: row.system_type_name.split('(')[0],
    IS_NULLABLE: row.is_nullable ? 'YES' : 'NO'
  }));
}

function extractSchemaName(objectName: string): { schemaName: string; pureName: string } {
  let schemaName = 'dbo';
  let pureName = objectName;

  const matches = objectName.match(/\[([^\]]+)\]\.\[([^\]]+)\]/) || objectName.match(/([^.]+)\.([^.]+)/);
  if (matches && matches.length >= 3) {
    schemaName = matches[1];
    pureName = matches[2];
  } else if (!objectName.includes('.')) {
    pureName = objectName;
  } else {
    [schemaName, pureName] = objectName.split('.');
  }

  return { schemaName, pureName };
}

function getApiPath(entities: Record<string, EntityDefinition>): string {
  for (const entity of Object.values(entities)) {
    if (entity.runtimeRestPath) {
      return entity.runtimeRestPath.replace(/^\/+|\/+$/g, '');
    }
  }
  return 'api';
}
