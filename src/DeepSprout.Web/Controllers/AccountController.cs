using System.IdentityModel.Tokens.Jwt;
using DeepSprout.Domain.V5;
using DeepSprout.Infrastructure.Identity;
using DeepSprout.Infrastructure.V5;
using DeepSprout.Web.Account;
using DeepSprout.Web.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace DeepSprout.Web.Controllers;

public sealed class AccountController(
    DeepSproutV5DbContext db,
    UserManager<ApplicationUser> users,
    JwtTokenService tokens,
    IAntiforgery antiforgery,
    IWebHostEnvironment environment) : Controller
{
    private const string LoginView = "~/Views/Auth/Login.cshtml";
    private const string RegisterView = "~/Views/Auth/Register.cshtml";
    private const string LoginPath = "/src/pages/auth/login/login.html";
    private const string DefaultDestination = "/src/pages/member/dashboard/dashboard.html";

    [HttpGet]
    [AllowAnonymous]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public IActionResult Login(string? returnUrl = null)
    {
        if (User.Identity?.IsAuthenticated == true) return LocalRedirect(SafeReturnUrl(returnUrl, DefaultDestination));
        return View(LoginView, new LoginViewModel { ReturnUrl = SafeReturnUrl(returnUrl, "") });
    }

    [HttpPost]
    [AllowAnonymous]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public async Task<IActionResult> Login(LoginViewModel model)
    {
        model.ReturnUrl = SafeReturnUrl(model.ReturnUrl, "");
        if (!ModelState.IsValid) return View(LoginView, model);

        var user = await users.FindByEmailAsync(model.Email.Trim());
        if (user is null || await users.IsLockedOutAsync(user))
        {
            ModelState.AddModelError("", "Invalid email or password, or this account is temporarily unavailable.");
            return View(LoginView, model);
        }

        var active = await db.Set<Person>().AnyAsync(person => person.Id == user.PersonId && person.Status == "Active");
        if (!active || !await users.CheckPasswordAsync(user, model.Password))
        {
            if (active) await users.AccessFailedAsync(user);
            ModelState.AddModelError("", "Invalid email or password, or this account is temporarily unavailable.");
            return View(LoginView, model);
        }

        await users.ResetAccessFailedCountAsync(user);
        await IssueCookieAsync(user);
        return LocalRedirect(SafeReturnUrl(model.ReturnUrl, DefaultDestination));
    }

    [HttpGet]
    [AllowAnonymous]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public IActionResult Register(string? returnUrl = null)
    {
        if (User.Identity?.IsAuthenticated == true) return LocalRedirect(SafeReturnUrl(returnUrl, DefaultDestination));
        return View(RegisterView, new RegisterViewModel { ReturnUrl = SafeReturnUrl(returnUrl, "") });
    }

    [HttpPost]
    [AllowAnonymous]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public async Task<IActionResult> Register(RegisterViewModel model)
    {
        model.ReturnUrl = SafeReturnUrl(model.ReturnUrl, "");
        model.DisplayName = model.DisplayName?.Trim() ?? "";
        model.Email = model.Email?.Trim() ?? "";
        if (string.IsNullOrWhiteSpace(model.DisplayName))
            ModelState.AddModelError(nameof(model.DisplayName), "Please enter your name.");
        if (!ModelState.IsValid) return View(RegisterView, model);

        var normalizedEmail = users.NormalizeEmail(model.Email);
        if (await users.FindByEmailAsync(model.Email) is not null ||
            await db.Set<Person>().AnyAsync(person => person.NormalizedEmail == normalizedEmail))
        {
            ModelState.AddModelError(nameof(model.Email), "An account already uses this email address.");
            return View(RegisterView, model);
        }

        var now = DateTime.UtcNow;
        await using var transaction = await db.Database.BeginTransactionAsync();
        try
        {
            var person = new Person
            {
                DisplayName = model.DisplayName,
                NormalizedEmail = normalizedEmail,
                Status = "Active",
                IndividualEnabledAtUtc = now,
                CreatedAtUtc = now
            };
            db.Set<Person>().Add(person);
            await db.SaveChangesAsync();

            var user = new ApplicationUser { PersonId = person.Id, UserName = model.Email, Email = model.Email };
            var result = await users.CreateAsync(user, model.Password);
            if (!result.Succeeded)
            {
                foreach (var error in result.Errors)
                    ModelState.AddModelError(error.Code.Contains("Password", StringComparison.OrdinalIgnoreCase)
                        ? nameof(model.Password) : nameof(model.Email), error.Description);
                await transaction.RollbackAsync();
                return View(RegisterView, model);
            }

            db.Set<IndividualProfile>().Add(new IndividualProfile
            {
                PersonId = person.Id, OnboardingStage = "Started", JourneyLevel = 1,
                PreferredTimeZone = "UTC", CreatedAtUtc = now
            });
            db.Set<ConsentRecord>().Add(new ConsentRecord
            {
                PersonId = person.Id, PurposeCode = "TermsAndPrivacy",
                NoticeVersion = "2026-11-10", Decision = "Accepted",
                DecidedAtUtc = now, CreatedAtUtc = now
            });
            await db.SaveChangesAsync();
            await transaction.CommitAsync();
            await IssueCookieAsync(user);
            return LocalRedirect(SafeReturnUrl(model.ReturnUrl, "/src/pages/member/onboarding/onboarding.html"));
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException sql && sql.Number is 2601 or 2627)
        {
            await transaction.RollbackAsync();
            ModelState.AddModelError(nameof(model.Email), "An account already uses this email address.");
            return View(RegisterView, model);
        }
    }

    [Authorize]
    [HttpGet]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public async Task<IActionResult> Profile()
    {
        var userId = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        var user = userId is null ? null : await users.FindByIdAsync(userId);
        if (user is null) return Challenge();
        var person = await db.Set<Person>().AsNoTracking().SingleAsync(item => item.Id == user.PersonId);
        return View("~/Views/Account/Profile.cshtml", new ProfileViewModel(person.DisplayName, user.Email ?? ""));
    }

    [Authorize]
    [HttpGet]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public async Task<IActionResult> Session()
    {
        var userId = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        var user = userId is null ? null : await users.FindByIdAsync(userId);
        if (user is null) return Unauthorized();
        var person = await db.Set<Person>().AsNoTracking().SingleAsync(item => item.Id == user.PersonId);
        var csrf = antiforgery.GetAndStoreTokens(HttpContext);
        return Json(new { displayName = person.DisplayName, email = user.Email, requestToken = csrf.RequestToken });
    }

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> Logout()
    {
        var userId = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        if (userId is not null)
        {
            var user = await users.FindByIdAsync(userId);
            if (user is not null)
            {
                var result = await users.UpdateSecurityStampAsync(user);
                if (!result.Succeeded) return StatusCode(StatusCodes.Status500InternalServerError);
            }
        }
        Response.Cookies.Delete(CookieName, new CookieOptions { Path = "/", Secure = !environment.IsDevelopment() });
        return LocalRedirect(LoginPath);
    }

    private async Task IssueCookieAsync(ApplicationUser user)
    {
        var (token, expires) = await tokens.CreateAsync(user);
        Response.Cookies.Append(CookieName, token, new CookieOptions
        {
            HttpOnly = true, Secure = !environment.IsDevelopment(), SameSite = SameSiteMode.Lax,
            Path = "/", Expires = new DateTimeOffset(expires), IsEssential = true
        });
    }

    private string SafeReturnUrl(string? returnUrl, string fallback) =>
        !string.IsNullOrWhiteSpace(returnUrl) && Url.IsLocalUrl(returnUrl) ? returnUrl : fallback;

    private string CookieName => environment.IsDevelopment() ? "DeepSproutAuth" : "__Host-DeepSproutAuth";
}
