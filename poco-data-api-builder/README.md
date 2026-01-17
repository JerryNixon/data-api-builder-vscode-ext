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