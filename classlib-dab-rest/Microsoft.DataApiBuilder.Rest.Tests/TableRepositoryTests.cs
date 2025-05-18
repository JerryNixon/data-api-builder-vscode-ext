using System.ComponentModel.DataAnnotations;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

using FluentAssertions;
using Microsoft.DataApiBuilder.Rest.Options;

namespace Microsoft.DataApiBuilder.Rest.Tests;

public record class Actor(
    [property: Key][property: JsonPropertyName("id")] int? Id,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("birthYear")] int BirthYear);

public class TableRepositoryTests
{
    static TableRepository<Actor> GetRepository(string json, HttpStatusCode status = HttpStatusCode.OK)
    {
        var http = new HttpClient(new MockHandler(new HttpResponseMessage
        {
            StatusCode = status,
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        }));
        return new TableRepository<Actor>(new Uri("http://test/api/Actor"), http);
    }

    static string MockValueJson<T>(T[] items) =>
        JsonSerializer.Serialize(new { value = items });

    class MockHandler(HttpResponseMessage response) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage _, CancellationToken __)
            => Task.FromResult(response);
    }

    [Fact]
    public async Task GetAsync_WithValidJson_ReturnsExpectedActors()
    {
        // arrange (Creating repository with mock actor JSON)
        var actorName = nameof(GetAsync_WithValidJson_ReturnsExpectedActors);
        var mockJson = MockValueJson([new Actor(1, actorName, 1980), new Actor(2, actorName, 1990)]);
        var repo = GetRepository(mockJson);

        // act (Calling GetAsync)
        var result = await repo.GetAsync();

        // assert (Validating response count)
        result.Result.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetAsync_WithFilterOption_AppendsQuerySuccessfully()
    {
        // arrange (Creating repository with mock actor JSON)
        var actorName = nameof(GetAsync_WithFilterOption_AppendsQuerySuccessfully);
        var mockJson = MockValueJson(new[] { new Actor(1, actorName, 1980) });
        var repo = GetRepository(mockJson);
        var options = new GetOptions { Filter = "id eq 1" };

        // act (Calling GetAsync with filter option)
        var result = await repo.GetAsync(options);

        // assert (Validating response is non-null)
        result.Should().NotBeNull();
    }

    [Fact]
    public async Task GetAsync_WithInvalidJson_ThrowsException()
    {
        // arrange (Creating repository with malformed JSON)
        var repo = GetRepository("invalid json");

        // act (Calling GetAsync and capturing exception)
        var act = async () => await repo.GetAsync();

        // assert (Expecting deserialization exception)
        await act.Should().ThrowAsync<Exception>();
    }

    [Fact]
    public async Task GetAsync_WithHttpError_ThrowsHttpRequestException()
    {
        // arrange (Creating repository with error status)
        var repo = GetRepository("", HttpStatusCode.InternalServerError);

        // act (Calling GetAsync and capturing exception)
        var act = async () => await repo.GetAsync();

        // assert (Expecting HttpRequestException)
        await act.Should().ThrowAsync<HttpRequestException>();
    }

    [Fact]
    public async Task PostAsync_WithValidItem_ReturnsCreatedActor()
    {
        // arrange (Creating repository with mock response JSON)
        var actorName = nameof(PostAsync_WithValidItem_ReturnsCreatedActor);
        var actor = new Actor(1, actorName, 1980);
        var mockJson = MockValueJson(new[] { actor });
        var repo = GetRepository(mockJson);

        // act (Calling PostAsync)
        var response = await repo.PostAsync(actor, new PostOptions());

        // assert (Validating ID)
        response.Result.Id.Should().Be(1);
    }

    [Fact]
    public async Task PostAsync_WithNullItem_ThrowsArgumentNullException()
    {
        // arrange (Creating repository)
        var repo = GetRepository(MockValueJson(Array.Empty<Actor>()));

        // act (Calling PostAsync with null)
        Func<Task> act = async () => await repo.PostAsync(null!, new PostOptions());

        // assert (Expecting ArgumentNullException)
        await act.Should().ThrowAsync<ArgumentNullException>();
    }

    [Fact]
    public async Task PostAsync_WithHttpError_ThrowsHttpRequestException()
    {
        // arrange (Creating repository with error response)
        var actorName = nameof(PostAsync_WithHttpError_ThrowsHttpRequestException);
        var actor = new Actor(1, actorName, 1980);
        var repo = GetRepository("", HttpStatusCode.BadRequest);

        // act (Calling PostAsync)
        var act = async () => await repo.PostAsync(actor, new PostOptions());

        // assert (Expecting HttpRequestException)
        await act.Should().ThrowAsync<HttpRequestException>();
    }

    [Fact]
    public async Task PutAsync_WithMissingKey_ThrowsInvalidOperationException()
    {
        // arrange (Creating repository)
        var actorName = nameof(PutAsync_WithMissingKey_ThrowsInvalidOperationException);
        var repo = GetRepository(MockValueJson(Array.Empty<Actor>()));
        var invalidActor = new Actor(null, actorName, 1980);

        // act (Calling PutAsync with keyless item)
        var act = async () => await repo.PutAsync(invalidActor, new PutOptions());

        // assert (Expecting InvalidOperationException)
        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task PatchAsync_WithMissingKey_ThrowsInvalidOperationException()
    {
        // arrange (Creating repository)
        var actorName = nameof(PatchAsync_WithMissingKey_ThrowsInvalidOperationException);
        var repo = GetRepository(MockValueJson(Array.Empty<Actor>()));
        var invalidActor = new Actor(null, actorName, 1980);

        // act (Calling PatchAsync with keyless item)
        var act = async () => await repo.PatchAsync(invalidActor, new PatchOptions());

        // assert (Expecting InvalidOperationException)
        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task DeleteAsync_WithMissingKey_ThrowsInvalidOperationException()
    {
        // arrange (Creating repository)
        var actorName = nameof(DeleteAsync_WithMissingKey_ThrowsInvalidOperationException);
        var repo = GetRepository(MockValueJson(Array.Empty<Actor>()));
        var invalidActor = new Actor(null, actorName, 1980);

        // act (Calling DeleteAsync with keyless item)
        var act = async () => await repo.DeleteAsync(invalidActor, new DeleteOptions());

        // assert (Expecting InvalidOperationException)
        await act.Should().ThrowAsync<InvalidOperationException>();
    }
}
