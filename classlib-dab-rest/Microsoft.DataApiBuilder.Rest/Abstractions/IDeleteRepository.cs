
using Microsoft.DataApiBuilder.Rest.Options;

namespace Microsoft.DataApiBuilder.Rest.Abstractions;

public interface IDeleteRepository<T> where T : class
{
    /// <summary>
    /// Deletes an item from the table.
    /// </summary>
    /// <returns>Nothing. A lack of exception is indication of success.</returns>
    Task<DabResponse> DeleteAsync(T item, DeleteOptions? apiOptions = null, CancellationToken? cancellationToken = null);
}
