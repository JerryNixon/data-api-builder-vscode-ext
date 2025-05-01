namespace Api.Abstractions;

using Api.Options;

public interface IApiProcedureRepository<T> where T : class
{
    Task<T[]> ExecuteProcedureAsync(ApiProcedureOptions apiOptions);
}
