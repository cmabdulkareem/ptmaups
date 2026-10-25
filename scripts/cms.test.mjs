#!/usr/bin/env node
/* Validation tests for the headless WordPress content pipeline. */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import vm from "node:vm";

import {
  CmsError,
  buildMemoryData,
  fetchFeed,
  loadConfig,
  normalizeContent,
  parseIsoDate,
  renderCmsData,
  runSync,
  todayInKolkata
} from "./sync-cms.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TODAY = "2026-10-25";
const MEDIA_HOST = "updates.example.org";
const PHOTO_URL = "https://" + MEDIA_HOST + "/wp-content/uploads/2026/10/assembly.jpg";

delete process.env.CMS_WORDPRESS_URL;

function validPayload() {
  return {
    schema: 1,
    pluginVersion: "1.0.0",
    generatedAt: "2026-10-25T06:00:00+00:00",
    announcement: {
      message: "School reopens on Monday.",
      updated: "2026-10-24"
    },
    notices: [
      {
        id: "welcome-notice",
        date: "2026-10-20",
        category: "General",
        title: "Welcome back",
        excerpt: "The new term begins next week.",
        body: ["First paragraph.", "Second paragraph."]
      }
    ],
    events: [
      {
        id: "annual-day",
        date: "2026-12-01",
        category: "Events",
        title: "Annual day",
        excerpt: "A celebration of the school year.",
        body: ["Students and families gather for the annual day."]
      },
      {
        id: "sports-day",
        date: "2024-01-15",
        category: "Activities",
        title: "Sports day",
        excerpt: "A past event for the archive.",
        body: ["This event is derived as past from its date."]
      }
    ],
    calendar: [
      {
        id: "school-reopens",
        date: "2026-11-02",
        category: "Academic",
        title: "School reopens",
        description: "Classes resume after the break."
      }
    ],
    galleries: [
      {
        id: "school-days",
        date: "2025",
        year: 2025,
        title: "School days",
        description: "A collection of everyday school life.",
        notes: ["Note one.", "Note two."],
        withheldPhotos: 0,
        photos: [
          {
            id: "assembly-01",
            url: PHOTO_URL,
            alt: "Students assembled in the school ground",
            caption: "Morning assembly",
            consentRecorded: true,
            modified: "2026-10-20T09:00:00+00:00"
          }
        ]
      }
    ]
  };
}

function normalize(payload, options) {
  return normalizeContent(payload, {
    today: TODAY,
    allowedHosts: new Set([MEDIA_HOST]),
    ...(options || {})
  });
}

function hasWarning(result, fragment) {
  return result.warnings.some((warning) => warning.includes(fragment));
}

test("parseIsoDate accepts full dates and optional year/month values", () => {
  assert.equal(parseIsoDate("2026-10-25"), "2026-10-25");
  assert.equal(parseIsoDate("2026-1-5"), "2026-01-05");
  assert.equal(parseIsoDate("2026-02-30"), null);
  assert.equal(parseIsoDate("2026-13-01"), null);
  assert.equal(parseIsoDate("2026-10"), null);
  assert.equal(parseIsoDate("2026-10", { allowPartial: true }), "2026-10");
  assert.equal(parseIsoDate("2026-10-25", { allowPartial: true }), "2026-10-25");
  assert.equal(parseIsoDate("2024-8", { allowPartial: true }), "2024-08");
  assert.equal(parseIsoDate("2024-13", { allowPartial: true }), null);
  assert.equal(parseIsoDate("25/10/2026"), null);
  assert.equal(parseIsoDate("2026"), null);
  assert.equal(parseIsoDate("2024", { allowPartial: true }), "2024");
  assert.equal(parseIsoDate(""), null);
});

test("normalizeContent keeps published entries and derives website state", () => {
  const records = normalize(validPayload());
  assert.deepEqual(records.warnings, []);
  assert.equal(records.announcement.message, "School reopens on Monday.");
  assert.equal(records.announcement.updated, "2026-10-24");

  assert.equal(records.notices.length, 1);
  assert.deepEqual(records.notices[0].body, ["First paragraph.", "Second paragraph."]);
  assert.equal(records.notices[0].category, "General");

  assert.equal(records.events.length, 2);
  assert.equal(records.events[0].past, false);
  assert.equal(records.events[1].past, true);

  assert.equal(records.calendarEvents.length, 1);
  assert.equal(records.calendarEvents[0].description, "Classes resume after the break.");

  assert.equal(records.galleries.length, 1);
  assert.equal(records.galleries[0].date, "2025");
  assert.equal(records.galleries[0].year, 2025);
  assert.deepEqual(records.galleries[0].notes, ["Note one.", "Note two."]);

  assert.equal(records.photos.length, 1);
  assert.equal(records.photos[0].galleryId, "school-days");
  assert.equal(records.photos[0].url, PHOTO_URL);
  assert.equal(records.photos[0].alt, "Students assembled in the school ground");
});

