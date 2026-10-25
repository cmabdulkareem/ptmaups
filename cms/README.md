# WordPress content system

The public website is static and is published by GitHub Pages. School updates are written in a separate, headless WordPress installation; an automated sync copies the published updates into this repository, and GitHub Pages then serves the refreshed site.

School staff work only in the familiar WordPress admin. The page copy, navigation, layout and design remain in this repository and are not editable from WordPress.

```
WordPress admin
      │  publish
      ▼
Public read-only REST feed
https://updates.example.org/wp-json/ptmaup/v1/content
      │  GitHub Actions, hourly or manual
      ▼
scripts/sync-cms.mjs
  validates content, downloads photographs, optimises images
      │  commits
      ▼
js/cms-data.js  +  assets/uploads/gallery/  +  cms/.state/photos.json
      │
      ▼
GitHub Pages
```

There are no WordPress credentials in this repository or in GitHub Actions. The content feed is public and read-only by design, so the workflow only needs the site address.

> **Hosting is still required.** Only the domain has been arranged so far. Before launch, choose a WordPress host, install WordPress at an HTTPS address, and follow the setup below. WordPress cannot run on GitHub Pages.

## What can be edited in WordPress

Everything appears under **School Updates** in the WordPress admin.

| WordPress section | Public website area | Main fields |
| --- | --- | --- |
| Announcements | Announcement bar | Message (240 characters) |
| Notices | Notices page | Website date, category, title, summary, full text |
| Events | Events page | Website date, category, title, summary, full text |
| Calendar | School calendar page | Date, category, title, short description |
| Galleries | Gallery page | Year or exact date, title, description, up to four highlights, selected photographs |

Only **published** entries are published to the website. Drafts, scheduled posts, trash and password-protected entries are ignored. To remove something from the website, unpublish or delete it in WordPress and run the sync.

Page copy, the About page, admissions information, contact details, navigation, footers and all design work remain in this repository. Changes there need a developer and a normal website deployment.

## Hosting requirements

Choose a host before launch. The cheapest suitable setup is a small managed WordPress plan or a standard WordPress installation on a subdomain such as `updates.school-domain.example`.

Requirements:

- WordPress 6.4 or newer and PHP 8.0 or newer.
- HTTPS with a valid certificate.
- The public WordPress REST API enabled. Security plugins and hosting firewalls must not block `/wp-json/ptmaup/v1/content`.
- Media library files served publicly over HTTPS, ideally from the same domain.
- **Settings → Permalinks → Post name.** The default plain permalink setting can make `/wp-json/` return a 404.
- A maintenance plan for WordPress core, plugin, theme and PHP updates, backups, admin hardening and uptime monitoring.
- No page builder or public theme is required. The plugin stores content and exposes the feed; the public website's design does not come from WordPress.

A subdomain is recommended so that the WordPress installation and the static website remain independent. If WordPress is installed in a subdirectory, set `contentPath` to the full path, for example `/school/wp-json/ptmaup/v1/content`.

## Setup

### 1. Install WordPress and the plugin

1. Install WordPress on the chosen host over HTTPS. Delete unused default themes and plugins, and complete the host's security checklist.
2. Install the plugin ZIP from `cms/wordpress/ptmaup-school-content.zip` through **Plugins → Add New → Upload Plugin**. If the ZIP has not been built, compress the `cms/wordpress/ptmaup-school-content` folder so that the ZIP contains that folder, then upload it.
3. Activate **PTMAUP School Content**. A **School Updates** menu appears in the admin sidebar.
4. Open **Settings → Permalinks** and choose **Post name**. Save the changes.
5. Open **School Updates** and check the readiness summary. It shows missing fields, missing consent, missing consent references, missing alternative text, the public feed address and a plain-permalink warning.

The plugin is built for this website. Do not install a second copy or rename its content types.

### 2. Add school content

Use the existing pages in this repository as the guide for tone and accuracy. Do not invent official dates, names, fees, results or contact details in WordPress.

- **Announcement:** add a title for internal reference and the message. Only the newest published announcement with a message appears in the bar. Unpublish it to hide the bar.
- **Notice or event:** choose the website date, category, title, summary and full text. The website date is the date shown to visitors; it does not have to match the WordPress publish date. Events dated before today in Asia/Kolkata are grouped as past automatically.
- **Calendar entry:** choose the date, category and title, and add a short optional description.
- **Gallery collection:** enter a year, or an exact date when the day is known, plus a title and description. Highlights are optional; one short observation per line, up to four.
- **Photographs:** add images through the gallery's **Select photographs** button, then drag them into order. Use **Edit photo details** to set alternative text, the consent checkbox and the consent reference. Save the gallery to refresh the readiness badges.

