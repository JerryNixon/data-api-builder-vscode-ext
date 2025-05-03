namespace Microsoft.DataApiBuilder.Rest.Options;

public class TableOptions : CommonOptions
{
    public TableOptions()
    {
        // empty constructor
    }

    public TableOptions(string? select, string? filter, string? orderBy, int? first, string? after)
    {
        Select = select;
        Filter = filter;
        OrderBy = orderBy;
        First = first;
        After = after;
    }

    public string? Select { get; set; }
    
    public string? Filter { get; set; }
    
    public string? OrderBy { get; set; }
    
    public int? First { get; set; }
    
    public string? After { get; set; }
}