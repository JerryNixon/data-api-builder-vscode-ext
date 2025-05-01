namespace Microsoft.DataApiBuilder.Rest.Json;

using System.Text.Json.Serialization;

public partial class ResponseRoot<T>
{
    [JsonPropertyName("value")]
    public T[]? Results { get; set; }

    [JsonPropertyName("nextLink")]
    public string? NextLink { get; set; }

    [JsonPropertyName("error")]
    public ResponseError? Error { get; set; }
}
