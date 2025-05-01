using Microsoft.DataApiBuilder.Rest;
using Microsoft.DataApiBuilder.Rest.Abstractions;

using System.Text.Json.Serialization;

const string URL = "http://localhost:5000";
var entityUri = new Uri(URL + "/api/Actor");
var repository = new TableRepository<Actor>(entityUri);

if (!await Utility.IsApiAvailableAsync(URL))
{
    Console.WriteLine($"API {URL} is not available.");
    Console.ReadKey();
    return;
}

var actors = await repository.GetAsync();

foreach (var actor in actors)
{
    Console.WriteLine(actor);
}

Console.ReadKey();


public record class Actor(int Id, string Name, int BirthYear);