### 3. Photograph consent and alternative text

A photograph is withheld automatically unless **all** of these are true:

- **Consent recorded for website publication** is ticked on the attachment.
- A **consent reference** is entered. Record who gave consent and when, or the consent form reference. This note is stored in WordPress and is **never** included in the public feed.
- **Alternative text** is at least 8 characters and describes the photograph for screen-reader users.
- The attachment is an image in the WordPress media library.

A withheld photograph does not block the rest of the gallery or website. The School Updates dashboard and the gallery editor show what needs attention. For images without consent, keep them out of published galleries. Do not use student photographs from other sources, generated lookalikes or stock images.

Before uploading, remove location metadata where appropriate. The sync strips metadata from the optimised public copies, but the original files in the WordPress media library are publicly accessible. Use file names and captions that contain no personal or confidential information.

### 4. Test the public feed

Sign out of WordPress, or use a private browser window, and open:

```
https://updates.example.org/wp-json/ptmaup/v1/content
```

A JSON response beginning with `"schema": 1` means the feed is working. It should list only published updates. If it returns an HTML page or a 404, see Troubleshooting.

The feed is intentionally public. It contains published titles, summaries, full text, dates, categories, gallery notes, approved image URLs, alternative text and captions. It does not contain consent references, drafts, private or password-protected entries, user accounts or form submissions.

### 5. Connect this website

Edit `cms/cms.config.json`:

```json
{
  "wordpressUrl": "https://updates.example.org",
  "contentPath": "/wp-json/ptmaup/v1/content",
  "allowedMediaHosts": []
}
```

- `wordpressUrl` — the HTTPS address of the WordPress installation. No trailing slash is required.
- `contentPath` — the plugin feed path. Change it for a subdirectory installation.
- `allowedMediaHosts` — only needed when published images are served from a different host, such as a media CDN. List hostnames only, for example `["cdn.example.org"]`. The WordPress host is always allowed.

Commit and push the change. The workflow also runs whenever this config file changes. For a local test, the environment variable `CMS_WORDPRESS_URL` overrides `wordpressUrl`: 

```bash
CMS_WORDPRESS_URL=https://updates.example.org npm run cms:check
```

### 6. Run the first sync

In GitHub, open **Actions → Sync school content from WordPress → Run workflow**. The first successful run replaces the demonstration content with the published WordPress content. After that the workflow runs every hour at 17 minutes past the hour.

The workflow commits:

- `js/cms-data.js`
- `assets/uploads/gallery/` — optimised JPEG copies, 1600 px wide
- `cms/.state/photos.json` — a cache of published image versions, used to avoid unnecessary downloads

A normal content change appears on the public site a few minutes after the workflow and GitHub Pages deployment finish. The content feed is read at build time only; visitors never contact WordPress.

## Content limits and validation

The plugin and the sync both check content. A single invalid item is skipped with a warning in the Action log; the rest of the site still updates. If WordPress returns entries of a type but none of them pass validation, the sync stops instead of erasing that section of the website.

| Item | Limit or rule |
| --- | --- |
| Announcement message | 240 characters |
| Notice or event title | 140 characters |
| Notice or event summary | 320 characters, shortened with a warning if longer |
| Full text | Up to 12 paragraphs, 1,500 characters per paragraph, 6,000 characters in total |
| Notice/event IDs / permalinks | The WordPress slug is used; an unusable or duplicate slug is replaced in the generated data |
| Calendar description | 500 characters |
| Gallery description | 600 characters |
| Gallery highlights | 4 lines, 240 characters each |
| Gallery year | Required unless an exact date is entered |
| Photograph caption | 200 characters |
| Alternative text | At least 8 characters, at most 300 |
| Photographs | 150 per sync; 25 MB each; 200 MB total per sync |
| Dates | Events, notices and calendar entries need a valid date; galleries accept a year, year and month, or full date |

Published images are converted to progressive JPEG at 1600 px wide and quality 82. File names use a content hash, so replacing a photograph in WordPress produces a new public file. If an image changes but WordPress reports the same attachment modification time, the sync may keep the cached copy; re-uploading or updating the attachment refreshes it.

## Local development

```bash
npm ci
npm run test                    # 19 pipeline tests, including image processing
npm run cms:fixtures            # write preview content from cms/fixtures/content.json
npm run cms:check               # exit 0 when configured, 3 when not configured
npm run cms:sync                # pull from the configured WordPress site
```

