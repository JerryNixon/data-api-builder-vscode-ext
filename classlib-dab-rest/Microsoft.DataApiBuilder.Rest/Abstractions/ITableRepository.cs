
using Microsoft.DataApiBuilder.Rest.Options;

namespace Microsoft.DataApiBuilder.Rest.Abstractions;
public interface ITableRepository<T> where T : class
{
    Task<DabResponse<T, T[]>> GetAsync(TableOptions? apiGetOptions = null);

    Task<DabResponse<T, T[]>> GetAsync(DabResponse<T, T[]> previous, TableOptions? options = null);

    Task<DabResponse<T, T>> PostAsync(T item, TableOptions? apiOptions = null);

    Task<DabResponse<T, T>> PutAsync(T item, TableOptions? apiOptions = null);

    Task<DabResponse<T, T>> PatchAsync(T item, TableOptions? apiOptions = null);

    Task<DabResponse> DeleteAsync(T item, TableOptions? apiOptions = null);
}
