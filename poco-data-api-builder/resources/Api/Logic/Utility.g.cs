namespace Api.Logic;

using System.ComponentModel.DataAnnotations;
using System.Diagnostics;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

using Api.Logic.Json;
using Api.Logic.Options;

public partial static class Utility
{
    public static async Task<bool> IsApiAvailableAsync(string url, int timeoutInSeconds = 30)
    {
        using var httpClient = new HttpClient
        {
            Timeout = TimeSpan.FromSeconds(timeoutInSeconds)
        };
        try
        {
            var response = await httpClient.GetAsync(url);
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

    public static string? BuildQueryStringFromOptions(this ApiTableOptions options)
    {
        var query = System.Web.HttpUtility.ParseQueryString(string.Empty);

        AddQueryParameter(query, "$select", options.Select);
        AddQueryParameter(query, "$filter", options.Filter);
        AddQueryParameter(query, "$orderby", options.OrderBy);
        AddQueryParameter(query, "$first", options.First?.ToString());
        AddQueryParameter(query, "$after", options.After);

        return query.ToString();

        static void AddQueryParameter(System.Collections.Specialized.NameValueCollection query, string key, string? value)
        {
            if (!string.IsNullOrEmpty(value))
            {
                query[key] = value;
            }
        }
    }

    public static JsonContent ToJsonContent(this ApiProcedureOptions options)
    {
        var filteredParameters = options.Parameters
            .Where(kv => !string.IsNullOrWhiteSpace(kv.Value))
            .ToDictionary(kv => kv.Key, kv => kv.Value);

        return JsonContent.Create(filteredParameters, options: new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        });
    }

    public static string? ToQueryString(this ApiProcedureOptions options)
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

    public static void AddHeadersToHttpClient(this ApiOptions options, HttpClient httpClient)
    {
        AddHttpHeader(httpClient, "x-ms-api-role", options.XMsApiRole);
        AddHttpHeader(httpClient, "Bearer", options.Authorization);

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

    public static Uri BuildUriWithKeyProperties<T>(this T item, Uri baseUri)
    {
        var keyProperties = ReflectKeyProperties(item);
        if (keyProperties.Count == 0)
        {
            throw new KeyNotFoundException($"No key properties defined for type {typeof(T).Name}.");
        }

        var pathSegments = keyProperties.Select(kp => $"{kp.Name}/{Uri.EscapeDataString(kp.Value)}");
        var pathFragment = string.Join("/", pathSegments);
        baseUri = new Uri(baseUri.ToString().TrimEnd('/'), UriKind.Absolute);

        return new Uri(baseUri, pathFragment);

        static List<(string Name, string Value)> ReflectKeyProperties(T item)
        {
            return typeof(T)
                .GetProperties(System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance)
                .Where(prop => Attribute.IsDefined(prop, typeof(KeyAttribute)))
                .Select(prop =>
                {
                    var jsonPropertyNameAttribute = prop
                        .GetCustomAttributes(typeof(JsonPropertyNameAttribute), true)
                        .FirstOrDefault() as JsonPropertyNameAttribute;

                    var jsonPropertyName = jsonPropertyNameAttribute?.Name ?? prop.Name;
                    var propertyValue = prop.GetValue(item)?.ToString();

                    if (string.IsNullOrEmpty(propertyValue))
                        throw new InvalidOperationException($"Key field '{prop.Name}' cannot have a null or empty value.");

                    return (jsonPropertyName, propertyValue);
                }).ToList();
        }
    }

    public static JsonContent SerializeWithoutKeyProperties<T>(this T item)
    {
        var keyProperties = ReflectKeyProperties();
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

        return JsonContent.Create(jsonNode, options: new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        });

        static HashSet<string> ReflectKeyProperties()
        {
            return typeof(T)
                .GetProperties(System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance)
                .Where(prop => Attribute.IsDefined(prop, typeof(KeyAttribute)))
                .Select(prop =>
                {
                    var jsonPropertyNameAttribute = prop.GetCustomAttributes(typeof(JsonPropertyNameAttribute), true)
                        .FirstOrDefault() as JsonPropertyNameAttribute;
                    return jsonPropertyNameAttribute?.Name ?? prop.Name;
                })
                .ToHashSet(StringComparer.OrdinalIgnoreCase);
        }
    }

    public static async Task<T[]> EnsureSuccessAsync<T>(this HttpResponseMessage response)
    {
        try
        {
            var method = response.RequestMessage?.Method?.ToString() ?? "UNKNOWN_METHOD";
            var url = response.RequestMessage?.RequestUri?.ToString() ?? "unknown";
            Debug.WriteLine($"{method} {url.Replace("%24", "$")} returned {response.StatusCode}.");

            var root = await response.Content.ReadFromJsonAsync<ApiRoot<T>>()
                ?? throw new InvalidOperationException("The response deserialized as null.");

            if (root.Error is not null)
            {
                Debug.WriteLine($"Code: {root.Error.Code}, Message: {root.Error.Message}, Status: {root.Error.Status}");
            }

            return !response.IsSuccessStatusCode
                ? throw new HttpRequestException($"{url} returned {response.StatusCode} with {root?.Error?.Message}.", null, response.StatusCode)
                : root.Results is null
                ? throw new Exception("The response did not contain any results.")
                : root.Results;
        }
        finally
        {
            response?.Dispose();
        }
    }
}
