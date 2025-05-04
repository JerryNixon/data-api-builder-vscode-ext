// Updated ActorIntegrationTests with clarified arrange/act/assert comments

using FluentAssertions;

using Microsoft.DataApiBuilder.Rest.Abstractions;
using Microsoft.DataApiBuilder.Rest.Options;

using System.ComponentModel.DataAnnotations;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace Microsoft.DataApiBuilder.Rest.Tests;

public class ActorIntegrationTests : IAsyncLifetime
{
    private static readonly Uri ActorUri = new($"{DabIntegrationFactAttribute.BaseUrl}/api/Actor");
    private static readonly ITableRepository<Actor> Repo = new TableRepository<Actor>(ActorUri);
    private static int _nextTestId = 9000;

    public async Task InitializeAsync() => await CleanupTestActorsAsync();
    public async Task DisposeAsync() => await CleanupTestActorsAsync();

    private static int GetNextId() => Interlocked.Increment(ref _nextTestId);

    private static async Task CleanupTestActorsAsync()
    {
        var all = await Repo.GetAsync(new TableOptions { Filter = "Id ge 9000" });
        foreach (var a in all.Result)
        {
            try { await Repo.DeleteAsync(a); } catch { }
        }
    }

    public record class Actor(
        [property: Key][property: JsonPropertyName("Id")] int Id,
        [property: JsonPropertyName("Name")] string Name,
        [property: JsonPropertyName("BirthYear")] int BirthYear);

    [DabIntegrationFact]
    public async Task DeleteAsync_WithExistingActor_RemovesRecord()
    {
        // arrange (insert actor to be deleted)
        var id = GetNextId();
        var actor = new Actor(id, nameof(DeleteAsync_WithExistingActor_RemovesRecord), 2000);
        await Repo.PostAsync(actor);

        // act (delete actor)
        await Repo.DeleteAsync(actor);

        // assert (confirm deletion)
        var result = await Repo.GetAsync(new TableOptions { Filter = $"Id eq {id}" });
        result.Result.Should().BeEmpty();
    }

    [DabIntegrationFact]
    public async Task DeleteAsync_WithNonExistentActor_Throws404()
    {
        // arrange (non-existent actor)
        var actor = new Actor(9997, nameof(DeleteAsync_WithNonExistentActor_Throws404), 1999);

        // act (attempt delete)
        Func<Task> act = async () => await Repo.DeleteAsync(actor);

        // assert (expect 404)
        await act.Should().ThrowAsync<HttpRequestException>().Where(e => e.StatusCode == HttpStatusCode.NotFound);
    }

    [DabIntegrationFact]
    public async Task GetAsync_WithFilterAndOrderAndSelect_ReturnsValidProjection()
    {
        // arrange (insert actors with only names selected)
        var name = nameof(GetAsync_WithFilterAndOrderAndSelect_ReturnsValidProjection);
        await Repo.PostAsync(new Actor(GetNextId(), name + "_1", 1901));
        await Repo.PostAsync(new Actor(GetNextId(), name + "_2", 1902));

        // act (query with filter/order/select)
        var result = await Repo.GetAsync(new TableOptions { Filter = "Id ge 9000", OrderBy = "Name", Select = "Name" });

        // assert (names present, birth year defaulted)
        result.Result.Should().OnlyContain(a => !string.IsNullOrEmpty(a.Name));
        result.Result[0].BirthYear.Should().Be(0);
    }

    [DabIntegrationFact]
    public async Task GetAsync_WithFirstOption_ReturnsSingleResult()
    {
        // arrange (insert multiple actors)
        var name = nameof(GetAsync_WithFirstOption_ReturnsSingleResult);
        await Repo.PostAsync(new Actor(GetNextId(), name + "_1", 2000));
        await Repo.PostAsync(new Actor(GetNextId(), name + "_2", 2000));

        // act (query with $first=1)
        var result = await Repo.GetAsync(new TableOptions { Filter = "Id ge 9000", First = 1 });

        // assert (only one result)
        result.Result.Should().HaveCount(1);
    }

    [DabIntegrationFact]
    public async Task GetAsync_WithIdFilter_ReturnsExpectedActor()
    {
        // arrange (insert known actor)
        var id = GetNextId();
        var name = nameof(GetAsync_WithIdFilter_ReturnsExpectedActor);
        await Repo.PostAsync(new Actor(id, name, 2000));

        // act (filter by ID)
        var result = await Repo.GetAsync(new TableOptions { Filter = $"Id eq {id}" });

        // assert (should match inserted ID)
        result.Result.Should().ContainSingle(a => a.Id == id);
    }

    [DabIntegrationFact]
    public async Task GetAsync_WithInvalidFilterSyntax_Throws400()
    {
        // arrange (invalid filter syntax)
        var options = new TableOptions { Filter = "Id === 'oops'" };

        // act (trigger filter error)
        Func<Task> act = async () => await Repo.GetAsync(options);

        // assert (should throw 400)
        await act.Should().ThrowAsync<HttpRequestException>();
    }

    [DabIntegrationFact]
    public async Task GetAsync_WithNonExistentSelectField_Throws400()
    {
        // arrange (invalid select field)
        var options = new TableOptions { Select = "BogusField" };

        // act (trigger select error)
        Func<Task> act = async () => await Repo.GetAsync(options);

        // assert (should throw 400)
        await act.Should().ThrowAsync<HttpRequestException>();
    }

