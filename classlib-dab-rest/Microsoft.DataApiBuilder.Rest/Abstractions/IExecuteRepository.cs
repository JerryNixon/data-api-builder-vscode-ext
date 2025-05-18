
using Microsoft.DataApiBuilder.Rest.Options;

namespace Microsoft.DataApiBuilder.Rest.Abstractions;

public interface IExecuteRepository<T> where T : class
{
    /// <summary>
    /// Executes a stored procedure or function.
    /// </summary>
    /// <returns>A list of items, depending on procedure implementation.</returns>
    Task<DabResponse<T, T[]>> ExecuteAsync(ExecuteOptions apiOptions, CancellationToken? cancellationToken = null);
}
