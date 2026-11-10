using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using DeepSprout.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;

namespace DeepSprout.Web.Services;

public sealed class JwtTokenService(IConfiguration configuration, UserManager<ApplicationUser> users)
{
    public static SymmetricSecurityKey SigningKey(IConfiguration configuration)
    {
        var secret = configuration["Jwt:SigningKey"];
        if (string.IsNullOrWhiteSpace(secret) || Encoding.UTF8.GetByteCount(secret) < 32)
            throw new InvalidOperationException("Configure Jwt:SigningKey with at least 32 random UTF-8 bytes outside source control.");
        return new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
    }

    public async Task<(string Token, DateTime ExpiresUtc)> CreateAsync(ApplicationUser user)
    {
        var now = DateTime.UtcNow;
        var expires = now.AddMinutes(30);
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email!),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N")),
            new Claim("security_stamp", await users.GetSecurityStampAsync(user))
        };
        var credentials = new SigningCredentials(SigningKey(configuration), SecurityAlgorithms.HmacSha256);
        var jwt = new JwtSecurityToken(
            issuer: configuration["Jwt:Issuer"], audience: configuration["Jwt:Audience"],
            claims: claims, notBefore: now, expires: expires, signingCredentials: credentials);
        return (new JwtSecurityTokenHandler().WriteToken(jwt), expires);
    }
}
