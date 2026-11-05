using DeepSprout.Web.Models;
using Microsoft.AspNetCore.Mvc;

namespace DeepSprout.Web.Controllers;

public sealed class PagesController(PageCatalog pages) : Controller
{
    public IActionResult Show(string page)
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

        var viewPath = $"~/Views/{view}.cshtml";
        return View(viewPath);
    }
}
