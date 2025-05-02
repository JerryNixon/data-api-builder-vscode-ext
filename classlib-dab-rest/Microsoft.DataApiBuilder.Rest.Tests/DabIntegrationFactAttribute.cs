using System.Net.Sockets;

namespace Microsoft.DataApiBuilder.Rest.Tests;

public sealed class DabIntegrationFactAttribute : FactAttribute
{
    public const string Host = "localhost";
    public const int Port = 5000;
    public static readonly string BaseUrl = $"http://{Host}:{Port}";

    private static readonly bool _isAvailable = CheckAvailability();

    public DabIntegrationFactAttribute()
    {
        if (!_isAvailable)
        {
            Skip = $"DAB API is not running at {BaseUrl}.";
        }
    }

    private static bool CheckAvailability()
    {
        try
        {
            using var client = new TcpClient();
            var result = client.BeginConnect(Host, Port, null, null);
            return result.AsyncWaitHandle.WaitOne(TimeSpan.FromSeconds(1)) && client.Connected;
        }
        catch
        {
            return false;
        }
    }
}