test("normalizeContent canonicalises categories and shortens overlong copy", () => {
  const payload = validPayload();
  payload.notices[0].category = "general";
  payload.notices[0].title = "A".repeat(200);
  payload.notices[0].excerpt = "";
  payload.announcement.message = "B".repeat(300);
  payload.announcement.updated = "not-a-date";

  const records = normalize(payload);
  assert.equal(records.notices[0].category, "General");
  assert.equal(Array.from(records.notices[0].title).length, 140);
  assert.ok(records.notices[0].title.endsWith("…"));
  assert.equal(records.notices[0].excerpt, "First paragraph.");
  assert.equal(Array.from(records.announcement.message).length, 240);
  assert.equal(records.announcement.updated, TODAY);
  assert.ok(hasWarning(records, "longer than"));
  assert.ok(hasWarning(records, "update date"));
});

test("normalizeContent skips invalid entries but keeps valid ones", () => {
  const payload = validPayload();
  payload.notices.push({
    id: "bad-category",
    date: "2026-10-18",
    category: "Sports",
    title: "Wrong category",
    excerpt: "This should be skipped.",
    body: ["Text."]
  });
  payload.notices.push({
    id: "bad-date",
    date: "2026-02-30",
    category: "General",
    title: "Impossible date",
    excerpt: "This should be skipped.",
    body: ["Text."]
  });
  payload.notices.push({
    id: "no-title",
    date: "2026-10-16",
    category: "General",
    title: "",
    excerpt: "This should be skipped.",
    body: ["Text."]
  });

  const records = normalize(payload);
  assert.equal(records.notices.length, 1);
  assert.ok(hasWarning(records, "not recognised"));
  assert.ok(hasWarning(records, "is not a valid date"));
  assert.ok(hasWarning(records, "title is missing"));
});

test("normalizeContent refuses to erase a list when every item is invalid", () => {
  const payload = validPayload();
  payload.notices = [
    {
      id: "bad",
      date: "not-a-date",
      category: "General",
      title: "Bad",
      excerpt: "",
      body: []
    }
  ];
  assert.throws(() => normalize(payload), /none passed validation/);
});

test("normalizeContent regenerates unusable and duplicate identifiers", () => {
  const payload = validPayload();
  payload.notices[0].id = "Not A Slug";
  payload.galleries.push({
    ...structuredClone(payload.galleries[0]),
    id: "school-days-second",
    title: "Second collection",
    photos: [
      {
        ...structuredClone(payload.galleries[0].photos[0]),
        id: "assembly-01"
      }
    ]
  });

  const records = normalize(payload);
  assert.equal(records.notices.length, 1);
  assert.equal(records.notices[0].id, "notice-20261020-welcome-back");
  assert.equal(records.photos.length, 2);
  assert.ok(records.photos.every((photo) => /^[a-z0-9-]+$/.test(photo.id)));
  assert.notEqual(records.photos[0].id, records.photos[1].id);
  assert.ok(hasWarning(records, "unusable web address"));
  assert.ok(hasWarning(records, "duplicate identifier"));
});

test("normalizeContent withholds photographs without consent, alt text or an approved host", () => {
  const withoutConsent = validPayload();
  withoutConsent.galleries[0].photos[0].consentRecorded = false;
  const noConsent = normalize(withoutConsent);
  assert.equal(noConsent.photos.length, 0);
  assert.ok(hasWarning(noConsent, "recorded consent"));

  const shortAlt = validPayload();
  shortAlt.galleries[0].photos[0].alt = "Photo";
  const badAlt = normalize(shortAlt);
  assert.equal(badAlt.photos.length, 0);
  assert.ok(hasWarning(badAlt, "alternative text"));

  const badHost = validPayload();
  badHost.galleries[0].photos[0].url = "https://images.example.net/photo.jpg";
  const wrongHost = normalize(badHost);
  assert.equal(wrongHost.photos.length, 0);
  assert.ok(hasWarning(wrongHost, "not an allowed media host"));

  const insecure = validPayload();
  insecure.galleries[0].photos[0].url = "http://updates.example.org/photo.jpg";
  const httpPhoto = normalize(insecure);
  assert.equal(httpPhoto.photos.length, 0);
  assert.ok(hasWarning(httpPhoto, "HTTPS"));
});

