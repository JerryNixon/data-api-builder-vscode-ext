namespace Api.Logic;

using System.ComponentModel.DataAnnotations;
using System.Diagnostics;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

public abstract class ApiTableViewRepository<T> : ApiRepository<T>, IApiTableViewRepository<T> where T : class
{
    private readonly Uri _baseUri;
    private readonly HttpClient? _httpClient;

    public ApiTableViewRepository(Uri baseUri, HttpClient? httpClient = null) : base(baseUri)
    {
        _baseUri = baseUri;
        _httpClient = httpClient;
    }

    public async Task<T[]> GetAsync(ApiTableViewGetOptions? apiGetOptions = null)
    {
        var http = _httpClient ?? new();
        apiGetOptions?.AddHeaders(http);

        var uriBuilder = new UriBuilder(_baseUri)
        {
            Query = apiGetOptions?.ToQueryString()
        };

        var response = await http.GetAsync(uriBuilder.Uri);
        if (_httpClient is null)
        {
            http.Dispose();
        }
        return (await EnsureSuccessAsync(response)) ?? [];
    }

    public async Task<T> PostAsync(T item, ApiOptions? apiOptions = null)
    {
        ArgumentNullException.ThrowIfNull(item);

        var http = _httpClient ?? new();
        apiOptions?.AddHeaders(http);

        var response = await http.PostAsJsonAsync(_baseUri, item);
        if (_httpClient is null)
        {
            http.Dispose();
        }
        return (await EnsureSuccessAsync(response)).Single();
    }

    public async Task<T> PutAsync(T item, ApiOptions? apiOptions = null)
    {
        ArgumentNullException.ThrowIfNull(item);

        var http = _httpClient ?? new();
        apiOptions?.AddHeaders(http);

        var uri = BuildUriWithKeyProperties(item);
        var content = SerializeWithoutKeyProperties(item);
        var response = await http.PutAsync(uri, content);
        if (_httpClient is null)
        {
            http.Dispose();
        }
        return (await EnsureSuccessAsync(response)).Single();
    }

    public async Task<T> PatchAsync(T item, ApiOptions? apiOptions = null)
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

    public async Task DeleteAsync(T item, ApiOptions? apiOptions = null)
    {
        var http = _httpClient ?? new();
        apiOptions?.AddHeaders(http);

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

    public async Task<T[]> ExecuteProcedureAsync(ApiStoredProcedureExecOptions apiOptions)
    {
        return apiOptions.Method switch
        {
            ApiStoredProcedureExecOptions.ApiMethod.GET => await ExecuteProcedureGetAsync(apiOptions),
            ApiStoredProcedureExecOptions.ApiMethod.POST => await ExecuteProcedurePostAsync(apiOptions),
            _ => throw new InvalidOperationException("Invalid API method.")
        };
    }

    private async Task<T[]> ExecuteProcedureGetAsync(ApiStoredProcedureExecOptions apiOptions)
    {
        var http = _httpClient ?? new();
        apiOptions.AddHeaders(http);

        var uriBuilder = new UriBuilder(_baseUri)
        {
            Query = apiOptions.ToQueryString()
        };

        var response = await http.GetAsync(uriBuilder.Uri);
        if (_httpClient is null)
        {
            http.Dispose();
        }

        return (await EnsureSuccessAsync(response)) ?? [];
    }

    private async Task<T[]> ExecuteProcedurePostAsync(ApiStoredProcedureExecOptions apiOptions)
    {
        var http = _httpClient ?? new();
        apiOptions.AddHeaders(http);

        var response = await http.PostAsync(_baseUri, apiOptions.ToJsonContent());
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
    Task<T> PostAsync(T item, ApiOptions? apiOptions = null);
    Task<T> PutAsync(T item, ApiOptions? apiOptions = null);
    Task<T> PatchAsync(T item, ApiOptions? apiOptions = null);
    Task DeleteAsync(T item, ApiOptions? apiOptions = null);
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
        response.EnsureSuccessStatusCode();

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

        response.Dispose();
        return root.Results;
    }
}

public class ApiOptions
{
    public string? HeaderXMsApiRole { get; set; }
    public string? HeaderAuthorization { get; set; }

    public void AddHeaders(HttpClient httpClient)
    {
        AddHttpHeader(httpClient, "x-ms-api-role", HeaderXMsApiRole);
        AddHttpHeader(httpClient, "Bearer", HeaderAuthorization);

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

public class ApiStoredProcedureExecOptions : ApiOptions
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

public class ApiTableViewGetOptions : ApiOptions
{
    public string? QuerySelect { get; set; }
    public string? QueryFilter { get; set; }
    public string? QueryOrderBy { get; set; }
    public int? QueryFirst { get; set; }
    public string? QueryAfter { get; set; }

    public string? ToQueryString()
    {
        var query = System.Web.HttpUtility.ParseQueryString(string.Empty);

        AddQueryParameter(query, "$select", QuerySelect);
        AddQueryParameter(query, "$filter", QueryFilter);
        AddQueryParameter(query, "$orderby", QueryOrderBy);
        AddQueryParameter(query, "$first", QueryFirst?.ToString());
        AddQueryParameter(query, "$after", QueryAfter);

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