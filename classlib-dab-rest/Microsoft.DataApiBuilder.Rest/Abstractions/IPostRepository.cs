
using Microsoft.DataApiBuilder.Rest.Options;

namespace Microsoft.DataApiBuilder.Rest.Abstractions;

public interface IPostRepository<T> where T : class
{
    /// <summary>
    /// Creates a new item in the table.
    /// </summary>
    /// <returns>The created item.</returns>
    Task<DabResponse<T, T>> PostAsync(T item, PostOptions? apiOptions = null, CancellationToken? cancellationToken = null);
}
