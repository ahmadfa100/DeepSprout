# Static assets in this MVC project

During development, `DeepSprout.Web.csproj` links `Client/assets` and non-HTML files under `Client/src` into this web root. `Program.cs` serves those files directly from `Client/`, preserving every existing asset URL. This avoids copying the same artwork and JavaScript into the source tree twice.

`dotnet publish` places the linked files physically under `wwwroot/assets` and `wwwroot/src` in the published application.