test("normalizeContent keeps an empty collection and reports WordPress withdrawals", () => {
  const payload = validPayload();
  payload.galleries[0].photos = [];
  payload.galleries[0].withheldPhotos = 2;

  const records = normalize(payload);
  assert.equal(records.galleries.length, 1);
  assert.equal(records.galleries[0].photos, undefined);
  assert.equal(records.photos.length, 0);
  assert.ok(hasWarning(records, "2 photograph(s) withheld by WordPress"));
});

test("normalizeContent warns when the gallery year disagrees with its date", () => {
  const payload = validPayload();
  payload.galleries[0].year = 2020;
  const records = normalize(payload);
  assert.equal(records.galleries[0].year, 2025);
  assert.ok(hasWarning(records, "does not match its date"));
});

test("normalizeContent validates the feed schema", () => {
  const nextSchema = validPayload();
  nextSchema.schema = 2;
  assert.throws(() => normalize(nextSchema), /schema 2/);

  const missing = validPayload();
  delete missing.notices;
  assert.throws(() => normalize(missing), /missing the "notices" list/);
});

test("buildMemoryData groups published photographs under their collection", () => {
  const records = normalize(validPayload());
  const photos = records.photos.map((photo) => ({
    ...photo,
    src: "assets/uploads/gallery/" + photo.id + "-0123456789ab.jpg"
  }));
  const memories = buildMemoryData(records.galleries, photos);

  assert.equal(memories.length, 1);
  assert.equal(memories[0].year, 2025);
  assert.equal(memories[0].notes.length, 2);
  assert.equal(memories[0].photos.length, 1);
  assert.equal(memories[0].photos[0].src, "assets/uploads/gallery/assembly-01-0123456789ab.jpg");
});

test("renderCmsData marks the site active, exposes counts and escapes markup", () => {
  const payload = {
    announcement: {
      message: "</script><script>alert(1)</script>",
      updated: "2026-10-25"
    },
    notices: [
      {
        id: "notice-1",
        date: "2026-10-25",
        category: "General",
        title: "<b>Notice</b>",
        excerpt: "Text & more",
        body: ["A paragraph."]
      }
    ],
    events: [],
    calendarEvents: [],
    memories: [
      {
        id: "memory-1",
        date: "2025",
        year: 2025,
        title: "Memory",
        description: "",
        notes: [],
        photos: [
          {
            src: "assets/uploads/gallery/photo-0123456789ab.jpg",
            alt: "A description",
            caption: ""
          }
        ]
      }
    ]
  };

  const code = renderCmsData(payload);
  assert.ok(code.includes("\\u003c/script>"));
  assert.ok(!code.includes("</script>"));

  const sandbox = {
    window: { SCHOOL_DATA: {} },
    document: {
      documentElement: {
        classes: [],
        classList: {
          add(name) {
            sandbox.document.documentElement.classes.push(name);
          }
        }
      }
    }
  };
  vm.runInNewContext(code, sandbox);

  assert.equal(sandbox.window.SCHOOL_SITE_CMS.active, true);
  assert.equal(sandbox.window.SCHOOL_SITE_CMS.counts.notices, 1);
  assert.equal(sandbox.window.SCHOOL_SITE_CMS.counts.events, 0);
  assert.equal(sandbox.window.SCHOOL_SITE_CMS.counts.calendar, 0);
  assert.equal(sandbox.window.SCHOOL_SITE_CMS.counts.galleries, 1);
  assert.equal(sandbox.window.SCHOOL_SITE_CMS.counts.photos, 1);
  assert.equal(sandbox.window.SCHOOL_DATA.announcement.message, payload.announcement.message);
  assert.equal(sandbox.window.SCHOOL_DATA.notices[0].title, "<b>Notice</b>");
  assert.deepEqual(sandbox.document.documentElement.classes, ["cms-active"]);
  assert.equal(sandbox.window.SCHOOL_MEMORIES[0].year, 2025);
});

