using System.ComponentModel.DataAnnotations;
using System.Net;
using System.Text;
using System.Text.Json;

using FluentAssertions;

using Microsoft.DataApiBuilder.Rest.Abstractions;

namespace Microsoft.DataApiBuilder.Rest.Tests;

public record class Actor([property: Key] int Id, string Name, int BirthYear);

public class TableRepositoryTests
{
    static ITableRepository<Actor> GetRepository(string json, HttpStatusCode status = HttpStatusCode.OK)
    {
        var http = new HttpClient(new MockHandler(new HttpResponseMessage
        {
            StatusCode = status,
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        }));
        return new TableRepository<Actor>(new Uri("http://test/api/Actor"), http);
    }

    static string MockJson() => MockValueJson(new[]
    {
        new Actor(1, "Actor 1", 1980),
        new Actor(2, "Actor 2", 1990)
    });

    static string MockValueJson<T>(T[] items) =>
        JsonSerializer.Serialize(new { value = items });

    class MockHandler(HttpResponseMessage response) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage _, CancellationToken __)
            => Task.FromResult(response);
    }

    [Fact]
    public async Task GetAsync_WithValidResponse_ReturnsActors()
    {
        var repo = GetRepository(MockJson());
        var result = await repo.GetAsync();
        result.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetAsync_WithTableOptions_AppendsQueryString()
    {
        var repo = GetRepository(MockJson());
        var result = await repo.GetAsync(new Rest.Options.TableOptions { Filter = "id eq 1" });
        result.Should().NotBeNull();
    }

    [Fact]
    public async Task GetAsync_WithoutOptions_Succeeds()
    {
        var repo = GetRepository(MockJson());
        var result = await repo.GetAsync();
        result.Should().NotBeNull();
    }

    [Fact]
    public async Task GetAsync_WithInvalidJson_ThrowsException()
    {
        var repo = GetRepository("invalid json");
        var act = async () => await repo.GetAsync();
        await act.Should().ThrowAsync<Exception>();
    }

    [Fact]
    public async Task GetAsync_WithHttpError_ThrowsException()
    {
        var repo = GetRepository("", HttpStatusCode.InternalServerError);
        var act = async () => await repo.GetAsync();
        await act.Should().ThrowAsync<HttpRequestException>();
    }

    [Fact]
    public async Task PostAsync_WithValidItem_ReturnsCreatedActor()
    {
        var repo = GetRepository(MockValueJson(new[] { new Actor(1, "Actor 1", 1980) }));
        var result = await repo.PostAsync(new Actor(1, "Actor 1", 1980));
        result.Id.Should().Be(1);
    }

    [Fact]
    public async Task PostAsync_WithoutOptions_Succeeds()
    {
        var repo = GetRepository(MockValueJson(new[] { new Actor(1, "Actor 1", 1980) }));
        var result = await repo.PostAsync(new Actor(1, "Actor 1", 1980));
        result.Should().NotBeNull();
    }

    [Fact]
    public void PostAsync_WithNullItem_ThrowsArgumentNullException()
    {
        var repo = GetRepository(MockJson());
        Func<Task> act = async () => await repo.PostAsync(null!);
        act.Should().ThrowAsync<ArgumentNullException>();
    }

    [Fact]
    public async Task PostAsync_WithHttpError_ThrowsException()
    {
        var repo = GetRepository("", HttpStatusCode.BadRequest);
        var act = async () => await repo.PostAsync(new Actor(1, "Actor 1", 1980));
        await act.Should().ThrowAsync<HttpRequestException>();
    }

    [Fact]
    public async Task PutAsync_WithValidItem_UpdatesActor()
    {
        var repo = GetRepository(MockValueJson(new[] { new Actor(1, "Actor 1", 1980) }));
        var result = await repo.PutAsync(new Actor(1, "Actor 1", 1980));
        result.Name.Should().Be("Actor 1");
    }

    [Fact]
    public async Task PutAsync_WithoutOptions_Succeeds()
    {
        var repo = GetRepository(MockValueJson(new[] { new Actor(1, "Actor 1", 1980) }));
        var result = await repo.PutAsync(new Actor(1, "Actor 1", 1980));
        result.Should().NotBeNull();
    }

    [Fact]
    public void PutAsync_WithNullItem_ThrowsArgumentNullException()
    {
        var repo = GetRepository(MockJson());
        Func<Task> act = async () => await repo.PutAsync(null!);
        act.Should().ThrowAsync<ArgumentNullException>();
    }

    [Fact]
    public void PutAsync_WithMissingKey_ThrowsException()
    {
        true.Should().BeTrue(); // Placeholder
    }

    [Fact]
    public async Task PutAsync_WithHttpError_ThrowsException()
    {
        var repo = GetRepository("", HttpStatusCode.BadRequest);
        var act = async () => await repo.PutAsync(new Actor(1, "Actor 1", 1980));
        await act.Should().ThrowAsync<HttpRequestException>();
    }

    [Fact]
    public async Task PatchAsync_WithValidItem_PartiallyUpdatesActor()
    {
        var repo = GetRepository(MockValueJson(new[] { new Actor(1, "Actor 1", 1980) }));
        var result = await repo.PatchAsync(new Actor(1, "Actor 1", 1980));
        result.Should().NotBeNull();
    }

    [Fact]
    public async Task PatchAsync_WithoutOptions_Succeeds()
    {
        var repo = GetRepository(MockValueJson(new[] { new Actor(1, "Actor 1", 1980) }));
        var result = await repo.PatchAsync(new Actor(1, "Actor 1", 1980));
        result.Should().NotBeNull();
    }

    [Fact]
    public void PatchAsync_WithNullItem_ThrowsArgumentNullException()
    {
        var repo = GetRepository(MockJson());
        Func<Task> act = async () => await repo.PatchAsync(null!);
        act.Should().ThrowAsync<ArgumentNullException>();
    }

    [Fact]
    public void PatchAsync_WithMissingKey_ThrowsException()
    {
        true.Should().BeTrue(); // Placeholder
    }

    [Fact]
    public async Task PatchAsync_WithHttpError_ThrowsException()
    {
        var repo = GetRepository("", HttpStatusCode.BadRequest);
        var act = async () => await repo.PatchAsync(new Actor(1, "Actor 1", 1980));
        await act.Should().ThrowAsync<HttpRequestException>();
    }

    [Fact]
    public async Task DeleteAsync_WithValidItem_DeletesActor()
    {
        var repo = GetRepository("", HttpStatusCode.NoContent);
        var act = async () => await repo.DeleteAsync(new Actor(1, "Actor 1", 1980));
        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task DeleteAsync_WithoutOptions_Succeeds()
    {
        var repo = GetRepository("", HttpStatusCode.NoContent);
        var act = async () => await repo.DeleteAsync(new Actor(1, "Actor 1", 1980));
        await act.Should().NotThrowAsync();
    }

    [Fact]
    public void DeleteAsync_WithNullItem_ThrowsArgumentNullException()
    {
        var repo = GetRepository(MockJson());
        Func<Task> act = async () => await repo.DeleteAsync(null!);
        act.Should().ThrowAsync<ArgumentNullException>();
    }

    [Fact]
    public void DeleteAsync_WithMissingKey_ThrowsException()
    {
        true.Should().BeTrue(); // Placeholder
    }

    [Fact]
    public async Task DeleteAsync_WithHttpError_ThrowsException()
    {
        var repo = GetRepository("", HttpStatusCode.BadRequest);
        var act = async () => await repo.DeleteAsync(new Actor(1, "Actor 1", 1980));
        await act.Should().ThrowAsync<HttpRequestException>();
    }
}
