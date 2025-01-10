# POCO Generator for Data API builder

A Visual Studio Code extension that generates POCO models from Data API builder configuration files.

![](https://github.com/JerryNixon/data-api-builder-vscode-ext/blob/master/poco-data-api-builder/images/screenshot.png?raw=true)

## Features

- Adds a right-click context menu for files named `dab-config.json`.
- Automatically generates C# code that developers can integrate into their projects.

## Sample

### Configuration file

```json
{
 "entities": {
    "User": {
      "source": {
        "object": "dbo.User",
        "type": "table",
        "key-fields": [
          "Id"
        ]
      },
      "mappings": {
        "Id": "Id",
        "Birth": "Birth",
        "Name": "Name",
        "Special": "SpecialSomething",
        "Description": "Description"
      }
    }
  }
}
```

The `mappings` property is optional for Data API builder entities in the configuration file. If present, the generation will obey the mapped names. If `mappings` is absent, it will use the names directly from the database. Database object names might sometimes be incompatible with C#, such as containing spaces or starting with a number. In those cases, it is up to the developer to update and resolve them.

### Database schema

```sql
CREATE TABLE dbo.STATE (
    ID INT PRIMARY KEY,
    Birth DATETIME,
    SpecialSomething UNIQUEIDENTIFIER,
    Name NVARCHAR(50),
    Description NVARCHAR(255)
);
```

This is a simple example and specific to SQL. For now, that is all that is supported. Some exotic data types might cause issues, but for most types, this should work fine right out of the box.

### Generated POCO Model

```csharp
public partial class @State
{
    [JsonPropertyName("id")]
    public int @ID { get; set; }
    [JsonPropertyName("name")]
    public string @Name { get; set; } = string.Empty;
    [JsonPropertyName("birth")]
    public DateTime @Birth { get; set; }
    [JsonPropertyName("special")]
    public Guid @Special { get; set; }
    [JsonPropertyName("description")]
    public string @Description { get; set; } = string.Empty;
}
```

## How does it work

As you know, VSCode extensions are JavaScript (TypeScript), which means we are limited to the JavaScript `mssql` driver, which does not support LocalDb.

Using the connection string in your configuration file (or `.env` or environment), we run a simple script against your database that reads the schema and types and outputs them as a formatted C# model. Pretty simple, really. The most complex part is handling the mappings.

## Customizations

There's no T4 template or anything like that, just the SQL script. Because of this, there are no customizations supported. Maybe someday, but not today. This gets most of you 100% of the way and the rest closer to 90%.