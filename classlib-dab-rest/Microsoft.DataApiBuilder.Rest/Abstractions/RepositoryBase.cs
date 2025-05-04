using static Microsoft.DataApiBuilder.Rest.Utility;

namespace Microsoft.DataApiBuilder.Rest.Abstractions;

public abstract class RepositoryBase
{
    protected readonly Uri entityUri;
    protected HttpClient? http;

    public RepositoryBase(Uri entityUri, HttpClient? http = null)
    {
        this.entityUri = entityUri;
        this.http = http;
    }

    public async Task<bool> IsAvailableAsync(int timeoutInSeconds = 30)
    {
        var baseUri = $"{entityUri.Scheme}://{entityUri.Authority}";
        return await IsApiAvailableAsync(baseUri, timeoutInSeconds);
    }
}
