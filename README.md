# Sandugorea

- `backend/Sandugorea.Api` — ASP.NET Core (.NET 10) minimal API, serves `/api/*` and the built Angular app
- `frontend` — Angular 22, SCSS, Tailwind CSS v4, ESLint + Prettier, Vitest

## Local development

```bash
# terminal 1 — API on http://localhost:5080
dotnet run --project backend/Sandugorea.Api

# terminal 2 — Angular on http://localhost:4200 (proxies /api -> :5080)
cd frontend && npm start
```

## How it works

The photographer creates a **project** (a private folder) for a customer, uploads the photos and
sends it. Each project has its own **username + password**; only that customer can sign in and see
or download those photos.

| Area | URLs | Notes |
| --- | --- | --- |
| Public | `/`, `/portfolio`, `/about`, `/contact` | Portfolio images come from `frontend/src/app/data/portfolio.data.ts` (placeholders for now) |
| Customer | `/client/login`, `/client` | Opens only after the project was sent and while access is enabled |
| Admin | `/admin/login`, `/admin`, `/admin/projects`, `/admin/projects/:id`, `/admin/security` | Not linked from the site; password + 2FA; 15-min idle sign-out |

**The UI currently runs on mock data** (`project-store.service.ts`, `auth.service.ts`) until the API is built.
Dev credentials — admin: `admin` / `admin123`, 2FA code `123456` · customer: `ana.mihai` / `demo1234`.

## Styling: Tailwind CSS v3 + SCSS + BEM

- `frontend/tailwind.config.js` — **all** design tokens: colours, fonts, font sizes, letter-spacing,
  spacing, z-index, easing, gradients, keyframes and animations.
- `frontend/src/styles.scss` — `@tailwind` directives plus shared BEM blocks (`.btn`, `.field`,
  `.card`, `.badge`, `.title`, `.wrapper`, …).
- Each component has its own BEM block in its `.scss`, built with `@apply`
  (e.g. `.hero`, `.hero__title`, `.hero__slide--active`). Templates use BEM class names only.

## Production (VPS, Ubuntu + nginx)

One-time server setup:

```bash
sudo mkdir -p /var/www/sandugorea
sudo cp deploy/sandugorea.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable sandugorea
sudo cp deploy/nginx.conf /etc/nginx/sites-available/sandugorea   # edit server_name
sudo ln -s /etc/nginx/sites-available/sandugorea /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d your-domain.com
```

Deploy (from your machine):

```bash
SERVER=user@your-vps ./deploy/deploy.sh
```

`dotnet publish` builds Angular automatically and puts it in `wwwroot`; the output is self-contained, so the VPS doesn't need .NET installed.
