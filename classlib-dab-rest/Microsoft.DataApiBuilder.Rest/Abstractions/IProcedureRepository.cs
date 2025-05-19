using Microsoft.DataApiBuilder.Rest.Options;

namespace Microsoft.DataApiBuilder.Rest.Abstractions;

public interface IProcedureRepository<T> where T : class
{
    Task<DabResponse<T, T[]>> ExecuteAsync(ExecuteOptions options, CancellationToken? cancellationToken = null);
    Task<bool> IsAvailableAsync(int timeoutInSeconds = 30);
}
