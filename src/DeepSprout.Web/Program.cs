using DeepSprout.Infrastructure.V5;
using DeepSprout.Web.Models;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;

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

// A database connection is opt-in and points at the approved 58-table design (DeepSproutV5DbContext).
// Starting the site never migrates or writes to any database; no page reads or writes SQL Server yet.
var connectionString = builder.Configuration.GetConnectionString("DeepSprout");
if (!string.IsNullOrWhiteSpace(connectionString))
{
    builder.Services.AddDbContext<DeepSproutV5DbContext>(options => options.UseSqlServer(connectionString));
}

var app = builder.Build();
var pages = app.Services.GetRequiredService<PageCatalog>();

app.UseStatusCodePagesWithReExecute("/404.html");
if (app.Environment.IsDevelopment())
{
    app.Use(async (context, next) =>
    {
        if (context.Request.Path.Equals("/workspaces.html", StringComparison.OrdinalIgnoreCase))
        {
            // Clear only the HTTP cache for this local demo origin. An older
            // unversioned module graph may otherwise survive a rebuilt view.
            // Browser localStorage and the demo's migration backups stay intact.
            context.Response.Headers["Clear-Site-Data"] = "\"cache\"";
        }
        await next();
    });
}
app.UseRouting();
// Page URLs keep their historical .html form, so the Razor views in Views/ own them.
// MVC endpoints run before static files; wwwroot holds only assets (images, CSS, JS, fonts).
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

// ES module imports and stylesheet @imports cannot carry a version query, so a
// browser must never mix files from two builds. Development never stores them;
// every other environment revalidates them (ETag, 304 when unchanged), because
// starting the built DeepSprout.Web.exe directly runs as Production.
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = context =>
    {
        if (app.Environment.IsDevelopment())
        {
            context.Context.Response.Headers.CacheControl = "no-store, max-age=0";
            context.Context.Response.Headers.Pragma = "no-cache";
        }
        else if (context.File.Name.EndsWith(".js", StringComparison.OrdinalIgnoreCase)
            || context.File.Name.EndsWith(".mjs", StringComparison.OrdinalIgnoreCase)
            || context.File.Name.EndsWith(".css", StringComparison.OrdinalIgnoreCase)
            || context.File.Name.EndsWith(".json", StringComparison.OrdinalIgnoreCase))
        {
            context.Context.Response.Headers.CacheControl = "no-cache";
        }
    }
});

WarnAboutStaleViews(app);

app.Run();

// Razor views are compiled into this assembly; wwwroot is served live. When a
// view in the source tree is newer than the running build, the pages it hosts
// may load newer scripts with an older page shell. Say so at startup.
static void WarnAboutStaleViews(WebApplication app)
{
    var views = Path.Combine(app.Environment.ContentRootPath, "Views");
    var assembly = typeof(Program).Assembly.Location;
    if (!Directory.Exists(views) || string.IsNullOrEmpty(assembly) || !File.Exists(assembly)) return;
    var built = File.GetLastWriteTimeUtc(assembly);
    var newer = Directory.EnumerateFiles(views, "*.cshtml", SearchOption.AllDirectories)
        .Where(file => File.GetLastWriteTimeUtc(file) > built)
        .Select(file => Path.GetRelativePath(views, file))
        .ToList();
    if (newer.Count > 0)
    {
        app.Logger.LogWarning(
            "Razor views changed after this build and are not being served: {Views}. Rebuild and restart (dotnet run --project src/DeepSprout.Web).",
            string.Join(", ", newer));
    }
}

public partial class Program;
