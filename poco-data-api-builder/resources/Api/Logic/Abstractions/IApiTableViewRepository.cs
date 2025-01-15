namespace Api.Logic.Abstractions;

using Api.Logic.Options;

public interface IApiTableViewRepository<T> where T : class
{
    Task<T[]> GetAsync(ApiTableOptions? apiGetOptions = null);
 
    Task<T> PostAsync(T item, ApiOptions? apiOptions = null);
 
    Task<T> PutAsync(T item, ApiOptions? apiOptions = null);
 
    Task<T> PatchAsync(T item, ApiOptions? apiOptions = null);
 
    Task DeleteAsync(T item, ApiOptions? apiOptions = null);
}
