namespace Api.Logic.Options;

public class ApiTableOptions : ApiOptions
{
    public string? Select { get; set; }
    
    public string? Filter { get; set; }
    
    public string? OrderBy { get; set; }
    
    public int? First { get; set; }
    
    public string? After { get; set; }
}