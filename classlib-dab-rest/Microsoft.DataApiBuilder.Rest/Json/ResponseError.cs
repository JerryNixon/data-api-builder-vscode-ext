
using System.Text.Json.Serialization;

namespace Microsoft.DataApiBuilder.Rest.Json;
public partial class ResponseError
{
    [JsonPropertyName("code")]
    public string Code { get; set; } = string.Empty;

    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public int Status { get; set; }
}
