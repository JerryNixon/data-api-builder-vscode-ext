namespace Api.Logic.Abstractions;

using Api.Logic.Options;

public interface IApiProcedureRepository<T> where T : class
{
    Task<T[]> ExecuteProcedureAsync(ApiProcedureOptions apiOptions);
}
