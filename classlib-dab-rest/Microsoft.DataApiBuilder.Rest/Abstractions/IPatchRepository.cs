
using Microsoft.DataApiBuilder.Rest.Options;

namespace Microsoft.DataApiBuilder.Rest.Abstractions;

public interface IPatchRepository<T> where T : class
{
    /// <summary>
    /// Inserts or updates (when key not found) an item in the table.
    /// </summary>
    /// <returns>The inserted or updated item.</returns>
    Task<DabResponse<T, T>> PatchAsync(T item, PatchOptions? apiOptions = null, CancellationToken? cancellationToken = null);
}
