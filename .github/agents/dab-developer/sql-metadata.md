# SQL Metadata Queries Reference

## Overview

These SQL queries retrieve database schema information for MSSQL (SQL Server and Azure SQL). Use them to discover tables, views, stored procedures, and their structures when configuring DAB entities.

## Get Tables

Retrieves all user tables with their columns and metadata.

```sql
SELECT
    s.name AS schemaName,
    t.name AS tableName,
    c.name AS columnName,
    ty.name AS dataType,
    c.max_length AS maxLength,
    c.precision,
    c.scale,
    c.is_nullable AS isNullable,
    c.is_identity AS isIdentity,
    CASE WHEN pk.column_id IS NOT NULL THEN 1 ELSE 0 END AS isPrimaryKey
FROM sys.tables t
INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
INNER JOIN sys.columns c ON t.object_id = c.object_id
INNER JOIN sys.types ty ON c.user_type_id = ty.user_type_id
LEFT JOIN (
    SELECT ic.object_id, ic.column_id
    FROM sys.index_columns ic
    INNER JOIN sys.indexes i ON ic.object_id = i.object_id AND ic.index_id = i.index_id
    WHERE i.is_primary_key = 1
) pk ON t.object_id = pk.object_id AND c.column_id = pk.column_id
WHERE t.is_ms_shipped = 0
ORDER BY s.name, t.name, c.column_id
```

### Result Columns

| Column | Description |
|--------|-------------|
| schemaName | Database schema (e.g., dbo, sales) |
| tableName | Table name |
| columnName | Column name |
| dataType | SQL data type |
| maxLength | Maximum length for variable types |
| precision | Numeric precision |
| scale | Numeric scale |
| isNullable | 1 if column allows NULL |
| isIdentity | 1 if column is identity |
| isPrimaryKey | 1 if column is part of primary key |

### Usage for DAB

Use this query to:
1. Discover available tables
2. Identify primary key columns
3. Determine data types for mappings
4. Find nullable fields

---

## Get Views

Retrieves all user views with their columns.

```sql
SELECT
    s.name AS schemaName,
    v.name AS viewName,
    c.name AS columnName,
    ty.name AS dataType,
    c.max_length AS maxLength,
    c.precision,
    c.scale,
    c.is_nullable AS isNullable
FROM sys.views v
INNER JOIN sys.schemas s ON v.schema_id = s.schema_id
INNER JOIN sys.columns c ON v.object_id = c.object_id
INNER JOIN sys.types ty ON c.user_type_id = ty.user_type_id
WHERE v.is_ms_shipped = 0
ORDER BY s.name, v.name, c.column_id
```

### Result Columns

| Column | Description |
|--------|-------------|
| schemaName | Database schema |
| viewName | View name |
| columnName | Column name |
| dataType | SQL data type |
| maxLength | Maximum length |
| precision | Numeric precision |
| scale | Numeric scale |
| isNullable | 1 if nullable |

### Usage for DAB

Views don't have primary keys in metadata. You must specify `key-fields` when adding a view entity:

```bash
dab add MyView \
  --source dbo.vw_MyView \
  --source.type view \
  --source.key-fields "Id" \
  --permissions "anonymous:read"
```

---

## Get Stored Procedures

Retrieves all user stored procedures with their parameters.

```sql
SELECT
    s.name AS schemaName,
    p.name AS procedureName,
    par.name AS parameterName,
    ty.name AS dataType,
    par.max_length AS maxLength,
    par.precision,
    par.scale,
    par.is_output AS isOutput,
    par.has_default_value AS hasDefault,
    par.default_value AS defaultValue
FROM sys.procedures p
INNER JOIN sys.schemas s ON p.schema_id = s.schema_id
LEFT JOIN sys.parameters par ON p.object_id = par.object_id
LEFT JOIN sys.types ty ON par.user_type_id = ty.user_type_id
WHERE p.is_ms_shipped = 0
ORDER BY s.name, p.name, par.parameter_id
```

### Result Columns

| Column | Description |
|--------|-------------|
| schemaName | Database schema |
| procedureName | Procedure name |
| parameterName | Parameter name (NULL if no params) |
| dataType | SQL data type |
| maxLength | Maximum length |
| precision | Numeric precision |
| scale | Numeric scale |
| isOutput | 1 if output parameter |
| hasDefault | 1 if has default value |
| defaultValue | Default value (if any) |

### Usage for DAB

```bash
# Basic stored procedure
dab add GetProducts \
  --source dbo.usp_GetProducts \
  --source.type stored-procedure \
  --permissions "anonymous:execute"

# With parameters
dab add GetProductsByCategory \
  --source dbo.usp_GetProductsByCategory \
  --source.type stored-procedure \
  --source.params "categoryId:1" \
  --permissions "anonymous:execute"
```

---

## Get Foreign Keys

Retrieves foreign key relationships between tables.

```sql
SELECT
    fk.name AS constraintName,
    ps.name AS parentSchema,
    pt.name AS parentTable,
    pc.name AS parentColumn,
    rs.name AS referencedSchema,
    rt.name AS referencedTable,
    rc.name AS referencedColumn
FROM sys.foreign_keys fk
INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
INNER JOIN sys.tables pt ON fkc.parent_object_id = pt.object_id
INNER JOIN sys.schemas ps ON pt.schema_id = ps.schema_id
INNER JOIN sys.columns pc ON fkc.parent_object_id = pc.object_id AND fkc.parent_column_id = pc.column_id
INNER JOIN sys.tables rt ON fkc.referenced_object_id = rt.object_id
INNER JOIN sys.schemas rs ON rt.schema_id = rs.schema_id
INNER JOIN sys.columns rc ON fkc.referenced_object_id = rc.object_id AND fkc.referenced_column_id = rc.column_id
ORDER BY ps.name, pt.name, fk.name
```

