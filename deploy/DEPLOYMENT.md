# SlateArt Experience VPS Deployment

This app is a static Vite/Three.js project. It is intentionally separate from
`slateart.ie`, `stories.slateart.ie`, checkout, PayPal and QR redirects.

## Target

```text
Domain: experience.slateart.ie
Folder: /var/www/slateart-experience/current
Served root: /var/www/slateart-experience/current/dist
User/group: deploy:nginx
```

## DNS

Create an `A` record:

```text
experience.slateart.ie -> VPS_PUBLIC_IP
```

If IPv6 is used, also add:

```text
AAAA experience.slateart.ie -> VPS_IPV6
```

## Nginx

Copy:

```text
deploy/nginx-experience.slateart.ie.conf
```

to:

```bash
/etc/nginx/conf.d/experience.slateart.ie.conf
```

Then:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## SSL

After DNS points to the VPS:

```bash
sudo certbot --nginx -d experience.slateart.ie
```

## First Deploy

```bash
sudo mkdir -p /var/www/slateart-experience/current
sudo chown -R deploy:nginx /var/www/slateart-experience
```

Clone or copy this project into:

```bash
/var/www/slateart-experience/current
```

Then:

```bash
sudo -u deploy bash -lc 'cd /var/www/slateart-experience/current && npm install && npm run build'
sudo chown -R deploy:nginx /var/www/slateart-experience/current
sudo find /var/www/slateart-experience/current -type d -exec chmod 2755 {} \;
sudo find /var/www/slateart-experience/current -type f -exec chmod 0644 {} \;
sudo restorecon -Rv /var/www/slateart-experience/current
sudo nginx -t
sudo systemctl reload nginx
```

## Update Deploy

```bash
cd /var/www/slateart-experience/current
sudo -u deploy bash -lc 'cd /var/www/slateart-experience/current && git pull'
sudo -u deploy bash -lc 'cd /var/www/slateart-experience/current && npm install && npm run build'
sudo restorecon -Rv /var/www/slateart-experience/current
sudo nginx -t
sudo systemctl reload nginx
```

## Test URLs

```text
https://experience.slateart.ie/
https://experience.slateart.ie/assets/
```

Expected:

- homepage loads the Magic Book Experience,
- no checkout/PayPal/Stories code is touched,
- if WebGL is disabled, HTML fallback still appears,
- mobile viewport keeps the text readable.

## Rollback

Because this is isolated from the shop, rollback is simple:

```bash
cd /var/www/slateart-experience/current
sudo -u deploy bash -lc 'git log --oneline -5'
sudo -u deploy bash -lc 'git checkout PREVIOUS_COMMIT'
sudo -u deploy bash -lc 'npm install && npm run build'
sudo systemctl reload nginx
```

Or disable the nginx site:

```bash
sudo mv /etc/nginx/conf.d/experience.slateart.ie.conf /etc/nginx/conf.d/experience.slateart.ie.conf.disabled
sudo nginx -t
sudo systemctl reload nginx
```
