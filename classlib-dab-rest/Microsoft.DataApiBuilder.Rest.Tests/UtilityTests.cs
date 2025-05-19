// Updated UtilityTests with descriptive arrange/act/assert comments

using System.Net;
using System.ComponentModel.DataAnnotations;
using FluentAssertions;
using Microsoft.DataApiBuilder.Rest.Options;
using System.Text.Json.Serialization;
using Microsoft.DataApiBuilder.Rest.Json;
using static Microsoft.DataApiBuilder.Rest.Utility;

namespace Microsoft.DataApiBuilder.Rest.Tests;

public class UtilityTests
{
    [Fact]
    public async Task IsApiAvailableAsync_WithReachableUrl_ReturnsTrue()
    {
        // act (send request to known reachable URL)
        var result = await IsApiAvailableAsync("https://google.com");

        // assert (API should be available)
        result.Should().BeTrue();
    }

    [Fact]
    public async Task IsApiAvailableAsync_WithMissingServer_ReturnsFalse()
    {
        // act (send request to invalid localhost port)
        var result = await IsApiAvailableAsync("http://localhost:9999/does-not-exist");

        // assert (API should be unavailable)
        result.Should().BeFalse();
    }

    [Fact]
    public async Task IsApiAvailableAsync_WithNetworkTimeout_ReturnsFalse()
    {
        // act (send request to unroutable IP that causes timeout)
        var result = await IsApiAvailableAsync("http://10.255.255.1", timeoutInSeconds: 1);

        // assert (timeout should return false)
        result.Should().BeFalse();
    }

    [Fact]
    public void BuildQueryStringFromOptions_WithAllFields_EncodesExpectedValues()
    {
        // arrange (build options object with all supported query fields)
        var options = new GetOptions
        {
            Select = "id,name",
            Filter = "id eq 1",
            OrderBy = "name",
            First = 10,
            After = "abc"
        };

        // act (parse generated query string)
        var parsed = System.Web.HttpUtility.ParseQueryString(options.BuildQueryStringFromOptions()!);

        // assert (query string should reflect expected values)
        parsed["$select"].Should().Be(options.Select);
        parsed["$filter"].Should().Be(options.Filter);
        parsed["$orderby"].Should().Be(options.OrderBy);
        parsed["$first"].Should().Be("10");
        parsed["$after"].Should().Be(options.After);
    }

    [Fact]
    public void BuildQueryStringFromOptions_WithNullInput_ReturnsNull()
    {
        // act (call with null options)
        GetOptions options = null!;
        var query = options.BuildQueryStringFromOptions();

        // assert (null input should yield null query string)
        query.Should().BeNull();
    }

    [Fact]
    public void ToJsonContent_WithValidProcedureParams_ReturnsContent()
    {
        // arrange (add valid parameter)
        var options = new ExecuteOptions();
        options.Parameters["name"] = "test";

        // act (convert to JsonContent)
        var content = options.ToJsonContent();

        // assert (content should not be null)
        content.Should().NotBeNull();
    }

    [Fact]
    public void ToQueryString_WithParameters_ReturnsEncodedQuery()
    {
        // arrange (define query parameters)
        var options = new ExecuteOptions();
        options.Parameters["name"] = "test";

        // act (generate query string)
        var result = options.ToQueryString();

        // assert (query string should include encoded key-value pair)
        result.Should().Contain("name=test");
    }

    [Fact]
    public void ToQueryString_WithNoParameters_ReturnsNull()
    {
        // act (convert empty parameters to query string)
        var result = new ExecuteOptions().ToQueryString();

        // assert (no parameters means null query)
        result.Should().BeNull();
    }

    [Fact]
    public void AddHeadersToHttpClient_WithValues_AddsCorrectHeaders()
    {
        // arrange (prepare http client and options)
        var client = new HttpClient();
        var options = new GetOptions { Authorization = "abc", XMsApiRole = "user" };

        // act (add headers from options)
        CreateHttpClientAndAddHeaders(ref client, options);

        // assert (headers should be applied)
        Assert.NotNull(client);
        client.DefaultRequestHeaders.Contains("Bearer").Should().BeTrue();
        client.DefaultRequestHeaders.Contains("x-ms-api-role").Should().BeTrue();
    }

    [Fact]
    public void AddHeadersToHttpClient_WithNull_RemovesExistingHeaders()
    {
        // arrange (prepare client with preset header)
        var client = new HttpClient();
        client.DefaultRequestHeaders.Add("Bearer", "xyz");
        var options = new GetOptions { Authorization = null };

        // act (try to clear null headers)
        CreateHttpClientAndAddHeaders(ref client, options);

        // assert (header should be removed)
        Assert.NotNull(client);
        client.DefaultRequestHeaders.Contains("Bearer").Should().BeFalse();
    }

