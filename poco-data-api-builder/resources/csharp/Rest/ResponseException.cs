namespace Repositories.Rest;

public class ResponseException(string message) : Exception(message)
{
    public required string Code { get; init; }
    public required int Status { get; init; }
}
