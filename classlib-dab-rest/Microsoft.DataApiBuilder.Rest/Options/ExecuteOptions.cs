namespace Microsoft.DataApiBuilder.Rest.Options;

public class ExecuteOptions : CommonOptions
{
    public ExecuteOptions()
    {
        // empty constructor
    }

    // parameters format "key=value,key=value"
    public ExecuteOptions(ExecuteHttpMethod apiMethod, string? parameters)
    {
        Method = apiMethod;

        if (parameters is null)
        {
            return;
        }
        var pairs = parameters?.Split(',', StringSplitOptions.RemoveEmptyEntries);
        foreach (var pair in pairs!)
        {
            var split = pair.Split('=', StringSplitOptions.RemoveEmptyEntries);
            Parameters.Add(split[0].Trim(), split[1].Trim());
        }
    }

    public ExecuteOptions(ExecuteHttpMethod apiMethod, Dictionary<string, string> parameters)
    {
        Method = apiMethod;
        Parameters = parameters;
    }

    public ExecuteHttpMethod Method { get; set; } = ExecuteHttpMethod.GET;

    public Dictionary<string, string> Parameters { get; set; } = [];
}

public enum ExecuteHttpMethod { GET, POST }
