using System.Text.Json;

namespace DeepSprout.Web.Models;

public sealed record PageRoute(string Path, string View);

public sealed class PageCatalog
{
    private readonly Dictionary<string, string> _views;

    public PageCatalog(IWebHostEnvironment environment)
    {
        var manifestPath = Path.Combine(environment.ContentRootPath, "page-routes.json");
        var routes = JsonSerializer.Deserialize<PageRoute[]>(
            File.ReadAllText(manifestPath),
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
            ?? throw new InvalidOperationException("The MVC page manifest is empty.");
        _views = routes.ToDictionary(route => route.Path, route => route.View,
            StringComparer.OrdinalIgnoreCase);
    }

    public IEnumerable<string> Paths => _views.Keys;

    public bool TryGetView(string path, out string view) => _views.TryGetValue(path, out view!);
}
