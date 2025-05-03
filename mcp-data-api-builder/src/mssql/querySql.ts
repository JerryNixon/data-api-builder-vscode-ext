import * as sql from 'mssql';
import { EntityDefinition, DbColumn, DbEntity, DbParameter } from '../types';
import { normalizeObjectName, buildAliasMap } from '../helpers';

interface SqlMetadataRow {
  fullName: string;
  columnName: string;
  dataType: string;
  isPrimaryKey: boolean;
}

export async function openConnection(connectionString: string): Promise<sql.ConnectionPool | undefined> {
  try {
    const pool = await sql.connect(connectionString);
    return pool.connected ? pool : undefined;
  } catch {
    return undefined;
  }
}

export async function enrichEntitiesWithSqlMetadata(
  pool: sql.ConnectionPool,
  entities: EntityDefinition[]
): Promise<EntityDefinition[]> {
  const tables = await enrichEntityWithSqlMetadata(pool, entities, 'table');
  const views = await enrichEntityWithSqlMetadata(pool, entities, 'view');
  const procs = await enrichStoredProcsWithSqlMetadata(pool, entities);
  return [...tables, ...views, ...procs];
}

export async function enrichEntityWithSqlMetadata(
  pool: sql.ConnectionPool,
  entities: EntityDefinition[],
  type: 'table' | 'view'
): Promise<EntityDefinition[]> {
  const targets = entities
    .filter(e => e.source.type === type)
    .map(e => ({
      object: normalizeObjectName(e.source.object),
      aliasMap: buildAliasMap(e.mappings),
      entity: e
    }));

  if (targets.length === 0) return [];

  const rows = await queryDbColumns(pool, targets, type);
  const grouped = groupBy(rows, (r: SqlMetadataRow) => r.fullName.toLowerCase());

  return targets.map(({ object, aliasMap, entity }) => {
    const rows = grouped[object] ?? [];

    const columns: DbColumn[] = rows.map(r => ({
      name: r.columnName,
      alias: aliasMap?.[r.columnName] ?? r.columnName,
      dbType: r.dataType,
      netType: mapDbTypeToNet(r.dataType),
      isKey: r.isPrimaryKey
    }));

    return {
      ...entity,
      dbMetadata: {
        objectName: object,
        normalizedObjectName: object,
        type,
        parameters: null,
        columns
      }
    };
  });
}

export async function enrichStoredProcsWithSqlMetadata(
  pool: sql.ConnectionPool,
  entities: EntityDefinition[]
): Promise<EntityDefinition[]> {
  const storedProcs = entities.filter(e => e.source.type === 'stored-procedure');
  if (storedProcs.length === 0) return [];

  const enriched: EntityDefinition[] = [];

  for (const e of storedProcs) {
    const name = normalizeObjectName(e.source.object);
    const columns = await getStoredProcResultColumns(pool, name);
    const parameters = await getStoredProcParameters(pool, name);

    enriched.push({
      ...e,
      dbMetadata: {
        objectName: name,
        normalizedObjectName: name,
        type: 'stored-procedure',
        parameters,
        columns
      }
    });
  }

  return enriched;
}

async function getStoredProcResultColumns(
  pool: sql.ConnectionPool,
  procName: string
): Promise<DbColumn[]> {
  const request = pool.request();
  request.input('tsql', sql.NVarChar, `EXEC ${procName}`);

  const result = await request.query(`
    SELECT name, system_type_name, is_hidden
    FROM sys.dm_exec_describe_first_result_set(@tsql, NULL, 0)
    WHERE is_hidden = 0;
  `);

  return result.recordset.map((row: any) => ({
    name: row.name,
    alias: row.name,
    dbType: row.system_type_name.split('(')[0],
    netType: mapDbTypeToNet(row.system_type_name),
    isKey: false
  }));
}

async function getStoredProcParameters(
  pool: sql.ConnectionPool,
  procName: string
): Promise<DbParameter[]> {
  const request = pool.request();
  const [schema, name] = procName.split('.');

  request.input('schema', sql.NVarChar, schema);
  request.input('name', sql.NVarChar, name);

  const result = await request.query(`
    SELECT 
      p.name,
      t.name AS type_name
    FROM sys.parameters p
    JOIN sys.types t ON p.user_type_id = t.user_type_id
    JOIN sys.objects o ON p.object_id = o.object_id
    JOIN sys.schemas s ON o.schema_id = s.schema_id
    WHERE s.name = @schema AND o.name = @name;
  `);

  return result.recordset.map((row: any) => ({
    name: row.name.replace(/^@/, ''),
    dbType: row.type_name,
    netType: mapDbTypeToNet(row.type_name)
  }));
}

async function queryDbColumns(
  pool: sql.ConnectionPool,
  targets: { object: string; aliasMap: Record<string, string>; entity: EntityDefinition }[],
  type: 'table' | 'view'
): Promise<SqlMetadataRow[]> {
  const whereClause = targets.map((e, i) => `CONCAT(s.name, '.', o.name) = @target${i}`).join(' OR ');
  const request = pool.request();
  targets.forEach((t, i) => request.input(`target${i}`, sql.NVarChar, t.object));
  request.input('typeCode', sql.NVarChar, type === 'table' ? 'U' : 'V');

  const result = await request.query<SqlMetadataRow>(`
    SELECT 
      CONCAT(s.name, '.', o.name) AS fullName,
      c.name AS columnName,
      t.name AS dataType,
      ISNULL(i.is_primary_key, 0) AS isPrimaryKey
    FROM sys.columns c
    JOIN sys.types t ON c.user_type_id = t.user_type_id
    JOIN sys.objects o ON c.object_id = o.object_id
    LEFT JOIN sys.index_columns ic ON ic.object_id = o.object_id AND ic.column_id = c.column_id
    LEFT JOIN sys.indexes i ON i.object_id = ic.object_id AND i.index_id = ic.index_id AND i.is_primary_key = 1
    JOIN sys.schemas s ON o.schema_id = s.schema_id
    WHERE o.type = @typeCode AND (${whereClause})
    ORDER BY fullName, c.column_id;
  `);

  return result.recordset;
}

function mapDbTypeToNet(dbType: string): string {
  const cleanType = dbType.split('(')[0].toLowerCase();
  const map: Record<string, string> = {
    int: 'int',
    bigint: 'long',
    smallint: 'short',
    tinyint: 'byte',
    bit: 'bool',
    varchar: 'string',
    nvarchar: 'string',
    text: 'string',
    ntext: 'string',
    datetime: 'DateTime',
    datetime2: 'DateTime',
    smalldatetime: 'DateTime',
    uniqueidentifier: 'Guid',
    float: 'double',
    real: 'float',
    decimal: 'decimal',
    numeric: 'decimal',
    money: 'decimal'
  };
  return map[cleanType] ?? 'object';
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}
