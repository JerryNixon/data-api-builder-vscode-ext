
using Microsoft.DataApiBuilder.Rest.Options;

namespace Microsoft.DataApiBuilder.Rest.Abstractions;

public interface IGetRepository<T> where T : class
{
    /// <summary>
    /// Get a single item by its ID.
    /// </summary>
    /// <returns>A paginationd list of items.</returns>
    Task<DabResponse<T, T[]>> GetAsync(GetOptions? apiGetOptions = null, CancellationToken? cancellationToken = null);

    /// <summary>
    /// Get the next page of items.
    /// </summary>
    /// <returns>A paginated list of items.</returns>
    Task<DabResponse<T, T[]>> GetNextAsync(DabResponse<T, T[]> previous, GetOptions? options = null, CancellationToken? cancellationToken = null);
}
