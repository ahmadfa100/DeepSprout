using DeepSprout.Web.Models;
using DeepSprout.Web.Services;
using DeepSprout.Domain.V5;
using DeepSprout.Infrastructure.V5;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DeepSprout.Web.Controllers;

public sealed class PagesController(PageCatalog pages, DeepSproutV5DbContext db, IWebHostEnvironment environment) : Controller
{
    [Authorize]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public Task<IActionResult> ShowProtected(string page, CancellationToken ct) => Show(page, ct);

    public async Task<IActionResult> Show(string page, CancellationToken ct)
    {
        if (!HttpMethods.IsGet(Request.Method) && !HttpMethods.IsHead(Request.Method))
        {
            return StatusCode(StatusCodes.Status405MethodNotAllowed);
        }

        if (!pages.TryGetView(page, out var view))
        {
            return NotFound();
        }

        if (page.Equals("404.html", StringComparison.OrdinalIgnoreCase))
        {
            Response.StatusCode = StatusCodes.Status404NotFound;
            Response.Headers.CacheControl = "no-store";
        }

        if (page is "admin.html" or "workspaces.html") Response.Headers.CacheControl = "no-store";
        if (page == "workspaces.html" && Request.Query["partner"] == "live" &&
            User.Identity?.IsAuthenticated != true) return Challenge();
        if (page == "admin.html" && !(environment.IsDevelopment() &&
            (Request.Query["demo"] == "1" || Request.Query["legacy"] == "1")))
        {
            if (User.Identity?.IsAuthenticated != true) return Challenge();
            if (await PersonalRecords.PlatformAdminId(db, User, ct) is null) return Forbid();
            return LocalRedirect("/workspaces.html?community=live#/admin/moderation");
        }
        var liveAdminWorkspace = page == "workspaces.html" && Request.Query["community"] == "live";
        if (liveAdminWorkspace)
        {
            if (User.Identity?.IsAuthenticated != true) return Challenge();
            if (await PersonalRecords.PlatformAdminId(db, User, ct) is null) return Forbid();
        }
        if (page.Equals("workspaces.html", StringComparison.OrdinalIgnoreCase) && User.Identity?.IsAuthenticated == true &&
            await PersonalRecords.PersonId(db, User, ct) is { } personId)
        {
            ViewData["CommunityAdmin"] = await PersonalRecords.PlatformAdmins(db).Where(person => person.Id == personId)
                .Select(person => person.DisplayName).SingleOrDefaultAsync(ct);
        }
        var viewPath = $"~/Views/{view}.cshtml";
        return View(viewPath);
    }
}
