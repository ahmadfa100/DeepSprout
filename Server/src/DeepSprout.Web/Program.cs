using DeepSprout.Infrastructure;
using DeepSprout.Web.Models;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);
builder.Logging.ClearProviders();
builder.Logging.AddConsole();

builder.Services.AddControllersWithViews();
builder.Services.AddSingleton<PageCatalog>();
builder.Services.AddDataProtection()
    .SetApplicationName("DeepSprout.Web")
    .PersistKeysToFileSystem(new DirectoryInfo(
        builder.Configuration["DataProtection:KeyDirectory"]
        ?? Path.Combine(builder.Environment.ContentRootPath, ".keys")));

// A database connection is opt-in. The existing validation database must never be
// migrated or written to merely because the web demonstration starts.
var connectionString = builder.Configuration.GetConnectionString("DeepSprout");
if (!string.IsNullOrWhiteSpace(connectionString))
{
    builder.Services.AddDbContext<DeepSproutDbContext>(options => options.UseSqlServer(connectionString));
}

var app = builder.Build();
var pages = app.Services.GetRequiredService<PageCatalog>();

app.UseStatusCodePagesWithReExecute("/404.html");
app.UseRouting();
// MVC endpoints must execute before static-file middleware so Client's legacy
// .html files cannot bypass their Razor views. This ordering is intentional.
#pragma warning disable ASP0014
app.UseEndpoints(endpoints =>
{
    endpoints.MapControllerRoute("home", "", new { controller = "Pages", action = "Show", page = "index.html" });

    var number = 0;
    foreach (var path in pages.Paths)
    {
        endpoints.MapControllerRoute($"page-{number++}", path,
            new { controller = "Pages", action = "Show", page = path });
    }
});
#pragma warning restore ASP0014

// Keep URLs and relative imports unchanged while MVC owns every HTML page.
// During local development, static assets are read from the existing Client tree.
// Published builds receive the same assets under wwwroot via the project file.
var clientRoot = Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, "..", "..", "..", "Client"));
if (Directory.Exists(clientRoot))
{
    foreach (var folder in new[] { "assets", "src" })
    {
        app.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = new PhysicalFileProvider(Path.Combine(clientRoot, folder)),
            RequestPath = $"/{folder}"
        });
    }
}
else
{
    app.UseStaticFiles();
}

app.Run();

public partial class Program;
