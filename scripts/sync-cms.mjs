#!/usr/bin/env node
/* Pull published School Updates from the headless WordPress site into the static
   website. The WordPress REST feed is public and read-only; no credentials are
   stored in this repository or in GitHub Actions. */

import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TIME_ZONE = "Asia/Kolkata";
const USER_AGENT = "PTMAUP-School-Website-Sync/2.0";

export const DATA_PATH = "js/cms-data.js";
export const GALLERY_URL_BASE = "assets/uploads/gallery";
export const STATE_PATH = "cms/.state/photos.json";
export const SCHEMA_VERSION = 1;
export const DEFAULT_CONTENT_PATH = "/wp-json/ptmaup/v1/content";

export const LIMITS = {
  notices: 100,
  events: 200,
  calendar: 500,
  galleries: 100,
  photos: 150,
  announcementMessage: 240,
  title: 140,
  excerpt: 320,
  noticeBody: 6000,
  bodyParagraph: 1500,
  bodyParagraphs: 12,
  galleryDescription: 600,
  galleryNotes: 4,
  galleryNoteLength: 240,
  altLength: 300,
  altMin: 8,
  caption: 200,
  description: 500,
  idLength: 60,
  photoIdLength: 64,
  feedBytes: 8 * 1024 * 1024,
  imageBytes: 25 * 1024 * 1024,
  imageTotalBytes: 200 * 1024 * 1024,
  imageWidth: 1600,
  imageQuality: 82,
  imagePixels: 60_000_000
};

export const CATEGORY_SETS = {
  notices: ["General", "Academic", "Admissions", "Events", "Holidays"],
  events: ["Announcements", "Academic", "Activities", "Events"],
  calendar: ["General", "Academic", "Admissions", "Activities", "Announcements", "Events", "Holidays"]
};

export class CmsError extends Error {
  constructor(message) {
    super(message);
    this.name = "CmsError";
  }
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function charLength(value) {
  return Array.from(value).length;
}

function plain(value) {
  return String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/\t/g, "  ")
    .trim();
}

function oneLine(value) {
  return plain(value).replace(/\s+/g, " ").trim();
}

function stripControlCharacters(value) {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

function truncate(value, maximum) {
  const characters = Array.from(value);
  if (characters.length <= maximum) return value;
  return characters.slice(0, Math.max(1, maximum - 1)).join("").trimEnd() + "…";
}

function warn(ctx, message) {
  ctx.warnings.push(message);
}

function itemLabel(raw, type, index) {
  if (raw && typeof raw === "object") {
    const title = oneLine(raw.title);
    if (title) return type + ' "' + truncate(title, 60) + '"';
    const id = oneLine(raw.id);
    if (id) return type + " " + truncate(id, 60);
  }
  return type + " item " + (index + 1);
}

function validYear(year) {
  return Number.isInteger(year) && year >= 1000 && year <= 9999;
}

export function parseIsoDate(value, options) {
  const settings = { allowPartial: false };
  Object.assign(settings, options || {});

  const text = String(value ?? "").trim();
  if (!text) return null;

  let match = /^(\d{4})$/.exec(text);
  if (match) {
    if (!settings.allowPartial) return null;
    return validYear(Number(match[1])) ? match[1] : null;
  }

  match = /^(\d{4})-(\d{1,2})$/.exec(text);
  if (match) {
    if (!settings.allowPartial) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (!validYear(year) || month < 1 || month > 12) return null;
    return year + "-" + pad(month);
  }

  match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!validYear(year) || month < 1 || month > 12 || day < 1) return null;

  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }
  return year + "-" + pad(month) + "-" + pad(day);
}

function canonicalCategory(raw, allowed, ctx, label) {
  const value = oneLine(raw);
  if (!value) {
    warn(ctx, label + " was skipped: the category is missing.");
    return "";
  }
  const found = allowed.find((category) => category.toLowerCase() === value.toLowerCase());
  if (!found) {
    warn(
      ctx,
      label + ' was skipped: the category "' + truncate(value, 80) + '" is not recognised. ' +
        "Use one of: " + allowed.join(", ") + "."
    );
    return "";
  }
  return found;
}

function slugify(value) {
  return oneLine(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "") || "entry";
}

function validSlug(value, maximum) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= maximum &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
  );
}

function uniqueId(base, used) {
  if (!used.has(base)) return base;
  let number = 2;
  let candidate = base + "-" + number;
  while (used.has(candidate)) {
    number += 1;
    candidate = base + "-" + number;
  }
  return candidate;
}

function autoEntryId(prefix, date, title) {
  const datePart = String(date || "undated").replace(/[^0-9]/g, "") || "undated";
  const base = (prefix + "-" + datePart + "-" + slugify(title))
    .slice(0, LIMITS.idLength)
    .replace(/-+$/g, "");
  return base || prefix + "-entry";
}

function resolveEntryId(raw, type, date, title, used, ctx, label) {
  const supplied = oneLine(raw);
  if (!supplied) {
    const generated = uniqueId(autoEntryId(type, date, title), used);
    used.add(generated);
    return generated;
  }
  if (!validSlug(supplied, LIMITS.idLength)) {
    const generated = uniqueId(autoEntryId(type, date, title), used);
    warn(
      ctx,
      label + ' has an unusable web address ("' + truncate(supplied, 80) + '"); using "' + generated + '".'
    );
    used.add(generated);
    return generated;
  }
  if (used.has(supplied)) {
    const generated = uniqueId(autoEntryId(type, date, title), used);
    warn(ctx, label + ' repeats the web address "' + supplied + '"; using "' + generated + '".');
    used.add(generated);
    return generated;
  }
  used.add(supplied);
  return supplied;
}

