namespace Microsoft.DataApiBuilder.Rest.Abstractions;

using System.Net.Http.Json;

using Microsoft.DataApiBuilder.Rest.Options;
using Microsoft.DataApiBuilder.Rest;

public class TableRepository<T>(Uri entityUri, HttpClient? httpClient = null) 
    : ITableRepository<T> where T : class
{
    public async Task<T[]> GetAsync(TableOptions? options = null)
    {
        var http = httpClient ?? new();
        options?.AddHeadersToHttpClient(http);

        var uriBuilder = new UriBuilder(entityUri)
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

    public async Task<T> PostAsync(T item, OptionsBase? options = null)
    {
        ArgumentNullException.ThrowIfNull(item);

        var http = httpClient ?? new();
        options?.AddHeadersToHttpClient(http);

        var response = await http.PostAsJsonAsync(entityUri, item);
        if (httpClient is null)
        {
            http.Dispose();
        }

        return (await response.EnsureSuccessAsync<T>()).Single();
    }

    public async Task<T> PutAsync(T item, OptionsBase? options = null)
    {
        ArgumentNullException.ThrowIfNull(item);

        var http = httpClient ?? new();
        options?.AddHeadersToHttpClient(http);

        var uri = item.BuildUriWithKeyProperties(entityUri);
        var content = item.SerializeWithoutKeyProperties();
        var response = await http.PutAsync(uri, content);
        if (httpClient is null)
        {
            http.Dispose();
        }

        return (await response.EnsureSuccessAsync<T>()).Single();
    }

    public async Task<T> PatchAsync(T item, OptionsBase? apiOptions = null)
    {
        ArgumentNullException.ThrowIfNull(item);

        var http = httpClient ?? new();
        apiOptions?.AddHeadersToHttpClient(http);

        var uri = item.BuildUriWithKeyProperties(entityUri);
        var content = item.SerializeWithoutKeyProperties();
        var response = await http.PatchAsync(uri, content);
        if (httpClient is null)
        {
            http.Dispose();
        }

        return (await response.EnsureSuccessAsync<T>()).Single();
    }

    public async Task DeleteAsync(T item, OptionsBase? options = null)
    {
        ArgumentNullException.ThrowIfNull(item);
    
        var http = httpClient ?? new();
        options?.AddHeadersToHttpClient(http);

        var uri = item.BuildUriWithKeyProperties(entityUri);
        var response = await http.DeleteAsync(uri);
        if (httpClient is null)
        {
            http.Dispose();
        }

        response.EnsureSuccessStatusCode();
    }
}
