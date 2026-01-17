using System.ComponentModel.DataAnnotations;
using System.Dynamic;
using System.Net.Http.Json;
using System.Reflection;
using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.WebUtilities;

namespace Repositories.Rest;

public abstract class RepositoryBase<TEntity>(string baseUrl, string apiPath, string entityPath, string? x_ms_api_role, HttpClient? httpClient = null)
    where TEntity : class
{
    public override string ToString() => $"{BaseUri}";

    public HttpClient HttpClient { get; set; } = httpClient ?? new();

    protected readonly Uri BaseUri = new(baseUrl.TrimEnd('/') + "/" + apiPath.Trim('/') + "/" + entityPath.Trim('/'));

    private readonly string? Role = x_ms_api_role;

    protected Task<ResponseRoot<TEntity>> CreateAsync(TEntity entity, CancellationToken cancellationToken = default)
    {
        var model = BuildCreateModel(entity: entity);

        return SendAsync(
            method: HttpMethod.Post,
            relativePath: string.Empty,
            query: null,
            content: JsonContent.Create(model),
            cancellationToken: cancellationToken,
            failedMessage: "Failed to create.");
    }

    protected Task<ResponseRoot<TEntity>> ReadAsync(
        int? first,
        string? select,
        string? filter,
        string? sort,
        string? nextPage,
        CancellationToken cancellationToken = default)
    {
        return SendAsync(
            method: HttpMethod.Get,
            relativePath: string.Empty,
            query: BuildQuery(first: first, select: select, filter: filter, sort: sort, nextPage: nextPage),
            content: null,
            cancellationToken: cancellationToken,
            failedMessage: "Failed to read.");
    }

    protected Task<ResponseRoot<TEntity>> UpdateAsync(TEntity entity, string[]? fields, CancellationToken cancellationToken = default)
    {
        var keys = BuildKeys(entity: entity);
        var model = BuildPatchModel(entity: entity, fields: fields);

        return SendAsync(
            method: HttpMethod.Patch,
            relativePath: keys,
            query: null,
            content: JsonContent.Create(model),
            cancellationToken: cancellationToken,
            failedMessage: "Failed to update.");
    }

    protected Task<ResponseRoot<TEntity>> DeleteAsync(TEntity entity, CancellationToken cancellationToken = default)
    {
        var keys = BuildKeys(entity: entity);

        return SendAsync(
            method: HttpMethod.Delete,
            relativePath: keys,
            query: null,
            content: null,
            cancellationToken: cancellationToken,
            failedMessage: "Failed to delete.");
    }

    protected Task<ResponseRoot<TEntity>> ExecuteAsync(
        HttpMethod method,
        string operation,
        (string name, object? value)[] parameters,
        CancellationToken cancellationToken = default)
    {
        var args = BuildParameters(parameters: parameters);

        return SendAsync(
            method: method,
            relativePath: args,
            query: null,
            content: null,
            cancellationToken: cancellationToken,
            failedMessage: "Failed to execute.");
    }

    private Uri BuildUri(string relativePath, string? query)
    {
        var uri = new Uri(BaseUri, relativePath.TrimStart('/'));

        if (string.IsNullOrEmpty(query))
        {
            return uri;
        }

        var builder = new UriBuilder(uri)
        {
            Query = query
        };

        return builder.Uri;
    }

    private static string BuildQuery(int? first, string? select, string? filter, string? sort, string? nextPage)
    {
        var queryParams = new Dictionary<string, string?>();

        Add("$top", first?.ToString());
        Add("$select", select);
        Add("$filter", filter);
        Add("$orderby", sort);
        Add("$after", nextPage);

        if (queryParams.Count == 0)
        {
            return string.Empty;
        }

        return QueryHelpers.AddQueryString(string.Empty, queryParams!).TrimStart('?');

        void Add(string key, string? value)
        {
            if (!string.IsNullOrEmpty(value))
            {
                queryParams[key] = value;
            }
        }
    }

    private static object BuildCreateModel(TEntity entity)
    {
        var type = typeof(TEntity);
        var create = (IDictionary<string, object?>)new ExpandoObject();

        var props = type.GetProperties();
        for (var i = 0; i < props.Length; i++)
        {
            var prop = props[i];

            if (Attribute.IsDefined(prop, typeof(KeyAttribute)))
            {
                continue;
            }

            var jsonName = GetJsonPropertyName(prop);
            create[jsonName] = prop.GetValue(entity);
        }

        return create;
    }

    private static object BuildPatchModel(TEntity entity, string[]? fields)
    {
        var type = typeof(TEntity);

        if (fields is not { Length: > 0 })
        {
            return GetAll();
        }

        return GetSome();

        object GetAll()
        {
            var all = (IDictionary<string, object?>)new ExpandoObject();

            var props = type.GetProperties();
            for (var i = 0; i < props.Length; i++)
            {
                var prop = props[i];

                if (Attribute.IsDefined(prop, typeof(KeyAttribute)))
                {
                    continue;
                }

                var jsonName = GetJsonPropertyName(prop);
                all[jsonName] = prop.GetValue(entity);
            }

            return all;
        }

        object GetSome()
        {
            var some = (IDictionary<string, object?>)new ExpandoObject();

            for (var i = 0; i < fields.Length; i++)
            {
                var name = fields[i];
                var prop = type.GetProperty(name);

                if (prop is null)
                {
                    continue;
                }

                var jsonName = GetJsonPropertyName(prop);
                some[jsonName] = prop.GetValue(entity);
            }

            return some;
        }
    }

    private static string GetJsonPropertyName(PropertyInfo prop)
    {
        var attr = prop.GetCustomAttribute<JsonPropertyNameAttribute>();
        return attr?.Name ?? prop.Name;
    }

    private static string BuildKeys(TEntity entity)
    {
        var type = typeof(TEntity);
        var properties = type.GetProperties();

        var sb = new StringBuilder();
        var found = false;

        for (var i = 0; i < properties.Length; i++)
        {
            var prop = properties[i];

            if (!Attribute.IsDefined(prop, typeof(KeyAttribute)))
            {
                continue;
            }

            var value = prop.GetValue(entity);

            if (value is null)
            {
                throw new InvalidOperationException($"Key value is null: {prop.Name}");
            }

            found = true;

            var jsonName = GetJsonPropertyName(prop);
            sb.Append('/')
              .Append(Encode(value: jsonName))
              .Append('/')
              .Append(Encode(value: value));
        }

        if (!found)
        {
            throw new InvalidOperationException($"No [Key] properties found on {type.Name}.");
        }

        return sb.ToString().TrimStart('/');
    }

    private static string BuildParameters((string name, object? value)[] parameters)
    {
        var parts = new List<string>();

        for (var i = 0; i < parameters.Length; i++)
        {
            parts.Add(Encode(value: parameters[i].name));
            parts.Add(Encode(value: parameters[i].value));
        }

        return string.Join("/", parts);
    }

    private static string Encode(object? value)
    {
        return Uri.EscapeDataString(value?.ToString() ?? string.Empty);
    }

    private async Task<ResponseRoot<TEntity>> SendAsync(
        HttpMethod method,
        string relativePath,
        string? query,
        HttpContent? content,
        string failedMessage,
        CancellationToken cancellationToken = default)
    {
        var uri = BuildUri(relativePath: relativePath, query: query);

        using var request = new HttpRequestMessage(method, uri);

        if (!string.IsNullOrEmpty(Role))
        {
            request.Headers.TryAddWithoutValidation("x-ms-api-role", Role);
        }

        request.Content = content;

        using var response = await HttpClient.SendAsync(request, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            return CreateError(failedMessage: body ?? $"{failedMessage} Status code: {response.StatusCode}");
        }

        return await response.Content.ReadFromJsonAsync<ResponseRoot<TEntity>>(cancellationToken)
            ?? CreateError($"{failedMessage} Failed to deserialize response.");

        static ResponseRoot<TEntity> CreateError(string failedMessage)
        {
            return new ResponseRoot<TEntity>
            {
                Error = new ResponseError
                {
                    Message = failedMessage ?? "No message."
                }
            };
        }
    }
}
