namespace Microsoft.DataApiBuilder.Rest.Options;

public class PatchOptions : CommonOptions
{
    public List<string>? ExcludeProperties { get; set; }
    public List<string>? IncludeProperties { get; set; }
}
