namespace Microsoft.DataApiBuilder.Rest.Options;

public class ProcedureOptions : CommonOptions
{
    public enum ApiMethod { GET, POST }

    public ApiMethod Method { get; set; } = ApiMethod.GET;

    public Dictionary<string, string> Parameters { get; set; } = [];
}