`npm run cms:fixtures` writes `js/cms-data.js`, `assets/uploads/gallery/` and `cms/.state/photos.json` in place. Use Git to discard the preview when finished:

```bash
git checkout -- js/cms-data.js
git clean -fd assets/uploads/gallery cms/.state
```

A single test can target a temporary output directory:

```bash
node scripts/sync-cms.mjs --fixtures cms/fixtures --out .tmp/preview
```

Use `http://127.0.0.1` or `http://localhost` for a local WordPress address; all non-loopback addresses must use HTTPS.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Action says "not configured" | `wordpressUrl` in `cms/cms.config.json` is empty, or the change is not on `master`. |
| Feed returns 404 | Plugin is active; Permalinks is set to **Post name**; `wordpressUrl` and `contentPath` are correct; for a subdirectory install set the full path. |
| Feed returns an HTML page | The site is in maintenance mode, a security plugin/firewall blocks REST, or the address points to the static website rather than WordPress. If the page is a JavaScript “checking your browser” challenge (common on free hosting), see the cookie workaround below. |
| `schema` mismatch | Update the plugin and the website together; the feed and sync must use schema 1. |
| Photographs are missing | Consent, consent reference and alternative text must all be recorded; the image must be selected in the gallery and saved; check `allowedMediaHosts` if images use a CDN. |
| Image download fails | WordPress media files must be publicly accessible over HTTPS; check hotlink protection, CDN rules and file size limits. |
| Website still shows demonstration content | Run the workflow manually, check the Action log and the commit, confirm GitHub Pages deployed, then hard-refresh. |
| A removed photograph is still visible | The current site may be cached; also remember that GitHub history retains earlier commits. For a consent withdrawal, remove the image, run the sync, and ask the maintainer to purge the file from repository history and any CDN cache. |
| Site design changes are expected from WordPress | The design is in this repository; WordPress only supplies School Updates content. |

### Hosts with a JavaScript “visitor check” (cookie workaround)

Some free hosts (for example byethost) answer automated requests with a JavaScript “checking your browser” page, so the sync sees HTML instead of the feed even though the site works in your browser. The sync can replay the verification cookie that your browser receives:

1. Open the WordPress site in your browser and let the check pass (the site loads normally).
2. Open DevTools (F12) → **Application** → **Cookies** → select the WordPress address. Copy every cookie shown there in `name=value; name=value` form. (The Console command `document.cookie` does not show HttpOnly cookies, so use the Application tab.)
3. In the GitHub repository go to **Settings → Secrets and variables → Actions → New repository secret**. Name it exactly `CMS_WORDPRESS_COOKIE` and paste the cookie string.
4. Re-run the workflow: **Actions → Sync school content from WordPress → Run workflow**.

The cookie is sent only to the configured WordPress host, never to other media hosts, and it is read from the secret — never commit it to `cms/cms.config.json`. Verification cookies expire; when the sync fails again with “returned a web page instead of the content feed”, repeat steps 1–3 with a fresh cookie. This workaround fights the host's bot protection and can stop working at any time; moving to hosting that serves `/wp-json/` without a challenge is the reliable fix.

## Security and privacy

- Treat the WordPress admin as a publishing system. Use strong unique passwords, two-factor authentication, update WordPress and plugins promptly, and give staff the lowest role that can publish (Editor or a dedicated role).
- The public content feed exposes only published, approved school updates. Do not put admission enquiries, student records, staff records, health information or other confidential material into WordPress posts, media titles, captions, alternative text or file names.
- Consent references remain in WordPress and are not published. They are still personal data on the WordPress server, so protect backups and admin access.
- The static website's demonstration forms do not transmit data. They send nothing to WordPress or any other server.
- The sync runs from GitHub Actions without stored WordPress credentials. It reads the public feed and public media files only.
- Removing content from WordPress and syncing removes it from the current site, but not from Git history. Handle consent withdrawals and accidental publications as a privacy incident: remove the content, purge repository history where appropriate, and invalidate any CDN or browser caches.

## Files in this folder

```
cms/
├── cms.config.json                 WordPress address and allowed media hosts
├── fixtures/content.json           Preview content for local development
├── wordpress/
│   ├── ptmaup-school-content/      Plugin source
│   └── ptmaup-school-content.zip   Installable plugin package
└── README.md
```

`cms/.state/photos.json` is generated by the sync. Do not edit it by hand. The public website reads only `js/cms-data.js` and `assets/uploads/gallery/`.
