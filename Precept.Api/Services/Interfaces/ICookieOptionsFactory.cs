namespace Precept.Api.Services.Interfaces;

public interface ICookieOptionsFactory
{
    CookieOptions CreateCookieOptions(bool rememberMe);
}
