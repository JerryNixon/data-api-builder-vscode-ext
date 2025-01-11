namespace Api.Logic;

/*
    Attention: this generic code should be reusable across
    every Data API builder project without modification.
    Having said that, this isn't special code. Treat
    it as a fully function starting place. You may need to
    modify, but 90% of you will just leave this alone.
*/

using System.ComponentModel.DataAnnotations;
using System.Diagnostics;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

public abstract class ApiTableViewRepository<T> : ApiRepository<T>, IApiTableViewRepository<T> where T : class
{
    private readonly HttpClient? _httpClient;

    public ApiTableViewRepository(Uri baseUri, HttpClient? httpClient = null) : base(baseUri)
    {
        _httpClient = httpClient;
    }

    public async Task<T[]> GetAsync(ApiTableViewGetOptions? options = null)
    {
        var http = _httpClient ?? new();
        options?.AddHeaders(http);

        var uriBuilder = new UriBuilder(BaseUri)
        {
            Query = options?.ToQueryString()
        };

        var response = await http.GetAsync(uriBuilder.Uri);
        if (_httpClient is null)
        {
            http.Dispose();
        }
        return (await EnsureSuccessAsync(response)) ?? [];
    }

    public async Task<T> PostAsync(T item, options? options = null)
    {
        ArgumentNullException.ThrowIfNull(item);

        var http = _httpClient ?? new();
        options?.AddHeaders(http);

        var response = await http.PostAsJsonAsync(BaseUri, item);
        if (_httpClient is null)
        {
            http.Dispose();
        }
        return (await EnsureSuccessAsync(response)).Single();
    }

    public async Task<T> PutAsync(T item, options? options = null)
    {
        ArgumentNullException.ThrowIfNull(item);

        var http = _httpClient ?? new();
        options?.AddHeaders(http);

        var uri = BuildUriWithKeyProperties(item);
        var content = SerializeWithoutKeyProperties(item);
        var response = await http.PutAsync(uri, content);
        if (_httpClient is null)
        {
            http.Dispose();
        }
        return (await EnsureSuccessAsync(response)).Single();
    }

    public async Task<T> PatchAsync(T item, options? apiOptions = null)
    {
        ArgumentNullException.ThrowIfNull(item);

        var http = _httpClient ?? new();
        apiOptions?.AddHeaders(http);

        var uri = BuildUriWithKeyProperties(item);
        var content = SerializeWithoutKeyProperties(item);
        var response = await http.PatchAsync(uri, content);
        if (_httpClient is null)
        {
            http.Dispose();
        }
        return (await EnsureSuccessAsync(response)).Single();
    }

    public async Task DeleteAsync(T item, options? options = null)
    {
        var http = _httpClient ?? new();
        options?.AddHeaders(http);

        var uri = BuildUriWithKeyProperties(item);
        var response = await http.DeleteAsync(uri);
        if (_httpClient is null)
        {
            http.Dispose();
        }
        response.EnsureSuccessStatusCode();
    }
}

public abstract class ApiProcedureRepository<T> : ApiRepository<T>, IApiProcedureRepository<T> where T : class
{
    private readonly Uri _baseUri;
    private readonly HttpClient? _httpClient;

    public ApiProcedureRepository(Uri baseUri, HttpClient? httpClient = null) : base(baseUri)
    {
        _baseUri = baseUri;
        _httpClient = httpClient;
    }

    public async Task<T[]> ExecuteProcedureAsync(ApiStoredProcedureExecOptions options)
    {
        return options.Method switch
        {
            ApiStoredProcedureExecOptions.ApiMethod.GET => await ExecuteProcedureGetAsync(options),
            ApiStoredProcedureExecOptions.ApiMethod.POST => await ExecuteProcedurePostAsync(options),
            _ => throw new InvalidOperationException("Invalid API method.")
        };
    }

