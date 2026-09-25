(function () {
  "use strict";

  var SESSION_KEY = "contactQrAuth_v1";
  var ATTEMPT_KEY = "contactQrAuthAttempts_v1";
  var LOCK_KEY = "contactQrAuthLockUntil_v1";
  var ITERATIONS = 310000;
  var SALT_B64 = "gAQSgpFyKQYPhv4aR3f4qQ==";
  var EXPECTED_B64 = "dwPPAM48GEdUwfbRlDiiVpAfUOJnVNLianSRKl1otpM=";

  var style = document.createElement("style");
  style.textContent = [
    "html.auth-pending body{overflow:hidden!important}",
    "html.auth-pending body>*:not(#accessGate){visibility:hidden!important}",
    "#accessGate{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;padding:20px;background:linear-gradient(135deg,#eef4ff 0%,#f8fafc 45%,#f5f7fb 100%);visibility:visible!important;font-family:Inter,system-ui,-apple-system,Segoe UI,Arial,sans-serif}",
    "#accessGate .auth-card{width:min(420px,100%);background:#fff;border:1px solid #dfe4ec;border-radius:18px;padding:28px;box-shadow:0 24px 70px rgba(16,24,40,.18)}",
    "#accessGate .auth-icon{width:48px;height:48px;border-radius:14px;display:grid;place-items:center;background:#eef4ff;font-size:24px;margin-bottom:18px}",
    "#accessGate h1{margin:0 0 8px;font-size:23px;color:#172033}",
    "#accessGate p{margin:0 0 18px;color:#667085;font-size:14px;line-height:1.5}",
    "#accessGate label{display:block;margin-bottom:6px;font-size:12px;font-weight:750;color:#344054}",
    "#accessGate .password-wrap{position:relative}",
    "#accessGate input{width:100%;height:44px;border:1px solid #d0d5dd;border-radius:9px;padding:0 44px 0 12px;font-size:15px;outline:none}",
    "#accessGate input:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.12)}",
    "#accessGate .toggle{position:absolute;right:7px;top:6px;height:32px;border:0;background:transparent;color:#475467;cursor:pointer;font-weight:650}",
    "#accessGate .submit{width:100%;margin-top:14px;height:44px;border:0;border-radius:9px;background:#2563eb;color:#fff;font-weight:750;cursor:pointer}",
    "#accessGate .submit:disabled{opacity:.6;cursor:not-allowed}",
    "#accessGate .auth-error{min-height:20px;margin-top:10px;color:#b42318;font-size:12px}",
    "#accessGate .auth-note{margin-top:12px;color:#98a2b3;font-size:11px;text-align:center}"
  ].join("");
  document.head.appendChild(style);

  function b64ToBytes(value) {
    var raw = atob(value);
    var bytes = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return bytes;
  }

  function equalBytes(a, b) {
    if (a.length !== b.length) return false;
    var diff = 0;
    for (var i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
    return diff === 0;
  }

  async function verifyPassword(password) {
    var keyMaterial = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );
    var bits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        hash: "SHA-256",
        salt: b64ToBytes(SALT_B64),
        iterations: ITERATIONS
      },
      keyMaterial,
      256
    );
    return equalBytes(new Uint8Array(bits), b64ToBytes(EXPECTED_B64));
  }

  function setLockedState(locked) {
    document.documentElement.classList.toggle("auth-pending", locked);
    if (!document.body) return;
    Array.prototype.forEach.call(document.body.children, function (el) {
      if (el.id === "accessGate") return;
      if (locked) {
        el.setAttribute("inert", "");
        el.setAttribute("aria-hidden", "true");
      } else {
        el.removeAttribute("inert");
        el.removeAttribute("aria-hidden");
      }
    });
  }

  function lockRemainingSeconds() {
    var until = Number(sessionStorage.getItem(LOCK_KEY) || 0);
    return Math.max(0, Math.ceil((until - Date.now()) / 1000));
  }

  function recordFailure() {
    var attempts = Number(sessionStorage.getItem(ATTEMPT_KEY) || 0) + 1;
    sessionStorage.setItem(ATTEMPT_KEY, String(attempts));
    if (attempts >= 5) {
      sessionStorage.setItem(LOCK_KEY, String(Date.now() + 30000));
      sessionStorage.setItem(ATTEMPT_KEY, "0");
      return 30;
    }
    return 0;
  }

  function unlock(gate) {
    sessionStorage.setItem(SESSION_KEY, "unlocked");
    window.dispatchEvent(new Event("contactQrUnlocked"));
    sessionStorage.removeItem(ATTEMPT_KEY);
    sessionStorage.removeItem(LOCK_KEY);
    setLockedState(false);
    if (gate) gate.remove();
  }

  function createGate() {
    if (sessionStorage.getItem(SESSION_KEY) === "unlocked") {
      setLockedState(false);
      return;
    }

    setLockedState(true);

    var gate = document.createElement("div");
    gate.id = "accessGate";
    gate.innerHTML =
      '<div class="auth-card" role="dialog" aria-modal="true" aria-labelledby="authTitle">' +
        '<div class="auth-icon" aria-hidden="true">🔒</div>' +
        '<h1 id="authTitle">Protected Access</h1>' +
        '<p>Enter the password to access Contact QR Management.</p>' +
        '<form id="accessForm" autocomplete="off">' +
          '<label for="accessPassword">Password</label>' +
          '<div class="password-wrap">' +
            '<input id="accessPassword" type="password" autocomplete="current-password" required autofocus>' +
            '<button class="toggle" id="togglePassword" type="button" aria-label="Show password">Show</button>' +
          '</div>' +
          '<button class="submit" id="accessSubmit" type="submit">Unlock</button>' +
          '<div class="auth-error" id="accessError" role="alert" aria-live="polite"></div>' +
          '<div class="auth-note">Access remains unlocked only for this browser tab session.</div>' +
        '</form>' +
      '</div>';

    document.body.appendChild(gate);

    var form = document.getElementById("accessForm");
    var input = document.getElementById("accessPassword");
    var submit = document.getElementById("accessSubmit");
    var error = document.getElementById("accessError");
    var toggle = document.getElementById("togglePassword");

    toggle.addEventListener("click", function () {
      var showing = input.type === "text";
      input.type = showing ? "password" : "text";
      toggle.textContent = showing ? "Show" : "Hide";
      toggle.setAttribute("aria-label", showing ? "Show password" : "Hide password");
      input.focus();
    });

    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      var remaining = lockRemainingSeconds();
      if (remaining > 0) {
        error.textContent = "Too many failed attempts. Try again in " + remaining + " seconds.";
        return;
      }

      submit.disabled = true;
      submit.textContent = "Checking...";
      error.textContent = "";

      try {
        var ok = await verifyPassword(input.value);
        if (ok) {
          unlock(gate);
          return;
        }

        input.value = "";
        input.focus();
        var lockSeconds = recordFailure();
        error.textContent = lockSeconds
          ? "Too many failed attempts. Access is locked for 30 seconds."
          : "Incorrect password. Please try again.";
      } catch (e) {
        error.textContent = "Secure password verification is not available in this browser.";
      } finally {
        submit.disabled = false;
        submit.textContent = "Unlock";
      }
    });

    setTimeout(function () { input.focus(); }, 0);
  }

  document.documentElement.classList.add("auth-pending");

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createGate, { once: true });
  } else {
    createGate();
  }
})();