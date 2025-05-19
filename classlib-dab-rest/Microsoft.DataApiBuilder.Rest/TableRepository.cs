using Microsoft.DataApiBuilder.Rest.Abstractions;
using Microsoft.DataApiBuilder.Rest.Options;

namespace Microsoft.DataApiBuilder.Rest;

public class TableRepository<T>(Uri entityUri, HttpClient? http = null) :
    BaseRepository<T>(entityUri.ToString(), http), ITableRepository<T> where T : class
{
    public new Task<bool> IsAvailableAsync(int timeoutInSeconds = 30)
    {
        return base.IsAvailableAsync(timeoutInSeconds);
    }

    public new Task<DabResponse<T, T[]>> GetAsync(GetOptions? apiGetOptions = null, CancellationToken? cancellationToken = null)
    {
        return base.GetAsync(apiGetOptions, cancellationToken);
    }

    public new Task<DabResponse<T, T[]>> GetNextAsync(DabResponse<T, T[]> previous, GetOptions? options = null, CancellationToken? cancellationToken = null)
    {
        return base.GetNextAsync(previous, options, cancellationToken);
    }

    public new Task<DabResponse<T, T>> PostAsync(T item, PostOptions? apiOptions = null, CancellationToken? cancellationToken = null)
    {
        return base.PostAsync(item, apiOptions, cancellationToken);
    }

    public new Task<DabResponse<T, T>> PutAsync(T item, PutOptions? apiOptions = null, CancellationToken? cancellationToken = null)
    {
        return base.PutAsync(item, apiOptions, cancellationToken);
    }

    public new Task<DabResponse<T, T>> PatchAsync(T item, PatchOptions? apiOptions = null, CancellationToken? cancellationToken = null)
    {
        return base.PatchAsync(item, apiOptions, cancellationToken);
    }

    /// <inheritdoc />
    public new Task<DabResponse> DeleteAsync(T item, DeleteOptions? apiOptions = null, CancellationToken? cancellationToken = null)
    {
        return base.DeleteAsync(item, apiOptions, cancellationToken);
    }
}