test("fixture sync writes data, state and optimised gallery images", async (t) => {
  const out = await fs.mkdtemp(path.join(os.tmpdir(), "ptmaup-cms-"));
  t.after(async () => {
    await fs.rm(out, { recursive: true, force: true });
  });

  const galleryDir = path.join(out, "assets/uploads/gallery");
  await fs.mkdir(galleryDir, { recursive: true });
  const stale = path.join(galleryDir, "old-photo-abcdef123456.jpg");
  await fs.writeFile(stale, Buffer.from("stale"));

  await runSync({ fixtures: path.join(ROOT, "cms/fixtures"), out });

  const data = await fs.readFile(path.join(out, "js/cms-data.js"), "utf8");
  const sandbox = {
    window: { SCHOOL_DATA: {} },
    document: {
      documentElement: {
        classList: { add() {} }
      }
    }
  };
  vm.runInNewContext(data, sandbox);

  assert.equal(sandbox.window.SCHOOL_SITE_CMS.active, true);
  assert.equal(sandbox.window.SCHOOL_DATA.announcement.message.includes("CMS preview"), true);
  assert.equal(sandbox.window.SCHOOL_DATA.notices.length, 2);
  assert.equal(sandbox.window.SCHOOL_DATA.events.length, 2);
  assert.equal(sandbox.window.SCHOOL_SITE_CMS.counts.photos, 2);
  assert.equal(sandbox.window.SCHOOL_MEMORIES.length, 2);
  assert.equal(
    sandbox.window.SCHOOL_MEMORIES.find((memory) => memory.id === "cms-preview-empty").photos.length,
    0
  );
  assert.ok(sandbox.window.SCHOOL_DATA.notices.every((notice) => !("isSample" in notice)));
  assert.ok(sandbox.window.SCHOOL_DATA.calendarEvents.every((entry) => !("isSample" in entry)));

  const state = JSON.parse(await fs.readFile(path.join(out, "cms/.state/photos.json"), "utf8"));
  assert.equal(state.version, 2);
  assert.deepEqual(
    Object.keys(state.photos).sort(),
    ["cms-preview-photo-01", "cms-preview-photo-02"]
  );
  assert.equal(state.photos["cms-preview-photo-01"].source, "assets/images/gallery/reading-room.jpg");

  const files = (await fs.readdir(galleryDir)).filter((name) => name.endsWith(".jpg"));
  assert.equal(files.length, 2);
  for (const file of files) {
    assert.match(file, /^cms-preview-photo-0[12]-[a-f0-9]{12}\.jpg$/);
    const buffer = await fs.readFile(path.join(galleryDir, file));
    assert.equal(buffer.subarray(0, 3).toString("hex"), "ffd8ff");
    assert.ok(buffer.length > 1000);
  }
  await assert.rejects(fs.stat(stale), /ENOENT/);
});

test("an empty feed publishes empty data and clears stale images", async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ptmaup-cms-empty-"));
  t.after(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  const fixtures = path.join(dir, "fixtures");
  await fs.mkdir(fixtures, { recursive: true });
  await fs.writeFile(
    path.join(fixtures, "content.json"),
    JSON.stringify({
      schema: 1,
      announcement: null,
      notices: [],
      events: [],
      calendar: [],
      galleries: []
    })
  );

  const out = path.join(dir, "site");
  const galleryDir = path.join(out, "assets/uploads/gallery");
  await fs.mkdir(galleryDir, { recursive: true });
  const stale = path.join(galleryDir, "old-photo-abcdef123456.jpg");
  await fs.writeFile(stale, Buffer.from("stale"));

  await runSync({ fixtures, out });

  const data = await fs.readFile(path.join(out, "js/cms-data.js"), "utf8");
  const sandbox = {
    window: { SCHOOL_DATA: {} },
    document: { documentElement: { classList: { add() {} } } }
  };
  vm.runInNewContext(data, sandbox);
  assert.equal(sandbox.window.SCHOOL_SITE_CMS.active, true);
  assert.equal(sandbox.window.SCHOOL_SITE_CMS.counts.notices, 0);
  assert.equal(sandbox.window.SCHOOL_SITE_CMS.counts.photos, 0);
  assert.equal(sandbox.window.SCHOOL_DATA.announcement, null);
  assert.equal(sandbox.window.SCHOOL_MEMORIES.length, 0);

  const state = JSON.parse(await fs.readFile(path.join(out, "cms/.state/photos.json"), "utf8"));
  assert.deepEqual(state, { version: 2, photos: {} });
  await assert.rejects(fs.stat(stale), /ENOENT/);
  assert.deepEqual(
    (await fs.readdir(galleryDir)).filter((name) => name.endsWith(".jpg")),
    []
  );
});