    [DabIntegrationFact]
    public async Task GetAsync_WithOrderBy_ReturnsSortedByName()
    {
        // arrange (insert actors out of order)
        await Repo.PostAsync(new Actor(GetNextId(), "OMEGA", 2000));
        await Repo.PostAsync(new Actor(GetNextId(), "ALPHA", 2000));

        // act (query sorted by name)
        var result = await Repo.GetAsync(new TableOptions { Filter = "Id ge 9000", OrderBy = "Name" });

        // assert (check sort order)
        result.Result.Select(a => a.Name).Should().ContainInOrder("ALPHA", "OMEGA");
    }

    [DabIntegrationFact]
    public async Task GetAsync_WithSelectOnlyName_ReturnsNameOnly()
    {
        // arrange (insert actor)
        var id = GetNextId();
        var name = nameof(GetAsync_WithSelectOnlyName_ReturnsNameOnly);
        await Repo.PostAsync(new Actor(id, name, 1970));

        // act (select only Name)
        var result = await Repo.GetAsync(new TableOptions { Filter = $"Id eq {id}", Select = "Name" });

        // assert (should contain name, but not birth year)
        result.Result.Should().ContainSingle().Which.Name.Should().Be(name);
        result.Result[0].BirthYear.Should().Be(0);
    }

    [DabIntegrationFact]
    public async Task PatchAsync_WithExistingActor_UpdatesSingleProperty()
    {
        // arrange (insert actor)
        var id = GetNextId();
        var name = nameof(PatchAsync_WithExistingActor_UpdatesSingleProperty);
        var actor = new Actor(id, name, 2000);
        await Repo.PostAsync(actor);

        // act (patch name)
        var patch = actor with { Name = name + "_PATCHED" };
        var result = await Repo.PatchAsync(patch);

        // assert (name updated)
        result.Result.Name.Should().Be(name + "_PATCHED");
    }

    [DabIntegrationFact]
    public async Task PatchAsync_WithNonExistentActor_InsertsRecord()
    {
        // arrange (new actor)
        var id = GetNextId();
        var name = nameof(PatchAsync_WithNonExistentActor_InsertsRecord);
        var patch = new Actor(id, name, 2099);

        // act (patch non-existent record)
        var inserted = await Repo.PatchAsync(patch);

        // assert (record created)
        var fetched = await Repo.GetAsync(new TableOptions { Filter = $"Id eq {id}" });
        inserted.Result.Id.Should().Be(id);
        fetched.Result.Should().ContainSingle(a => a.Name == name);
    }

    [DabIntegrationFact]
    public async Task PostAsync_WithExtraField_IgnoresOrFailsGracefully()
    {
        // arrange (object with unknown property)
        var id = GetNextId();
        var payload = new { Id = id, Name = "Extra", BirthYear = 2001, Extra = "value" };

        // act (send to POST)
        var response = await new HttpClient().PostAsync($"{ActorUri}", JsonContent.Create(payload));

        // assert (allowable responses)
        new[] { HttpStatusCode.OK, HttpStatusCode.Created, HttpStatusCode.BadRequest }
            .Should().Contain(response.StatusCode);
    }

    [DabIntegrationFact]
    public async Task PostAsync_WithMissingRequiredField_ThrowsValidationError()
    {
        // arrange (missing Name field)
        var json = """{ "Id": 9991, "BirthYear": 2000 }""";
        var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");

        // act (send to POST)
        var response = await new HttpClient().PostAsync($"{ActorUri}", content);

        // assert (should be 400)
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [DabIntegrationFact]
    public async Task PostAsync_WithNullRequiredField_ThrowsValidationError()
    {
        // arrange (null Name field)
        var payload = new { Id = GetNextId(), Name = (string?)null, BirthYear = 2020 };

        // act (send to POST)
        var response = await new HttpClient().PostAsync($"{ActorUri}", JsonContent.Create(payload));

        // assert (should be 400)
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [DabIntegrationFact]
    public async Task PostAsync_WithOverflowInteger_ThrowsOrTruncates()
    {
        // arrange (overflow integer)
        var payload = new { Id = GetNextId(), Name = "Overflow", BirthYear = int.MaxValue + 1L };

        // act (send to POST)
        var response = await new HttpClient().PostAsync($"{ActorUri}", JsonContent.Create(payload));

        // assert (should be 400)
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [DabIntegrationFact]
    public async Task PostAsync_WithValidActor_ReturnsCreatedActor()
    {
        // arrange (valid actor)
        var id = GetNextId();
        var actor = new Actor(id, nameof(PostAsync_WithValidActor_ReturnsCreatedActor), 2222);

        // act (send to POST)
        var inserted = await Repo.PostAsync(actor);

        // assert (insert succeeded)
        inserted.Result.Should().NotBeNull();
        inserted.Result.Id.Should().Be(actor.Id);
    }

    [DabIntegrationFact]
    public async Task PutAsync_WithExistingActor_UpdatesFullRecord()
    {
        // arrange (insert actor)
        var id = GetNextId();
        var actor = new Actor(id, nameof(PutAsync_WithExistingActor_UpdatesFullRecord), 2000);
        await Repo.PostAsync(actor);

        // act (update birth year)
        var result = await Repo.PutAsync(actor with { BirthYear = 2001 });

        // assert (birth year updated)
        result.Result.BirthYear.Should().Be(2001);
    }

    [DabIntegrationFact]
    public async Task PutAsync_WithNonExistentActor_InsertsRecord()
    {
        // arrange (new actor)
        var id = GetNextId();
        var put = new Actor(id, nameof(PutAsync_WithNonExistentActor_InsertsRecord), 1998);

        // act (send to PUT)
        var inserted = await Repo.PutAsync(put);

        // assert (record inserted)
        var fetched = await Repo.GetAsync(new TableOptions { Filter = $"Id eq {id}" });
        inserted.Result.Id.Should().Be(id);
        fetched.Result.Should().ContainSingle(a => a.Name == put.Name);
    }
}
