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
| Public | `/`, `/about`, `/services`, `/portfolio`, `/booking` | Images come from `frontend/src/app/data/portfolio.data.ts` (placeholders for now) |
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

- `frontend/tailwind.config.js` — **all** design tokens (colours, fonts, spacing, animations…).
- `frontend/src/styles.scss` — **imports only** (`app/styles/_tailwind`, `_base`, `_reveal`, `_parallax`,
  `_view-transitions`, `_reduced-motion`, `_page-loader`).
- Every other style lives in the component that owns it, as a BEM block built with `@apply`.
- Shared UI is made of components in `src/app/components/ui` (alias `@ui/…`):
  `<button app-button variant="outline" size="sm">`, `<a app-link caps underline>`,
  `<h2 app-title size="lg">` (gold words in `<em>`), `<p app-eyebrow>`, `<p app-text size="small">`,
  `<label app-field>` + `<input appInput boxed>`, `app-card`, `app-badge`, `app-alert`, `app-spinner`,
  `app-avatar`, `app-container`, `app-page-head`, `app-credentials`.

## Icons

Icon font generated like driver-platform: SVG sources (24×24, stroke 1.5) in
`frontend/src/assets/icons/src/` → `npm run generate-fonts` (oslllo-svg-fixer → fantasticon) →
`src/assets/fonts/icons.css` (font embedded) + `src/app/models/icon-names.generated.ts`.
Use `<app-icon name="calendar" [size]="16" />`; a wrong name is a compile error.

## Production — sandugorea.ch (VPS 66.29.142.5, Ubuntu 24.04, 1 GB RAM)

1. **DNS** (at your domain registrar): `A  sandugorea.ch → 66.29.142.5` and `A  www → 66.29.142.5`.
2. **Server setup** (once; safe to re-run):
   ```bash
   scp -r deploy root@66.29.142.5:/root/
   ssh root@66.29.142.5 'bash /root/deploy/setup-server.sh you@example.com'
   ```
   Installs nginx, certbot, firewall (22/80/443 only), fail2ban, automatic security updates, a 2 GB swap file,
   the service user, systemd unit and nginx site, and gets the HTTPS certificate once DNS points at the server.
3. **Secrets**: `ssh root@66.29.142.5 nano /etc/sandugorea/sandugorea.env` — set `Admin__Password`
   (12+ chars, upper, lower, digit, symbol) and the SMTP settings.
4. **Deploy** (every release, from your Mac): `./deploy/deploy.sh`
5. Open https://sandugorea.ch/admin/login, scan the QR code, save the recovery codes, then remove
   `Admin__Password` from the env file.

All data (database, photos, encryption keys) is in `/var/lib/sandugorea`. It is backed up every night,
encrypted, to off-site storage — set that up once with [deploy/BACKUP.md](deploy/BACKUP.md).
Logs: `journalctl -u sandugorea -f`. Disk: 20 GB total ≈ 1,000–1,500 full-size photos.
