
using System.Net.Http.Json;

using Microsoft.DataApiBuilder.Rest.Options;

using static Microsoft.DataApiBuilder.Rest.Utility;

namespace Microsoft.DataApiBuilder.Rest.Abstractions;
public class TableRepository<T>(Uri entityUri, HttpClient? http = null)
    : ITableRepository<T> where T : class
{
    // this uses the NextPage property
    public async Task<DabResponse<T, T[]>> GetAsync(DabResponse<T, T[]> previous, TableOptions? options = null)
    {
        if (string.IsNullOrEmpty(previous.NextPage))
        {
            return new DabResponse<T, T[]>() { Options = options }; // empty response
        }

        CreateHttpClientAndAddHeaders(ref http, options, previous.Options);

        var uri = new Uri(previous.NextPage, UriKind.Absolute);
        var response = await http!.GetAsync(uri);
        return await response.EnsureSuccessAndConvertToDabResponseAsync<T, T[]>(options);
    }

    public async Task<DabResponse<T, T[]>> GetAsync(TableOptions? options = null)
    {
        CreateHttpClientAndAddHeaders(ref http, options);

        var uriBuilder = new UriBuilder(entityUri)
        {
            Query = options?.BuildQueryStringFromOptions()
        };
        var response = await http!.GetAsync(uriBuilder.Uri);
        return await response.EnsureSuccessAndConvertToDabResponseAsync<T, T[]>(options);
    }

    public async Task<DabResponse<T, T>> PostAsync(T item, TableOptions? options = null)
    {
        ArgumentNullException.ThrowIfNull(item);

        CreateHttpClientAndAddHeaders(ref http, options);

        var response = await http!.PostAsJsonAsync(entityUri, item);
        return await response.EnsureSuccessAndConvertToDabResponseAsync<T, T>(options);
    }

    public async Task<DabResponse<T, T>> PutAsync(T item, TableOptions? options = null)
    {
        ArgumentNullException.ThrowIfNull(item);

        CreateHttpClientAndAddHeaders(ref http, options);

        var uri = item.BuildUriWithKeyProperties(entityUri);
        var content = item.SerializeWithoutKeyProperties();
        var response = await http!.PutAsync(uri, content);
        return await response.EnsureSuccessAndConvertToDabResponseAsync<T, T>(options);
    }

    public async Task<DabResponse<T, T>> PatchAsync(T item, TableOptions? options = null)
    {
        ArgumentNullException.ThrowIfNull(item);

        CreateHttpClientAndAddHeaders(ref http, options);

        var uri = item.BuildUriWithKeyProperties(entityUri);
        var content = item.SerializeWithoutKeyProperties();
        var response = await http!.PatchAsync(uri, content);
        return await response.EnsureSuccessAndConvertToDabResponseAsync<T, T>(options);
    }

    public async Task<DabResponse> DeleteAsync(T item, TableOptions? options = null)
    {
        ArgumentNullException.ThrowIfNull(item);

        CreateHttpClientAndAddHeaders(ref http, options);

        var uri = item.BuildUriWithKeyProperties(entityUri);
        var response = await http!.DeleteAsync(uri);
        return await response.EnsureSuccessAndConvertToDabResponseAsync(options);
    }
}
