# Sandugorea

- `backend/Sandugorea.Api` — ASP.NET Core (.NET 10) minimal API, serves `/api/*` and the built Angular app
- `frontend` — Angular 22, SCSS, Tailwind CSS v4, ESLint + Prettier, Vitest

## Local development

The .NET 10 SDK lives in `~/.dotnet` on this machine - add it to your PATH once:
`echo 'export PATH="$HOME/.dotnet:$PATH"' >> ~/.zshrc`

```bash
# terminal 1 — API on http://localhost:5080 (creates .data/ with the SQLite DB, photos, outbox)
dotnet run --project backend/Sandugorea.Api

# terminal 2 — Angular on http://localhost:4200 (proxies /api -> :5080)
cd frontend && npm start
```

- Admin: http://localhost:4200/admin/login — `admin` / `Dev-Admin-2026!` (from `appsettings.Development.json`).
  The first sign-in shows a QR code: scan it with an authenticator app (Google Authenticator, 1Password…),
  then save the recovery codes.
- Emails are not sent in development: they are written to `.data/outbox/*.eml`.
- Tests: `dotnet test Sandugorea.slnx` (in-memory API with its own temp folder).
- New migration after changing `Data/Entities.cs`: `dotnet ef migrations add <Name> --project backend/Sandugorea.Api --output-dir Data/Migrations`
  (migrations are applied automatically on start).

## Backend

| Area | Endpoints | Auth |
| --- | --- | --- |
| Admin sign-in | `POST /api/admin/auth/login` → `POST /api/admin/auth/verify` (TOTP or recovery code) | password + 2FA |
| Projects | `/api/admin/projects`, `/{id}/photos` (upload), `/{id}/send`, `/{id}/password` | admin cookie |
| Account | `/api/admin/account/{password,sessions,history,recovery-codes}` | admin cookie |
| Customer | `POST /api/customer/auth/login`, `GET /api/customer/project`, `/photos/{id}/{thumb,preview,original}`, `/project/zip` | customer cookie |
| Booking | `POST /api/booking` | public, rate limited |

Security in short: PBKDF2 password hashes; TOTP 2FA for admin with one-time recovery codes; account lockout;
per-IP rate limits; HttpOnly + Secure + SameSite=Strict cookies; server-side admin sessions (revocable);
customer sessions die when the project is disabled or its password reset; CSRF header check; strict security
headers/CSP; photos stored outside the web root and only served after an ownership check; uploads verified by
decoding (not by extension); EXIF/GPS stripped from thumbnails and previews.

## How it works

The photographer creates a **project** (a private folder) for a customer, uploads the photos and
sends it. Each project has its own **username + password**; only that customer can sign in and see
or download those photos.

| Area | URLs | Notes |
| --- | --- | --- |
| Public | `/` (one page: `#home`, `#about`, `#works`, `#testimonials`, `#booking`) | Images come from `frontend/src/app/data/portfolio.data.ts` (placeholders for now) |
| Customer | `/client/login`, `/client` | Opens only after the project was sent and while access is enabled |
| Admin | `/admin/login`, `/admin`, `/admin/projects`, `/admin/projects/:id`, `/admin/security` | Not linked from the site; password + 2FA; 15-min idle sign-out |

**The UI currently runs on mock data** (`project-store.service.ts`, `auth.service.ts`) until the API is built.
Dev credentials — admin: `admin` / `admin123`, 2FA code `123456` · customer: `ana.mihai` / `demo1234`.

## Languages (ngx-translate)

English, Deutsch, Italiano, Français and Română. All text lives in `frontend/public/i18n/{en,de,it,fr,ro}.json`
and is used in templates as `{{ 'section.key' | translate }}`. Dates use the `localDate` pipe so month names follow
the language. The choice is remembered; first visit uses the browser language (fallback English).
When adding text, add the key to **all five** files.

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
sudo useradd --system --no-create-home --shell /usr/sbin/nologin sandugorea
sudo mkdir -p /var/www/sandugorea /etc/sandugorea
sudo cp deploy/sandugorea.env.example /etc/sandugorea/sandugorea.env   # edit: admin password, SMTP, domain
sudo chmod 600 /etc/sandugorea/sandugorea.env
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

`dotnet publish` builds Angular automatically and puts it in `wwwroot`; the output is self-contained, so the
VPS doesn't need .NET installed. All data (database, photos, keys) is in `/var/lib/sandugorea` — back up that
one folder. After the first admin sign-in, remove `Admin__Password` from the env file.
