using System.Text.Json.Serialization;

namespace Repositories.Rest;

public class ResponseRoot<T> : ResponseRoot
{
    [JsonPropertyName("value")]
    public T[] Results { get; set; } = [];
}