### Result Columns

| Column | Description |
|--------|-------------|
| constraintName | FK constraint name |
| parentSchema | Schema of child table |
| parentTable | Child table name |
| parentColumn | FK column in child |
| referencedSchema | Schema of parent table |
| referencedTable | Parent table name |
| referencedColumn | PK column in parent |

### Usage for DAB Relationships

Use foreign key info to configure relationships:

```bash
# Product belongs to Category (FK: Products.CategoryId -> Categories.CategoryId)
dab update Product \
  --relationship "category" \
  --cardinality one \
  --target.entity Category \
  --source.fields "CategoryId" \
  --target.fields "CategoryId"

# Category has many Products
dab update Category \
  --relationship "products" \
  --cardinality many \
  --target.entity Product \
  --source.fields "CategoryId" \
  --target.fields "CategoryId"
```

---

## Get Indexes

Retrieves index information for tables.

```sql
SELECT
    s.name AS schemaName,
    t.name AS tableName,
    i.name AS indexName,
    i.type_desc AS indexType,
    i.is_unique AS isUnique,
    i.is_primary_key AS isPrimaryKey,
    c.name AS columnName,
    ic.key_ordinal AS keyOrdinal,
    ic.is_descending_key AS isDescending,
    ic.is_included_column AS isIncluded
FROM sys.indexes i
INNER JOIN sys.tables t ON i.object_id = t.object_id
INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
WHERE t.is_ms_shipped = 0
  AND i.name IS NOT NULL
ORDER BY s.name, t.name, i.name, ic.key_ordinal
```

### Usage for DAB

- Identify primary key columns
- Find unique constraints (potential alternate keys)
- Understand query patterns for caching decisions

---

## Data Type Mapping

Common SQL Server to DAB/JSON type mappings:

| SQL Server Type | JSON Type | Notes |
|-----------------|-----------|-------|
| int, bigint, smallint, tinyint | number | Integer values |
| decimal, numeric, money | number | Decimal values |
| float, real | number | Floating point |
| bit | boolean | True/false |
| char, varchar, nchar, nvarchar | string | Text values |
| text, ntext | string | Legacy text (avoid) |
| date, datetime, datetime2 | string | ISO 8601 format |
| time | string | Time only |
| uniqueidentifier | string | GUID as string |
| binary, varbinary | string | Base64 encoded |
| xml | string | XML as string |
| geography, geometry | object | Spatial data |

---

## Quick Discovery Queries

### List All Tables
```sql
SELECT s.name + '.' + t.name AS fullName
FROM sys.tables t
INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
WHERE t.is_ms_shipped = 0
ORDER BY s.name, t.name
```

### List All Views
```sql
SELECT s.name + '.' + v.name AS fullName
FROM sys.views v
INNER JOIN sys.schemas s ON v.schema_id = s.schema_id
WHERE v.is_ms_shipped = 0
ORDER BY s.name, v.name
```

### List All Stored Procedures
```sql
SELECT s.name + '.' + p.name AS fullName
FROM sys.procedures p
INNER JOIN sys.schemas s ON p.schema_id = s.schema_id
WHERE p.is_ms_shipped = 0
ORDER BY s.name, p.name
```

### Get Table Row Counts
```sql
SELECT
    s.name + '.' + t.name AS tableName,
    p.rows AS rowCount
FROM sys.tables t
INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
INNER JOIN sys.partitions p ON t.object_id = p.object_id
WHERE t.is_ms_shipped = 0
  AND p.index_id IN (0, 1)
ORDER BY p.rows DESC
```

---

## Connection String Format

To run these queries, connect using:

### Windows Authentication
```
Server=localhost;Database=MyDatabase;Integrated Security=true;TrustServerCertificate=true
```

### SQL Authentication
```
Server=localhost;Database=MyDatabase;User Id=myuser;Password=mypassword;TrustServerCertificate=true
```

### Azure SQL
```
Server=myserver.database.windows.net;Database=MyDatabase;User Id=myuser;Password=mypassword;Encrypt=true
```

---

## Integration with DAB Workflow

### 1. Discover Database Objects
```sql
-- Run get tables, views, stored procedures queries
```

### 2. Initialize DAB
```bash
dab init --database-type mssql --connection-string "@env('DATABASE_CONNECTION_STRING')"
```

### 3. Add Entities Based on Discovery
```bash
# For each table
dab add TableName --source dbo.TableName --permissions "anonymous:read"

# For each view (with key-fields from your analysis)
dab add ViewName --source dbo.ViewName --source.type view --source.key-fields "Id" --permissions "anonymous:read"

# For each stored procedure
dab add ProcName --source dbo.ProcName --source.type stored-procedure --permissions "anonymous:execute"
```

### 4. Add Relationships Based on Foreign Keys
```bash
# Based on FK query results
dab update ChildEntity --relationship "parent" --cardinality one --target.entity ParentEntity --source.fields "ParentId" --target.fields "Id"
```

---

## Next Steps

- See [dab-add.md](dab-add.md) for adding entities
- See [dab-update.md](dab-update.md) for adding relationships
- See [entities.md](entities.md) for entity configuration
- See [relationships.md](relationships.md) for relationship patterns
