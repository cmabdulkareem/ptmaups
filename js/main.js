/* Shared site behaviour: navigation, announcement bar, dialogs, utilities. */

(function () {
  "use strict";

  var doc = document;
  var body = doc.body;

  /* ---------- Active navigation ---------- */

  var page = body.getAttribute("data-page") || "home";
  var parentMap = {
    home: "home",
    about: "about",
    privacy: "about",
    academics: "academics",
    "school-calendar": "academics",
    facilities: "facilities",
    activities: "activities",
    events: "news",
    notices: "news",
    gallery: "gallery",
    admissions: "admissions",
    contact: "contact",
    "404": ""
  };
  var activeKey = parentMap[page] || "";
  var currentFile = window.location.pathname.split("/").pop() || "index.html";

  if (activeKey) {
    doc.querySelectorAll("[data-nav]").forEach(function (item) {
      if (item.getAttribute("data-nav") !== activeKey) return;
      item.classList.add("is-active");
      if (item.tagName === "A") {
        item.setAttribute("aria-current", "page");
      }
    });
  }

  doc.querySelectorAll(".primary-nav a").forEach(function (link) {
    var href = (link.getAttribute("href") || "").split("#")[0];
    if (href && href === currentFile) {
      link.setAttribute("aria-current", "page");
    }
  });

  /* ---------- Mobile navigation ---------- */

  var navToggle = doc.querySelector(".nav-toggle");
  var navBar = doc.querySelector(".nav-bar");

  function closeMobileNav(returnFocus) {
    if (!navBar || !navBar.classList.contains("is-open")) return;
    navBar.classList.remove("is-open");
    if (navToggle) {
      navToggle.setAttribute("aria-expanded", "false");
      navToggle.setAttribute("aria-label", "Open menu");
      if (returnFocus) navToggle.focus();
    }
  }

  if (navToggle && navBar) {
    navToggle.addEventListener("click", function () {
      var open = navBar.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(open));
      navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      if (!open) closeAllDropdowns();
    });

    var desktopQuery = window.matchMedia("(min-width: 1024px)");
    var handleBroaden = function (event) {
      if (event.matches) closeMobileNav(false);
    };
    if (desktopQuery.addEventListener) {
      desktopQuery.addEventListener("change", handleBroaden);
    } else {
      desktopQuery.addListener(handleBroaden);
    }
  }

  /* ---------- Dropdown menus ---------- */

  var dropdowns = Array.prototype.slice.call(doc.querySelectorAll(".has-dropdown"));
  var hoverMedia = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 1024px)");

  function setDropdown(item, open) {
    var button = item.querySelector(".nav-link--toggle");
    item.classList.toggle("is-open", open);
    if (button) button.setAttribute("aria-expanded", String(open));
  }

  function closeAllDropdowns(except) {
    dropdowns.forEach(function (item) {
      if (item !== except) setDropdown(item, false);
    });
  }

  dropdowns.forEach(function (item) {
    var button = item.querySelector(".nav-link--toggle");
    if (!button) return;

    button.addEventListener("click", function (event) {
      event.stopPropagation();
      var willOpen = !item.classList.contains("is-open");
      closeAllDropdowns(item);
      setDropdown(item, willOpen);
    });

    item.addEventListener("mouseenter", function () {
      if (hoverMedia.matches) setDropdown(item, true);
    });

    item.addEventListener("mouseleave", function () {
      if (hoverMedia.matches) setDropdown(item, false);
    });

    item.addEventListener("focusout", function (event) {
      if (!item.contains(event.relatedTarget)) setDropdown(item, false);
    });
  });

  doc.addEventListener("click", function (event) {
    if (!event.target.closest(".has-dropdown")) closeAllDropdowns();
  });

  doc.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    var openDropdown = dropdowns.filter(function (item) {
      return item.classList.contains("is-open");
    }).pop();
    if (openDropdown) {
      var button = openDropdown.querySelector(".nav-link--toggle");
      setDropdown(openDropdown, false);
      if (button && openDropdown.contains(doc.activeElement)) button.focus();
      return;
    }
    closeMobileNav(true);
  });

  /* ---------- Announcement bar ---------- */

  var announcement = doc.getElementById("announcement");
  if (announcement && window.SCHOOL_DATA && window.SCHOOL_DATA.announcement) {
    var announcementData = window.SCHOOL_DATA.announcement;
    var announcementText = doc.getElementById("announcement-text");
    var announcementClose = announcement.querySelector(".announcement__close");
    var storageKey = "ptm-aup-announcement";
    var token = announcementData.message + "|" + (announcementData.updated || "");
    var dismissed = null;

    try {
      dismissed = window.localStorage.getItem(storageKey);
    } catch (error) {
      dismissed = null;
    }

    if (announcementText) announcementText.textContent = announcementData.message;
    announcement.hidden = dismissed === token;

    if (announcementClose) {
      announcementClose.addEventListener("click", function () {
        announcement.hidden = true;
        try {
          window.localStorage.setItem(storageKey, token);
        } catch (error) {
          return;
        }
      });
    }
  }

  /* ---------- Current year ---------- */

  doc.querySelectorAll("[data-current-year]").forEach(function (node) {
    node.textContent = String(new Date().getFullYear());
  });

  /* ---------- Back to top ---------- */

  var backToTop = doc.getElementById("back-to-top");
  if (backToTop) {
    var updateBackToTop = function () {
      backToTop.classList.toggle("is-visible", window.scrollY > 600);
    };
    window.addEventListener("scroll", updateBackToTop, { passive: true });
    updateBackToTop();

    backToTop.addEventListener("click", function () {
      var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      var main = doc.getElementById("main");
      if (main) main.focus({ preventScroll: true });
    });
  }

  /* ---------- Accessible dialogs (modal / lightbox) ---------- */

  var activeDialog = null;
  var dialogTrigger = null;

  function focusableElements(container) {
    return Array.prototype.filter.call(
      container.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ),
      function (element) {
        return element.offsetWidth > 0 || element.offsetHeight > 0 || element === doc.activeElement;
      }
    );
  }

  function onDialogKeydown(event) {
    if (!activeDialog) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeDialog();
      return;
    }
    if (event.key !== "Tab") return;
    var focusable = focusableElements(activeDialog);
    if (!focusable.length) {
      event.preventDefault();
      activeDialog.focus();
      return;
    }
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && doc.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && doc.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function openDialog(dialog) {
    if (!dialog || activeDialog) return;
    dialogTrigger = doc.activeElement;
    activeDialog = dialog;
    dialog.hidden = false;
    body.classList.add("modal-open");
    doc.addEventListener("keydown", onDialogKeydown);
    var initial =
      dialog.querySelector("[data-autofocus]") ||
      dialog.querySelector(".modal__close, .lightbox__close") ||
      focusableElements(dialog)[0] ||
      dialog;
    window.setTimeout(function () {
      initial.focus();
    }, 0);
  }

  function closeDialog() {
    if (!activeDialog) return;
    activeDialog.hidden = true;
    body.classList.remove("modal-open");
    doc.removeEventListener("keydown", onDialogKeydown);
    if (dialogTrigger && typeof dialogTrigger.focus === "function") dialogTrigger.focus();
    activeDialog = null;
    dialogTrigger = null;
  }

  window.PTM = {
    openDialog: openDialog,
    closeDialog: closeDialog,
    escapeHTML: function (value) {
      return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    },
    formatDate: function (isoString) {
      var parts = isoString.split("-");
      var date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    }
  };

  /* ---------- Homepage previews from central data ---------- */

  function shortMonth(isoString) {
    var parts = isoString.split("-");
    var date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return {
      day: date.getDate(),
      month: date.toLocaleDateString("en-GB", { month: "short" }),
      time: date.getTime()
    };
  }

  var homeNotices = doc.getElementById("home-notices");
  if (homeNotices && window.SCHOOL_DATA && window.SCHOOL_DATA.notices && window.PTM) {
    var escapeHome = window.PTM.escapeHTML;
    var notices = window.SCHOOL_DATA.notices
      .slice()
      .sort(function (a, b) {
        return b.date.localeCompare(a.date);
      })
      .slice(0, 3);

    if (!notices.length) {
      homeNotices.innerHTML = '<li class="list-empty">No notices have been published yet.</li>';
    } else {
      homeNotices.innerHTML = notices
        .map(function (notice) {
          var date = shortMonth(notice.date);
          return (
            '<li class="notice-preview">' +
            '<div class="notice-preview__date" aria-hidden="true">' +
            '<span class="notice-preview__day">' + date.day + "</span>" +
            '<span class="notice-preview__month">' + escapeHome(date.month) + "</span>" +
            "</div>" +
            '<div class="notice-preview__body">' +
            '<div class="notice-preview__meta">' +
            '<span class="tag">' + escapeHome(notice.category) + "</span>" +
            (notice.isSample ? '<span class="tag tag--sample">Sample</span>' : "") +
            "<span>" + escapeHome(window.PTM.formatDate(notice.date)) + "</span>" +
            "</div>" +
            '<a href="notices.html">' + escapeHome(notice.title) + "</a>" +
            '<p class="notice-preview__excerpt">' + escapeHome(notice.excerpt) + "</p>" +
            "</div>" +
            "</li>"
          );
        })
        .join("");
    }
  }

  var homeEvents = doc.getElementById("home-events");
  if (homeEvents && window.SCHOOL_DATA && window.SCHOOL_DATA.events && window.PTM) {
    var escapeEvents = window.PTM.escapeHTML;
    var upcomingEvents = window.SCHOOL_DATA.events
      .filter(function (event) {
        return !event.past;
      })
      .slice()
      .sort(function (a, b) {
        return a.date.localeCompare(b.date);
      })
      .slice(0, 3);

    if (!upcomingEvents.length) {
      homeEvents.innerHTML = '<li class="list-empty">No upcoming events have been published yet.</li>';
    } else {
      homeEvents.innerHTML = upcomingEvents
        .map(function (event) {
          var date = shortMonth(event.date);
          return (
            '<li class="event-mini">' +
            '<div class="event-mini__date" aria-hidden="true">' +
            '<span class="event-mini__day">' + date.day + "</span>" +
            '<span class="event-mini__month">' + escapeEvents(date.month) + "</span>" +
            "</div>" +
            "<div>" +
            '<div class="event-mini__meta">' +
            '<span class="tag">' + escapeEvents(event.category) + "</span>" +
            (event.isSample ? '<span class="tag tag--sample">Sample</span>' : "") +
            "</div>" +
            '<h4><a href="events.html">' + escapeEvents(event.title) + "</a></h4>" +
            "<p>" + escapeEvents(window.PTM.formatDate(event.date)) + "</p>" +
            "</div>" +
            "</li>"
          );
        })
        .join("");
    }
  }

  /* ---------- FAQ rendering from central data ---------- */

  var faqList = doc.getElementById("faq-list");
  if (faqList && window.SCHOOL_DATA && window.SCHOOL_DATA.faqs && window.PTM) {
    var escapeFaq = window.PTM.escapeHTML;
    faqList.innerHTML = window.SCHOOL_DATA.faqs
      .map(function (faq, index) {
        var panelId = "faq-panel-" + index;
        var buttonId = "faq-button-" + index;
        return (
          '<div class="faq-item">' +
          "<h3><button type=\"button\" class=\"faq-question\" id=\"" + buttonId +
          '" aria-expanded="false" aria-controls="' + panelId + '">' +
          escapeFaq(faq.question) +
          '<span class="faq-question__icon" aria-hidden="true"></span></button></h3>' +
          '<div class="faq-answer" id="' + panelId + '" role="region" aria-labelledby="' + buttonId + '" hidden>' +
          "<p>" + escapeFaq(faq.answer) + "</p></div>" +
          "</div>"
        );
      })
      .join("");
  }

  /* ---------- FAQ accordions ---------- */

  doc.querySelectorAll("[data-accordion]").forEach(function (accordion) {
    var buttons = Array.prototype.slice.call(accordion.querySelectorAll(".faq-question"));

    buttons.forEach(function (button, index) {
      var panel = doc.getElementById(button.getAttribute("aria-controls"));
      if (!panel) return;

      button.addEventListener("click", function () {
        var isOpen = button.getAttribute("aria-expanded") === "true";
        buttons.forEach(function (other) {
          var otherPanel = doc.getElementById(other.getAttribute("aria-controls"));
          other.setAttribute("aria-expanded", "false");
          if (otherPanel) otherPanel.hidden = true;
        });
        if (!isOpen) {
          button.setAttribute("aria-expanded", "true");
          panel.hidden = false;
        }
      });

      button.addEventListener("keydown", function (event) {
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Home" && event.key !== "End") return;
        event.preventDefault();
        var nextIndex = index;
        if (event.key === "ArrowDown") nextIndex = (index + 1) % buttons.length;
        if (event.key === "ArrowUp") nextIndex = (index - 1 + buttons.length) % buttons.length;
        if (event.key === "Home") nextIndex = 0;
        if (event.key === "End") nextIndex = buttons.length - 1;
        buttons[nextIndex].focus();
      });
    });
  });
  /* ---------- Scroll reveal ---------- */

  var motionSelector = [
    ".section-head",
    ".quick-card",
    ".info-tile",
    ".subject-card",
    ".facility-card",
    ".activity-card",
    ".life-card",
    ".life-band__intro",
    ".event-card",
    ".event-mini",
    ".notice-preview",
    ".notice-row",
    ".contact-card",
    ".principal",
    ".metric",
    ".academic-panel",
    ".plain-col",
    ".about-panel",
    ".quote-panel",
    ".panel--link",
    ".about-preview",
    ".at-a-glance",
    ".map-placeholder",
    ".form-shell",
    ".calendar-layout",
    ".purpose-list li",
    ".mission-list li",
    ".faq-item",
    ".memory-intro",
    ".memory-summary",
    ".memory-empty"
  ].join(",");

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (!reduceMotion.matches && "IntersectionObserver" in window) {
    var motionObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var item = entry.target;
          motionObserver.unobserve(item);
          item.classList.add("is-in");
          item.addEventListener("transitionend", function done(event) {
            if (event.target !== item || event.propertyName !== "transform") return;
            item.removeEventListener("transitionend", done);
            item.classList.remove("motion-item", "is-in");
          });
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );

    var motionGroups = new WeakMap();

    var watchMotion = function (item) {
      if (item.classList.contains("motion-item")) return;
      if (item.closest(".modal, .memory-modal, .memory-viewer, [aria-modal='true'], .page-hero")) return;
      var parent = item.parentElement;
      var index = motionGroups.get(parent) || 0;
      motionGroups.set(parent, index + 1);
      if (index > 0) {
        item.style.setProperty("--motion-delay", Math.min(index, 4) * 70 + "ms");
      }
      item.classList.add("motion-item");
      motionObserver.observe(item);
    };

    Array.prototype.forEach.call(doc.querySelectorAll(motionSelector), watchMotion);

    if ("MutationObserver" in window) {
      new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
          Array.prototype.forEach.call(mutation.addedNodes, function (node) {
            if (node.nodeType !== 1) return;
            if (node.matches(motionSelector)) watchMotion(node);
            Array.prototype.forEach.call(node.querySelectorAll(motionSelector), watchMotion);
          });
        });
      }).observe(body, { childList: true, subtree: true });
    }
  }
})();