test("the CLI reports exit code 3 while WordPress is unconfigured", async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ptmaup-cms-config-"));
  t.after(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });
  const config = path.join(dir, "cms.config.json");
  await fs.writeFile(config, JSON.stringify({ wordpressUrl: "", allowedMediaHosts: [] }));

  const result = spawnSync(
    process.execPath,
    [path.join(ROOT, "scripts/sync-cms.mjs"), "--check", "--config", config],
    {
      cwd: ROOT,
      encoding: "utf8",
      env: { ...process.env, CMS_WORDPRESS_URL: "" }
    }
  );
  assert.equal(result.status, 3);
  assert.match(result.stdout, /not configured/);
});

test("loadConfig validates the WordPress address and media hosts", async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ptmaup-cms-options-"));
  t.after(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  async function configFor(value) {
    const file = path.join(dir, "config-" + Math.random().toString(16).slice(2) + ".json");
    await fs.writeFile(file, JSON.stringify(value));
    return loadConfig(file);
  }

  const valid = await configFor({
    wordpressUrl: "https://updates.example.org/",
    contentPath: "/wp-json/ptmaup/v1/content",
    allowedMediaHosts: ["CDN.example.org"]
  });
  assert.equal(valid.wordpressUrl, "https://updates.example.org");
  assert.deepEqual(valid.allowedMediaHosts, ["cdn.example.org"]);

  const loopback = await configFor({ wordpressUrl: "http://127.0.0.1:8080" });
  assert.equal(loopback.wordpressUrl, "http://127.0.0.1:8080");

  await assert.rejects(
    configFor({ wordpressUrl: "http://updates.example.org" }),
    /must use HTTPS/
  );
  await assert.rejects(
    configFor({ wordpressUrl: "https://updates.example.org", contentPath: "wp-json/content" }),
    /contentPath/
  );
  await assert.rejects(
    configFor({
      wordpressUrl: "https://updates.example.org",
      allowedMediaHosts: ["https://cdn.example.org"]
    }),
    /invalid host/
  );
});

test("the sync reads a live HTTP WordPress feed", async (t) => {
  const feed = validPayload();
  feed.galleries = [];
  let requested = null;

  const server = http.createServer((request, response) => {
    requested = request;
    if (request.url === "/wp-json/ptmaup/v1/content") {
      response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      response.end(JSON.stringify(feed));
      return;
    }
    response.writeHead(404, { "content-type": "text/html; charset=utf-8" });
    response.end("<!doctype html><title>Not found</title><p>Not found</p>");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const port = server.address().port;
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ptmaup-cms-http-"));
  t.after(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  const configFile = path.join(dir, "cms.config.json");
  await fs.writeFile(
    configFile,
    JSON.stringify({
      wordpressUrl: "http://127.0.0.1:" + port,
      contentPath: "/wp-json/ptmaup/v1/content",
      allowedMediaHosts: []
    })
  );
  const out = path.join(dir, "site");

  await runSync({ config: configFile, out });

  assert.match(requested.headers["user-agent"], /PTMAUP-School-Website-Sync/);
  const data = await fs.readFile(path.join(out, "js/cms-data.js"), "utf8");
  const sandbox = {
    window: { SCHOOL_DATA: {} },
    document: { documentElement: { classList: { add() {} } } }
  };
  vm.runInNewContext(data, sandbox);
  assert.equal(sandbox.window.SCHOOL_SITE_CMS.active, true);
  assert.equal(sandbox.window.SCHOOL_SITE_CMS.counts.notices, 1);
  assert.equal(sandbox.window.SCHOOL_SITE_CMS.counts.galleries, 0);

  await assert.rejects(
    fetchFeed({
      wordpressUrl: "http://127.0.0.1:" + port,
      contentPath: "/missing",
      allowedMediaHosts: []
    }),
    (error) => error instanceof CmsError && /HTTP 404/.test(error.message) && /Permalinks/.test(error.message)
  );
});

test("CmsError instances identify CMS failures", () => {
  assert.throws(() => {
    throw new CmsError("Example failure");
  }, CmsError);
});

test("todayInKolkata returns a full ISO date", () => {
  assert.match(todayInKolkata(), /^\d{4}-\d{2}-\d{2}$/);
});
