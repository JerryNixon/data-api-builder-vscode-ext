# Database Schema Reference

## Trek Database

The Trek database is a Star Trek themed test database used for integration testing and development of DAB extensions.

## Connection String

**Default:**
```
Server=localhost;Database=Trek;Integrated Security=true;TrustServerCertificate=true;
```

**Environment Variable:**
```bash
set TEST_SQL_CONNECTION_STRING=Server=localhost;Database=Trek;Integrated Security=true;TrustServerCertificate=true;
```

## Schema

### Tables

#### Actor
Stores information about actors.

**Columns:**
- `Id` (INT, PRIMARY KEY, IDENTITY) - Actor unique identifier
- `Name` (NVARCHAR(100)) - Actor's name
- `BirthYear` (INT) - Year of birth

**Relationships:**
- One-to-many with Character (one actor plays many characters)

**Sample Data:**
```sql
INSERT INTO Actor (Name, BirthYear) VALUES 
    ('Patrick Stewart', 1940),
    ('William Shatner', 1931),
    ('Avery Brooks', 1948);
```

#### Character
Stores information about characters in Star Trek series.

**Columns:**
- `Id` (INT, PRIMARY KEY, IDENTITY) - Character unique identifier
- `Name` (NVARCHAR(100)) - Character's name
- `ActorId` (INT, FOREIGN KEY → Actor.Id) - Actor who plays this character

**Relationships:**
- Many-to-one with Actor (many characters to one actor)
- Many-to-many with Series via Series_Character
- Many-to-many with Species via Character_Species

**Sample Data:**
```sql
INSERT INTO Character (Name, ActorId) VALUES 
    ('Jean-Luc Picard', 1),  -- Patrick Stewart
    ('James T. Kirk', 2),     -- William Shatner
    ('Benjamin Sisko', 3);    -- Avery Brooks
```

#### Series
Stores information about Star Trek TV series.

**Columns:**
- `Id` (INT, PRIMARY KEY, IDENTITY) - Series unique identifier
- `Name` (NVARCHAR(100)) - Series name
- `Year` (INT) - Year series premiered

**Relationships:**
- Many-to-many with Character via Series_Character

**Sample Data:**
```sql
INSERT INTO Series (Name, Year) VALUES 
    ('The Next Generation', 1987),
    ('The Original Series', 1966),
    ('Deep Space Nine', 1993);
```

#### Species
Stores information about alien species.

**Columns:**
- `Id` (INT, PRIMARY KEY, IDENTITY) - Species unique identifier
- `Name` (NVARCHAR(100)) - Species name
- `Homeworld` (NVARCHAR(100)) - Home planet

**Relationships:**
- Many-to-many with Character via Character_Species

**Sample Data:**
```sql
INSERT INTO Species (Name, Homeworld) VALUES 
    ('Human', 'Earth'),
    ('Vulcan', 'Vulcan'),
    ('Klingon', 'Qo''noS');
```

### Linking Tables (Junction Tables)

#### Series_Character
Links characters to the series they appear in.

**Columns:**
- `SeriesId` (INT, FOREIGN KEY → Series.Id)
- `CharacterId` (INT, FOREIGN KEY → Character.Id)
- PRIMARY KEY (SeriesId, CharacterId)

**Sample Data:**
```sql
INSERT INTO Series_Character (SeriesId, CharacterId) VALUES 
    (1, 1),  -- Picard in TNG
    (2, 2),  -- Kirk in TOS
    (3, 3);  -- Sisko in DS9
```

#### Character_Species
Links characters to their species.

**Columns:**
- `CharacterId` (INT, FOREIGN KEY → Character.Id)
- `SpeciesId` (INT, FOREIGN KEY → Species.Id)
- PRIMARY KEY (CharacterId, SpeciesId)

**Sample Data:**
```sql
INSERT INTO Character_Species (CharacterId, SpeciesId) VALUES 
    (1, 1),  -- Picard is Human
    (2, 1),  -- Kirk is Human
    (3, 1);  -- Sisko is Human
```

