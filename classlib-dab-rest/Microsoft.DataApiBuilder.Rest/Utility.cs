
using System.ComponentModel.DataAnnotations;
using System.Diagnostics;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.Json.Nodes;
using Microsoft.DataApiBuilder.Rest.Json;
using Microsoft.DataApiBuilder.Rest.Options;
using System.Collections.Specialized;
using System.Reflection;
using static System.Text.Json.JsonNamingPolicy;
using static System.Text.Json.Serialization.JsonIgnoreCondition;

namespace Microsoft.DataApiBuilder.Rest;
internal static partial class Utility
{
    public static async Task<bool> IsApiAvailableAsync(string url, int timeoutInSeconds = 30, HttpClient? httpClient = null)
    {
        using var http = httpClient ?? new HttpClient
        {
            Timeout = TimeSpan.FromSeconds(timeoutInSeconds)
        };
        try
        {
            var response = await http.GetAsync(url).ConfigureAwait(false);
            return response.IsSuccessStatusCode;
        }
        catch (HttpRequestException ex)
        {
            Debug.WriteLine($"Error: {ex.Message}");
            return false;
        }
        catch (TaskCanceledException)
        {
            Debug.WriteLine($"Timed out after {timeoutInSeconds} seconds.");
            return false;
        }
    }

    public static string? BuildQueryStringFromOptions(this TableOptions options)
    {
        if (options is null)
        {
            return null;
        }

        var query = System.Web.HttpUtility.ParseQueryString(string.Empty);
        Add(query, "$select", options.Select);
        Add(query, "$filter", options.Filter);
        Add(query, "$orderby", options.OrderBy);
        Add(query, "$first", options.First?.ToString());
        Add(query, "$after", options.After);

        return query.ToString();

        static void Add(NameValueCollection query, string key, string? value)
        {
            if (!string.IsNullOrEmpty(value))
            {
                query[key] = value;
            }
        }
    }

    public static JsonContent ToJsonContent(this ProcedureOptions options)
    {
        var filtered = options.Parameters
            .Where(kv => !string.IsNullOrWhiteSpace(kv.Value))
            .ToDictionary(kv => kv.Key, kv => kv.Value, StringComparer.OrdinalIgnoreCase);

        return JsonContent.Create(filtered, options: new JsonSerializerOptions
        {
            PropertyNamingPolicy = CamelCase,
            DefaultIgnoreCondition = WhenWritingNull
        });
    }

    public static string? ToQueryString(this ProcedureOptions options)
    {
        var query = System.Web.HttpUtility.ParseQueryString(string.Empty);

        foreach (var (key, value) in options.Parameters)
        {
            if (!string.IsNullOrWhiteSpace(value))
            {
                query[key] = value;
            }
        }

        return query.Count > 0 ? query.ToString() : null;
    }

    public static void CreateHttpClientAndAddHeaders(ref HttpClient? httpClient, params CommonOptions?[] options)
    {
        httpClient ??= new();

        // allow multiple for GetAsync() that has previous response for paging
        var option = options.FirstOrDefault(o => o is not null);
        if (option is null)
        {
            return;
        }

        Add(httpClient, "x-ms-api-role", option.XMsApiRole);
        Add(httpClient, "Bearer", option.Authorization);

        void Add(HttpClient httpClient, string key, string? value)
        {
            if (!string.IsNullOrEmpty(value))
            {
                if (!httpClient.DefaultRequestHeaders.Contains(key))
                {
                    httpClient.DefaultRequestHeaders.Add(key, value);
                }
            }
            else if (httpClient.DefaultRequestHeaders.Contains(key))
            {
                httpClient.DefaultRequestHeaders.Remove(key);
            }
        }
    }

