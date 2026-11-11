# Static assets in this MVC project

`wwwroot` is the only home of runtime assets. It holds `assets/` (media, Azm poses, fonts and local vendor files) and `src/` (page CSS and JavaScript, shared layouts, the browser-local domain and the partner workspaces app). There is no separate client folder: the URLs `/assets/...` and `/src/...` map directly to these directories. The page markup itself is in `../Views`, and Razor views are served at their historical `.html` URLs through `PagesController`.
