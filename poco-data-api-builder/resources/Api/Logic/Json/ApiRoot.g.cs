namespace Api.Logic.Json;

using System.Text.Json.Serialization;

public partial class ApiRoot<T>
{
    [JsonPropertyName("value")]
    public T[]? Results { get; set; }

    [JsonPropertyName("nextLink")]
    public string? NextLink { get; set; }

    [JsonPropertyName("error")]
    public ApiError? Error { get; set; }
}
