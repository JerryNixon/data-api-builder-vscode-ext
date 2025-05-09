using System.Text.Json;
using ModelContextProtocol.Client;
using ModelContextProtocol.Protocol.Transport;

namespace Mcp.Client;

public static class McpClientEntry
{
    public static async Task<IMcpClient> ConnectSseAsync(Uri uri)
    {
        var transport = new SseClientTransport(new SseClientTransportOptions
        {
            Endpoint = uri
        });

        return await McpClientFactory.CreateAsync(transport, new McpClientOptions
        {
            ClientInfo = new() { Name = "McpSseClient", Version = "1.0.0" }
        });
    }

    public static async Task<IMcpClient> ConnectStdAsync(string projectPath)
    {
        var transport = new StdioClientTransport(new StdioClientTransportOptions
        {
            Name = "Mcp.Server",
            Command = "dotnet",
            Arguments = ["run", "--project", projectPath]
        });

        return await McpClientFactory.CreateAsync(transport, new McpClientOptions
        {
            ClientInfo = new() { Name = "McpStdClient", Version = "1.0.0" }
        });
    }
}