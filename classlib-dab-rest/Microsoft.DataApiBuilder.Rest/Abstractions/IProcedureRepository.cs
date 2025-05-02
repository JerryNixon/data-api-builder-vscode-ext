
using Microsoft.DataApiBuilder.Rest.Options;

namespace Microsoft.DataApiBuilder.Rest.Abstractions;
public interface IProcedureRepository<T> where T : class
{
    Task<DabResponse<T, T[]>> ExecuteProcedureAsync(ProcedureOptions apiOptions);
}
