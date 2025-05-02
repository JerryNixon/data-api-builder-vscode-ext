using FluentAssertions;

using Microsoft.DataApiBuilder.Rest.Abstractions;
using Microsoft.DataApiBuilder.Rest.Options;

using System.ComponentModel.DataAnnotations;
using System.Net;
using System.Text.Json;
using System.Text.Json.Serialization;

using Xunit;
using Xunit.Sdk;

namespace Microsoft.DataApiBuilder.Rest.Tests;

public sealed class DabFactAttribute : FactAttribute
{
    public DabFactAttribute()
    {
        if (!DabTestHost.IsAvailableAsync().GetAwaiter().GetResult())
        {
            Skip = "DAB API is not running.";
        }
    }
}

public static class DabTestHost
{
    private static readonly HttpClient Http = new();
    private const string BaseUrl = "http://localhost:5000";

    public static async Task<bool> IsAvailableAsync()
    {
        try
        {
            var response = await Http.GetAsync(BaseUrl);
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }
}

public class ActorIntegrationTests : IAsyncLifetime
{
    private const string BaseUrl = "http://localhost:5000";
    private static readonly Uri ActorUri = new($"{BaseUrl}/api/Actor");
    private static readonly ITableRepository<Actor> Repo = new TableRepository<Actor>(ActorUri);
    private static int _nextTestId = 9000;
    private static readonly List<int> _testIds = new();

    public async Task InitializeAsync() => await CleanupTestActorsAsync();
    public async Task DisposeAsync() => await CleanupTestActorsAsync();

    private static int TrackTestId()
    {
        var id = Interlocked.Increment(ref _nextTestId);
        _testIds.Add(id);
        return id;
    }

    private static async Task CleanupTestActorsAsync()
    {
        foreach (var id in _testIds.Distinct())
        {
            try { await Repo.DeleteAsync(new Actor(id, "", 0)); }
            catch { /* already deleted */ }
        }

        _testIds.Clear();
    }

    public record class Actor(
        [property: Key][property: JsonPropertyName("Id")] int Id,
        [property: JsonPropertyName("Name")] string Name,
        [property: JsonPropertyName("BirthYear")] int BirthYear);

    [DabFact]
    public async Task InsertActor_CreatesRecordSuccessfully()
    {
        var actor = new Actor(TrackTestId(), "TEST_INSERT", 2222);
        var inserted = await Repo.PostAsync(actor);
        inserted.Should().NotBeNull();
        inserted.Id.Should().Be(actor.Id);
    }

    [DabFact]
    public async Task UpdateActor_ReplacesRecord()
    {
        var id = TrackTestId();
        var actor = new Actor(id, "TEST_UPDATE", 2000);
        await Repo.PostAsync(actor);
        var updated = actor with { BirthYear = 2001 };
        var result = await Repo.PutAsync(updated);
        result.BirthYear.Should().Be(2001);
    }

    [DabFact]
    public async Task PatchActor_UpdatesSingleField()
    {
        var id = TrackTestId();
        var actor = new Actor(id, "TEST_PATCH", 2000);
        await Repo.PostAsync(actor);
        var patch = actor with { Name = "TEST_PATCHED" };
        var result = await Repo.PatchAsync(patch);
        result.Name.Should().Be("TEST_PATCHED");
    }

    [DabFact]
    public async Task DeleteActor_ExistingRecord_RemovesRecord()
    {
        var id = TrackTestId();
        var actor = new Actor(id, "TEST_DELETE", 2000);
        await Repo.PostAsync(actor);
        await Repo.DeleteAsync(actor);

        var result = await Repo.GetAsync(new TableOptions { Filter = $"Id eq {id}" });
        result.Should().BeEmpty();
    }

    [DabFact]
    public async Task DeleteActor_NonExistent_Throws404()
    {
        var actor = new Actor(9997, "GHOST_DELETE", 1999);
        Func<Task> act = async () => await Repo.DeleteAsync(actor);

        await act.Should().ThrowAsync<HttpRequestException>()
            .Where(e => e.StatusCode == HttpStatusCode.NotFound);
    }

    [DabFact]
    public async Task FilterActor_ById_ReturnsSingle()
    {
        var id = TrackTestId();
        var actor = new Actor(id, "TEST_FILTER", 2000);
        await Repo.PostAsync(actor);
        var result = await Repo.GetAsync(new TableOptions { Filter = $"Id eq {id}" });
        result.Should().ContainSingle(a => a.Id == id);
    }

    [DabFact]
    public async Task GetActors_WithFirst_ReturnsOnlyOne()
    {
        await Repo.PostAsync(new Actor(TrackTestId(), "FIRST_1", 2000));
        await Repo.PostAsync(new Actor(TrackTestId(), "FIRST_2", 2000));

        var result = await Repo.GetAsync(new TableOptions { Filter = "Id ge 9000", First = 1 });
        result.Should().HaveCount(1);
    }

    [DabFact]
    public async Task GetActors_WithOrderBy_ReturnsInExpectedOrder()
    {
        await Repo.PostAsync(new Actor(TrackTestId(), "ALPHA", 2000));
        await Repo.PostAsync(new Actor(TrackTestId(), "OMEGA", 2000));

        var result = await Repo.GetAsync(new TableOptions
        {
            Filter = "Id ge 9000",
            OrderBy = "Name"
        });

        result.Select(a => a.Name).Should().ContainInOrder("ALPHA", "OMEGA");
    }

    [DabFact]
    public async Task GetActors_WithSelectOnlyName_ReturnsNameOnly()
    {
        var id = TrackTestId();
        await Repo.PostAsync(new Actor(id, "SELECT_ONLY", 1970));

        var result = await Repo.GetAsync(new TableOptions
        {
            Filter = $"Id eq {id}",
            Select = "Name"
        });

        result.Should().ContainSingle().Which.Name.Should().Be("SELECT_ONLY");
        result[0].BirthYear.Should().Be(0);
    }

    [DabFact]
    public async Task PatchActor_NonExistent_InsertsRecord()
    {
        var id = TrackTestId();
        var patch = new Actor(id, "NEW_VIA_PATCH", 2099);

        var inserted = await Repo.PatchAsync(patch);

        inserted.Should().NotBeNull();
        inserted.Id.Should().Be(id);

        var fetched = await Repo.GetAsync(new TableOptions { Filter = $"Id eq {id}" });
        fetched.Should().ContainSingle(a => a.Name == "NEW_VIA_PATCH");
    }

    [DabFact]
    public async Task PutActor_NonExistent_InsertsRecord()
    {
        var id = TrackTestId();
        var put = new Actor(id, "NEW_VIA_PUT", 1998);

        var inserted = await Repo.PutAsync(put);

        inserted.Should().NotBeNull();
        inserted.Id.Should().Be(id);

        var fetched = await Repo.GetAsync(new TableOptions { Filter = $"Id eq {id}" });
        fetched.Should().ContainSingle(a => a.Name == "NEW_VIA_PUT");
    }
}
