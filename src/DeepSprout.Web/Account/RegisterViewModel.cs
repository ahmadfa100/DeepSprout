using System.ComponentModel.DataAnnotations;

namespace DeepSprout.Web.Account;

public sealed class RegisterViewModel
{
    [Required(ErrorMessage = "Please enter your name.")]
    [StringLength(160, MinimumLength = 2)]
    public string DisplayName { get; set; } = "";

    [Required(ErrorMessage = "Please enter your email address.")]
    [EmailAddress(ErrorMessage = "Please enter a valid email address.")]
    [StringLength(256)]
    public string Email { get; set; } = "";

    [Required(ErrorMessage = "Please create a password.")]
    [DataType(DataType.Password)]
    [StringLength(128, MinimumLength = 12, ErrorMessage = "Use a password between 12 and 128 characters.")]
    public string Password { get; set; } = "";

    [Required(ErrorMessage = "Please confirm your password.")]
    [DataType(DataType.Password)]
    [Compare(nameof(Password), ErrorMessage = "The passwords do not match.")]
    public string ConfirmPassword { get; set; } = "";

    [Range(typeof(bool), "true", "true", ErrorMessage = "Please accept the terms and privacy notice.")]
    public bool AcceptTerms { get; set; }

    public string? ReturnUrl { get; set; }
}
