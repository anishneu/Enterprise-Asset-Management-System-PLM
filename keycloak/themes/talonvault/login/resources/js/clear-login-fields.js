(function () {
  function clearLoginFields() {
    var username = document.getElementById("username");
    var password = document.getElementById("password");
    var form = document.getElementById("kc-form-login");

    if (form) {
      form.setAttribute("autocomplete", "off");
    }

    if (username) {
      username.value = "";
      username.setAttribute("autocomplete", "off");
      username.setAttribute("autocapitalize", "off");
      username.setAttribute("spellcheck", "false");
    }

    if (password) {
      password.value = "";
      password.setAttribute("autocomplete", "new-password");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", clearLoginFields);
  } else {
    clearLoginFields();
  }

  window.addEventListener("pageshow", clearLoginFields);
})();
