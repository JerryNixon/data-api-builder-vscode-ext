using Microsoft.DataApiBuilder.Rest.Options;

namespace Microsoft.DataApiBuilder.Rest.Abstractions;

public interface ITableRepository<T> where T : class
{
    Task<DabResponse> DeleteAsync(T item, DeleteOptions? apiOptions = null, CancellationToken? cancellationToken = null);
    Task<DabResponse<T, T[]>> GetAsync(GetOptions? apiGetOptions = null, CancellationToken? cancellationToken = null);
    Task<DabResponse<T, T[]>> GetNextAsync(DabResponse<T, T[]> previous, GetOptions? options = null, CancellationToken? cancellationToken = null);
    Task<bool> IsAvailableAsync(int timeoutInSeconds = 30);
    Task<DabResponse<T, T>> PatchAsync(T item, PatchOptions? apiOptions = null, CancellationToken? cancellationToken = null);
    Task<DabResponse<T, T>> PostAsync(T item, PostOptions? apiOptions = null, CancellationToken? cancellationToken = null);
    Task<DabResponse<T, T>> PutAsync(T item, PutOptions? apiOptions = null, CancellationToken? cancellationToken = null);
}