### Stored Procedures

#### GetSeriesActors
Retrieves actors who appeared in a specific series.

**Parameters:**
- `@seriesId` (INT) - Series identifier
- `@top` (INT) - Maximum number of results

**Returns:**
- ActorId
- ActorName
- BirthYear
- CharacterName

**Definition:**
```sql
CREATE PROCEDURE dbo.GetSeriesActors
    @seriesId INT,
    @top INT
AS
BEGIN
    SELECT TOP (@top)
        a.Id AS ActorId,
        a.Name AS ActorName,
        a.BirthYear,
        c.Name AS CharacterName
    FROM Actor a
    INNER JOIN Character c ON a.Id = c.ActorId
    INNER JOIN Series_Character sc ON c.Id = sc.CharacterId
    WHERE sc.SeriesId = @seriesId
    ORDER BY a.Name;
END
```

**Usage in DAB Config:**
```json
{
  "GetSeriesActors": {
    "source": {
      "object": "dbo.GetSeriesActors",
      "type": "stored-procedure",
      "parameters": {
        "seriesId": "int",
        "top": "int"
      }
    }
  }
}
```

## Entity Relationship Diagram

```
Actor (1) ─────< (N) Character (N) >────── (N) Series
  │                    │
  │                    │
  │                    V
  │              (N) Species
  │
  └─ One actor can play many characters
     Many characters appear in many series
     Many characters can be of many species
```

## Querying with Shared Utilities

### Get Tables
```typescript
import { openConnection, getTables } from 'dab-vscode-shared-database/mssql';

const pool = await openConnection(connectionString);
const tables = await getTables(pool);

// Find Actor table
const actor = tables.find(t => t.name === 'Actor');
console.log(actor?.columns);  // Array of column metadata

await pool.close();
```

### Get Views
```typescript
import { getViews } from 'dab-vscode-shared-database/mssql';

const pool = await openConnection(connectionString);
const views = await getViews(pool);

// Check for views
console.log(views.map(v => v.name));

await pool.close();
```

### Get Stored Procedures
```typescript
import { getProcs } from 'dab-vscode-shared-database/mssql';

const pool = await openConnection(connectionString);
const procs = await getProcs(pool);

// Find GetSeriesActors
const proc = procs.find(p => p.name === 'GetSeriesActors');
console.log(proc?.parameters);  // seriesId, top

await pool.close();
```

## Expected Table Metadata

### Actor Table
```typescript
{
  schema: 'dbo',
  name: 'Actor',
  columns: [
    {
      name: 'Id',
      type: 'int',
      isNullable: false,
      isPrimaryKey: true,
      isIdentity: true
    },
    {
      name: 'Name',
      type: 'nvarchar',
      maxLength: 100,
      isNullable: true,
      isPrimaryKey: false,
      isIdentity: false
    },
    {
      name: 'BirthYear',
      type: 'int',
      isNullable: true,
      isPrimaryKey: false,
      isIdentity: false
    }
  ],
  primaryKeys: ['Id']
}
```

### Character Table
```typescript
{
  schema: 'dbo',
  name: 'Character',
  columns: [
    { name: 'Id', type: 'int', isPrimaryKey: true, isIdentity: true },
    { name: 'Name', type: 'nvarchar', maxLength: 100 },
    { name: 'ActorId', type: 'int', isNullable: true }
  ],
  primaryKeys: ['Id']
}
```

## Using in Tests

