# Change Log

All notable changes to the "poco-data-api-builder" extension will be documented in this file.

## [0.1.0] - 2026-01-16

### Added
- **Self-contained C# solution**: Generated code has zero third-party dependencies
- **Repositories/Rest/ infrastructure**: Static infrastructure code copied to output:
  - `RepositoryBase<T>` - Base class for all entity repositories
  - `ITableRepository<T>` - Interface for table/view repositories
  - `IProcedureRepository<T>` - Interface for stored procedure repositories
  - `ResponseRoot<T>` - Response wrapper matching DAB REST response format
  - `ResponseError` - Error handling with status codes
  - `ResponseException` - Exception type for failed operations
  - `Extensions` - Utility extensions (IsAvailableAsync)
- **RestRepository**: Super-repository aggregating all entity repositories with shared static HttpClient
- **C# 12 records**: Models use positional parameters with property attributes
- **WithoutKeys() method**: Returns anonymous object excluding key properties (for tables/views)
- **Procedure parameters**: Stored procedure repositories support typed parameters

### Changed
- **Complete architecture rewrite**: Removed dependency on third-party REST libraries
- **File organization for future languages**: Code isolated in src/csharp/ for future Python/Rust support
- **Simplified Program.cs**: Client uses RestRepository pattern with IsAvailableAsync check
- **Clean generated code**: Minimal, idiomatic C# 12/.NET 8 code without excessive comments

### Technical
- Static resources in resources/csharp/ copied to output
- Modular code generation: generators.ts, fileWriter.ts, mermaidGenerator.ts, index.ts
- EntityDefinition extended with relationships property
- Improved Mermaid diagrams with entity relationships