function normalizeAnnouncement(raw, ctx, today) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) {
    warn(ctx, "The announcement was ignored: WordPress sent an unexpected value.");
    return null;
  }

  let message = oneLine(raw.message);
  if (!message) return null;
  message = stripControlCharacters(message);
  if (charLength(message) > LIMITS.announcementMessage) {
    warn(
      ctx,
      "The announcement is longer than " + LIMITS.announcementMessage +
        " characters; it was shortened for the announcement bar."
    );
    message = truncate(message, LIMITS.announcementMessage);
  }

  let updated = parseIsoDate(raw.updated);
  if (!updated) {
    updated = today;
    warn(ctx, "The announcement has no valid update date; the sync date is being shown instead.");
  } else if (updated > today) {
    warn(ctx, "The announcement update date is in the future; it will be shown as supplied.");
  }

  return { message, updated };
}

function normalizeParagraphs(raw, ctx, label) {
  if (raw === undefined || raw === null) return [];
  const values = Array.isArray(raw) ? raw : [raw];
  const paragraphs = [];

  for (const value of values) {
    if (typeof value !== "string") continue;
    let paragraph = stripControlCharacters(oneLine(value));
    if (!paragraph) continue;
    if (charLength(paragraph) > LIMITS.bodyParagraph) {
      warn(
        ctx,
        label + " has a paragraph longer than " + LIMITS.bodyParagraph +
          " characters; it was shortened."
      );
      paragraph = truncate(paragraph, LIMITS.bodyParagraph);
    }
    paragraphs.push(paragraph);
  }

  if (paragraphs.length > LIMITS.bodyParagraphs) {
    warn(
      ctx,
      label + " has more than " + LIMITS.bodyParagraphs +
        " paragraphs; only the first " + LIMITS.bodyParagraphs + " are published."
    );
    paragraphs.length = LIMITS.bodyParagraphs;
  }

  let total = 0;
  const bounded = [];
  for (const paragraph of paragraphs) {
    if (total + charLength(paragraph) > LIMITS.noticeBody) {
      warn(ctx, label + " is longer than " + LIMITS.noticeBody + " characters in total; it was shortened.");
      break;
    }
    total += charLength(paragraph);
    bounded.push(paragraph);
  }
  return bounded;
}

function normalizeEntry(raw, options) {
  const { type, prefix, allowedCategories, usedIds, ctx } = options;
  const label = itemLabel(raw, type, options.index);

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    warn(ctx, label + " was skipped: WordPress sent an unexpected value.");
    return null;
  }

  let date = parseIsoDate(raw.date);
  if (!date) {
    warn(ctx, label + ' was skipped: "' + truncate(oneLine(raw.date), 40) + '" is not a valid date.');
    return null;
  }

  let title = stripControlCharacters(oneLine(raw.title));
  if (!title) {
    warn(ctx, label + " was skipped: the title is missing.");
    return null;
  }
  if (charLength(title) > LIMITS.title) {
    warn(ctx, label + " has a title longer than " + LIMITS.title + " characters; it was shortened.");
    title = truncate(title, LIMITS.title);
  }

  const category = canonicalCategory(raw.category, allowedCategories, ctx, label);
  if (!category) return null;

  const body = normalizeParagraphs(raw.body, ctx, label);
  let excerpt = stripControlCharacters(oneLine(raw.excerpt));
  if (!excerpt && body.length) excerpt = body[0];
  if (charLength(excerpt) > LIMITS.excerpt) {
    warn(ctx, label + " has a summary longer than " + LIMITS.excerpt + " characters; it was shortened.");
    excerpt = truncate(excerpt, LIMITS.excerpt);
  }

  const id = resolveEntryId(raw.id, prefix, date, title, usedIds, ctx, label);
  return { id, date, category, title, excerpt, body };
}

function normalizeEntries(raw, options) {
  const { type, prefix, limit, allowedCategories, ctx, today } = options;
  if (!Array.isArray(raw)) {
    warn(ctx, type + " were ignored: WordPress sent an unexpected value.");
    return [];
  }

  const usedIds = new Set();
  const entries = [];
  const considered = raw.slice(0, limit);
  if (raw.length > limit) {
    warn(ctx, "WordPress sent " + raw.length + " " + type.toLowerCase() + "; only the newest " + limit + " are published.");
  }

  considered.forEach((item, index) => {
    const entry = normalizeEntry(item, {
      type,
      prefix,
      allowedCategories,
      usedIds,
      ctx,
      index
    });
    if (!entry) return;
    if (type === "Events") entry.past = entry.date < today;
    entries.push(entry);
  });

  if (raw.length && !entries.length) {
    throw new CmsError(
      "WordPress returned " + raw.length + " " + type.toLowerCase() +
        ", but none passed validation. Nothing was published. Review the sync warnings."
    );
  }

  return entries;
}

function normalizeCalendar(raw, options) {
  const { ctx } = options;
  if (!Array.isArray(raw)) {
    warn(ctx, "Calendar entries were ignored: WordPress sent an unexpected value.");
    return [];
  }

  const usedIds = new Set();
  const entries = [];
  const considered = raw.slice(0, LIMITS.calendar);
  if (raw.length > LIMITS.calendar) {
    warn(
      ctx,
      "WordPress sent " + raw.length + " calendar entries; only the newest " +
        LIMITS.calendar + " are published."
    );
  }

  considered.forEach((rawEntry, index) => {
    const label = itemLabel(rawEntry, "Calendar entry", index);
    if (!rawEntry || typeof rawEntry !== "object" || Array.isArray(rawEntry)) {
      warn(ctx, label + " was skipped: WordPress sent an unexpected value.");
      return;
    }
    const date = parseIsoDate(rawEntry.date);
    if (!date) {
      warn(ctx, label + " was skipped: it has no valid date.");
      return;
    }
    let title = stripControlCharacters(oneLine(rawEntry.title));
    if (!title) {
      warn(ctx, label + " was skipped: the title is missing.");
      return;
    }
    if (charLength(title) > LIMITS.title) {
      warn(ctx, label + " has a title longer than " + LIMITS.title + " characters; it was shortened.");
      title = truncate(title, LIMITS.title);
    }
    const category = canonicalCategory(rawEntry.category, CATEGORY_SETS.calendar, ctx, label);
    if (!category) return;

    let description = stripControlCharacters(oneLine(rawEntry.description));
    if (charLength(description) > LIMITS.description) {
      warn(ctx, label + " has a description longer than " + LIMITS.description + " characters; it was shortened.");
      description = truncate(description, LIMITS.description);
    }

    const id = resolveEntryId(rawEntry.id, "calendar", date, title, usedIds, ctx, label);
    entries.push({ id, date, title, category, description });
  });

  if (raw.length && !entries.length) {
    throw new CmsError(
      "WordPress returned " + raw.length +
        " calendar entries, but none passed validation. Nothing was published. Review the sync warnings."
    );
  }

  return entries;
}

