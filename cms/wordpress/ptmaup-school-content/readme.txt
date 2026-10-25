=== PTMAUP School Content ===

Stable tag: 1.0.0
Requires at least: 6.4
Requires PHP: 7.4
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Publishes announcements, notices, events, calendar entries and consent-checked photo galleries for the Panakkad Thangal Memorial AUP School static website.

== Description ==

This plugin is built for the school's headless WordPress content workflow. It adds a **School Updates** area to the WordPress admin and exposes one public, read-only feed at:

`/wp-json/ptmaup/v1/content`

The static website's GitHub Actions sync reads that feed and republishes the content. Visitors never contact WordPress.

Content types:

* **Announcements** — the message in the website's announcement bar.
* **Notices** — dated notices with a category, summary and full text.
* **Events** — dated events, automatically shown as upcoming or past.
* **Calendar** — short dated entries for the school calendar.
* **Galleries** — dated collections of photographs selected from the media library.

Photograph safeguards:

* Consent must be recorded on the attachment.
* A consent reference must be entered and is never exposed by the feed.
* Alternative text of at least 8 characters is required.
* A photograph failing any check is withheld from the feed; the rest of the gallery still publishes.

The feed includes only published, non-password-protected updates. It does not include drafts, consent references, user accounts or private content. Media files and the feed are publicly readable by design because the static build has no WordPress credentials.

The plugin does not register a public theme, front-end templates or forms. It is designed for a separate static website in this repository.

== Installation ==

1. Upload the `ptmaup-school-content` folder to `/wp-content/plugins/`, or upload the plugin ZIP through **Plugins → Add New → Upload Plugin**.
2. Activate **PTMAUP School Content**.
3. Open **Settings → Permalinks** and choose **Post name**.
4. Open **School Updates** in the admin sidebar and begin adding content.
5. Before adding photographs, set alternative text in the media library; tick **Consent recorded** and enter a **Consent reference** in the attachment details.

No API key, application password or other credential is required.

== Frequently Asked Questions ==

= How does the public website get this content? =

A GitHub Actions job requests the public feed, validates the entries, downloads approved photographs, optimises them and commits the generated static files. The workflow normally runs hourly and can be run manually.

= Why is a photograph missing from the website? =

Check that the image is selected in the gallery, consent is ticked, a consent reference is entered and alternative text is at least 8 characters. The School Updates dashboard and the gallery editor show review badges. Save the gallery after changing attachment details.

= Why does the feed return a 404 or an HTML page? =

Check that the plugin is active, that permalinks are set to **Post name**, and that a security plugin or hosting firewall is not blocking `/wp-json/`. If WordPress is installed in a subdirectory, the website configuration needs the full feed path.

= Can page copy or design be changed here? =

No. This plugin manages School Updates only. Page copy, navigation, admissions information, contact details and design remain in the website repository.

= Is it safe to upload photographs of students? =

Only after the school has recorded consent and entered a consent reference. Do not upload photographs that are not approved for public display. Remove location metadata before uploading where appropriate. The feed and original media files are publicly accessible, and Git history retains earlier published copies.

== Changelog ==

= 1.0.0 =
* Initial release: five School Updates content types, readiness checks, consent-aware media fields, public read-only feed and gallery picker.
