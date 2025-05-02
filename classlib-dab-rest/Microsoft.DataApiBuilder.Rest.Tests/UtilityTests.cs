using System.Net;
using System.ComponentModel.DataAnnotations;
using FluentAssertions;
using Microsoft.DataApiBuilder.Rest.Options;
using System.Text.Json.Serialization;

namespace Microsoft.DataApiBuilder.Rest.Tests;

public class UtilityTests
{
    [Fact]
    public async Task IsApiAvailableAsync_WithSuccess_ReturnsTrue()
    {
        // arrange
        var url = "https://example.com";

        // act
        var result = await Utility.IsApiAvailableAsync(url);

        // assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task IsApiAvailableAsync_WithHttpError_ReturnsFalse()
    {
        // simulate unreachable URL or 404
        var result = await Utility.IsApiAvailableAsync("http://localhost:9999/does-not-exist");
        result.Should().BeFalse();
    }

    [Fact]
    public async Task IsApiAvailableAsync_WithTimeout_ReturnsFalse()
    {
        var result = await Utility.IsApiAvailableAsync("http://10.255.255.1", timeoutInSeconds: 1);
        result.Should().BeFalse();
    }

    [Fact]
    public void BuildQueryStringFromOptions_WithValues_ReturnsExpectedQuery()
    {
        var options = new TableOptions
        {
            Select = "id,name",
            Filter = "id eq 1",
            OrderBy = "name",
            First = 10,
            After = "abc"
        };

        var query = options.BuildQueryStringFromOptions();
        var parsed = System.Web.HttpUtility.ParseQueryString(query!);

        parsed["$select"].Should().Be("id,name");
        parsed["$filter"].Should().Be("id eq 1");
        parsed["$orderby"].Should().Be("name");
        parsed["$first"].Should().Be("10");
        parsed["$after"].Should().Be("abc");
    }

    [Fact]
    public void BuildQueryStringFromOptions_WithNull_ReturnsNull()
    {
        TableOptions options = null!;
        var query = options.BuildQueryStringFromOptions();
        query.Should().BeNull();
    }

    [Fact]
    public void ToJsonContent_WithValidParameters_SerializesCorrectly()
    {
        var options = new ProcedureOptions();
        options.Parameters["name"] = "test";

        var content = options.ToJsonContent();
        content.Should().NotBeNull();
    }

    [Fact]
    public void ToQueryString_WithValidParameters_ReturnsQueryString()
    {
        var options = new ProcedureOptions();
        options.Parameters["name"] = "test";

        var result = options.ToQueryString();
        result.Should().Contain("name=test");
    }

    [Fact]
    public void ToQueryString_WithEmptyParameters_ReturnsNull()
    {
        var options = new ProcedureOptions();
        var result = options.ToQueryString();
        result.Should().BeNull();
    }

    [Fact]
    public void AddHeadersToHttpClient_AddsHeadersCorrectly()
    {
        var options = new TableOptions { Authorization = "abc", XMsApiRole = "user" };
        var client = new HttpClient();
        options.AddHeadersToHttpClient(client);

        client.DefaultRequestHeaders.Contains("Bearer").Should().BeTrue();
        client.DefaultRequestHeaders.Contains("x-ms-api-role").Should().BeTrue();
    }

    [Fact]
    public void AddHeadersToHttpClient_RemovesHeadersIfNull()
    {
        var client = new HttpClient();
        client.DefaultRequestHeaders.Add("Bearer", "xyz");

        var options = new TableOptions { Authorization = null };
        options.AddHeadersToHttpClient(client);

        client.DefaultRequestHeaders.Contains("Bearer").Should().BeFalse();
    }

    [Fact]
    public void BuildUriWithKeyProperties_WithValidKey_BuildsUri()
    {
        var item = new SampleEntity { Id = 42 };
        var uri = item.BuildUriWithKeyProperties(new Uri("http://host/entity/"));
        uri.ToString().Should().Contain("id/42");
    }

    [Fact]
    public void BuildUriWithKeyProperties_WithCompositeKeys_ProducesCorrectFormat()
    {
        var item = new CompositeEntity { Key1 = 10, Key2 = 20 };
        var uri = item.BuildUriWithKeyProperties(new Uri("http://host/Series_Character/"));
        uri.AbsoluteUri.Should().Be("http://host/Series_Character/Key1/10/Key2/20");
    }

    public class CompositeEntity
    {
        [Key]
        [JsonPropertyName("Key1")]
        public int Key1 { get; set; }

        [Key]
        [JsonPropertyName("Key2")]
        public int Key2 { get; set; }
    }

    [Fact]
    public void BuildUriWithKeyProperties_MissingKey_ThrowsException()
    {
        var item = new object();
        Action act = () => item.BuildUriWithKeyProperties(new Uri("http://host/"));
        act.Should().Throw<KeyNotFoundException>();
    }

    [Fact]
    public void BuildUriWithKeyProperties_EmptyKeyValue_ThrowsException()
    {
        var item = new NullKeyEntity { Id = null }; // or "" to test empty string
        Action act = () => item.BuildUriWithKeyProperties(new Uri("http://host/"));
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*cannot have a null or empty value*");
    }

    public class NullKeyEntity
    {
        [Key]
        [JsonPropertyName("id")]
        public string? Id { get; set; }
    }

    [Fact]
    public void SerializeWithoutKeyProperties_RemovesKeyFields()
    {
        var entity = new SampleEntity { Id = 1, Name = "test" };
        var json = entity.SerializeWithoutKeyProperties();
        var str = json.ReadAsStringAsync().Result;
        str.Should().NotContain("id");
        str.Should().Contain("name");
    }

    [Fact]
    public void SerializeWithoutKeyProperties_MissingKey_ThrowsException()
    {
        var anon = new { Name = "x" };
        Action act = () => anon.SerializeWithoutKeyProperties();
        act.Should().Throw<KeyNotFoundException>();
    }

    [Fact]
    public async Task EnsureSuccessAsync_WithValidResponse_ReturnsResults()
    {
        var json = """
        { "value": [ { "id": 1, "name": "X", "birthYear": 2000 } ] }
        """;

        var response = new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(json)
        };

        var results = await response.EnsureSuccessAsync<SampleEntity>();
        results.Should().HaveCount(1);
    }

    [Fact]
    public async Task EnsureSuccessAsync_WithHttpError_ThrowsException()
    {
        var response = new HttpResponseMessage(HttpStatusCode.BadRequest)
        {
            Content = new StringContent("error")
        };

        Func<Task> act = async () => await response.EnsureSuccessAsync<SampleEntity>();
        await act.Should().ThrowAsync<HttpRequestException>();
    }

    [Fact]
    public async Task EnsureSuccessAsync_WithNullResults_ThrowsException()
    {
        var json = """{ "value": null }""";

        var response = new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(json)
        };

        Func<Task> act = async () => await response.EnsureSuccessAsync<SampleEntity>();
        await act.Should().ThrowAsync<Exception>().WithMessage("*did not contain any results*");
    }

    [Fact]
    public async Task EnsureSuccessAsync_WithErrorObject_LogsAndReturnsResults()
    {
        var json = """
        {
          "value": [{ "id": 1, "name": "test", "birthYear": 1990 }],
          "error": { "code": "123", "message": "warning", "status": 200 }
        }
        """;

        var response = new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(json)
        };

        var result = await response.EnsureSuccessAsync<SampleEntity>();
        result.Should().HaveCount(1);
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
}