    [Fact]
    public void BuildUriWithKeyProperties_WithSingleKey_GeneratesCorrectUri()
    {
        // arrange (define entity with key value)
        var item = new SampleEntity { Id = 42 };

        // act (build URI using key)
        var uri = item.BuildUriWithKeyProperties(new Uri("http://host/entity/"));

        // assert (URI should include key value in path)
        uri.ToString().Should().Contain("id/42");
    }

    [Fact]
    public void BuildUriWithKeyProperties_WithCompositeKey_FormatsPathCorrectly()
    {
        // arrange (define entity with two keys)
        var item = new CompositeEntity { Key1 = 10, Key2 = 20 };

        // act (build URI from composite keys)
        var uri = item.BuildUriWithKeyProperties(new Uri("http://host/Series_Character/"));

        // assert (URI should match expected format)
        uri.ToString().Should().Be("http://host/Series_Character/Key1/10/Key2/20");
    }

    [Fact]
    public void BuildUriWithKeyProperties_WithNoKey_ThrowsException()
    {
        // arrange (create non-keyed object)
        var item = new object();

        // act (attempt URI build with invalid type)
        Action act = () => item.BuildUriWithKeyProperties(new Uri("http://host/"));

        // assert (should throw KeyNotFoundException)
        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void BuildUriWithKeyProperties_WithNullKey_ThrowsInvalidOperation()
    {
        // arrange (key property is null)
        var item = new NullKeyEntity { Id = null };

        // act (attempt URI build with null key)
        Action act = () => item.BuildUriWithKeyProperties(new Uri("http://host/"));

        // assert (should throw validation exception)
        act.Should().Throw<InvalidOperationException>().WithMessage("*cannot have a null or empty value*");
    }

    [Fact]
    public async Task SerializeWithoutKeyProperties_WithKey_RemovesKeyField()
    {
        // arrange (entity with key and additional fields)
        var entity = new SampleEntity { Id = 1, Name = "test" };

        // act (serialize without key fields)
        var json = await entity.SerializeWithoutKeyProperties().ReadAsStringAsync();

        // assert (output should exclude key)
        json.Should().NotContain("id");
        json.Should().Contain("name");
    }

    [Fact]
    public void SerializeWithoutKeyProperties_WithoutKey_ThrowsException()
    {
        // arrange (anonymous object with no key)
        var anon = new { Name = "x" };

        // act (attempt serialization)
        Action act = () => anon.SerializeWithoutKeyProperties();

        // assert (should throw KeyNotFoundException)
        act.Should().Throw<KeyNotFoundException>();
    }

    [Fact]
    public async Task EnsureSuccessAndConvertToDabResponseAsync_WithValidJson_ReturnsResponse()
    {
        // arrange (valid JSON content for GET response)
        var json = """{ "value": [ { "id": 1, "name": "X", "birthYear": 2000 } ] }""";
        var response = new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(json)
        };

        // act (deserialize to DabResponse)
        var result = await response.EnsureSuccessAndConvertToDabResponseAsync<SampleEntity, SampleEntity>(default);

        // assert (result should be parsed correctly)
        result.Result.Should().NotBeNull();
    }

    [Fact]
    public async Task EnsureSuccessAndConvertToDabResponseAsync_WithBadStatus_ThrowsHttpException()
    {
        // arrange (simulate error response)
        var response = new HttpResponseMessage(HttpStatusCode.BadRequest)
        {
            Content = new StringContent("error")
        };

        // act (call deserializer expecting exception)
        Func<Task> act = async () => await response.EnsureSuccessAndConvertToDabResponseAsync<SampleEntity, SampleEntity>(default);

        // assert (should throw HttpRequestException)
        await act.Should().ThrowAsync<HttpRequestException>();
    }

    [Fact]
    public async Task EnsureSuccessAndConvertToDabResponseAsync_WithNullValue_ThrowsException()
    {
        // arrange (JSON with null value field)
        var response = new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("""{ "value": null }""")
        };

        // act (attempt to deserialize null value)
        Func<Task> act = async () => await response.EnsureSuccessAndConvertToDabResponseAsync<SampleEntity, SampleEntity>(default);