    private async Task<T[]> ExecuteProcedureGetAsync(ApiStoredProcedureExecOptions options)
    {
        var http = _httpClient ?? new();
        options.AddHeaders(http);

        var uriBuilder = new UriBuilder(_baseUri)
        {
            Query = options.ToQueryString()
        };

        var response = await http.GetAsync(uriBuilder.Uri);
        if (_httpClient is null)
        {
            http.Dispose();
        }

        return (await EnsureSuccessAsync(response)) ?? [];
    }

    private async Task<T[]> ExecuteProcedurePostAsync(ApiStoredProcedureExecOptions options)
    {
        var http = _httpClient ?? new();
        options.AddHeaders(http);

        var response = await http.PostAsync(_baseUri, options.ToJsonContent());
        if (_httpClient is null)
        {
            http.Dispose();
        }

        return (await EnsureSuccessAsync(response)) ?? [];
    }
}

public class ApiRoot<T>
{
    [JsonPropertyName("value")]
    public T[]? Results { get; set; }

    [JsonPropertyName("nextLink")]
    public string? NextLink { get; set; }

    [JsonPropertyName("error")]
    public ApiError? Error { get; set; }
}

public class ApiError
{
    [JsonPropertyName("code")]
    public string Code { get; set; } = string.Empty;

    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public int Status { get; set; }
}

public interface IApiTableViewRepository<T> where T : class
{
    Task<T[]> GetAsync(ApiTableViewGetOptions? apiGetOptions = null);
    Task<T> PostAsync(T item, options? apiOptions = null);
    Task<T> PutAsync(T item, options? apiOptions = null);
    Task<T> PatchAsync(T item, options? apiOptions = null);
    Task DeleteAsync(T item, options? apiOptions = null);
}

public interface IApiProcedureRepository<T> where T : class
{
    Task<T[]> ExecuteProcedureAsync(ApiStoredProcedureExecOptions apiOptions);
}

public abstract class ApiRepository<T> where T : class
{
    protected Uri BaseUri { get; }

    protected ApiRepository(Uri baseUri)
    {
        BaseUri = baseUri;
    }

    protected Uri BuildUriWithKeyProperties(T item)
    {
        var keyProperties = typeof(T)
            .GetProperties(System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance)
            .Where(prop => Attribute.IsDefined(prop, typeof(KeyAttribute)))
            .Select(prop =>
            {
                var jsonPropertyNameAttribute = prop.GetCustomAttributes(typeof(JsonPropertyNameAttribute), true)
                    .FirstOrDefault() as JsonPropertyNameAttribute;
                var jsonPropertyName = jsonPropertyNameAttribute?.Name ?? prop.Name;
                var propertyValue = prop.GetValue(item)?.ToString();

                return string.IsNullOrEmpty(propertyValue)
                    ? throw new InvalidOperationException($"Key field '{prop.Name}' cannot have a null or empty value.")
                    : (new { Name = jsonPropertyName, Value = propertyValue });
            })
            .ToList();

        if (keyProperties.Count == 0)
        {
            throw new KeyNotFoundException($"No key properties defined for type {typeof(T).Name}.");
        }

        var pathSegments = keyProperties
            .Select(kp => $"{kp.Name}/{Uri.EscapeDataString(kp.Value)}");

        var fullPath = string.Join("/", pathSegments);
        var uri = new Uri(new Uri(BaseUri.ToString(), UriKind.Absolute), fullPath);

        Debug.WriteLine(uri.ToString());
        return uri;
    }

    protected static JsonContent SerializeWithoutKeyProperties(T item)
    {
        var keyProperties = typeof(T)
            .GetProperties(System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance)
            .Where(prop => Attribute.IsDefined(prop, typeof(KeyAttribute)))
            .Select(prop =>
            {
                var jsonPropertyNameAttribute = prop.GetCustomAttributes(typeof(JsonPropertyNameAttribute), true)
                    .FirstOrDefault() as JsonPropertyNameAttribute;
                return jsonPropertyNameAttribute?.Name ?? prop.Name;
            })
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        if (keyProperties.Count == 0)
        {
            throw new KeyNotFoundException($"No key properties defined for type {typeof(T).Name}.");
        }

        var jsonNode = JsonSerializer.SerializeToNode(item, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        });

