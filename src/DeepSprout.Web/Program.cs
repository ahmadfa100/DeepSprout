using DeepSprout.Infrastructure;
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

// During local development, never let a browser reuse a module from an older
// build with a newer Razor view. Production keeps the normal static-file policy.
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = context =>
    {
        if (app.Environment.IsDevelopment())
        {
            context.Context.Response.Headers.CacheControl = "no-store, max-age=0";
            context.Context.Response.Headers.Pragma = "no-cache";
        }
    }
});

app.Run();

public partial class Program;
