# SlateArt Experience

Standalone Phase 1 prototype for `experience.slateart.ie`.

This project is intentionally separate from:

- `slateart.ie`
- `stories.slateart.ie`
- checkout / PayPal
- QR redirects
- customer login
- database

It is a progressive enhancement demo only. If WebGL, JavaScript, Three.js or the embed fails, the normal story page must still work.

## Phase 1 Scope

- Magic Book Experience only
- Demo data only
- No database
- No login
- No admin
- No external API calls
- No autoplay audio
- HTML story text stays readable outside WebGL

## Local Commands

```bash
npm install
npm run dev
npm run build
npm run preview
```

## VPS Deploy Target

```text
/var/www/slateart-experience
experience.slateart.ie
```

Build output:

```text
dist/
```

## Safe Deployment Idea

Use the same style as DisplayHub:

```text
/var/www/slateart-experience/current
```

Nginx should point to:

```text
/var/www/slateart-experience/current/dist
```

This keeps source and build output together while serving only the compiled static files.

## VPS Commands

First setup:

```bash
sudo mkdir -p /var/www/slateart-experience/current
sudo chown -R deploy:nginx /var/www/slateart-experience
```

Deploy/update:

```bash
cd /var/www/slateart-experience/current
sudo -u deploy bash -lc 'cd /var/www/slateart-experience/current && git pull'
sudo -u deploy bash -lc 'cd /var/www/slateart-experience/current && npm install && npm run build'
sudo chown -R deploy:nginx /var/www/slateart-experience/current
sudo find /var/www/slateart-experience/current -type d -exec chmod 2755 {} \;
sudo find /var/www/slateart-experience/current -type f -exec chmod 0644 {} \;
sudo restorecon -Rv /var/www/slateart-experience/current
sudo nginx -t
sudo systemctl reload nginx
```

No composer, no migrations, no php-fpm restart.

## Later Embed Plan

Later, after testing:

```html
<div id="slateart-experience"></div>
<script src="https://experience.slateart.ie/embed.js" defer></script>
```

Not part of Phase 1.
