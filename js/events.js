/* News and events: working category filters, event detail modal and archive. */

(function () {
  "use strict";

  var data = window.SCHOOL_DATA && window.SCHOOL_DATA.events;
  var grid = document.getElementById("event-grid");
  if (!data || !grid || !window.PTM) return;

  var filterGroup = document.getElementById("event-filters");
  var countNode = document.getElementById("event-count");
  var emptyState = document.getElementById("event-empty");
  var emptyTitle = emptyState ? emptyState.querySelector("h3") : null;
  var emptyText = emptyState ? emptyState.querySelector("p") : null;
  var modal = document.getElementById("event-modal");
  var pastList = document.getElementById("past-events");
  var state = { category: "All" };

  function parseDate(isoString) {
    var parts = isoString.split("-");
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }

  function cardDate(isoString) {
    var date = parseDate(isoString);
    return {
      day: date.getDate(),
      month: date.toLocaleDateString("en-GB", { month: "short" })
    };
  }

  function render() {
    var escape = window.PTM.escapeHTML;
    var upcoming = data
      .filter(function (event) {
        return !event.past;
      })
      .filter(function (event) {
        return state.category === "All" || event.category === state.category;
      })
      .sort(function (a, b) {
        return parseDate(a.date) - parseDate(b.date);
      });

    grid.innerHTML = upcoming
      .map(function (event) {
        var date = cardDate(event.date);
        return (
          '<article class="event-card">' +
          '<div class="event-card__head">' +
          '<div class="event-card__date">' +
          '<span class="event-card__day">' + date.day + "</span>" +
          '<span class="event-card__month">' + escape(date.month) + "</span>" +
          "</div>" +
          (event.isSample ? '<span class="tag tag--sample">Sample</span>' : "") +
          "</div>" +
          '<div class="event-card__body">' +
          '<span class="tag">' + escape(event.category) + "</span>" +
          "<h3>" + escape(event.title) + "</h3>" +
          "<p>" + escape(event.excerpt) + "</p>" +
          '<div class="event-card__foot">' +
          '<span class="muted">' + escape(window.PTM.formatDate(event.date)) + "</span>" +
          '<button type="button" class="btn-link js-event-open" data-event-id="' + escape(event.id) + '">Read details' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          "</button>" +
          "</div>" +
          "</div>" +
          "</article>"
        );
      })
      .join("");

    grid.hidden = upcoming.length === 0;
    if (emptyState) emptyState.hidden = upcoming.length !== 0;
    if (emptyTitle && emptyText) {
      var hasUpcoming = data.some(function (event) {
        return !event.past;
      });
      emptyTitle.textContent = hasUpcoming ? "No events in this category" : "No upcoming events";
      emptyText.textContent = hasUpcoming
        ? "Try another category, or check back when new events are published."
        : "New events will appear here once the school office publishes them.";
    }
    if (countNode) {
      var scope = state.category === "All" ? "" : " in " + state.category;
      countNode.textContent = upcoming.length
        ? "Showing " + upcoming.length + " upcoming " + (upcoming.length === 1 ? "event" : "events") + scope
        : "No upcoming events" + scope;
    }

    grid.querySelectorAll(".js-event-open").forEach(function (button) {
      button.addEventListener("click", function () {
        openEvent(button.getAttribute("data-event-id"));
      });
    });
  }

  function openEvent(id) {
    var event = data.filter(function (item) {
      return item.id === id;
    })[0];
    if (!event || !modal) return;

    var escape = window.PTM.escapeHTML;
    var tagNode = document.getElementById("event-modal-tag");
    var titleNode = document.getElementById("event-modal-title");
    var metaNode = document.getElementById("event-modal-meta");
    var bodyNode = document.getElementById("event-modal-body");

    if (tagNode) tagNode.textContent = event.category;
    if (titleNode) titleNode.textContent = event.title;
    if (metaNode) {
      metaNode.innerHTML =
        '<span><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M8 3v4M16 3v4M3 10h18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>' +
        escape(window.PTM.formatDate(event.date)) +
        "</span>" +
        (event.isSample ? '<span class="tag tag--sample">Sample record</span>' : "");
    }
    if (bodyNode) {
      bodyNode.innerHTML =
        (event.body || [])
          .map(function (paragraph) {
            return "<p>" + escape(paragraph) + "</p>";
          })
          .join("") +
        (event.isSample
          ? '<p class="muted">This demonstration record is not an official school announcement.</p>'
          : "");
    }

    window.PTM.openDialog(modal);
  }

  if (filterGroup) {
    filterGroup.querySelectorAll("[data-category]").forEach(function (button) {
      button.addEventListener("click", function () {
        state.category = button.getAttribute("data-category");
        filterGroup.querySelectorAll("[data-category]").forEach(function (item) {
          var active = item === button;
          item.classList.toggle("is-active", active);
          item.setAttribute("aria-pressed", String(active));
        });
        render();
      });
    });
  }

  if (modal) {
    modal.querySelectorAll("[data-modal-close]").forEach(function (button) {
      button.addEventListener("click", function () {
        window.PTM.closeDialog();
      });
    });
  }

  if (pastList) {
    var escapePast = window.PTM.escapeHTML;
    var pastEvents = data
      .filter(function (event) {
        return event.past;
      })
      .sort(function (a, b) {
        return parseDate(b.date) - parseDate(a.date);
      });

    pastList.innerHTML = pastEvents.length
      ? pastEvents.map(function (event) {
          return (
            "<li>" +
            '<span class="calendar-list__date">' + escapePast(window.PTM.formatDate(event.date)) + "</span>" +
            "<span>" + escapePast(event.title) + "</span>" +
            (event.isSample
              ? '<span class="tag tag--sample">Sample</span>'
              : '<span class="tag">' + escapePast(event.category) + "</span>") +
            "</li>"
          );
        }).join("")
      : '<li><span class="muted">No past events are listed.</span></li>';
  }

  render();
})();