function normalizeNotes(raw, ctx, label) {
  if (raw === undefined || raw === null) return [];
  const values = Array.isArray(raw) ? raw : [raw];
  const notes = [];

  for (const value of values) {
    if (typeof value !== "string") continue;
    let note = stripControlCharacters(oneLine(value));
    if (!note) continue;
    if (charLength(note) > LIMITS.galleryNoteLength) {
      warn(ctx, label + " has a highlight longer than " + LIMITS.galleryNoteLength + " characters; it was shortened.");
      note = truncate(note, LIMITS.galleryNoteLength);
    }
    notes.push(note);
  }

  if (notes.length > LIMITS.galleryNotes) {
    warn(ctx, label + " has more than " + LIMITS.galleryNotes + " highlights; only the first " + LIMITS.galleryNotes + " are published.");
    notes.length = LIMITS.galleryNotes;
  }
  return notes;
}

function isLoopbackHost(hostname) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]"
  );
}

// Hosts such as free byethost answer automated requests with a JavaScript
// "visitor check" page. A browser passes it by storing a verification cookie,
// which we replay from the CMS_WORDPRESS_COOKIE secret — only ever to the
// configured WordPress host, never to other media hosts.
function wordpressCookieHeaders(config, requestUrl, headers) {
  const merged = { ...headers };
  const cookie = String(process.env.CMS_WORDPRESS_COOKIE || "").trim();
  if (!cookie || !config || !config.wordpressUrl) {
    return merged;
  }
  try {
    const requestHost = new URL(requestUrl).hostname.toLowerCase();
    const siteHost = new URL(config.wordpressUrl).hostname.toLowerCase();
    if (requestHost === siteHost) {
      merged.cookie = cookie;
    }
  } catch (error) {
    return merged;
  }
  return merged;
}

function parseMediaSource(raw, options) {
  const value = String(raw ?? "").trim();
  if (!value) return { error: "the photograph has no file address" };

  if (options.fixtures) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith("/") || value.startsWith("\\")) {
      return { error: "a fixture photograph must use a path inside this project" };
    }
    const resolved = path.resolve(ROOT, value);
    const relative = path.relative(ROOT, resolved);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
      return { error: "the fixture photograph path must stay inside this project" };
    }
    if (!/\.(?:jpe?g|png|webp|gif|avif|tiff?)$/i.test(resolved)) {
      return { error: "the fixture photograph must be a JPEG, PNG, WebP, AVIF or TIFF image" };
    }
    return { fixturePath: resolved, source: value };
  }

  let url;
  try {
    url = new URL(value);
  } catch (error) {
    return { error: "the photograph file address is not a valid URL" };
  }
  if (url.username || url.password) {
    return { error: "the photograph URL must not contain a username or password" };
  }
  const isLocal = isLoopbackHost(url.hostname);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && isLocal)) {
    return { error: "the photograph must be served over HTTPS" };
  }
  const host = url.hostname.toLowerCase();
  if (!options.allowedHosts || !options.allowedHosts.has(host)) {
    return {
      error:
        'the photograph is hosted on "' + host +
        '", which is not an allowed media host. Add it to allowedMediaHosts in cms/cms.config.json.'
    };
  }
  return { url: url.href, source: url.href };
}

function hashText(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizePhoto(raw, gallery, options) {
  const { ctx, usedPhotoIds, allowedHosts, fixtures } = options;
  const galleryLabel = 'Gallery "' + truncate(gallery.title, 60) + '"';

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    warn(ctx, galleryLabel + " contains a photograph with an unexpected value; it was withheld.");
    return null;
  }

  if (ctx.photoCount >= LIMITS.photos) {
    if (!ctx.photoLimitWarned) {
      warn(ctx, "Only " + LIMITS.photos + " photographs can be published from one sync; the rest were withheld.");
      ctx.photoLimitWarned = true;
    }
    return null;
  }

  if (raw.consentRecorded !== true) {
    warn(ctx, galleryLabel + " has a photograph without recorded consent; it was withheld.");
    return null;
  }

  let alt = stripControlCharacters(oneLine(raw.alt));
  if (charLength(alt) < LIMITS.altMin) {
    warn(
      ctx,
      galleryLabel + " has a photograph with missing or very short alternative text; it was withheld. " +
        "Add at least " + LIMITS.altMin + " characters in the media library."
    );
    return null;
  }
  if (charLength(alt) > LIMITS.altLength) {
    warn(ctx, galleryLabel + " has alternative text longer than " + LIMITS.altLength + " characters; it was shortened.");
    alt = truncate(alt, LIMITS.altLength);
  }

  const media = parseMediaSource(raw.url, { fixtures, allowedHosts });
  if (media.error) {
    warn(ctx, galleryLabel + " has a photograph that was withheld: " + media.error + ".");
    return null;
  }

  const suppliedId = oneLine(raw.id);
  let photoId;
  let sourceKey = media.source;
  if (validSlug(suppliedId, LIMITS.photoIdLength) && !usedPhotoIds.has(suppliedId)) {
    photoId = suppliedId;
  } else {
    const generated = uniqueId("photo-" + hashText(sourceKey).slice(0, 12), usedPhotoIds);
    if (suppliedId) {
      warn(
        ctx,
        galleryLabel + ' has a photograph with an unusable or duplicate identifier ("' +
          truncate(suppliedId, 80) + '"); using "' + generated + '".'
      );
    } else {
      warn(ctx, galleryLabel + ' has a photograph without an identifier; using "' + generated + '".');
    }
    photoId = generated;
  }
  usedPhotoIds.add(photoId);

  let caption = stripControlCharacters(oneLine(raw.caption));
  if (charLength(caption) > LIMITS.caption) {
    warn(ctx, galleryLabel + " has a caption longer than " + LIMITS.caption + " characters; it was shortened.");
    caption = truncate(caption, LIMITS.caption);
  }

  const modified = oneLine(raw.modified);
  ctx.photoCount += 1;

  return {
    id: photoId,
    galleryId: gallery.id,
    source: sourceKey,
    url: media.url || null,
    fixturePath: media.fixturePath || null,
    alt,
    caption,
    modified: modified ? truncate(modified, 40) : null,
    label: galleryLabel
  };
}

