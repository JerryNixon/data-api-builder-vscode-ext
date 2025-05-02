using Microsoft.DataApiBuilder.Rest.Json;

namespace Microsoft.DataApiBuilder.Rest;

public record class DabResponse<TItem, TResult> : DabResponse
{
    public TResult Result { get; init; } = default!;
    public string? NextPage { get; init; }
    public bool HasNextPage => NextPage is not null;

    public DabResponse()
    {
        // empty
    }

    public DabResponse(ResponseRoot<TItem> root)
    {
        if (typeof(TResult).IsArray)
        {
            Result = (TResult)(object)(root.Results ?? []);
        }
        else
        {
            if (root?.Results is null)
            {
                Result = default!;
            }
            else
            {
                Result = (TResult)(object)root.Results.FirstOrDefault()!;
            }
        }

        NextPage = root?.NextLink;
        Error = root?.Error;
    }
}

public record class DabResponse
{
    public DabResponse()
    {
        // empty
    }

    public DabResponse(ResponseRoot root)
    {
        Error = root.Error;
    }

    public ResponseError? Error { get; init; }
    public bool Success => Error is null;

    internal Options.CommonOptions? Options { get; init; }
}