        if (jsonNode is System.Text.Json.Nodes.JsonObject jsonObject)
        {
            foreach (var keyField in keyProperties)
            {
                jsonObject.Remove(keyField);
            }
        }

        Debug.WriteLine(jsonNode?.ToString());
        return JsonContent.Create(jsonNode, options: new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        });
    }

    protected static async Task<T[]> EnsureSuccessAsync(HttpResponseMessage response)
    {
        try
        {
            var url = response.RequestMessage?.RequestUri?.ToString() ?? "unknown";
            Debug.WriteLine($"{url} returned {response.StatusCode}.");
            if (!response.IsSuccessStatusCode)
            {
                Debug.WriteLine($"{url} returned {response.StatusCode}.");
                throw new HttpRequestException($"{url} returned {response.StatusCode}.", null, response.StatusCode);
            }

            var root = await response.Content.ReadFromJsonAsync<ApiRoot<T>>()
                ?? throw new InvalidOperationException("The response deserialized as null.");

            if (root.Error is not null)
            {
                throw new Exception($"Code: {root.Error.Code}, Message: {root.Error.Message}, Status: {root.Error.Status}");
            }
            else if (root.Results is null)
            {
                throw new Exception("The response did not contain any results.");
            }

            return root.Results;
        }
        finally
        {
            response?.Dispose();
        }
    }
}

public class options
{
    public string? XMsApiRole { get; set; }
    public string? Authorization { get; set; }

    public void AddHeaders(HttpClient httpClient)
    {
        AddHttpHeader(httpClient, "x-ms-api-role", XMsApiRole);
        AddHttpHeader(httpClient, "Bearer", Authorization);

        static void AddHttpHeader(HttpClient httpClient, string key, string? value)
        {
            if (!string.IsNullOrEmpty(value))
            {
                httpClient.DefaultRequestHeaders.Add(key, value);
            }
            else if (string.IsNullOrEmpty(value) && httpClient.DefaultRequestHeaders.Contains(key))
            {
                httpClient.DefaultRequestHeaders.Remove(key);
            }
        }
    }
}

public class ApiStoredProcedureExecOptions : options
{
    public enum ApiMethod { GET, POST }

    public ApiMethod Method { get; set; } = ApiMethod.GET;

    public Dictionary<string, string> Parameters { get; } = [];

    public JsonContent ToJsonContent()
    {
        var filteredParameters = Parameters
            .Where(kv => !string.IsNullOrWhiteSpace(kv.Value))
            .ToDictionary(kv => kv.Key, kv => kv.Value);

        return JsonContent.Create(filteredParameters, options: new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        });
    }

    public string? ToQueryString()
    {
        var query = System.Web.HttpUtility.ParseQueryString(string.Empty);

        foreach (var (key, value) in Parameters)
        {
            if (!string.IsNullOrWhiteSpace(value))
            {
                query[key] = value;
            }
        }

        return query.Count > 0 ? query.ToString() : null;
    }
}

public class ApiTableViewGetOptions : options
{
    public string? Select { get; set; }
    public string? Filter { get; set; }
    public string? OrderBy { get; set; }
    public int? First { get; set; }
    public string? After { get; set; }

    public string? ToQueryString()
    {
        var query = System.Web.HttpUtility.ParseQueryString(string.Empty);

        AddQueryParameter(query, "$select", Select);
        AddQueryParameter(query, "$filter", Filter);
        AddQueryParameter(query, "$orderby", OrderBy);
        AddQueryParameter(query, "$first", First?.ToString());
        AddQueryParameter(query, "$after", After);

        return query.ToString();

        static void AddQueryParameter(System.Collections.Specialized.NameValueCollection query, string key, string? value)
        {
            if (!string.IsNullOrEmpty(value))
            {
                query[key] = value;
            }
        }
    }
}