namespace Repositories.Rest;

public interface IProcedureRepository<T>
{
    Task<T[]> ExecuteAsync(HttpMethod method, params (string name, object? value)[] parameters);
}
