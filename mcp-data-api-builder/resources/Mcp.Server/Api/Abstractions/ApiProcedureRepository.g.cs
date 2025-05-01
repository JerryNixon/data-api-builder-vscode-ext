namespace Api.Abstractions;

using Api.Options;

using static Api.Options.ApiProcedureOptions;

public abstract class ApiProcedureRepository<T>(Uri baseUri, HttpClient? httpClient = null) 
    : IApiProcedureRepository<T> where T : class
{
    private readonly HttpClient? _httpClient = httpClient;

    public async Task<T[]> ExecuteProcedureAsync(ApiProcedureOptions options)
    {
        return options.Method switch
        {
            ApiMethod.GET => await ExecuteProcedureGetAsync(options),
            ApiMethod.POST => await ExecuteProcedurePostAsync(options),
            _ => throw new InvalidOperationException("Invalid API method.")
        };
    }

    private async Task<T[]> ExecuteProcedureGetAsync(ApiProcedureOptions options)
    {
        var http = _httpClient ?? new();
        options.AddHeadersToHttpClient(http);

        var uriBuilder = new UriBuilder(baseUri)
        {
            Query = BuildQueryStringFromParameters(options)
        };

        var response = await http.GetAsync(uriBuilder.Uri);
        if (_httpClient is null)
        {
            http.Dispose();
        }

        return await response.EnsureSuccessAsync<T>() ?? [];

        static string? BuildQueryStringFromParameters(ApiProcedureOptions options)
        {
            return options.Parameters?
                .Where(kv => !string.IsNullOrWhiteSpace(kv.Key) && !string.IsNullOrWhiteSpace(kv.Value))
                .Select(kv => $"{Uri.EscapeDataString(kv.Key)}={Uri.EscapeDataString(kv.Value)}")
                .Aggregate((a, b) => $"{a}&{b}");
        }
    }

    private async Task<T[]> ExecuteProcedurePostAsync(ApiProcedureOptions options)
    {
        var http = _httpClient ?? new();
        options.AddHeadersToHttpClient(http);

        var response = await http.PostAsync(baseUri, options.ToJsonContent());
        if (_httpClient is null)
        {
            http.Dispose();
        }

        return await response.EnsureSuccessAsync<T>() ?? [];
    }
}
