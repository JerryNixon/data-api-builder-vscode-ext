using System.Reflection;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

var builder = Host.CreateApplicationBuilder(args);

builder.Logging.AddConsole(consoleLogOptions =>
{
    // Configure all logs to go to stderr
    consoleLogOptions.LogToStandardErrorThreshold = LogLevel.Trace;
});

builder.Services
    .AddMcpServer()
    .WithStdioServerTransport()
    .WithToolsFromAssembly();

AddRepositories(builder.Services);

await builder.Build().RunAsync();

static void AddRepositories(IServiceCollection services, string baseUrl)
{
    foreach (var model in ModelsFromAssembly())
    {
        var repoType = typeof(TableRepository<>).MakeGenericType(model);
        var ifaceType = typeof(ITableRepository<>).MakeGenericType(model);

        services.AddTransient(ifaceType, serviceProvider =>
            Activator.CreateInstance(repoType, new Uri(baseUrl))!);
    }

    static IEnumerable<Type> ModelsFromAssembly()
    {
        var assembly = Assembly.Load("Mcp.Shared");

        return assembly.GetTypes().Where(OnlyModels);

        static bool OnlyModels(Type type)
        {
            return type.IsClass &&
                   type.IsPublic &&
                   type.Namespace == "Mcp.Models";
        }
    }
}