function normalizeGalleries(raw, options) {
  const { ctx, fixtures, allowedHosts } = options;
  if (!Array.isArray(raw)) {
    warn(ctx, "Galleries were ignored: WordPress sent an unexpected value.");
    return { galleries: [], photos: [], withheld: 0 };
  }

  const usedIds = new Set();
  const usedPhotoIds = new Set();
  const galleries = [];
  const photos = [];
  let withheld = 0;
  const considered = raw.slice(0, LIMITS.galleries);
  if (raw.length > LIMITS.galleries) {
    warn(ctx, "WordPress sent " + raw.length + " galleries; only the newest " + LIMITS.galleries + " are published.");
  }

  considered.forEach((rawGallery, index) => {
    const label = itemLabel(rawGallery, "Gallery", index);
    if (!rawGallery || typeof rawGallery !== "object" || Array.isArray(rawGallery)) {
      warn(ctx, label + " was skipped: WordPress sent an unexpected value.");
      return;
    }

    let date = parseIsoDate(rawGallery.date, { allowPartial: true });
    const suppliedYear = Number(rawGallery.year);
    const hasYear = Number.isInteger(suppliedYear) && validYear(suppliedYear);
    let year;

    if (date) {
      year = Number(date.slice(0, 4));
      if (hasYear && String(suppliedYear) !== date.slice(0, 4)) {
        warn(ctx, label + " has a year that does not match its date; the date is being used.");
      }
    } else if (hasYear) {
      date = String(suppliedYear);
      year = suppliedYear;
    } else {
      warn(ctx, label + " was skipped: it has no year or valid date.");
      return;
    }

    let title = stripControlCharacters(oneLine(rawGallery.title));
    if (!title) {
      warn(ctx, label + " was skipped: the title is missing.");
      return;
    }
    if (charLength(title) > LIMITS.title) {
      warn(ctx, label + " has a title longer than " + LIMITS.title + " characters; it was shortened.");
      title = truncate(title, LIMITS.title);
    }

    let description = stripControlCharacters(oneLine(rawGallery.description));
    if (charLength(description) > LIMITS.galleryDescription) {
      warn(ctx, label + " has a description longer than " + LIMITS.galleryDescription + " characters; it was shortened.");
      description = truncate(description, LIMITS.galleryDescription);
    }

    const notes = normalizeNotes(rawGallery.notes, ctx, label);
    const id = resolveEntryId(rawGallery.id, "memory", date, title, usedIds, ctx, label);

    const withheldCount = Number(rawGallery.withheldPhotos);
    if (Number.isInteger(withheldCount) && withheldCount > 0) {
      withheld += withheldCount;
      warn(
        ctx,
        label + " has " + withheldCount +
          " photograph(s) withheld by WordPress because consent, a consent reference or alternative text is missing."
      );
    }

    const gallery = { id, date, year, title, description, notes };
    galleries.push(gallery);

    if (!Array.isArray(rawGallery.photos)) {
      if (rawGallery.photos !== undefined && rawGallery.photos !== null) {
        warn(ctx, label + " has an unexpected photograph list; no photographs were published for it.");
      }
      return;
    }

    for (const rawPhoto of rawGallery.photos) {
      const photo = normalizePhoto(rawPhoto, gallery, {
        ctx,
        usedPhotoIds,
        allowedHosts,
        fixtures
      });
      if (photo) photos.push(photo);
    }
  });

  if (raw.length && !galleries.length) {
    throw new CmsError(
      "WordPress returned " + raw.length +
        " galleries, but none passed validation. Nothing was published. Review the sync warnings."
    );
  }

  return { galleries, photos, withheld };
}

export function normalizeContent(payload, options) {
  const settings = {
    today: todayInKolkata(),
    fixtures: false,
    allowedHosts: new Set()
  };
  Object.assign(settings, options || {});

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new CmsError("The WordPress content feed is not a JSON object.");
  }
  if (payload.schema !== SCHEMA_VERSION) {
    throw new CmsError(
      "The WordPress content feed uses schema " + JSON.stringify(payload.schema) +
        "; this website sync understands schema " + SCHEMA_VERSION +
        ". Update the PTMAUP School Content plugin and the website together."
    );
  }
  for (const key of ["notices", "events", "calendar", "galleries"]) {
    if (!Array.isArray(payload[key])) {
      throw new CmsError(
        'The WordPress content feed is missing the "' + key + '" list. ' +
          "Check that the PTMAUP School Content plugin is up to date."
      );
    }
  }

  const ctx = {
    warnings: [],
    photoLimitWarned: false,
    photoCount: 0
  };

  const announcement = normalizeAnnouncement(payload.announcement, ctx, settings.today);
  const notices = normalizeEntries(payload.notices, {
    type: "Notices",
    prefix: "notice",
    limit: LIMITS.notices,
    allowedCategories: CATEGORY_SETS.notices,
    ctx,
    today: settings.today
  });
  const events = normalizeEntries(payload.events, {
    type: "Events",
    prefix: "event",
    limit: LIMITS.events,
    allowedCategories: CATEGORY_SETS.events,
    ctx,
    today: settings.today
  });
  const calendarEvents = normalizeCalendar(payload.calendar, { ctx });
  const galleryData = normalizeGalleries(payload.galleries, {
    ctx,
    fixtures: settings.fixtures,
    allowedHosts: settings.allowedHosts
  });

  return {
    announcement,
    notices,
    events,
    calendarEvents,
    galleries: galleryData.galleries,
    photos: galleryData.photos,
    warnings: ctx.warnings
  };
}

