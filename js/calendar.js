/* Interactive monthly academic calendar with sample event data. */

(function () {
  "use strict";

  var data = window.SCHOOL_DATA && window.SCHOOL_DATA.calendarEvents;
  var grid = document.getElementById("calendar-grid");
  if (!data || !grid || !window.PTM) return;

  var monthNode = document.getElementById("calendar-month");
  var selectedLabel = document.getElementById("calendar-selected-label");
  var detailBody = document.getElementById("calendar-day-events");
  var listNode = document.getElementById("calendar-list-items");
  var prevButton = document.getElementById("calendar-prev");
  var nextButton = document.getElementById("calendar-next");
  var todayButton = document.getElementById("calendar-today");
  var months = window.SCHOOL_DATA.months;

  var today = new Date();
  today.setHours(0, 0, 0, 0);
  var todayKey = toKey(today);
  var view = new Date(today.getFullYear(), today.getMonth(), 1);
  var selectedKey = todayKey;

  function toKey(date) {
    return (
      date.getFullYear() + "-" +
      String(date.getMonth() + 1).padStart(2, "0") + "-" +
      String(date.getDate()).padStart(2, "0")
    );
  }

  function fromKey(key) {
    var parts = key.split("-");
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }

  function eventsOn(key) {
    return data.filter(function (event) {
      return event.date === key;
    });
  }

  function eventsInView() {
    return data
      .filter(function (event) {
        var date = fromKey(event.date);
        return date.getFullYear() === view.getFullYear() && date.getMonth() === view.getMonth();
      })
      .sort(function (a, b) {
        return fromKey(a.date) - fromKey(b.date);
      });
  }

  function longDate(key) {
    return fromKey(key).toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }

  function renderGrid() {
    var year = view.getFullYear();
    var month = view.getMonth();
    var first = new Date(year, month, 1);
    var start = new Date(year, month, 1 - first.getDay());
    var cells = "";
    var selectedDate = fromKey(selectedKey);

    for (var index = 0; index < 42; index += 1) {
      var date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
      var key = toKey(date);
      var dayEvents = eventsOn(key);
      var isOutside = date.getMonth() !== month;
      var isToday = key === todayKey;
      var isSelected = key === selectedKey;
      var classes = "calendar__day";
      if (isOutside) classes += " calendar__day--outside";
      if (isToday) classes += " calendar__day--today";
      if (isSelected) classes += " calendar__day--selected";
      if (dayEvents.length) classes += " calendar__day--has-event";

      var label = date.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      });
      if (dayEvents.length) {
        label += ", " + dayEvents.length + " sample " + (dayEvents.length === 1 ? "entry" : "entries");
      }

      var dots = dayEvents
        .slice(0, 3)
        .map(function () {
          return '<span class="calendar__dot calendar__dot--sample"></span>';
        })
        .join("");

      cells +=
        '<button type="button" class="' + classes + '" data-date="' + key + '" tabindex="' +
        (isSelected ? "0" : "-1") + '" aria-label="' + label + '"' +
        (isSelected ? ' aria-current="date"' : "") + ">" +
        '<span class="calendar__day-num">' + date.getDate() + "</span>" +
        (dots ? '<span class="calendar__dots" aria-hidden="true">' + dots + "</span>" : "") +
        "</button>";
    }

    grid.innerHTML = cells;

    if (monthNode) {
      monthNode.textContent = months[view.getMonth()] + " " + view.getFullYear();
    }

    if (selectedLabel) selectedLabel.textContent = longDate(selectedKey);
    renderDetail();

    if (selectedDate.getMonth() !== month || selectedDate.getFullYear() !== year) {
      selectedKey = toKey(new Date(year, month, 1));
      if (selectedLabel) selectedLabel.textContent = longDate(selectedKey);
      renderDetail();
      var firstButton = grid.querySelector('[data-date="' + selectedKey + '"]');
      if (firstButton) {
        grid.querySelectorAll(".calendar__day").forEach(function (day) {
          day.setAttribute("tabindex", "-1");
          day.removeAttribute("aria-current");
        });
        firstButton.setAttribute("tabindex", "0");
        firstButton.setAttribute("aria-current", "date");
        firstButton.classList.add("calendar__day--selected");
      }
    }
  }

  function renderDetail() {
    if (!detailBody) return;
    var events = eventsOn(selectedKey);
    var escape = window.PTM.escapeHTML;

    if (!events.length) {
      detailBody.innerHTML =
        '<p>No events scheduled for this date.</p>' +
        '<p class="muted">This calendar currently shows demonstration entries only. Official holidays and academic dates will be published by the school.</p>';
      return;
    }

    detailBody.innerHTML = events
      .map(function (event) {
        return (
          '<div class="calendar-event">' +
          '<span class="tag tag--sample">Sample</span>' +
          "<h3>" + escape(event.title) + "</h3>" +
          "<p>" + escape(event.description) + "</p>" +
          "</div>"
        );
      })
      .join("");
  }

  function renderList() {
    if (!listNode) return;
    var events = eventsInView();
    var escape = window.PTM.escapeHTML;

    if (!events.length) {
      listNode.innerHTML =
        '<li><span class="muted">No events are listed for this month. Demonstration entries are available in other months.</span></li>';
      return;
    }

    listNode.innerHTML = events
      .map(function (event) {
        return (
          "<li>" +
          '<span class="calendar-list__date">' + escape(window.PTM.formatDate(event.date)) + "</span>" +
          "<span>" + escape(event.title) + "</span>" +
          '<span class="tag tag--sample">Sample</span>' +
          "</li>"
        );
      })
      .join("");
  }

  function refresh() {
    renderGrid();
    renderList();
  }

  function selectDate(key, shouldFocus) {
    selectedKey = key;
    var date = fromKey(key);
    if (date.getMonth() !== view.getMonth() || date.getFullYear() !== view.getFullYear()) {
      view = new Date(date.getFullYear(), date.getMonth(), 1);
    }
    refresh();
    if (shouldFocus) {
      var button = grid.querySelector('[data-date="' + key + '"]');
      if (button) button.focus({ preventScroll: true });
    }
  }

  grid.addEventListener("click", function (event) {
    var day = event.target.closest(".calendar__day");
    if (!day) return;
    selectDate(day.getAttribute("data-date"), true);
  });

  grid.addEventListener("focusin", function (event) {
    var day = event.target.closest(".calendar__day");
    if (!day) return;
    grid.querySelectorAll(".calendar__day").forEach(function (item) {
      item.setAttribute("tabindex", "-1");
    });
    day.setAttribute("tabindex", "0");
  });

  grid.addEventListener("keydown", function (event) {
    var day = event.target.closest(".calendar__day");
    if (!day) return;
    var days = Array.prototype.slice.call(grid.querySelectorAll(".calendar__day"));
    var index = days.indexOf(day);
    var nextIndex = null;

    if (event.key === "ArrowLeft") nextIndex = index - 1;
    if (event.key === "ArrowRight") nextIndex = index + 1;
    if (event.key === "ArrowUp") nextIndex = index - 7;
    if (event.key === "ArrowDown") nextIndex = index + 7;
    if (event.key === "Home") nextIndex = index - (index % 7);
    if (event.key === "End") nextIndex = index + (6 - (index % 7));

    if (nextIndex === null || nextIndex < 0 || nextIndex >= days.length) return;
    event.preventDefault();
    days[nextIndex].focus();
  });

  if (prevButton) {
    prevButton.addEventListener("click", function () {
      view = new Date(view.getFullYear(), view.getMonth() - 1, 1);
      selectedKey = toKey(view);
      refresh();
    });
  }

  if (nextButton) {
    nextButton.addEventListener("click", function () {
      view = new Date(view.getFullYear(), view.getMonth() + 1, 1);
      selectedKey = toKey(view);
      refresh();
    });
  }

  if (todayButton) {
    todayButton.addEventListener("click", function () {
      view = new Date(today.getFullYear(), today.getMonth(), 1);
      selectedKey = todayKey;
      refresh();
    });
  }

  refresh();
})();