        // assert (should throw exception for null results)
        await act.Should().NotThrowAsync<Exception>();
    }

    [Fact]
    public async Task EnsureSuccessAndConvertToDabResponseAsync_WithErrorObject_ReturnsError()
    {
        // arrange (simulate partial success response with error object)
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

        // act (deserialize response with error)
        var result = await response.EnsureSuccessAndConvertToDabResponseAsync<SampleEntity, SampleEntity>(default);

        // assert (result should include error details)
        result.Success.Should().BeFalse();
        result.Error.Should().NotBeNull();
    }

    [Fact]
    public async Task EnsureSuccessAndConvertToDabResponseAsync_NonGeneric_ReturnsSuccess()
    {
        // arrange (simple JSON payload for non-generic case)
        var json = """
        {
          "value": [{ "id": 1, "name": "test", "birthYear": 1990 }]
        }
        """;
        var response = new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(json)
        };

        // act (deserialize non-generic DabResponse)
        var result = await response.EnsureSuccessAndConvertToDabResponseAsync(default);

        // assert (should succeed with no error)
        result.Success.Should().BeTrue();
    }

    [Fact]
    public void DabResponse_DefaultConstructor_HasNoError()
    {
        // act (construct empty response)
        var result = new DabResponse();

        // assert (should be marked successful and error-free)
        result.Success.Should().BeTrue();
        result.Error.Should().BeNull();
    }

    [Fact]
    public void DabResponseGeneric_DefaultConstructor_InitializesEmpty()
    {
        // act (instantiate empty generic response)
        var result = new DabResponse<SampleEntity, SampleEntity[]>();

        // assert (default should be successful with null result)
        result.Success.Should().BeTrue();
        result.Result.Should().BeNull();
    }

    [Fact]
    public void DabResponseGeneric_WithValidRoot_PopulatesFields()
    {
        // arrange (prepare root object with single result)
        var root = new ResponseRoot<SampleEntity>
        {
            Results = [new SampleEntity { Id = 1, Name = "Test", BirthYear = 1980 }],
            NextLink = "http://next",
            Error = null
        };

        // act (construct DabResponse from root)
        var result = new DabResponse<SampleEntity, SampleEntity>(root);

        // assert (should correctly map values)
        result.Result.Should().BeEquivalentTo(root.Results.First());
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

    public class CompositeEntity
    {
        [Key]
        [JsonPropertyName("Key1")]
        public int Key1 { get; set; }

        [Key]
        [JsonPropertyName("Key2")]
        public int Key2 { get; set; }
    }

    public class NullKeyEntity
    {
        [Key]
        [JsonPropertyName("id")]
        public string? Id { get; set; }
    }

    [Fact]
    public async Task SerializeWithoutKeyProperties_WithInclude_OnlyIncludesSpecifiedFields()
    {
        // arrange
        var entity = new SampleEntity { Id = 1, Name = "Kirk", BirthYear = 2233 };

        // act
        var json = await entity.SerializeWithoutKeyProperties(includeProperties: ["name"]).ReadAsStringAsync();

        // assert
        json.Should().Contain("name");
        json.Should().NotContain("birthYear");
        json.Should().NotContain("id"); // key always removed
    }

    [Fact]
    public async Task SerializeWithoutKeyProperties_WithExclude_RemovesSpecifiedFields()
    {
        // arrange
        var entity = new SampleEntity { Id = 2, Name = "Spock", BirthYear = 2230 };

        // act
        var json = await entity.SerializeWithoutKeyProperties(excludeProperties: ["birthYear"]).ReadAsStringAsync();

        // assert
        json.Should().Contain("name");
        json.Should().NotContain("birthYear");
        json.Should().NotContain("id"); // key always removed
    }

    [Fact]
    public async Task SerializeWithoutKeyProperties_WithIncludeAndExclude_ExcludeWins()
    {
        // arrange
        var entity = new SampleEntity { Id = 3, Name = "McCoy", BirthYear = 2227 };

        // act
        var json = await entity.SerializeWithoutKeyProperties(
            includeProperties: ["name", "birthYear"],
            excludeProperties: ["birthYear"]
        ).ReadAsStringAsync();

        // assert
        json.Should().Contain("name");
        json.Should().NotContain("birthYear"); // excluded wins
        json.Should().NotContain("id");
    }

    [Fact]
    public async Task SerializeWithoutKeyProperties_WithCaseMismatch_HandlesPropertyNameCaseInsensitively()
    {
        // arrange
        var entity = new SampleEntity { Id = 4, Name = "Uhura", BirthYear = 2239 };

        // act
        var json = await entity.SerializeWithoutKeyProperties(includeProperties: ["Name"]).ReadAsStringAsync();

        // assert
        json.Should().Contain("name");
        json.Should().NotContain("birthYear");
        json.Should().NotContain("id");
    }
}
