namespace Microsoft.DataApiBuilder.Rest.Abstractions;

using Microsoft.DataApiBuilder.Rest.Options;

public interface ITableRepository<T> where T : class
{
    Task<T[]> GetAsync(TableOptions? apiGetOptions = null);

    Task<T> PostAsync(T item, OptionsBase? apiOptions = null);

    Task<T> PutAsync(T item, OptionsBase? apiOptions = null);

    Task<T> PatchAsync(T item, OptionsBase? apiOptions = null);

    Task DeleteAsync(T item, OptionsBase? apiOptions = null);
}
