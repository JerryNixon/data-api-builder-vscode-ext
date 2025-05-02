namespace Microsoft.DataApiBuilder.Rest.Options;

public class TableOptions : CommonOptions
{
    public string? Select { get; set; }
    
    public string? Filter { get; set; }
    
    public string? OrderBy { get; set; }
    
    public int? First { get; set; }
    
    public string? After { get; set; }
}