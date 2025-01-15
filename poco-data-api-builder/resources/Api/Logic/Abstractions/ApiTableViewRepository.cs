namespace Api.Logic.Abstractions;

using System.Net.Http.Json;

using Api.Logic.Options;
using Api.Logic;

public abstract class ApiTableViewRepository<T>(Uri baseUri, HttpClient? httpClient = null) 
    : IApiTableViewRepository<T> where T : class
{
    public async Task<T[]> GetAsync(ApiTableOptions? options = null)
    {
        var http = httpClient ?? new();
        options?.AddHeadersToHttpClient(http);

        var uriBuilder = new UriBuilder(baseUri)
        {
            Query = options?.BuildQueryStringFromOptions()
        };

        var response = await http.GetAsync(uriBuilder.Uri);
        if (httpClient is null)
        {
            http.Dispose();
        }

        return await response.EnsureSuccessAsync<T>() ?? [];
    }

    public async Task<T> PostAsync(T item, ApiOptions? options = null)
    {
        ArgumentNullException.ThrowIfNull(item);

        var http = httpClient ?? new();
        options?.AddHeadersToHttpClient(http);

        var response = await http.PostAsJsonAsync(baseUri, item);
        if (httpClient is null)
        {
            http.Dispose();
        }

        return (await response.EnsureSuccessAsync<T>()).Single();
    }

    public async Task<T> PutAsync(T item, ApiOptions? options = null)
    {
        ArgumentNullException.ThrowIfNull(item);

        var http = httpClient ?? new();
        options?.AddHeadersToHttpClient(http);

        var uri = item.BuildUriWithKeyProperties(baseUri);
        var content = item.SerializeWithoutKeyProperties();
        var response = await http.PutAsync(uri, content);
        if (httpClient is null)
        {
            http.Dispose();
        }

        return (await response.EnsureSuccessAsync<T>()).Single();
    }

    public async Task<T> PatchAsync(T item, ApiOptions? apiOptions = null)
    {
        ArgumentNullException.ThrowIfNull(item);

        var http = httpClient ?? new();
        apiOptions?.AddHeadersToHttpClient(http);

        var uri = item.BuildUriWithKeyProperties(baseUri);
        var content = item.SerializeWithoutKeyProperties();
        var response = await http.PatchAsync(uri, content);
        if (httpClient is null)
        {
            http.Dispose();
        }

        return (await response.EnsureSuccessAsync<T>()).Single();
    }

    public async Task DeleteAsync(T item, ApiOptions? options = null)
    {
        ArgumentNullException.ThrowIfNull(item);
    
        var http = httpClient ?? new();
        options?.AddHeadersToHttpClient(http);

        var uri = item.BuildUriWithKeyProperties(baseUri);
        var response = await http.DeleteAsync(uri);
        if (httpClient is null)
        {
            http.Dispose();
        }

        response.EnsureSuccessStatusCode();
    }
}
