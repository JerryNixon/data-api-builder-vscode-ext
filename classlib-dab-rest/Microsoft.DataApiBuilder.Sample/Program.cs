using Microsoft.DataApiBuilder.Rest;

const string URL = "http://localhost:5000";
var entityUri = new Uri(URL + "/api/Actor");
var repository = new TableRepository<Actor>(entityUri);

if (!await repository.IsAvailableAsync())
{
    Console.WriteLine($"API {URL} is not available.");
    Console.ReadKey();
    return;
}

var response = await repository.GetAsync(new() { First = 5 });

foreach (var actor in response.Result)
{
    Console.WriteLine(actor);
}

Console.ReadKey();
Console.Clear();

response = await repository.GetAsync(new() { Filter = "Id eq 1" });

foreach (var actor in response.Result)
{
    Console.WriteLine(actor);
}

Console.ReadKey();
Console.Clear();

response = await repository.GetAsync(new() { OrderBy = "Name" });

foreach (var actor in response.Result)
{
    Console.WriteLine(actor);
}

Console.ReadKey();

public record class Actor(int Id, string Name, int BirthYear);