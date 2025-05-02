namespace Microsoft.DataApiBuilder.Rest.Abstractions;

using Microsoft.DataApiBuilder.Rest.Options;

public interface IProcedureRepository<T> where T : class
{
    Task<T[]> ExecuteProcedureAsync(ProcedureOptions apiOptions);
}
