/* Chronological school memories timeline, event collection modal and image viewer. */

(function () {
  "use strict";

  var timeline = document.getElementById("memory-timeline");
  if (!timeline) return;

  var PTM = window.PTM || {};
  var escapeHTML = PTM.escapeHTML || function (value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  var MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  var ICONS = {
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M8 3v4M16 3v4M3.5 10h17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    camera: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h4l2-2h4l2 2h4v12H4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
    expand: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    image: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="9" cy="10" r="2" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="m4 18 5-5 3 3 3-3 5 5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
    note: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v11l-4 4H5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M15 19v-4h4M8 8h8M8 11.5h5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
  };

  var refs = {
    controls: document.getElementById("memory-controls"),
    years: document.getElementById("memory-years"),
    positionYear: document.getElementById("memory-position-year"),
    summaryValue: document.getElementById("memory-summary-value"),
    summaryDetail: document.getElementById("memory-summary-detail"),
    modal: document.getElementById("memory-modal"),
    dialog: document.getElementById("memory-modal-dialog"),
    modalKicker: document.getElementById("memory-modal-kicker"),
    modalTitle: document.getElementById("memory-modal-title"),
    modalDate: document.getElementById("memory-modal-date"),
    modalCount: document.getElementById("memory-modal-count"),
    modalDescription: document.getElementById("memory-modal-description"),
    modalScroll: document.getElementById("memory-modal-scroll"),
    modalGrid: document.getElementById("memory-modal-grid"),
    modalNoPhotos: document.getElementById("memory-modal-no-photos"),
    viewer: document.getElementById("memory-viewer"),
    viewerCounter: document.getElementById("memory-viewer-counter"),
    viewerImage: document.getElementById("memory-viewer-image"),
    viewerFallback: document.getElementById("memory-viewer-fallback"),
    viewerCaption: document.getElementById("memory-viewer-caption"),
    viewerStatus: document.getElementById("memory-viewer-status"),
    viewerStage: document.getElementById("memory-viewer-stage"),
    viewerPrev: document.querySelector("[data-viewer-prev]"),
    viewerNext: document.querySelector("[data-viewer-next]")
  };

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var memories = buildMemories(window.SCHOOL_MEMORIES);
  var groups = groupMemories(memories);
  var yearSections = [];
  var activeYearKey = null;
  var revealObserver = null;
  var scrollTicking = false;
  var modalState = {
    open: false,
    trigger: null,
    memory: null,
    photoIndex: 0,
    viewerOpen: false,
    viewerTrigger: null,
    scrollY: 0,
    bodyStyles: null,
    htmlOverflow: "",
    inerted: []
  };

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function plural(count, singular, pluralForm) {
    return count + " " + (count === 1 ? singular : pluralForm);
  }

  function photoCount(count) {
    return plural(count, "photograph", "photographs");
  }

  function parseDate(value) {
    var match = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(String(value || "").trim());
    if (!match) return null;

    var year = Number(match[1]);
    var month = match[2] ? Number(match[2]) : null;
    var day = match[3] ? Number(match[3]) : null;

    if (year < 1000) return null;
    if (month !== null && (month < 1 || month > 12)) return null;
    if (day !== null && day < 1) return null;

    if (month !== null && day !== null) {
      var check = new Date(year, month - 1, day);
      if (check.getFullYear() !== year || check.getMonth() !== month - 1 || check.getDate() !== day) return null;
    }

    return { year: year, month: month, day: day };
  }

  function normaliseNotes(items) {
    if (!Array.isArray(items)) return [];

    return items
      .filter(function (note) {
        return typeof note === "string" && note.trim();
      })
      .map(function (note) {
        return note.trim();
      });
  }

  function normalisePhotos(items, title) {
    if (!Array.isArray(items)) return [];

    return items
      .map(function (photo, index) {
        if (!photo || typeof photo.src !== "string" || !photo.src.trim()) return null;
        var alt = typeof photo.alt === "string" && photo.alt.trim()
          ? photo.alt.trim()
          : title + " photograph " + (index + 1);
        return {
          src: photo.src.trim(),
          alt: alt,
          caption: typeof photo.caption === "string" ? photo.caption.trim() : ""
        };
      })
      .filter(Boolean);
  }

  function formatDateLabel(memory) {
    var date = memory.parsed;
    if (date && date.day) {
      return {
        label: date.day + " " + MONTHS[date.month - 1] + " " + date.year,
        iso: date.year + "-" + pad(date.month) + "-" + pad(date.day)
      };
    }
    if (date && date.month) {
      return {
        label: MONTHS[date.month - 1] + " " + date.year,
        iso: date.year + "-" + pad(date.month)
      };
    }
    if (memory.year) {
      return { label: memory.year + " · year only", iso: String(memory.year) };
    }
    return { label: "Date to be confirmed", iso: null };
  }

  function sortValue(memory) {
    if (!memory.year) return Number.MAX_SAFE_INTEGER;
    if (memory.parsed && memory.parsed.month) {
      return memory.year * 10000 + memory.parsed.month * 100 + (memory.parsed.day || 99);
    }
    return memory.year * 10000 + 9999;
  }

  function buildMemories(source) {
    if (!Array.isArray(source)) return [];

    var list = [];
    source.forEach(function (item, index) {
      if (!item || typeof item !== "object") return;
      var title = typeof item.title === "string" ? item.title.trim() : "";
      if (!title) return;

      var parsed = parseDate(item.date);
      var suppliedYear = Number(item.year);
      var year = parsed
        ? parsed.year
        : Number.isInteger(suppliedYear) && suppliedYear >= 1000 && suppliedYear <= 9999
          ? suppliedYear
          : null;

      var memory = {
        index: index,
        order: index,
        title: title,
        description: typeof item.description === "string" ? item.description.trim() : "",
        notes: normaliseNotes(item.notes),
        photos: normalisePhotos(item.photos, title),
        parsed: parsed,
        year: year,
        isSample: item.isSample === true
      };

      var dateLabel = formatDateLabel(memory);
      memory.dateLabel = dateLabel.label;
      memory.dateISO = dateLabel.iso;
      memory.sortValue = sortValue(memory);
      list.push(memory);
    });

    list.sort(function (a, b) {
      if (a.year === null && b.year === null) return a.order - b.order;
      if (a.year === null) return 1;
      if (b.year === null) return -1;
      if (a.year !== b.year) return a.year - b.year;
      if (a.sortValue !== b.sortValue) return a.sortValue - b.sortValue;
      return a.order - b.order;
    });

    list.forEach(function (memory, index) {
      memory.index = index;
    });

    return list;
  }

  function groupMemories(list) {
    var groupsByKey = {};
    var result = [];

    list.forEach(function (memory) {
      var key = memory.year === null ? "undated" : String(memory.year);
      if (!groupsByKey[key]) {
        groupsByKey[key] = {
          key: key,
          year: memory.year,
          label: memory.year === null ? "Undated" : String(memory.year),
          memories: []
        };
        result.push(groupsByKey[key]);
      }
      groupsByKey[key].memories.push(memory);
    });

    result.sort(function (a, b) {
      if (a.year === null) return 1;
      if (b.year === null) return -1;
      return a.year - b.year;
    });

    return result;
  }

  function dateMarkup(memory) {
    if (!memory.dateISO) return "<span>" + escapeHTML(memory.dateLabel) + "</span>";
    return '<time datetime="' + escapeHTML(memory.dateISO) + '">' + escapeHTML(memory.dateLabel) + "</time>";
  }

  function renderPreview(memory) {
    if (!memory.photos.length) {
      return (
        '<div class="memory-card__awaiting">' +
        '<span class="memory-card__awaiting-icon">' + ICONS.camera + "</span>" +
        "<span>Photographs for this memory are being prepared.</span>" +
        "</div>"
      );
    }

    var previewCount = Math.min(4, memory.photos.length);
    var extra = memory.photos.length - previewCount;
    var items = memory.photos.slice(0, 4).map(function (photo) {
      return (
        '<span class="memory-preview__item">' +
        '<img src="' + escapeHTML(photo.src) + '" alt="" loading="lazy" decoding="async">' +
        '<span class="memory-preview__fallback" hidden>' + ICONS.image + "<span>Photograph unavailable</span></span>" +
        "</span>"
      );
    }).join("");

    return (
      '<button class="memory-card__media" type="button" data-memory-open="' + memory.index + '" aria-haspopup="dialog" ' +
      'aria-label="View ' + photoCount(memory.photos.length) + " from " + escapeHTML(memory.title) + '">' +
      '<span class="memory-preview memory-preview--' + previewCount + '">' +
      items +
      (extra > 0 ? '<span class="memory-preview__more" aria-hidden="true">+' + extra + "</span>" : "") +
      "</span>" +
      '<span class="memory-card__media-action" aria-hidden="true">' + ICONS.expand + "<span>View collection</span></span>" +
      "</button>"
    );
  }

  function renderFoot(memory) {
    if (!memory.photos.length) {
      return (
        '<div class="memory-card__foot">' +
        '<span class="memory-card__status">' + ICONS.camera + "Awaiting photographs</span>" +
        "</div>"
      );
    }

    return (
      '<div class="memory-card__foot">' +
      '<span class="memory-card__count">' + ICONS.camera + photoCount(memory.photos.length) + "</span>" +
      '<button class="memory-card__action" type="button" data-memory-open="' + memory.index + '" aria-haspopup="dialog" ' +
      'aria-label="View memories from ' + escapeHTML(memory.title) + '">' +
      "View memories " + ICONS.arrow +
      "</button>" +
      "</div>"
    );
  }

  function renderAside(memory) {
    if (!memory.notes.length) return "";

    return (
      '<div class="memory-aside">' +
      '<p class="memory-aside__label">' + ICONS.note + "Archive note</p>" +
      '<ul class="memory-aside__points">' +
      memory.notes.map(function (note) {
        return "<li>" + escapeHTML(note) + "</li>";
      }).join("") +
      "</ul>" +
      "</div>"
    );
  }

  function renderCard(memory) {
    return (
      '<li class="memory-entry memory-entry--' + (memory.index % 2 === 0 ? "left" : "right") + '">' +
      '<span class="memory-entry__node" aria-hidden="true"></span>' +
      '<article class="memory-card">' +
      '<div class="memory-card__body">' +
      '<div class="memory-card__meta">' +
      '<span class="memory-card__date">' + ICONS.calendar + dateMarkup(memory) + "</span>" +
      (memory.isSample ? '<span class="tag tag--sample">Sample</span>' : "") +
      "</div>" +
      "<h4>" + escapeHTML(memory.title) + "</h4>" +
      (memory.description ? '<p class="memory-card__desc">' + escapeHTML(memory.description) + "</p>" : "") +
      "</div>" +
      renderPreview(memory) +
      renderFoot(memory) +
      "</article>" +
      renderAside(memory) +
      "</li>"
    );
  }

  function renderYear(group) {
    var sectionId = group.year === null ? "year-undated" : "year-" + group.year;
    var labelId = sectionId + "-label";
    var kicker = group.year === null ? "Memories" : "Year";

    return (
      '<section class="memory-year" id="' + sectionId + '" data-year="' + group.key + '" aria-labelledby="' + labelId + '">' +
      '<div class="memory-year__marker">' +
      '<h3 class="memory-year__label" id="' + labelId + '" tabindex="-1"><span>' + kicker + "</span> " + escapeHTML(group.label) + "</h3>" +
      "</div>" +
      '<ol class="memory-list">' +
      group.memories.map(renderCard).join("") +
      "</ol>" +
      "</section>"
    );
  }

  function renderYearNav() {
    if (!refs.years) return;

    if (!groups.length) {
      refs.years.innerHTML = '<span class="memory-years__empty">Years will appear with the first memory</span>';
      return;
    }

    refs.years.innerHTML = groups.map(function (group) {
      var targetId = group.year === null ? "year-undated" : "year-" + group.year;
      var label = group.year === null ? "undated memories" : group.label + " memories";
      return (
        '<a class="memory-year-link" href="#' + targetId + '" data-year-link="' + group.key + '" ' +
        'aria-label="Jump to ' + escapeHTML(label) + '">' + escapeHTML(group.label) + "</a>"
      );
    }).join("");
  }

  function updateSummary() {
    if (!refs.summaryValue || !refs.summaryDetail) return;

    if (!memories.length) {
      refs.summaryValue.textContent = "Awaiting photographs";
      refs.summaryDetail.textContent = "New memories will be added here";
      return;
    }

    var photos = memories.reduce(function (total, memory) {
      return total + memory.photos.length;
    }, 0);
    var years = groups
      .filter(function (group) {
        return group.year !== null;
      })
      .map(function (group) {
        return group.year;
      });

    refs.summaryValue.textContent = plural(memories.length, "collection archived", "collections archived");

    if (!photos) {
      refs.summaryDetail.textContent = "Photographs will be added soon";
      return;
    }

    var range = "";
    if (years.length) {
      var first = Math.min.apply(null, years);
      var last = Math.max.apply(null, years);
      range = first === last ? String(first) : first + "–" + last;
    }

    refs.summaryDetail.textContent = photoCount(photos) + (range ? " · " + range : " · dates to be confirmed");
  }

  function bindImageFallback(container) {
    if (!container) return;
    container.addEventListener("error", function (event) {
      var image = event.target;
      if (!image || image.tagName !== "IMG") return;

      var preview = image.closest(".memory-preview__item");
      if (preview) {
        var previewFallback = preview.querySelector(".memory-preview__fallback");
        preview.classList.add("is-missing");
        image.hidden = true;
        if (previewFallback) previewFallback.hidden = false;
        return;
      }

      var photo = image.closest(".memory-modal__photo");
      if (photo) {
        var photoFallback = photo.querySelector(".memory-modal__photo-fallback");
        photo.classList.add("is-missing");
        image.hidden = true;
        if (photoFallback) photoFallback.hidden = false;
      }
    }, true);
  }

  function setupReveal() {
    var entries = Array.prototype.slice.call(timeline.querySelectorAll(".memory-entry"));
    if (revealObserver) {
      revealObserver.disconnect();
      revealObserver = null;
    }

    if (reduceMotion.matches || !("IntersectionObserver" in window) || !entries.length) {
      entries.forEach(function (entry) {
        entry.classList.add("is-revealed");
      });
      timeline.classList.remove("is-reveal-ready");
      return;
    }

    var viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    var reveal = new IntersectionObserver(function (observed, observer) {
      observed.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });

    entries.forEach(function (entry) {
      if (entry.getBoundingClientRect().top < viewportHeight * 0.92) {
        entry.classList.add("is-revealed");
      } else {
        reveal.observe(entry);
      }
    });

    revealObserver = reveal;
    timeline.classList.add("is-reveal-ready");
  }

  function setActiveYear(key) {
    if (activeYearKey === key) return;
    activeYearKey = key;

    var activeLink = null;
    if (refs.years) {
      refs.years.querySelectorAll("[data-year-link]").forEach(function (link) {
        var active = link.getAttribute("data-year-link") === key;
        link.classList.toggle("is-active", active);
        if (active) {
          link.setAttribute("aria-current", "true");
          activeLink = link;
        } else {
          link.removeAttribute("aria-current");
        }
      });
    }

    if (activeLink && refs.years.scrollWidth > refs.years.clientWidth) {
      var navBox = refs.years.getBoundingClientRect();
      var linkBox = activeLink.getBoundingClientRect();
      if (linkBox.left < navBox.left + 4 || linkBox.right > navBox.right - 4) {
        var target = refs.years.scrollLeft + (linkBox.left - navBox.left) - (navBox.width - linkBox.width) / 2;
        refs.years.scrollTo({
          left: Math.max(0, target),
          behavior: reduceMotion.matches ? "auto" : "smooth"
        });
      }
    }

    if (refs.positionYear) {
      refs.positionYear.textContent = key === "undated" ? "Undated" : key;
    }
  }

  function updateActiveYear() {
    if (!yearSections.length) return;

    var controlsBottom = refs.controls ? refs.controls.getBoundingClientRect().bottom : 120;
    var scrollMargin = parseFloat(window.getComputedStyle(yearSections[0]).scrollMarginTop) || 110;
    var threshold = Math.max(controlsBottom + 16, scrollMargin + 1);
    var current = yearSections[0];

    yearSections.forEach(function (section) {
      if (section.getBoundingClientRect().top <= threshold) current = section;
    });

    setActiveYear(current.getAttribute("data-year"));
  }

  function requestActiveYearUpdate() {
    if (scrollTicking) return;
    scrollTicking = true;
    window.requestAnimationFrame(function () {
      scrollTicking = false;
      updateActiveYear();
    });
  }

  function initTimeline() {
    bindImageFallback(timeline);
    bindImageFallback(refs.modalGrid);

    if (!memories.length) return;

    timeline.classList.remove("is-empty");
    if (refs.controls) refs.controls.classList.remove("is-empty");
    timeline.innerHTML = groups.map(renderYear).join("");
    renderYearNav();
    updateSummary();
    yearSections = Array.prototype.slice.call(timeline.querySelectorAll(".memory-year"));

    setupReveal();
    updateActiveYear();

    window.addEventListener("scroll", requestActiveYearUpdate, { passive: true });
    window.addEventListener("resize", requestActiveYearUpdate);

    if (refs.years) {
      refs.years.addEventListener("click", function (event) {
        var link = event.target.closest("[data-year-link]");
        if (!link) return;
        event.preventDefault();

        var target = document.getElementById(link.getAttribute("href").slice(1));
        if (!target) return;

        target.scrollIntoView({
          behavior: reduceMotion.matches ? "auto" : "smooth",
          block: "start"
        });

        var label = target.querySelector(".memory-year__label");
        if (label) {
          label.focus({ preventScroll: true });
        }
        setActiveYear(link.getAttribute("data-year-link"));
      });
    }

    if (refs.controls) {
      refs.controls.addEventListener("keydown", function (event) {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft" && event.key !== "Home" && event.key !== "End") return;
        var links = Array.prototype.slice.call(refs.years.querySelectorAll("[data-year-link]"));
        if (!links.length) return;
        var index = links.indexOf(document.activeElement);
        if (index < 0) return;
        event.preventDefault();
        if (event.key === "ArrowRight") index = (index + 1) % links.length;
        if (event.key === "ArrowLeft") index = (index - 1 + links.length) % links.length;
        if (event.key === "Home") index = 0;
        if (event.key === "End") index = links.length - 1;
        links[index].focus();
      });
    }

    timeline.addEventListener("click", function (event) {
      var trigger = event.target.closest("[data-memory-open]");
      if (!trigger) return;
      openMemory(Number(trigger.getAttribute("data-memory-open")), trigger);
    });
  }

  function getFocusable(container) {
    if (!container) return [];
    return Array.prototype.filter.call(
      container.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ),
      function (element) {
        return element.getClientRects().length > 0 && !element.closest("[inert]");
      }
    );
  }

  function lockPage() {
    var body = document.body;
    var html = document.documentElement;
    modalState.scrollY = window.pageYOffset;
    modalState.htmlOverflow = html.style.overflow;
    modalState.bodyStyles = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
      paddingRight: body.style.paddingRight
    };

    var scrollbar = Math.max(0, window.innerWidth - html.clientWidth);
    body.style.position = "fixed";
    body.style.top = -modalState.scrollY + "px";
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";
    if (scrollbar) body.style.paddingRight = scrollbar + "px";
    html.style.overflow = "hidden";
  }

  function unlockPage() {
    var body = document.body;
    var html = document.documentElement;
    var styles = modalState.bodyStyles;
    if (styles) {
      body.style.position = styles.position;
      body.style.top = styles.top;
      body.style.left = styles.left;
      body.style.right = styles.right;
      body.style.width = styles.width;
      body.style.overflow = styles.overflow;
      body.style.paddingRight = styles.paddingRight;
    }
    html.style.overflow = modalState.htmlOverflow;

    var previousBehavior = html.style.scrollBehavior;
    html.style.scrollBehavior = "auto";
    window.scrollTo(0, modalState.scrollY);
    html.style.scrollBehavior = previousBehavior;
    modalState.scrollY = 0;
    modalState.bodyStyles = null;
  }

  function setPageInert(inert) {
    if (inert) {
      modalState.inerted = Array.prototype.map.call(
        document.querySelectorAll(".skip-link, .topbar, .site-header, .nav-bar, .announcement, #main, .site-footer, .back-to-top"),
        function (element) {
          return {
            element: element,
            wasInert: element.inert,
            ariaHidden: element.getAttribute("aria-hidden")
          };
        }
      );
      modalState.inerted.forEach(function (item) {
        item.element.inert = true;
        item.element.setAttribute("aria-hidden", "true");
      });
      return;
    }

    modalState.inerted.forEach(function (item) {
      item.element.inert = item.wasInert;
      if (item.ariaHidden === null) item.element.removeAttribute("aria-hidden");
      else item.element.setAttribute("aria-hidden", item.ariaHidden);
    });
    modalState.inerted = [];
  }

  function populateModal(memory) {
    if (refs.modalKicker) {
      refs.modalKicker.textContent = memory.isSample ? "Sample memory collection" : "Memory collection";
    }
    refs.modalTitle.textContent = memory.title;
    refs.modalDate.textContent = memory.dateLabel;
    refs.modalCount.textContent = memory.photos.length ? photoCount(memory.photos.length) : "No photographs available";
    refs.modalDescription.textContent = memory.description;
    refs.modalDescription.hidden = !memory.description;

    if (memory.description) refs.dialog.setAttribute("aria-describedby", "memory-modal-description");
    else refs.dialog.removeAttribute("aria-describedby");

    refs.modalGrid.innerHTML = memory.photos.map(function (photo, index) {
      return (
        '<button class="memory-modal__photo" type="button" data-photo-index="' + index + '" ' +
        'aria-haspopup="dialog" aria-label="Open photograph ' + (index + 1) + " of " + memory.photos.length + ' in full size">' +
        '<span class="memory-modal__photo-frame">' +
        '<img src="' + escapeHTML(photo.src) + '" alt="" loading="lazy" decoding="async">' +
        '<span class="memory-modal__photo-zoom" aria-hidden="true">' + ICONS.expand + "</span>" +
        '<span class="memory-modal__photo-fallback" hidden>' + ICONS.image + "<span>Photograph unavailable</span></span>" +
        "</span>" +
        (photo.caption ? '<span class="memory-modal__photo-caption">' + escapeHTML(photo.caption) + "</span>" : "") +
        "</button>"
      );
    }).join("");

    refs.modalNoPhotos.hidden = memory.photos.length > 0;
    refs.modalGrid.hidden = memory.photos.length === 0;
  }

  function openMemory(index, trigger) {
    var memory = memories[index];
    if (!memory || !refs.modal || modalState.open) return;

    modalState.open = true;
    modalState.memory = memory;
    modalState.trigger = trigger;
    modalState.viewerOpen = false;

    populateModal(memory);
    refs.viewer.hidden = true;
    refs.dialog.inert = false;
    refs.modal.hidden = false;
    refs.modalScroll.scrollTop = 0;

    setPageInert(true);
    lockPage();
    document.addEventListener("keydown", onModalKeydown, true);

    window.requestAnimationFrame(function () {
      var autofocus = refs.modal.querySelector("[data-modal-autofocus]");
      if (autofocus) autofocus.focus({ preventScroll: true });
    });
  }

  function closeMemory() {
    if (!modalState.open) return;

    var trigger = modalState.trigger;
    modalState.open = false;
    modalState.viewerOpen = false;
    modalState.photoIndex = 0;
    refs.modal.hidden = true;
    refs.viewer.hidden = true;
    refs.dialog.inert = false;

    document.removeEventListener("keydown", onModalKeydown, true);
    setPageInert(false);
    unlockPage();

    refs.viewerImage.removeAttribute("src");
    refs.viewerImage.removeAttribute("alt");
    refs.viewerCaption.textContent = "";
    refs.viewerStatus.textContent = "";
    refs.modalGrid.innerHTML = "";

    modalState.memory = null;
    modalState.trigger = null;
    modalState.viewerTrigger = null;

    if (trigger) trigger.focus({ preventScroll: true });
  }

  function renderViewerPhoto() {
    if (!modalState.memory || !modalState.memory.photos.length) return;

    var photos = modalState.memory.photos;
    var total = photos.length;
    modalState.photoIndex = (modalState.photoIndex + total) % total;
    var photo = photos[modalState.photoIndex];

    refs.viewerImage.hidden = false;
    refs.viewerImage.alt = photo.alt;
    refs.viewerImage.src = photo.src;
    refs.viewerFallback.hidden = true;
    refs.viewerCaption.textContent = photo.caption;
    refs.viewerCaption.hidden = !photo.caption;
    var samplePrefix = modalState.memory.isSample ? "Sample · " : "";
    refs.viewerCounter.textContent = samplePrefix + (modalState.photoIndex + 1) + " of " + total;
    refs.viewerStatus.textContent = (modalState.memory.isSample ? "Sample photograph " : "Photograph ") +
      (modalState.photoIndex + 1) + " of " + total + ". " + photo.alt;

    var multiple = total > 1;
    refs.viewerPrev.hidden = !multiple;
    refs.viewerNext.hidden = !multiple;
  }

  function openViewer(index, trigger) {
    if (!modalState.memory || !modalState.memory.photos.length) return;

    modalState.viewerOpen = true;
    modalState.photoIndex = index;
    modalState.viewerTrigger = trigger;
    refs.dialog.inert = true;
    refs.viewer.hidden = false;
    renderViewerPhoto();

    window.requestAnimationFrame(function () {
      var close = refs.viewer.querySelector(".memory-viewer__close");
      if (close) close.focus({ preventScroll: true });
    });
  }

  function closeViewer() {
    if (!modalState.viewerOpen) return;

    var trigger = modalState.viewerTrigger;
    modalState.viewerOpen = false;
    refs.viewer.hidden = true;
    refs.dialog.inert = false;
    modalState.viewerTrigger = null;

    if (trigger) trigger.focus({ preventScroll: true });
  }

  function stepViewer(direction) {
    if (!modalState.viewerOpen || !modalState.memory || modalState.memory.photos.length < 2) return;
    modalState.photoIndex += direction;
    renderViewerPhoto();
  }

  function onModalKeydown(event) {
    if (!modalState.open) return;

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      if (modalState.viewerOpen) closeViewer();
      else closeMemory();
      return;
    }

    if (modalState.viewerOpen && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      event.preventDefault();
      stepViewer(event.key === "ArrowRight" ? 1 : -1);
      return;
    }

    if (event.key !== "Tab") return;

    var scope = modalState.viewerOpen ? refs.viewer : refs.dialog;
    var focusable = getFocusable(scope);
    if (!focusable.length) {
      event.preventDefault();
      if (scope && typeof scope.focus === "function") scope.focus();
      return;
    }

    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    var active = document.activeElement;

    if (event.shiftKey) {
      if (active === first || !scope.contains(active)) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last || !scope.contains(active)) {
      event.preventDefault();
      first.focus();
    }
  }

  function bindModal() {
    if (!refs.modal || !refs.dialog || !refs.viewer) return;

    refs.modal.addEventListener("click", function (event) {
      if (event.target.closest("[data-memory-close]")) closeMemory();
    });

    refs.modalGrid.addEventListener("click", function (event) {
      var button = event.target.closest("[data-photo-index]");
      if (!button) return;
      openViewer(Number(button.getAttribute("data-photo-index")), button);
    });

    refs.viewer.addEventListener("click", function (event) {
      if (event.target.closest("[data-viewer-close]")) closeViewer();
      if (event.target.closest("[data-viewer-prev]")) stepViewer(-1);
      if (event.target.closest("[data-viewer-next]")) stepViewer(1);
    });

    refs.viewerImage.addEventListener("error", function () {
      var photo = modalState.memory && modalState.memory.photos[modalState.photoIndex];
      if (!photo || refs.viewerImage.getAttribute("src") !== photo.src) return;
      refs.viewerImage.hidden = true;
      refs.viewerFallback.hidden = false;
    });

    var touchStartX = null;
    var touchStartY = null;

    refs.viewerStage.addEventListener("touchstart", function (event) {
      if (!modalState.viewerOpen || event.touches.length !== 1) return;
      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;
    }, { passive: true });

    refs.viewerStage.addEventListener("touchend", function (event) {
      if (touchStartX === null || !modalState.viewerOpen) return;
      var touch = event.changedTouches[0];
      var changeX = touchStartX - touch.clientX;
      var changeY = touchStartY - touch.clientY;
      touchStartX = null;
      touchStartY = null;
      if (Math.abs(changeX) < 42 || Math.abs(changeX) < Math.abs(changeY)) return;
      stepViewer(changeX > 0 ? 1 : -1);
    }, { passive: true });
  }

  bindModal();
  initTimeline();
})();
