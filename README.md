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

## Tailwind v4 + SCSS

- `frontend/src/tailwind.css` — Tailwind import and theme tokens (`@theme`). Plain CSS on purpose: Sass can't process Tailwind v4 directives.
- `frontend/src/styles.scss` — global SCSS.
- Component `.scss` files that use `@apply` need `@reference '<relative path>/tailwind.css';` at the top.

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