export function buildMemoryData(galleries, photos) {
  return galleries.map((gallery) => {
    const galleryPhotos = photos
      .filter((photo) => photo.galleryId === gallery.id)
      .map((photo) => ({
        src: photo.src,
        alt: photo.alt,
        caption: photo.caption
      }));

    return {
      id: gallery.id,
      date: gallery.date,
      year: gallery.year,
      title: gallery.title,
      description: gallery.description,
      notes: gallery.notes,
      photos: galleryPhotos
    };
  });
}

function serializeJson(value) {
  return JSON.stringify(value, null, 2)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function renderCmsData(payload) {
  const memories = payload.memories || [];
  const counts = {
    notices: payload.notices.length,
    events: payload.events.length,
    calendar: payload.calendarEvents.length,
    galleries: memories.length,
    photos: memories.reduce((total, memory) => total + memory.photos.length, 0)
  };
  const site = { active: true, counts };

  return (
    "/* Generated by scripts/sync-cms.mjs from the school's WordPress content.\n" +
    "   Do not edit this file by hand; update School Updates in WordPress and run the sync. */\n\n" +
    "window.SCHOOL_DATA = window.SCHOOL_DATA || {};\n\n" +
    "window.SCHOOL_SITE_CMS = " + serializeJson(site) + ";\n\n" +
    'if (window.SCHOOL_SITE_CMS.active) document.documentElement.classList.add("cms-active");\n\n' +
    "window.SCHOOL_DATA.announcement = " + serializeJson(payload.announcement) + ";\n\n" +
    "window.SCHOOL_DATA.notices = " + serializeJson(payload.notices) + ";\n\n" +
    "window.SCHOOL_DATA.events = " + serializeJson(payload.events) + ";\n\n" +
    "window.SCHOOL_DATA.calendarEvents = " + serializeJson(payload.calendarEvents) + ";\n\n" +
    "window.SCHOOL_MEMORIES = " + serializeJson(memories) + ";\n"
  );
}

export function todayInKolkata(now) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now || new Date());
  const values = {};
  parts.forEach((part) => {
    values[part.type] = part.value;
  });
  return values.year + "-" + values.month + "-" + values.day;
}

function parseArgs(argv) {
  const args = {
    config: path.join(ROOT, "cms/cms.config.json"),
    fixtures: null,
    out: ROOT,
    check: false,
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--check") {
      args.check = true;
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--fixtures") {
      const value = argv[index + 1];
      if (!value) throw new CmsError("--fixtures requires a directory path.");
      args.fixtures = path.resolve(ROOT, value);
      index += 1;
    } else if (arg === "--out") {
      const value = argv[index + 1];
      if (!value) throw new CmsError("--out requires a directory path.");
      args.out = path.resolve(ROOT, value);
      index += 1;
    } else if (arg === "--config") {
      const value = argv[index + 1];
      if (!value) throw new CmsError("--config requires a file path.");
      args.config = path.resolve(ROOT, value);
      index += 1;
    } else {
      throw new CmsError(`Unknown option "${arg}". Use --help for usage.`);
    }
  }

  return args;
}

export async function loadConfig(file) {
  let raw;
  try {
    raw = JSON.parse(await fs.readFile(file, "utf8"));
  } catch (error) {
    throw new CmsError(`Could not read ${path.relative(ROOT, file)}: ${error.message}`);
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new CmsError(`${path.relative(ROOT, file)} must contain a JSON object.`);
  }

  const rawUrl = String(process.env.CMS_WORDPRESS_URL || raw.wordpressUrl || "").trim();
  let wordpressUrl = "";
  if (rawUrl) {
    let parsed;
    try {
      parsed = new URL(rawUrl);
    } catch (error) {
      throw new CmsError(
        "wordpressUrl must be the full address of the WordPress site, for example " +
          "https://updates.example.org."
      );
    }
    if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && isLoopbackHost(parsed.hostname))) {
      throw new CmsError("wordpressUrl must use HTTPS. HTTP is only allowed for local testing.");
    }
    if (parsed.username || parsed.password) {
      throw new CmsError("wordpressUrl must not contain a username or password.");
    }
    if (parsed.search || parsed.hash) {
      throw new CmsError("wordpressUrl must be a plain site address without a query string or fragment.");
    }
    const basePath = parsed.pathname.replace(/\/+$/g, "");
    wordpressUrl = parsed.origin + basePath;
  }

  const contentPath = String(raw.contentPath || DEFAULT_CONTENT_PATH).trim();
  if (
    !contentPath.startsWith("/") ||
    contentPath.startsWith("//") ||
    contentPath.length > 300 ||
    /[\s\u0000-\u001F]/.test(contentPath) ||
    contentPath.includes("?") ||
    contentPath.includes("#")
  ) {
    throw new CmsError(
      "contentPath must be a path beginning with a single slash, for example " +
        DEFAULT_CONTENT_PATH + "."
    );
  }

  const allowedMediaHosts = [];
  if (raw.allowedMediaHosts !== undefined) {
    if (!Array.isArray(raw.allowedMediaHosts)) {
      throw new CmsError("allowedMediaHosts must be a list of hostnames.");
    }
    for (const value of raw.allowedMediaHosts) {
      const host = String(value ?? "").trim().toLowerCase();
      if (!host || /[\s/?#@:]/.test(host) || host.includes("..")) {
        throw new CmsError(
          'allowedMediaHosts contains an invalid host "' + String(value ?? "") + '". Use a hostname only, for example cdn.example.org.'
        );
      }
      if (!allowedMediaHosts.includes(host)) allowedMediaHosts.push(host);
    }
  }

  return { wordpressUrl, contentPath, allowedMediaHosts };
}

