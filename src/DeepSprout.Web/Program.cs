using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using DeepSprout.Infrastructure.Identity;
using DeepSprout.Infrastructure.V5;
using DeepSprout.Web.Models;
using DeepSprout.Web.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);
builder.Logging.ClearProviders();
builder.Logging.AddConsole();

builder.Services.AddControllersWithViews(options => options.Filters.Add(new AutoValidateAntiforgeryTokenAttribute()));
builder.Services.AddAntiforgery(options =>
    options.Cookie.SecurePolicy = builder.Environment.IsDevelopment()
        ? CookieSecurePolicy.None : CookieSecurePolicy.Always);
builder.Services.AddSingleton<PageCatalog>();
builder.Services.AddDataProtection()
    .SetApplicationName("DeepSprout.Web")
    .PersistKeysToFileSystem(new DirectoryInfo(
        builder.Configuration["DataProtection:KeyDirectory"]
        ?? Path.Combine(builder.Environment.ContentRootPath, ".keys")));

// A database connection is opt-in and points at the approved 58-table design (DeepSproutV5DbContext).
// Starting the site never migrates or writes to any database; no page reads or writes SQL Server yet.
var connectionString = builder.Configuration.GetConnectionString("DeepSprout");
if (string.IsNullOrWhiteSpace(connectionString))
    throw new InvalidOperationException("Configure ConnectionStrings:DeepSprout for the V5 SQL Server database.");
builder.Services.AddDbContext<DeepSproutV5DbContext>(options => options.UseSqlServer(connectionString));
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddScoped<AttendanceQrService>();
builder.Services.AddScoped<JwtTokenService>();
builder.Services.AddIdentityCore<ApplicationUser>(options =>
    {
        options.User.RequireUniqueEmail = true;
        options.Password.RequiredLength = 12;
        options.Password.RequireDigit = true;
        options.Password.RequireLowercase = true;
        options.Password.RequireUppercase = true;
        options.Password.RequireNonAlphanumeric = false;
        options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
        options.Lockout.MaxFailedAccessAttempts = 5;
        options.Lockout.AllowedForNewUsers = true;
    })
    .AddRoles<IdentityRole<long>>()
    .AddEntityFrameworkStores<DeepSproutV5DbContext>()
    .AddDefaultTokenProviders();

var issuer = builder.Configuration["Jwt:Issuer"];
var audience = builder.Configuration["Jwt:Audience"];
if (string.IsNullOrWhiteSpace(issuer) || string.IsNullOrWhiteSpace(audience))
    throw new InvalidOperationException("Configure Jwt:Issuer and Jwt:Audience.");
var signingKey = JwtTokenService.SigningKey(builder.Configuration);
var authCookieName = builder.Environment.IsDevelopment() ? "DeepSproutAuth" : "__Host-DeepSproutAuth";
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true, ValidIssuer = issuer,
            ValidateAudience = true, ValidAudience = audience,
            ValidateIssuerSigningKey = true, IssuerSigningKey = signingKey,
            ValidateLifetime = true, ClockSkew = TimeSpan.FromSeconds(30),
            NameClaimType = JwtRegisteredClaimNames.Sub
        };
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                if (context.Request.Cookies.TryGetValue(authCookieName, out var token))
                    context.Token = token;
                return Task.CompletedTask;
            },
            OnTokenValidated = async context =>
            {
                var id = context.Principal?.FindFirstValue(JwtRegisteredClaimNames.Sub);
                var stamp = context.Principal?.FindFirstValue("security_stamp");
                if (!long.TryParse(id, out var userId) || string.IsNullOrEmpty(stamp))
                {
                    context.Fail("Invalid account.");
                    return;
                }
                var users = context.HttpContext.RequestServices.GetRequiredService<UserManager<ApplicationUser>>();
                var db = context.HttpContext.RequestServices.GetRequiredService<DeepSproutV5DbContext>();
                var user = await users.FindByIdAsync(userId.ToString());
                if (user is null || user.SecurityStamp != stamp || !await db.Set<DeepSprout.Domain.V5.Person>()
                    .AnyAsync(person => person.Id == user.PersonId && person.Status == "Active"))
                    context.Fail("Account is no longer active.");
            },
            OnChallenge = context =>
            {
                context.HandleResponse();
                context.Response.Redirect("/src/pages/auth/login/login.html?returnUrl=" +
                    Uri.EscapeDataString(context.Request.PathBase + context.Request.Path + context.Request.QueryString));
                return Task.CompletedTask;
            }
        };
    });
builder.Services.AddAuthorization();

var app = builder.Build();
var pages = app.Services.GetRequiredService<PageCatalog>();

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
    app.UseHttpsRedirection();
}
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

app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();
// Page URLs keep their historical .html form, so the Razor views in Views/ own them.
// Static files contain assets only; the historical .html URLs resolve to MVC endpoints.
#pragma warning disable ASP0014
app.UseEndpoints(endpoints =>
{
    endpoints.MapControllerRoute("home", "", new { controller = "Pages", action = "Show", page = "index.html" });

    endpoints.MapControllerRoute("account-login", "src/pages/auth/login/login.html", new { controller = "Account", action = "Login" });
    endpoints.MapControllerRoute("account-register", "src/pages/auth/register/register.html", new { controller = "Account", action = "Register" });
    endpoints.MapControllerRoute("account-logout", "account/logout", new { controller = "Account", action = "Logout" });
    endpoints.MapControllerRoute("account-session", "account/session", new { controller = "Account", action = "Session" });
    endpoints.MapControllerRoute("account-profile", "account/profile", new { controller = "Account", action = "Profile" });

    var number = 0;
    foreach (var path in pages.Paths)
    {
        if (path is "src/pages/auth/login/login.html" or "src/pages/auth/register/register.html") continue;
        var protectedPage = path.StartsWith("src/pages/member/", StringComparison.OrdinalIgnoreCase)
            || path is "dashboard.html" or "profile.html" or "community.html" or "explore.html"
                or "garden.html" or "insights.html" or "lab.html" or "onboarding.html"
                or "recovery-plan.html" or "shield.html" or "training.html" or "weekly-review.html";
        endpoints.MapControllerRoute($"page-{number++}", path,
            new { controller = "Pages", action = protectedPage ? "ShowProtected" : "Show", page = path });
    }
});
#pragma warning restore ASP0014

// ES module imports and stylesheet @imports cannot carry a version query, so a
// browser must never mix files from two builds. Development never stores them;
// every other environment revalidates them (ETag, 304 when unchanged), because
// starting the built DeepSprout.Web.exe directly runs as Production.
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
