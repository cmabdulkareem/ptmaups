/* School notice board: search, category filter, sort and read-more. */

(function () {
  "use strict";

  var data = window.SCHOOL_DATA && window.SCHOOL_DATA.notices;
  var list = document.getElementById("notice-list");
  if (!data || !list || !window.PTM) return;

  var searchInput = document.getElementById("notice-search");
  var sortSelect = document.getElementById("notice-sort");
  var filterGroup = document.getElementById("notice-filters");
  var countNode = document.getElementById("notice-count");
  var emptyState = document.getElementById("notice-empty");

  var state = {
    query: "",
    category: "All",
    sort: "newest"
  };

  var categories = ["All"].concat(
    data.reduce(function (result, notice) {
      if (result.indexOf(notice.category) === -1) result.push(notice.category);
      return result;
    }, [])
  );

  function dateParts(isoString) {
    var parts = isoString.split("-");
    var date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return {
      day: date.getDate(),
      month: date.toLocaleDateString("en-GB", { month: "short" }),
      year: date.getFullYear(),
      time: date.getTime()
    };
  }

  function buildFilters() {
    if (!filterGroup) return;
    filterGroup.innerHTML = "";
    categories.forEach(function (category) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "notice-filter" + (category === state.category ? " is-active" : "");
      button.textContent = category;
      button.setAttribute("aria-pressed", String(category === state.category));
      button.addEventListener("click", function () {
        state.category = category;
        filterGroup.querySelectorAll(".notice-filter").forEach(function (item) {
          var active = item === button;
          item.classList.toggle("is-active", active);
          item.setAttribute("aria-pressed", String(active));
        });
        render();
      });
      filterGroup.appendChild(button);
    });
  }

  function matches(notice) {
    if (state.category !== "All" && notice.category !== state.category) return false;
    if (!state.query) return true;
    var haystack = [notice.title, notice.excerpt, notice.category]
      .concat(notice.body || [])
      .join(" ")
      .toLowerCase();
    return haystack.indexOf(state.query) !== -1;
  }

  function render() {
    var filtered = data.filter(matches).sort(function (a, b) {
      var difference = dateParts(a.date).time - dateParts(b.date).time;
      return state.sort === "newest" ? -difference : difference;
    });

    var escape = window.PTM.escapeHTML;
    var fragment = "";

    filtered.forEach(function (notice) {
      var date = dateParts(notice.date);
      var moreId = "notice-more-" + notice.id;
      var bodyHtml = (notice.body || [])
        .map(function (paragraph) {
          return "<p>" + escape(paragraph) + "</p>";
        })
        .join("");

      fragment +=
        '<li class="notice-row">' +
        '<div class="notice-row__date" aria-hidden="true">' +
        '<span class="notice-row__day">' + date.day + "</span>" +
        '<span class="notice-row__month">' + escape(date.month) + " " + date.year + "</span>" +
        "</div>" +
        '<div class="notice-row__body">' +
        '<div class="notice-row__meta">' +
        '<span class="tag">' + escape(notice.category) + "</span>" +
        (notice.isSample ? '<span class="tag tag--sample">Sample</span>' : "") +
        "<span>Published " + escape(window.PTM.formatDate(notice.date)) + "</span>" +
        "</div>" +
        "<h3><button type=\"button\" class=\"js-notice-toggle\" aria-expanded=\"false\" aria-controls=\"" + moreId + "\">" +
        escape(notice.title) +
        "</button></h3>" +
        '<p class="notice-row__text">' + escape(notice.excerpt) + "</p>" +
        '<div class="notice-row__more" id="' + moreId + '" hidden>' + bodyHtml + "</div>" +
        '<button type="button" class="btn-link notice-row__more-btn js-notice-toggle" aria-expanded="false" aria-controls="' + moreId + '">' +
        "Read more" +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        "</button>" +
        "</div>" +
        "</li>";
    });

    list.innerHTML = fragment;
    list.hidden = filtered.length === 0;
    if (emptyState) emptyState.hidden = filtered.length !== 0;

    if (countNode) {
      countNode.textContent = "Showing " + filtered.length + " of " + data.length + " notices";
    }

    list.querySelectorAll(".js-notice-toggle").forEach(function (button) {
      var row = button.closest(".notice-row");
      var isTitle = button.tagName === "BUTTON" && button.parentElement.tagName === "H3";
      button.addEventListener("click", function () {
        var panel = document.getElementById(button.getAttribute("aria-controls"));
        if (!panel) return;
        var willOpen = panel.hidden;
        panel.hidden = !willOpen;
        var toggles = row ? row.querySelectorAll(".js-notice-toggle") : [];
        toggles.forEach(function (toggle) {
          toggle.setAttribute("aria-expanded", String(willOpen));
          if (toggle.classList.contains("notice-row__more-btn")) {
            toggle.firstChild.nodeValue = willOpen ? "Read less" : "Read more";
          }
        });
        if (willOpen && isTitle) {
          panel.setAttribute("tabindex", "-1");
        }
      });
    });
  }

  buildFilters();

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      state.query = searchInput.value.trim().toLowerCase();
      render();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", function () {
      state.sort = sortSelect.value;
      render();
    });
  }

  render();
})();
