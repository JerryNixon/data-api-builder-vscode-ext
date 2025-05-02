
using System.Text.Json.Serialization;

namespace Microsoft.DataApiBuilder.Rest.Json;
public partial class ResponseRoot<T> : ResponseRoot
{
    [JsonPropertyName("value")]
    public T[] Results { get; set; } = [];
}

public partial class ResponseRoot
{
    [JsonPropertyName("nextLink")]
    public string? NextLink { get; set; }

    [JsonPropertyName("error")]
    public ResponseError? Error { get; set; }
}
