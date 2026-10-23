/* Frontend-only enquiry forms with accessible validation. */

(function () {
  "use strict";

  var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var forms = Array.prototype.slice.call(document.querySelectorAll("form[data-demo-form]"));

  function normalisePhone(value) {
    var digits = value.replace(/[^\d]/g, "");
    if (digits.length === 12 && digits.indexOf("91") === 0) digits = digits.slice(2);
    if (digits.length === 11 && digits.charAt(0) === "0") digits = digits.slice(1);
    return digits;
  }

  function labelFor(input) {
    if (input.getAttribute("data-label")) return input.getAttribute("data-label");
    var label = input.labels && input.labels[0];
    return label ? label.textContent.replace(/\*/g, "").replace(/\s+/g, " ").trim().toLowerCase() : "this field";
  }

  function errorFor(input) {
    var value = input.value.trim();
    var label = labelFor(input);

    if (input.hasAttribute("required") && !value) {
      return "Please enter " + label + ".";
    }
    if (!value) return "";

    if (input.type === "email" && !emailPattern.test(value)) {
      return "Enter a valid email address, for example name@example.com.";
    }

    if (input.hasAttribute("data-phone")) {
      var digits = normalisePhone(value);
      if (!/^[6-9]\d{9}$/.test(digits)) {
        return "Enter a valid 10-digit Indian mobile number starting with 6, 7, 8 or 9.";
      }
    }

    if (input.tagName === "TEXTAREA" && value.length < 10 && input.hasAttribute("required")) {
      return "Please add a little more detail (at least 10 characters).";
    }

    return "";
  }

  function setFieldError(input, message) {
    var error = document.querySelector('[data-error-for="' + input.id + '"]');
    input.setAttribute("aria-invalid", message ? "true" : "false");
    if (!error) return;
    error.textContent = message;
    error.classList.toggle("is-visible", Boolean(message));
  }

  function clearFormState(form) {
    form.querySelectorAll("[aria-invalid]").forEach(function (input) {
      input.setAttribute("aria-invalid", "false");
    });
    form.querySelectorAll(".form-error").forEach(function (error) {
      error.textContent = "";
      error.classList.remove("is-visible");
    });
  }

  forms.forEach(function (form) {
    var fields = Array.prototype.slice.call(form.querySelectorAll("input, select, textarea"));
    var success = form.querySelector(".form-feedback");

    fields.forEach(function (input) {
      var validateIfNeeded = function () {
        if (input.getAttribute("aria-invalid") === "true") {
          setFieldError(input, errorFor(input));
        }
      };
      input.addEventListener("input", validateIfNeeded);
      input.addEventListener("blur", validateIfNeeded);
      input.addEventListener("change", validateIfNeeded);
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var firstInvalid = null;

      fields.forEach(function (input) {
        var message = errorFor(input);
        setFieldError(input, message);
        if (message && !firstInvalid) firstInvalid = input;
      });

      if (firstInvalid) {
        if (success) success.hidden = true;
        firstInvalid.focus();
        return;
      }

      form.reset();
      clearFormState(form);

      if (success) {
        success.hidden = false;
        success.focus();
        success.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    });
  });
})();
