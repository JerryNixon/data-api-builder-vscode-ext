using System.Net;
using System.Text;
using System.Text.Json;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using FluentAssertions;
using Microsoft.DataApiBuilder.Rest.Abstractions;
using Microsoft.DataApiBuilder.Rest.Options;
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
    public async Task ExecuteProcedureAsync_WithGetMethodAndValidParams_ReturnsDabResponseWithResult()
    {
        // arrange (set method to GET and provide one param)
        var repo = GetRepo(MockJson());
        var options = new ProcedureOptions
        {
            Method = ApiMethod.GET,
            Parameters = { ["name"] = "test" }
        };

        // act (execute GET)
        var result = await repo.ExecuteProcedureAsync(options);

        // assert
        result.Result.Should().HaveCount(1);
        result.Success.Should().BeTrue();
    }

    [Fact]
    public async Task ExecuteProcedureAsync_WithPostMethodAndValidParams_ReturnsDabResponseWithResult()
    {
        // arrange (set method to POST with param)
        var repo = GetRepo(MockJson());
        var options = new ProcedureOptions
        {
            Method = ApiMethod.POST,
            Parameters = { ["name"] = "test" }
        };

        // act (execute POST)
        var result = await repo.ExecuteProcedureAsync(options);

        // assert
        result.Result.Should().HaveCount(1);
        result.Success.Should().BeTrue();
    }

    [Fact]
    public async Task ExecuteProcedureAsync_WithInvalidApiMethod_ThrowsInvalidOperation()
    {
        // arrange (invalid enum value)
        var repo = GetRepo(MockJson());
        var options = new ProcedureOptions { Method = (ApiMethod)999 };

        // act (attempt call)
        Func<Task> act = async () => await repo.ExecuteProcedureAsync(options);

        // assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Invalid API method.");
    }

    [Fact]
    public async Task ExecuteProcedureAsync_WithPostMethodAndHttpError_ThrowsHttpRequestException()
    {
        // arrange (set status to 400 to simulate failure)
        var repo = GetRepo("", HttpStatusCode.BadRequest);
        var options = new ProcedureOptions
        {
            Method = ApiMethod.POST,
            Parameters = { ["name"] = "fail" }
        };

        // act
        Func<Task> act = async () => await repo.ExecuteProcedureAsync(options);

        // assert
        await act.Should().ThrowAsync<HttpRequestException>();
    }

    [Fact]
    public async Task ExecuteProcedureAsync_WithGetMethodAndMultipleParams_ReturnsResult()
    {
        // arrange (add multiple query params)
        var repo = GetRepo(MockJson());
        var options = new ProcedureOptions
        {
            Method = ApiMethod.GET,
            Parameters =
            {
                ["param1"] = "val1",
                ["param2"] = "val2"
            }
        };

        // act
        var result = await repo.ExecuteProcedureAsync(options);

        // assert
        result.Result.Should().HaveCount(1);
    }

    [Fact]
    public async Task ExecuteProcedureAsync_WithGetMethodAndNoParams_ReturnsValidResponse()
    {
        // arrange (no parameters set)
        var repo = GetRepo(MockJson());
        var options = new ProcedureOptions { Method = ApiMethod.GET };

        // act
        var result = await repo.ExecuteProcedureAsync(options);

        // assert
        result.Result.Should().HaveCount(1);
    }
}