### Integration Test Example
```typescript
import * as assert from 'assert';
import { openConnection, getTables } from '../mssql';

const connectionString = process.env.TEST_SQL_CONNECTION_STRING || 
    'Server=localhost;Database=Trek;Integrated Security=true;TrustServerCertificate=true;';

describe('Trek Database Tests', function() {
    this.timeout(10000);

    it('should retrieve all tables', async () => {
        const pool = await openConnection(connectionString);
        const tables = await getTables(pool);
        await pool.close();

        const tableNames = tables.map(t => t.name);
        
        assert.ok(tableNames.includes('Actor'));
        assert.ok(tableNames.includes('Character'));
        assert.ok(tableNames.includes('Series'));
        assert.ok(tableNames.includes('Species'));
    });

    it('should have correct Actor columns', async () => {
        const pool = await openConnection(connectionString);
        const tables = await getTables(pool);
        await pool.close();

        const actor = tables.find(t => t.name === 'Actor');
        assert.ok(actor);
        
        const columns = actor.columns.map(c => c.name);
        assert.ok(columns.includes('Id'));
        assert.ok(columns.includes('Name'));
        assert.ok(columns.includes('BirthYear'));
    });
});
```

## DAB Config Example

See [shared/src/test/fixtures/dab-config.json](../../shared/src/test/fixtures/dab-config.json) for a complete working DAB configuration for the Trek database.

Key entities configured:
- **Actor** - Table with Character relationship
- **Character** - Table with Actor, Series, and Species relationships
- **Series** - Table
- **Species** - Table  
- **GetSeriesActors** - Stored procedure

## Database Setup Script

```sql
-- Create Trek database
CREATE DATABASE Trek;
GO

USE Trek;
GO

-- Create tables
CREATE TABLE Actor (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Name NVARCHAR(100),
    BirthYear INT
);

CREATE TABLE Character (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Name NVARCHAR(100),
    ActorId INT FOREIGN KEY REFERENCES Actor(Id)
);

CREATE TABLE Series (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Name NVARCHAR(100),
    Year INT
);

CREATE TABLE Species (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Name NVARCHAR(100),
    Homeworld NVARCHAR(100)
);

CREATE TABLE Series_Character (
    SeriesId INT FOREIGN KEY REFERENCES Series(Id),
    CharacterId INT FOREIGN KEY REFERENCES Character(Id),
    PRIMARY KEY (SeriesId, CharacterId)
);

CREATE TABLE Character_Species (
    CharacterId INT FOREIGN KEY REFERENCES Character(Id),
    SpeciesId INT FOREIGN KEY REFERENCES Species(Id),
    PRIMARY KEY (CharacterId, SpeciesId)
);

-- Insert sample data
INSERT INTO Actor (Name, BirthYear) VALUES 
    ('Patrick Stewart', 1940),
    ('William Shatner', 1931),
    ('Avery Brooks', 1948);

INSERT INTO Series (Name, Year) VALUES 
    ('The Next Generation', 1987),
    ('The Original Series', 1966),
    ('Deep Space Nine', 1993);

INSERT INTO Species (Name, Homeworld) VALUES 
    ('Human', 'Earth'),
    ('Vulcan', 'Vulcan'),
    ('Klingon', 'Qo''noS');

INSERT INTO Character (Name, ActorId) VALUES 
    ('Jean-Luc Picard', 1),
    ('James T. Kirk', 2),
    ('Benjamin Sisko', 3);

INSERT INTO Series_Character (SeriesId, CharacterId) VALUES 
    (1, 1),  -- Picard in TNG
    (2, 2),  -- Kirk in TOS
    (3, 3);  -- Sisko in DS9

INSERT INTO Character_Species (CharacterId, SpeciesId) VALUES 
    (1, 1),  -- Picard is Human
    (2, 1),  -- Kirk is Human
    (3, 1);  -- Sisko is Human

-- Create stored procedure
GO
CREATE PROCEDURE dbo.GetSeriesActors
    @seriesId INT,
    @top INT
AS
BEGIN
    SELECT TOP (@top)
        a.Id AS ActorId,
        a.Name AS ActorName,
        a.BirthYear,
        c.Name AS CharacterName
    FROM Actor a
    INNER JOIN Character c ON a.Id = c.ActorId
    INNER JOIN Series_Character sc ON c.Id = sc.CharacterId
    WHERE sc.SeriesId = @seriesId
    ORDER BY a.Name;
END
GO
```