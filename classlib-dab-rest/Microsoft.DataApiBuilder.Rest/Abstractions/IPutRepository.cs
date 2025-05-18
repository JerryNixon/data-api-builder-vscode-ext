
using Microsoft.DataApiBuilder.Rest.Options;

namespace Microsoft.DataApiBuilder.Rest.Abstractions;

public interface IPutRepository<T> where T : class
{
    /// <summary>
    /// Updates an existing item in the table.
    /// </summary>
    /// <returns>The updated item.</returns>
    Task<DabResponse<T, T>> PutAsync(T item, PutOptions? apiOptions = null, CancellationToken? cancellationToken = null);
}
