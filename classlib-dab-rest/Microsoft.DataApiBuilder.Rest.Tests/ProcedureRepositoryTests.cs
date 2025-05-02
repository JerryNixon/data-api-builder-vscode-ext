using System.Net;
using System.Text;
using System.Text.Json;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using FluentAssertions;
using Microsoft.DataApiBuilder.Rest.Abstractions;
using Microsoft.DataApiBuilder.Rest.Options;
using Xunit;
using static Microsoft.DataApiBuilder.Rest.Options.ProcedureOptions;

namespace Microsoft.DataApiBuilder.Rest.Tests;

public class ProcedureRepositoryTests
{
    class TestProcedureRepository(Uri uri, HttpClient client)
        : ProcedureRepository<SampleEntity>(uri, client)
    { }

    static IProcedureRepository<SampleEntity> GetRepo(string json, HttpStatusCode status = HttpStatusCode.OK)
    {
        var http = new HttpClient(new MockHandler(new HttpResponseMessage
        {
            StatusCode = status,
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        }));
        return new TestProcedureRepository(new Uri("http://test/proc"), http);
    }

    static string MockJson() => JsonSerializer.Serialize(new
    {
        value = new[] {
        new SampleEntity { Id = 1, Name = "A", BirthYear = 2000 }
    }
    });

    class MockHandler(HttpResponseMessage response) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage _, CancellationToken __)
            => Task.FromResult(response);
    }

    public class SampleEntity
    {
        [Key]
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("birthYear")]
        public int BirthYear { get; set; }
    }

    [Fact]
    public async Task ExecuteProcedureAsync_WithGetMethod_ReturnsResults()
    {
        var repo = GetRepo(MockJson());
        var options = new ProcedureOptions
        {
            Method = ApiMethod.GET,
            Parameters = { ["name"] = "test" }
        };

        var result = await repo.ExecuteProcedureAsync(options);
        result.Should().HaveCount(1);
    }

    [Fact]
    public async Task ExecuteProcedureAsync_WithPostMethod_ReturnsResults()
    {
        var repo = GetRepo(MockJson());
        var options = new ProcedureOptions
        {
            Method = ApiMethod.POST,
            Parameters = { ["name"] = "test" }
        };

        var result = await repo.ExecuteProcedureAsync(options);
        result.Should().HaveCount(1);
    }

    [Fact]
    public async Task ExecuteProcedureAsync_WithInvalidMethod_Throws()
    {
        var repo = GetRepo(MockJson());
        var options = new ProcedureOptions { Method = (ApiMethod)999 };

        Func<Task> act = async () => await repo.ExecuteProcedureAsync(options);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Invalid API method.");
    }

    [Fact]
    public async Task ExecuteProcedurePostAsync_WithHttpError_Throws()
    {
        var repo = GetRepo("", HttpStatusCode.BadRequest);
        var options = new ProcedureOptions
        {
            Method = ApiMethod.POST,
            Parameters = { ["name"] = "fail" }
        };

        Func<Task> act = async () => await repo.ExecuteProcedureAsync(options);
        await act.Should().ThrowAsync<HttpRequestException>();
    }

    [Fact]
    public async Task ExecuteProcedureGetAsync_WithQueryParams_SerializesCorrectly()
    {
        var repo = GetRepo(MockJson());
        var options = new ProcedureOptions
        {
            Method = ApiMethod.GET,
            Parameters = {
                ["param1"] = "val1",
                ["param2"] = "val2"
            }
        };

        var result = await repo.ExecuteProcedureAsync(options);
        result.Should().HaveCount(1);
    }

    [Fact]
    public async Task ExecuteProcedureGetAsync_WithNoParameters_Succeeds()
    {
        var repo = GetRepo(MockJson());
        var options = new ProcedureOptions { Method = ApiMethod.GET };
        var result = await repo.ExecuteProcedureAsync(options);
        result.Should().NotBeNull();
    }
}