export function isConfigured(config) {
  return Boolean(config && config.wordpressUrl);
}

function contentEndpoint(config) {
  return config.wordpressUrl.replace(/\/+$/g, "") + config.contentPath;
}

function allowedMediaHostSet(config) {
  const hosts = new Set(config.allowedMediaHosts);
  if (config.wordpressUrl) {
    hosts.add(new URL(config.wordpressUrl).hostname.toLowerCase());
  }
  return hosts;
}

async function readLimitedBody(response, maxBytes) {
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > maxBytes) {
    throw new CmsError(
      "The response is " + Math.ceil(declared / 1024 / 1024) +
        " MB; the allowed limit is " + Math.floor(maxBytes / 1024 / 1024) + " MB."
    );
  }

  if (!response.body) {
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > maxBytes) {
      throw new CmsError(
        "The response is larger than the allowed limit of " + Math.floor(maxBytes / 1024 / 1024) + " MB."
      );
    }
    return buffer;
  }

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      total += chunk.value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new CmsError(
          "The response is larger than the allowed limit of " + Math.floor(maxBytes / 1024 / 1024) + " MB."
        );
      }
      chunks.push(Buffer.from(chunk.value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, total);
}

function feedFailureHint(status) {
  if (status === 404) {
    return (
      " Check the WordPress address, confirm the PTMAUP School Content plugin is active, " +
      "and set Settings → Permalinks to “Post name” so that /wp-json/ works."
    );
  }
  if (status === 401 || status === 403) {
    return " The content feed must be publicly readable. Check the security plugin or hosting firewall.";
  }
  if (status >= 500) {
    return " WordPress returned a server error. Try again after checking the WordPress site and its error log.";
  }
  return "";
}

export async function fetchFeed(config) {
  const endpoint = contentEndpoint(config);
  let response;
  try {
    response = await fetch(endpoint, {
      headers: wordpressCookieHeaders(config, endpoint, {
        "user-agent": USER_AGENT,
        accept: "application/json"
      }),
      redirect: "follow",
      signal: AbortSignal.timeout(45_000),
      cache: "no-store"
    });
  } catch (error) {
    throw new CmsError(
      "Could not reach the WordPress content feed at " + endpoint + ": " + error.message
    );
  }

  const contentType = (response.headers.get("content-type") || "").toLowerCase();
  let text;
  try {
    text = (await readLimitedBody(response, LIMITS.feedBytes)).toString("utf8");
  } catch (error) {
    if (error instanceof CmsError) {
      throw new CmsError("The WordPress content feed could not be read: " + error.message);
    }
    throw error;
  }

  if (!response.ok) {
    throw new CmsError(
      "The WordPress content feed returned HTTP " + response.status + "." + feedFailureHint(response.status)
    );
  }

  if (contentType.includes("text/html") || /^\s*<(!doctype|html)/i.test(text)) {
    throw new CmsError(
      "WordPress returned a web page instead of the content feed at " + endpoint + "." +
        feedFailureHint(404) +
        " If the site shows a visitor-verification page, update the CMS_WORDPRESS_COOKIE secret." +
        " If the site is in maintenance mode, disable it and run the sync again."
    );
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    throw new CmsError(
      "The WordPress content feed is not valid JSON. Check that the plugin is active and the content path is correct."
    );
  }

  return data;
}

async function readFixtureFeed(fixturesDir) {
  const file = path.join(fixturesDir, "content.json");
  let text;
  try {
    text = await fs.readFile(file, "utf8");
  } catch (error) {
    throw new CmsError(`Could not read fixture ${path.relative(ROOT, file)}: ${error.message}`);
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new CmsError(`${path.relative(ROOT, file)} is not valid JSON: ${error.message}`);
  }
}

function formatWarnings(warnings) {
  if (!warnings.length) return "";
  const shown = warnings.slice(0, 40).map((message) => "  - " + message).join("\n");
  const extra = warnings.length > 40 ? "\n  ...and " + (warnings.length - 40) + " more." : "";
  return "Warnings:\n" + shown + extra + "\n";
}

function imageHash(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex").slice(0, 12);
}

async function fileExists(file) {
  try {
    const stats = await fs.stat(file);
    return stats.isFile() && stats.size > 0;
  } catch (error) {
    return false;
  }
}

async function readState(file) {
  try {
    const parsed = JSON.parse(await fs.readFile(file, "utf8"));
    if (!parsed || parsed.version !== 2 || typeof parsed.photos !== "object" || !parsed.photos) {
      return { version: 2, photos: {} };
    }
    return parsed;
  } catch (error) {
    return { version: 2, photos: {} };
  }
}

function generatedNamePattern(photoId) {
  return new RegExp("^" + photoId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "-[a-f0-9]{12}\\.jpg$");
}

