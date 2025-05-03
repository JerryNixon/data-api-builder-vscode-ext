namespace Microsoft.DataApiBuilder.Rest.Options;

public class ProcedureOptions : CommonOptions
{
    public ProcedureOptions()
    {
        // empty constructor
    }

    // parameters format "key=value,key=value"
    public ProcedureOptions(ApiMethod apiMethod, string? parameters)
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

    public ProcedureOptions(ApiMethod apiMethod, Dictionary<string, string> parameters)
    {
        Method = apiMethod;
        Parameters = parameters;
    }

    public enum ApiMethod { GET, POST }

    public ApiMethod Method { get; set; } = ApiMethod.GET;

    public Dictionary<string, string> Parameters { get; set; } = [];
}
