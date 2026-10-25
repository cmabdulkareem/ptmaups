/* Gallery photograph picker for the PTMAUP School Content plugin. */
(function ($) {
    "use strict";

    $(function () {
        var $list = $("#ptmaup-photo-list");
        var $input = $("#ptmaup-photo-ids");
        if (!$list.length || !$input.length || typeof wp === "undefined" || !wp.media) {
            return;
        }

        var settings = window.ptmaupScAdmin || {};

        function getIds() {
            var value = $.trim($input.val());
            return value ? value.split(",").filter(Boolean) : [];
        }

        function updateEmpty() {
            if (getIds().length) {
                $list.find(".ptmaup-photo-empty").remove();
            } else if (!$list.find(".ptmaup-photo-empty").length) {
                $list.append($("<li>").addClass("ptmaup-photo-empty").text(settings.emptyLabel || ""));
            }
        }

        function setIds(ids) {
            $input.val(ids.join(","));
            updateEmpty();
        }

        function badge(label, type) {
            return $("<span>")
                .addClass("ptmaup-badge ptmaup-badge--" + type)
                .text(label);
        }

        function createItem(data) {
            var id = String(data.id);
            var title = data.title || data.filename || id;
            var url = data.sizes && data.sizes.thumbnail ? data.sizes.thumbnail.url : data.url;
            var alt = $.trim(data.alt || "");
            var consent = data.ptmaupConsent === true;
            var reference = $.trim(data.ptmaupConsentReference || "");
            var ready = true;

            var $item = $("<li>").addClass("ptmaup-photo").attr("data-id", id);
            $("<span>").addClass("ptmaup-photo-handle").attr("aria-hidden", "true").html("&#10303;").appendTo($item);

            var $thumb = $("<span>").addClass("ptmaup-photo-thumb").appendTo($item);
            if (url) {
                $("<img>").attr({ src: url, alt: "" }).appendTo($thumb);
            }

            var $info = $("<span>").addClass("ptmaup-photo-info").appendTo($item);
            $("<strong>").text(title).appendTo($info);

            if (alt.length < 8) {
                $info.append(badge(settings.missingAlt, "warning"));
                ready = false;
            }
            if (!consent) {
                $info.append(badge(settings.missingConsent, "warning"));
                ready = false;
            }
            if (!reference) {
                $info.append(badge(settings.missingReference, "warning"));
                ready = false;
            }
            if (ready) {
                $info.append(badge(settings.readyLabel, "ok"));
            } else {
                $info.append($("<span>").addClass("description").text(settings.reviewNote || ""));
            }

            if (data.editLink) {
                $("<a>")
                    .addClass("ptmaup-photo-edit")
                    .attr({ href: data.editLink, target: "_blank", rel: "noopener" })
                    .text(settings.editLabel)
                    .appendTo($info);
            }

            $("<button>")
                .attr("type", "button")
                .addClass("button-link ptmaup-photo-remove")
                .text(settings.removeLabel)
                .appendTo($item);

            return $item;
        }

        $("#ptmaup-select-photos").on("click", function (event) {
            event.preventDefault();
            var frame = wp.media({
                title: settings.frameTitle,
                button: { text: settings.frameButton },
                library: { type: "image" },
                multiple: true
            });
            frame.on("select", function () {
                var selection = frame.state().get("selection");
                var ids = getIds();
                selection.each(function (attachment) {
                    var id = String(attachment.get("id"));
                    if (ids.indexOf(id) !== -1) {
                        return;
                    }
                    $list.append(createItem(attachment.toJSON()));
                    ids.push(id);
                });
                setIds(ids);
            });
            frame.open();
        });

        $("#ptmaup-clear-photos").on("click", function (event) {
            event.preventDefault();
            if (!getIds().length) {
                return;
            }
            if (window.confirm(settings.confirmClear || "")) {
                $list.find(".ptmaup-photo").remove();
                setIds([]);
            }
        });

        $list.on("click", ".ptmaup-photo-remove", function (event) {
            event.preventDefault();
            var $item = $(this).closest(".ptmaup-photo");
            var id = String($item.attr("data-id"));
            $item.remove();
            setIds(getIds().filter(function (candidate) {
                return candidate !== id;
            }));
        });

        if ($.fn.sortable) {
            $list.sortable({
                items: "> li.ptmaup-photo",
                handle: ".ptmaup-photo-handle",
                axis: "y",
                update: function () {
                    setIds($list.children(".ptmaup-photo").map(function () {
                        return String($(this).attr("data-id"));
                    }).get());
                }
            });
        }

        updateEmpty();
    });
})(jQuery);