    public static Uri BuildUriWithKeyProperties<T>(this T item, Uri baseUri)
    {
        var keySegments = ReflectKeyProperties(item);
        if (keySegments.Count == 0)
        {
            throw new InvalidOperationException($"No key properties defined for type {typeof(T).Name}.");
        }

        if (keySegments.Any(x => string.IsNullOrWhiteSpace(x.Name) || string.IsNullOrWhiteSpace(x.Value)))
        {
            throw new InvalidOperationException($"Key properties cannot have null or empty values. {typeof(T).Name}.");
        }

        // Format: /Entity/Key1Name/Key1Value/Key2Name/Key2Value
        var path = string.Join("/", keySegments.SelectMany(kp => new[]
        {
            Uri.EscapeDataString(kp.Name ?? throw new InvalidOperationException("Key name cannot be null.")),
            Uri.EscapeDataString(kp.Value ?? throw new InvalidOperationException("Key value cannot be null."))
        }));

        baseUri = new Uri(baseUri.ToString().TrimEnd('/'), UriKind.Absolute);
        return new Uri($"{baseUri}/{path}");

        static List<(string Name, string Value)> ReflectKeyProperties(T item)
        {
            return typeof(T)
                .GetProperties(BindingFlags.Public | BindingFlags.Instance)
                .Where(p => Attribute.IsDefined(p, typeof(KeyAttribute)))
                .Select(p =>
                {
                    var name = p.GetCustomAttribute<JsonPropertyNameAttribute>()?.Name ?? p.Name;
                    var value = p.GetValue(item)?.ToString();
                    if (string.IsNullOrEmpty(value))
                    {
                        throw new InvalidOperationException($"Key field '{p.Name}' cannot have a null or empty value.");
                    }

                    return (name, value);
                }).ToList();
        }
    }

    public static JsonContent SerializeWithoutKeyProperties<T>(this T item)
    {
        var keyProps = ReflectKeyProperties();
        if (keyProps.Count == 0)
        {
            throw new KeyNotFoundException($"No key properties defined for type {typeof(T).Name}.");
        }

        var json = JsonSerializer.SerializeToNode(item, new JsonSerializerOptions
        {
            PropertyNamingPolicy = CamelCase,
            DefaultIgnoreCondition = WhenWritingNull
        });

        if (json is JsonObject obj)
        {
            foreach (var key in keyProps)
            {
                obj.Remove(key);
            }
        }

        return JsonContent.Create(json, options: new JsonSerializerOptions
        {
            PropertyNamingPolicy = CamelCase,
            DefaultIgnoreCondition = WhenWritingNull
        });

        static HashSet<string> ReflectKeyProperties()
        {
            return typeof(T)
                .GetProperties(BindingFlags.Public | BindingFlags.Instance)
                .Where(p => Attribute.IsDefined(p, typeof(KeyAttribute)))
                .Select(p => p.GetCustomAttribute<JsonPropertyNameAttribute>()?.Name ?? p.Name)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);
        }
    }

    public static async Task<DabResponse<TItem, TResult>> EnsureSuccessAndConvertToDabResponseAsync<TItem, TResult>(this HttpResponseMessage response, CommonOptions? options)
    {
        await ValidateIsSuccessStatusCode(response).ConfigureAwait(false);

        var json = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
        ResponseRoot<TItem>? root;
        try
        {
            root = JsonSerializer.Deserialize<ResponseRoot<TItem>>(json);
        }
        catch (JsonException ex)
        {
            Debug.WriteLine("JSON ERROR:");
            Debug.WriteLine(ex.Message);
            Debug.WriteLine($"TItem: {typeof(TItem)}");
            Debug.WriteLine($"TResult: {typeof(TResult)}");
            Debug.WriteLine(ex.Path);
            Debug.WriteLine(ex.InnerException);
            Debug.WriteLine(json);
            throw;
        }

        if (root is null)
        {
            throw new InvalidOperationException("The response deserialized as null.");
        }

        return new DabResponse<TItem, TResult>(root) { Options = options };
    }

    public static async Task<DabResponse> EnsureSuccessAndConvertToDabResponseAsync(this HttpResponseMessage response, CommonOptions? options)
    {
        await ValidateIsSuccessStatusCode(response).ConfigureAwait(false);

        var json = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
        if (string.IsNullOrWhiteSpace(json))
        {
            return new DabResponse() { Options = options }; ;
        }

        var root = JsonSerializer.Deserialize<ResponseRoot>(json);
        if (root is null)
        {
            throw new InvalidOperationException("The response deserialized as null.");
        }

        return new DabResponse(root) { Options = options }; ;
    }

    private static async Task ValidateIsSuccessStatusCode(HttpResponseMessage response)
    {
        if (!response.IsSuccessStatusCode)
        {
            var method = response.RequestMessage?.Method?.ToString() ?? "UNKNOWN_METHOD";
            var url = response.RequestMessage?.RequestUri?.ToString() ?? "UNKNOWN_URL";
            var errorText = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
            var errorMessage = $"{method} {url} returned {response.StatusCode}. Body: {errorText}";
            throw new HttpRequestException(errorMessage, null, response.StatusCode);
        }
    }
}