async function downloadImage(photo, ctx) {
  let response;
  try {
    response = await fetch(photo.url, {
      headers: wordpressCookieHeaders(ctx, photo.url, {
        "user-agent": USER_AGENT,
        accept: "image/*"
      }),
      redirect: "follow",
      signal: AbortSignal.timeout(60_000)
    });
  } catch (error) {
    throw new CmsError(
      photo.label + ': photograph "' + photo.id + '" could not be downloaded: ' + error.message
    );
  }

  if (!response.ok) {
    throw new CmsError(
      photo.label + ': photograph "' + photo.id + '" returned HTTP ' + response.status +
        ". Check that the WordPress media file is publicly accessible."
    );
  }

  if (response.url) {
    let finalUrl;
    try {
      finalUrl = new URL(response.url);
    } catch (error) {
      finalUrl = null;
    }
    if (
      finalUrl &&
      !ctx.allowedHosts.has(finalUrl.hostname.toLowerCase())
    ) {
      await response.body?.cancel().catch(() => {});
      throw new CmsError(
        photo.label + ': photograph "' + photo.id + '" redirected to the unapproved host "' +
          finalUrl.hostname + '". Add it to allowedMediaHosts if this is your media CDN.'
      );
    }
  }

  const contentType = (response.headers.get("content-type") || "").toLowerCase();
  if (contentType.includes("text/html")) {
    await response.body?.cancel().catch(() => {});
    throw new CmsError(
      photo.label + ': photograph "' + photo.id +
        '" returned a web page instead of an image. Check that the media file is publicly accessible.' +
        " If the host checks visitors with JavaScript, update the CMS_WORDPRESS_COOKIE secret."
    );
  }
  if (contentType && !contentType.startsWith("image/")) {
    await response.body?.cancel().catch(() => {});
    throw new CmsError(
      photo.label + ': photograph "' + photo.id +
        '" is not served as an image (content type "' + contentType + '").'
    );
  }

  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > ctx.imageBytes) {
    throw new CmsError(
      photo.label + ': photograph "' + photo.id + '" is ' + Math.ceil(declared / 1024 / 1024) +
        " MB; keep photographs under " + Math.floor(ctx.imageBytes / 1024 / 1024) + " MB."
    );
  }

  let buffer;
  try {
    buffer = await readLimitedBody(response, ctx.imageBytes);
  } catch (error) {
    throw new CmsError(
      photo.label + ': photograph "' + photo.id + '" could not be downloaded: ' + error.message
    );
  }

  ctx.downloadedBytes += buffer.length;
  if (ctx.downloadedBytes > ctx.imageTotalBytes) {
    throw new CmsError(
      "The published photographs exceed the total download limit of " +
        Math.floor(ctx.imageTotalBytes / 1024 / 1024) + " MB for one sync."
    );
  }
  return buffer;
}

async function readFixtureImage(photo, ctx) {
  let stats;
  try {
    stats = await fs.stat(photo.fixturePath);
  } catch (error) {
    throw new CmsError(
      photo.label + ': fixture photograph "' + photo.id + '" could not be read: ' + error.message
    );
  }
  if (stats.size > ctx.imageBytes) {
    throw new CmsError(
      photo.label + ': fixture photograph "' + photo.id + '" is larger than ' +
        Math.floor(ctx.imageBytes / 1024 / 1024) + " MB."
    );
  }
  ctx.downloadedBytes += stats.size;
  if (ctx.downloadedBytes > ctx.imageTotalBytes) {
    throw new CmsError(
      "The fixture photographs exceed the total limit of " +
        Math.floor(ctx.imageTotalBytes / 1024 / 1024) + " MB for one sync."
    );
  }
  return fs.readFile(photo.fixturePath);
}

async function optimizeImage(buffer, photo, ctx, sharp) {
  try {
    const image = sharp(buffer, {
      failOn: "error",
      limitInputPixels: LIMITS.imagePixels
    });
    const metadata = await image.metadata();
    if (!metadata.format || metadata.format === "svg") {
      throw new Error("unsupported image format");
    }
    if (metadata.width && metadata.width < 480) {
      warn(
        ctx,
        photo.label + ': photograph "' + photo.id + '" is only ' + metadata.width +
          "px wide; a larger original will look sharper."
      );
    }
    const output = await image
      .rotate()
      .flatten({ background: "#ffffff" })
      .resize({ width: LIMITS.imageWidth, withoutEnlargement: true })
      .jpeg({ quality: LIMITS.imageQuality, mozjpeg: true, progressive: true })
      .toBuffer();
    if (output.length > 8 * 1024 * 1024) {
      throw new Error("the processed image is larger than 8 MB");
    }
    return output;
  } catch (error) {
    throw new CmsError(
      photo.label + ': photograph "' + photo.id + '" could not be read as an image: ' +
        error.message + ". Use a JPEG, PNG, WebP or AVIF photograph."
    );
  }
}

async function processPhotos(photos, paths, ctx) {
  if (!photos.length) {
    return {
      photos: [],
      state: { version: 2, photos: {} },
      desiredFiles: new Set()
    };
  }

  let sharp;
  try {
    sharp = (await import("sharp")).default;
  } catch (error) {
    throw new CmsError("The sharp dependency is not installed. Run npm ci before syncing the CMS.");
  }

  const state = await readState(paths.state);
  const nextState = { version: 2, photos: {} };
  const output = [];
  const newImages = new Map();
  const desiredFiles = new Set();

  for (const photo of photos) {
    const cached = state.photos[photo.id];
    const reusable =
      !ctx.fixtures &&
      cached &&
      cached.source === photo.source &&
      Boolean(photo.modified) &&
      cached.modified === photo.modified &&
      typeof cached.file === "string" &&
      generatedNamePattern(photo.id).test(cached.file) &&
      await fileExists(path.join(paths.galleryDir, cached.file));

    let file = null;
    let reused = false;

    if (reusable) {
      file = cached.file;
      reused = true;
      console.log(`  - ${photo.id}: unchanged (cached)`);
    }

    if (!reused) {
      let buffer;
      if (ctx.fixtures) {
        console.log(`  - ${photo.id}: reading fixture ${path.relative(ROOT, photo.fixturePath)}`);
        buffer = await readFixtureImage(photo, ctx);
      } else {
        console.log(`  - ${photo.id}: downloading`);
        buffer = await downloadImage(photo, ctx);
      }

      const jpeg = await optimizeImage(buffer, photo, ctx, sharp);
      const hash = imageHash(jpeg);
      file = photo.id + "-" + hash + ".jpg";
      if (!(await fileExists(path.join(paths.galleryDir, file)))) {
        newImages.set(file, jpeg);
      }
    }

    desiredFiles.add(file);
    output.push({ ...photo, src: GALLERY_URL_BASE + "/" + file });
    nextState.photos[photo.id] = {
      source: photo.source,
      modified: photo.modified,
      file,
      hash: path.basename(file).slice(photo.id.length + 1, -4)
    };
  }

  for (const [name, buffer] of newImages) {
    await fs.writeFile(path.join(paths.galleryDir, name + ".tmp-" + process.pid), buffer);
    await fs.rename(
      path.join(paths.galleryDir, name + ".tmp-" + process.pid),
      path.join(paths.galleryDir, name)
    );
  }

  return { photos: output, state: nextState, desiredFiles };
}

