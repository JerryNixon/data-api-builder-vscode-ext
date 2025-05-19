using System.Net.Http.Json;
using Microsoft.DataApiBuilder.Rest.Options;
using static Microsoft.DataApiBuilder.Rest.Utility;

namespace Microsoft.DataApiBuilder.Rest.Abstractions;

public abstract class BaseRepository<T>(string baseUrl, HttpClient? http = null) where T : class
{
    private readonly Uri baseUri = new(baseUrl, UriKind.Absolute);

    public async Task<bool> IsAvailableAsync(int timeoutInSeconds = 30)
    {
        var baseUrl = $"{baseUri.Scheme}://{baseUri.Authority}";
        return await IsApiAvailableAsync(baseUrl, timeoutInSeconds);
    }

    // this uses the NextPage property
    protected async Task<DabResponse<T, T[]>> GetNextAsync(DabResponse<T, T[]> previous, GetOptions? options = null, CancellationToken? cancellationToken = null)
    {
        if (string.IsNullOrEmpty(previous.NextPage))
        {
            return new DabResponse<T, T[]>() { Options = options }; // empty response
        }

        CreateHttpClientAndAddHeaders(ref http, options, previous.Options);

        var uri = new Uri(previous.NextPage, UriKind.Absolute);
        var response = await http!.GetAsync(uri, cancellationToken ?? CancellationToken.None);
        return await response.EnsureSuccessAndConvertToDabResponseAsync<T, T[]>(options);
    }

    protected async Task<DabResponse<T, T[]>> GetAsync(GetOptions? options = null, CancellationToken? cancellationToken = null)
    {
        CreateHttpClientAndAddHeaders(ref http, options);

        var uriBuilder = new UriBuilder(baseUrl)
        {
            Query = options?.BuildQueryStringFromOptions()
        };
        var response = await http!.GetAsync(uriBuilder.Uri, cancellationToken ?? CancellationToken.None);
        return await response.EnsureSuccessAndConvertToDabResponseAsync<T, T[]>(options);
    }

    protected async Task<DabResponse<T, T>> PostAsync(T item, PostOptions? options = null, CancellationToken? cancellationToken = null)
    {
        ArgumentNullException.ThrowIfNull(item);

        CreateHttpClientAndAddHeaders(ref http, options);

        var response = await http!.PostAsJsonAsync(baseUri, item, cancellationToken ?? CancellationToken.None);
        return await response.EnsureSuccessAndConvertToDabResponseAsync<T, T>(options);
    }

    protected async Task<DabResponse<T, T>> PutAsync(T item, PutOptions? options = null, CancellationToken? cancellationToken = null)
    {
        ArgumentNullException.ThrowIfNull(item);

        CreateHttpClientAndAddHeaders(ref http, options);

        var uri = item.BuildUriWithKeyProperties(baseUri);
        var content = item.SerializeWithoutKeyProperties();
        var response = await http!.PutAsync(uri, content, cancellationToken ?? CancellationToken.None);
        return await response.EnsureSuccessAndConvertToDabResponseAsync<T, T>(options);
    }

    protected async Task<DabResponse<T, T>> PatchAsync(T item, PatchOptions? options = null, CancellationToken? cancellationToken = null)
    {
        ArgumentNullException.ThrowIfNull(item);

        CreateHttpClientAndAddHeaders(ref http, options);

        var uri = item.BuildUriWithKeyProperties(baseUri);
        var content = item.SerializeWithoutKeyProperties();
        var response = await http!.PatchAsync(uri, content, cancellationToken ?? CancellationToken.None);
        return await response.EnsureSuccessAndConvertToDabResponseAsync<T, T>(options);
    }

    /// <inheritdoc />
    protected async Task<DabResponse> DeleteAsync(T item, DeleteOptions? options = null, CancellationToken? cancellationToken = null)
    {
        ArgumentNullException.ThrowIfNull(item);

        CreateHttpClientAndAddHeaders(ref http, options);

        var uri = item.BuildUriWithKeyProperties(baseUri);
        var response = await http!.DeleteAsync(uri, cancellationToken ?? CancellationToken.None);
        return await response.EnsureSuccessAndConvertToDabResponseAsync(options);
    }

    protected async Task<DabResponse<T, T[]>> ExecuteAsync(ExecuteOptions options, CancellationToken? cancellationToken = null)
    {
        return options.Method switch
        {
            ExecuteHttpMethod.GET => await ExecuteProcedureGetAsync(options),
            ExecuteHttpMethod.POST => await ExecuteProcedurePostAsync(options),
            _ => throw new InvalidOperationException("Invalid API method.")
        };
    }

    private async Task<DabResponse<T, T[]>> ExecuteProcedureGetAsync(ExecuteOptions options, CancellationToken? cancellationToken = null)
    {
        CreateHttpClientAndAddHeaders(ref http, options);

        var uriBuilder = new UriBuilder(baseUri)
        {
            Query = BuildQueryStringFromParameters(options)
        };

        uriBuilder.Query += options.ToQueryString();

        try
        {
            var response = await http!.GetAsync(uriBuilder.Uri, cancellationToken ?? CancellationToken.None);
            return await response.EnsureSuccessAndConvertToDabResponseAsync<T, T[]>(options);
        }
        catch (HttpRequestException ex) when (ex.StatusCode == System.Net.HttpStatusCode.MethodNotAllowed)
        {
            throw new InvalidOperationException($"Ensure the {{StoredProcedure}}.rest.method property is configured to support {options.Method}.", ex);
        }
        catch
        {
            throw;
        }

        static string? BuildQueryStringFromParameters(ExecuteOptions options)
        {
            if (options.Parameters.Count == 0)
            {
                return null;
            }

            return options.Parameters.Aggregate("?", (q, kv) =>
                    $"{q}{Uri.EscapeDataString(kv.Key)}={Uri.EscapeDataString(kv.Value)}&").TrimEnd('&');
        }
    }

    private async Task<DabResponse<T, T[]>> ExecuteProcedurePostAsync(ExecuteOptions options, CancellationToken? cancellationToken = null)
    {
        CreateHttpClientAndAddHeaders(ref http, options);

        var response = await http!.PostAsync(baseUri, options.ToJsonContent(), cancellationToken ?? CancellationToken.None);
        return await response.EnsureSuccessAndConvertToDabResponseAsync<T, T[]>(options);
    }
}
