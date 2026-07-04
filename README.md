# SlateArt Experience

Standalone visual experience prototype for `experience.slateart.ie`.

This project is intentionally separate from:

- `slateart.ie`
- `stories.slateart.ie`
- checkout / PayPal
- QR redirects
- customer login
- database

It is a progressive enhancement layer only. If WebGL, JavaScript, Three.js or a future embed fails, the normal story page must still work.

## Current Scope

- Story Book mode
- Voice From The Stone mode
- SlateArt Time Capsule mode
- Family Stone Collection mode
- Demo data only
- No database
- No login
- No admin
- No external API calls
- No autoplay audio
- HTML story text stays readable outside WebGL

## Long-Term Product Rule

This app should not store customer photos, audio, private messages or order data.

The long-life Smart Link architecture should stay:

```text
q.slateart.ie/code -> stories.slateart.ie/story-or-collection -> optional experience.slateart.ie visual layer
```

That keeps printed QR codes safe for years. If the visual engine changes later, the permanent QR redirect and the normal story page can continue working.

## Demo URLs

```text
https://experience.slateart.ie/?mode=story
https://experience.slateart.ie/?mode=voice
https://experience.slateart.ie/?mode=secret
https://experience.slateart.ie/?mode=collection
```

## Professional Story Integration

Preferred production links:

```text
https://experience.slateart.ie/?story=bailey-memory
https://experience.slateart.ie/?collection=murphy-family-stone-collection
```

The app fetches public cinematic data from:

```text
https://stories.slateart.ie/api/experience?story=bailey-memory
https://stories.slateart.ie/api/experience?collection=murphy-family-stone-collection
```

The API should return only public display data: title, short description, public image, dates, location, unlock date label and live story link. Do not expose hidden Secret Message text through this API.

## Fallback URL Parameters

Stories can also open this visual layer with safe public fallback parameters:

```text
https://experience.slateart.ie/?mode=voice&title=Bailey&subtitle=Pet%20memorial&image=https%3A%2F%2Fstories.slateart.ie%2Fuploads%2Fstories%2F...
```

Supported parameters:

```text
mode       story | voice | secret | collection
title      public story or collection title
subtitle   short public description
body       short public explanation
date       life dates, event date or display date
location   public place label
unlock     public Secret Message unlock date label
count      number of connected stories for collection mode
image      HTTPS image hosted on slateart.ie or stories.slateart.ie
source     HTTPS link back to the live story or collection page
```

Do not pass private hidden Secret Message text to this app. The real story page remains the source of truth.

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