async function cleanupGallery(dir, desiredFiles) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    return;
  }
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!/^[a-z0-9][a-z0-9-]*-[a-f0-9]{12}\.jpg$/.test(entry.name)) continue;
    if (desiredFiles.has(entry.name)) continue;
    try {
      await fs.unlink(path.join(dir, entry.name));
    } catch (error) {
      console.warn(`  Warning: could not remove stale image ${entry.name}: ${error.message}`);
    }
  }
}

async function writeFileAtomic(file, contents) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = file + ".tmp-" + process.pid;
  await fs.writeFile(temporary, contents);
  await fs.rename(temporary, file);
}

export async function runSync(options) {
  const settings = {
    config: path.join(ROOT, "cms/cms.config.json"),
    fixtures: null,
    out: ROOT
  };
  Object.assign(settings, options || {});

  const config = await loadConfig(settings.config);
  const fixturesDir = settings.fixtures;
  if (!fixturesDir && !isConfigured(config)) {
    throw new CmsError(
      "The WordPress CMS is not configured. Add the WordPress address to cms/cms.config.json " +
        "(or set CMS_WORDPRESS_URL) and run the sync again."
    );
  }

  const paths = {
    data: path.join(settings.out, DATA_PATH),
    galleryDir: path.join(settings.out, GALLERY_URL_BASE),
    state: path.join(settings.out, STATE_PATH)
  };
  const allowedHosts = allowedMediaHostSet(config);

  console.log(
    "CMS source: " + (fixturesDir ? "local fixtures" : "WordPress " + config.wordpressUrl)
  );
  const feed = fixturesDir ? await readFixtureFeed(fixturesDir) : await fetchFeed(config);
  const content = normalizeContent(feed, {
    today: todayInKolkata(),
    fixtures: Boolean(fixturesDir),
    allowedHosts
  });

  if (content.warnings.length) {
    console.warn(formatWarnings(content.warnings));
  }

  const ctx = {
    fixtures: Boolean(fixturesDir),
    wordpressUrl: config.wordpressUrl,
    allowedHosts,
    imageBytes: LIMITS.imageBytes,
    imageTotalBytes: LIMITS.imageTotalBytes,
    downloadedBytes: 0,
    warnings: content.warnings
  };
  await fs.mkdir(paths.galleryDir, { recursive: true });

  const warningCount = content.warnings.length;
  const processed = await processPhotos(content.photos, paths, ctx);
  if (ctx.warnings.length > warningCount) {
    console.warn(formatWarnings(ctx.warnings.slice(warningCount)));
  }

  const memories = buildMemoryData(content.galleries, processed.photos);
  const payload = {
    announcement: content.announcement,
    notices: content.notices,
    events: content.events,
    calendarEvents: content.calendarEvents,
    memories
  };

  await writeFileAtomic(paths.data, renderCmsData(payload));
  await writeFileAtomic(paths.state, JSON.stringify(processed.state, null, 2) + "\n");
  await cleanupGallery(paths.galleryDir, processed.desiredFiles);

  const totalPhotos = memories.reduce((total, memory) => total + memory.photos.length, 0);
  console.log(
    "Published: " +
      content.notices.length + " notice(s), " +
      content.events.length + " event(s), " +
      content.calendarEvents.length + " calendar entry/entries, " +
      memories.length + " collection(s), " +
      totalPhotos + " photograph(s)."
  );
  console.log("Wrote " + path.relative(ROOT, paths.data) + " and " + GALLERY_URL_BASE + ".");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(
      "Usage: node scripts/sync-cms.mjs [--check] [--fixtures <dir>] [--out <dir>] [--config <file>]\n\n" +
      "  --check       Exit 0 when a WordPress content address is configured; exit 3 otherwise.\n" +
      "  --fixtures    Read content.json and local images from a fixture directory.\n" +
      "  --out         Write generated files under another directory (testing).\n" +
      "  --config      Use an alternative cms.config.json."
    );
    return;
  }

  const config = await loadConfig(args.config);
  if (args.check) {
    if (args.fixtures || isConfigured(config)) {
      console.log(args.fixtures ? "Fixture CMS is available." : "WordPress content source is configured.");
      return;
    }
    console.log(
      "The WordPress CMS is not configured. Add the WordPress address to cms/cms.config.json " +
        "or set CMS_WORDPRESS_URL."
    );
    process.exitCode = 3;
    return;
  }

  await runSync(args);
}

const isDirectRun =
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isDirectRun) {
  main().catch((error) => {
    if (error instanceof CmsError) {
      console.error("\nCMS sync failed:\n" + error.message);
    } else {
      console.error("\nCMS sync failed:", error);
    }
    process.exitCode = 1;
  });
}
