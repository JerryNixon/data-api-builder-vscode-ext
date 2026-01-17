using System.Text.Json.Serialization;

namespace Repositories.Rest;

public class ResponseError
{
    [JsonPropertyName("code")]
    public string Code { get; set; } = string.Empty;

    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public int Status { get; set; }

    public void Throw()
    {
        throw new ResponseException(Message)
        {
            Code = Code,
            Status = Status,
        };
    }
}
