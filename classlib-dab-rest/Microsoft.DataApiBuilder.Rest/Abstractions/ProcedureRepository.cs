namespace Microsoft.DataApiBuilder.Rest.Abstractions;

using Microsoft.DataApiBuilder.Rest.Options;

using static Microsoft.DataApiBuilder.Rest.Options.ProcedureOptions;

public abstract class ProcedureRepository<T>(Uri entityUri, HttpClient? httpClient = null) 
    : IProcedureRepository<T> where T : class
{
    public async Task<T[]> ExecuteProcedureAsync(ProcedureOptions options)
    {
        return options.Method switch
        {
            ApiMethod.GET => await ExecuteProcedureGetAsync(options),
            ApiMethod.POST => await ExecuteProcedurePostAsync(options),
            _ => throw new InvalidOperationException("Invalid API method.")
        };
    }

    private async Task<T[]> ExecuteProcedureGetAsync(ProcedureOptions options)
    {
        var http = httpClient ?? new();
        options.AddHeadersToHttpClient(http);

        var uriBuilder = new UriBuilder(entityUri)
        {
            Query = BuildQueryStringFromParameters(options)
        };

        var response = await http.GetAsync(uriBuilder.Uri);
        if (httpClient is null)
        {
            http.Dispose();
        }

        return await response.EnsureSuccessAsync<T>() ?? [];

        static string? BuildQueryStringFromParameters(ProcedureOptions options)
        {
            return options.Parameters?
                .Where(kv => !string.IsNullOrWhiteSpace(kv.Key) && !string.IsNullOrWhiteSpace(kv.Value))
                .Select(kv => $"{Uri.EscapeDataString(kv.Key)}={Uri.EscapeDataString(kv.Value)}")
                .Aggregate((a, b) => $"{a}&{b}");
        }
    }

    private async Task<T[]> ExecuteProcedurePostAsync(ProcedureOptions options)
    {
        var http = httpClient ?? new();
        options.AddHeadersToHttpClient(http);

        var response = await http.PostAsync(entityUri, options.ToJsonContent());
        if (httpClient is null)
        {
            http.Dispose();
        }

        return await response.EnsureSuccessAsync<T>() ?? [];
    }
}
