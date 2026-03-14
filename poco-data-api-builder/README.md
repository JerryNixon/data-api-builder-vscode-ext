# POCO Generator for Data API builder

A Visual Studio Code extension that generates C# models, repositories, and a client console application from Data API builder configuration files. It produces a complete, self-contained .NET 8 solution with no third-party dependencies.

![](https://github.com/JerryNixon/data-api-builder-vscode-ext/blob/master/poco-data-api-builder/images/screenshot.png?raw=true)

## Features

- Adds a right-click context menu for files named `dab-config.json`.
- Generates a complete C# solution in a `Gen` folder:
  - **Models/**: C# 12 records for each entity with `[Key]` and `[JsonPropertyName]` attributes
  - **Repositories/**: Entity-specific repository classes and a `RestRepository` super-repository
  - **Repositories/Rest/**: Static infrastructure code (interfaces, base classes, response types)
  - **Client/**: Sample console application demonstrating usage
  - **Gen.sln**: Visual Studio solution file
  - **diagram.md**: Mermaid diagram visualizing the generated structure

## Generated Code

### Models

Models are generated as C# 12 records with positional parameters:

```csharp
public record Actor(
    [property: Key][property: JsonPropertyName("Id")] int Id,
    [property: JsonPropertyName("Name")] string? Name
)
{
    public object WithoutKeys() => new { Name };
};
```

### Repositories

Each entity gets a dedicated repository implementing `ITableRepository<T>` (for tables/views) or `IProcedureRepository<T>` (for stored procedures):

```csharp
public sealed class ActorRepository : RepositoryBase<Actor>, ITableRepository<Actor>
{
    public Task<Actor> CreateAsync(Actor item);
    public Task<Actor[]> ReadAsync(int? first = null, string? select = null, string? filter = null, string? sort = null, string? nextPage = null);
    public Task<Actor> UpdateAsync(Actor item, string[]? fields = null);
    public Task DeleteAsync(Actor item);
}
```

### RestRepository

The `RestRepository` aggregates all entity repositories with a shared `HttpClient`:

```csharp
public class RestRepository(string baseUrl, string apiPath = "api", string? x_ms_api_role = null)
{
    public static HttpClient HttpClient { get; set; } = new();
    public ITableRepository<Actor> ActorRepository { get; }
    public Task<bool> IsAvailableAsync(int timeoutInSeconds = 30);
}
```

## Requirements

- .NET 8 SDK (for running the generated code)
- SQL Server database with entities matching your DAB config

## Customizations

The generated code is self-contained and can be freely modified. The `Repositories/Rest` folder contains the infrastructure code that is shared across all repositories.

## Release Notes

### 0.1.0 - 2026-01-16

**Added**
- Self-contained C# solution: Generated code has zero third-party dependencies
- Repositories/Rest/ infrastructure: Static infrastructure code copied to output
  - `RepositoryBase<T>` - Base class for all entity repositories
  - `ITableRepository<T>` - Interface for table/view repositories
  - `IProcedureRepository<T>` - Interface for stored procedure repositories
  - `ResponseRoot<T>` - Response wrapper matching DAB REST response format
  - `ResponseError` - Error handling with status codes
  - `ResponseException` - Exception type for failed operations
  - `Extensions` - Utility extensions (IsAvailableAsync)
- RestRepository: Super-repository aggregating all entity repositories with shared static HttpClient
- C# 12 records: Models use positional parameters with property attributes
- WithoutKeys() method: Returns anonymous object excluding key properties (for tables/views)
- Procedure parameters: Stored procedure repositories support typed parameters

**Changed**
- Complete architecture rewrite: Removed dependency on third-party REST libraries
- File organization for future languages: Code isolated in src/csharp/ for future Python/Rust support
- Simplified Program.cs: Client uses RestRepository pattern with IsAvailableAsync check
- Clean generated code: Minimal, idiomatic C# 12/.NET 8 code without excessive comments

**Technical**
- Static resources in resources/csharp/ copied to output
- Modular code generation: generators.ts, fileWriter.ts, mermaidGenerator.ts, index.ts
- EntityDefinition extended with relationships property
- Improved Mermaid diagrams with entity relationships