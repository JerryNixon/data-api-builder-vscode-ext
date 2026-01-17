namespace Repositories.Rest;

public static class Extensions
{
    public static async Task<bool> IsAvailableAsync(this Uri uri, int timeoutInSeconds = 30, HttpClient? httpClient = null)
    {
        using var http = httpClient ?? new HttpClient
        {
            Timeout = TimeSpan.FromSeconds(timeoutInSeconds)
        };

        try
        {
            var response = await http.GetAsync(uri.ToString()).ConfigureAwait(false);
            return response.IsSuccessStatusCode;
        }
        catch (HttpRequestException)
        {
            return false;
        }
        catch (TaskCanceledException)
        {
            return false;
        }
    }
}
