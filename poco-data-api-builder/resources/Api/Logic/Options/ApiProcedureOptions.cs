namespace Api.Logic.Options;

public class ApiProcedureOptions : ApiOptions
{
    public enum ApiMethod { GET, POST }

    public ApiMethod Method { get; set; } = ApiMethod.GET;

    public Dictionary<string, string> Parameters { get; set; } = [];
}
