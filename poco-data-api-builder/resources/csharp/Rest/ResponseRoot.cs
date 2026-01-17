using System.Text.Json.Serialization;

namespace Repositories.Rest;

public class ResponseRoot
{
    [JsonPropertyName("nextLink")]
    public string? NextLink { get; set; }

    [JsonPropertyName("error")]
    public ResponseError? Error { get; set; }

    public void EnsureSuccessfulResult() => Error?.Throw();
}
