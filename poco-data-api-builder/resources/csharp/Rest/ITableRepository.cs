namespace Repositories.Rest;

public interface ITableRepository<T>
{
    Task<T> CreateAsync(T item);
    Task DeleteAsync(T item);
    Task<T> UpdateAsync(T item, string[]? fields = null);
    Task<T[]> ReadAsync(int? first = null, string? select = null, string? filter = null, string? sort = null, string? nextPage = null);
}
