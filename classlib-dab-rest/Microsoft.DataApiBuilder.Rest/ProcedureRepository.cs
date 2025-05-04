using Microsoft.DataApiBuilder.Rest.Abstractions;
using Microsoft.DataApiBuilder.Rest.Options;

using static Microsoft.DataApiBuilder.Rest.Options.ProcedureOptions;

using static Microsoft.DataApiBuilder.Rest.Utility;

namespace Microsoft.DataApiBuilder.Rest;

public class ProcedureRepository<T>(Uri entityUri, HttpClient? http = null)
    : RepositoryBase(entityUri, http), IProcedureRepository<T> where T : class
{
    public async Task<DabResponse<T, T[]>> ExecuteProcedureAsync(ProcedureOptions options, CancellationToken? cancellationToken = null)
    {
        return options.Method switch
        {
            ApiMethod.GET => await ExecuteProcedureGetAsync(options),
            ApiMethod.POST => await ExecuteProcedurePostAsync(options),
            _ => throw new InvalidOperationException("Invalid API method.")
        };
    }

    private async Task<DabResponse<T, T[]>> ExecuteProcedureGetAsync(ProcedureOptions options, CancellationToken? cancellationToken = null)
    {
        CreateHttpClientAndAddHeaders(ref http, options);

        var uriBuilder = new UriBuilder(entityUri)
        {
            Query = BuildQueryStringFromParameters(options)
        };

        var response = await http!.GetAsync(uriBuilder.Uri, cancellationToken ?? CancellationToken.None);
        return await response.EnsureSuccessAndConvertToDabResponseAsync<T, T[]>(options);

        static string? BuildQueryStringFromParameters(ProcedureOptions options)
        {
            if (options.Parameters.Count == 0)
            {
                return null;
            }

            return options.Parameters.Aggregate("?", (q, kv) =>
                    $"{q}{Uri.EscapeDataString(kv.Key)}={Uri.EscapeDataString(kv.Value)}&").TrimEnd('&');
        }
    }

    private async Task<DabResponse<T, T[]>> ExecuteProcedurePostAsync(ProcedureOptions options, CancellationToken? cancellationToken = null)
    {
        CreateHttpClientAndAddHeaders(ref http, options);

        var response = await http!.PostAsync(entityUri, options.ToJsonContent(), cancellationToken ?? CancellationToken.None);
        return await response.EnsureSuccessAndConvertToDabResponseAsync<T, T[]>(options);
    }
}
