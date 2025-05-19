using Microsoft.DataApiBuilder.Rest.Abstractions;
using Microsoft.DataApiBuilder.Rest.Options;

namespace Microsoft.DataApiBuilder.Rest;

public class ProcedureRepository<T>(Uri entityUri, HttpClient? http = null) :
    BaseRepository<T>(entityUri.ToString(), http),
    IExecuteRepository<T>, IProcedureRepository<T> where T : class
{
    public new Task<bool> IsAvailableAsync(int timeoutInSeconds = 30)
    {
        return base.IsAvailableAsync(timeoutInSeconds);
    }

    public new Task<DabResponse<T, T[]>> ExecuteAsync(ExecuteOptions options, CancellationToken? cancellationToken = null)
    {
        return base.ExecuteAsync(options, cancellationToken);
    }
}
