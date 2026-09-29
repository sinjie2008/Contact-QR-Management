(function () {
  "use strict";

  var syncing = false, queued = false, refreshTimer = 0;
  var pending = { profile: "", background: "" };
  var imageKey = "contactQrLessDenseImagesV4";
  var profilesByRow = new WeakMap();
  var oldQrColumns = [], originalColumnCount = 0;

  function loadImages() {
    try {
      var value = JSON.parse(localStorage.getItem(imageKey) || "{}");
      return value && typeof value === "object" ? value : {};
    } catch (e) { return {}; }
  }
  function saveImages(value) {
    try { localStorage.setItem(imageKey, JSON.stringify(value)); } catch (e) {}
  }
  function liveUrl(id) {
    var url = new URL("p.html", location.href);
    url.search = "";
    url.hash = encodeURIComponent(id);
    return url.href;
  }
  function qrImage(url) {
    return "https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=" + encodeURIComponent(url);
  }
  function snapshot(url) {
    try {
      var match = new URL(url, location.href).hash.match(/(?:^#|&)p=([^&]+)/);
      if (!match) return null;
      var value = match[1].replace(/-/g, "+").replace(/_/g, "/");
      while (value.length % 4) value += "=";
      var bin = atob(value), bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      var profile = JSON.parse(new TextDecoder().decode(bytes));
      return profile && typeof profile === "object" && !Array.isArray(profile) ? profile : null;
    } catch (e) { return null; }
  }
  function cleanProfile(profile) {
    var result = JSON.parse(JSON.stringify(profile));
    Object.keys(result).forEach(function (key) {
      if (/^(wechatQr|whatsappQr|vCardQr)/i.test(key)) delete result[key];
    });
    return result;
  }
  function rowId(row) {
    var element = row.querySelector("[data-id]");
    var id = row.getAttribute("data-id") || (element && element.getAttribute("data-id")) || "";
    return /^[A-Za-z0-9_-]{1,100}$/.test(id) ? id : "";
  }
  function publicColumn(header) {
    for (var i = 0; i < header.cells.length; i++) {
      if (/public url/i.test(header.cells[i].textContent || "")) return i;
    }
    return -1;
  }
  function currentRecord(id) {
    try {
      if (Array.isArray(window.contacts)) {
        for (var i = 0; i < window.contacts.length; i++) {
          if (window.contacts[i] && String(window.contacts[i].id || "") === id) return window.contacts[i];
        }
      }
    } catch (e) {}
    return null;
  }
  function dataImage(record, type) {
    if (!record) return "";
    var keys = Object.keys(record);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i].toLowerCase(), value = record[keys[i]];
      if (typeof value !== "string" || !/^data:image\//i.test(value)) continue;
      if (type === "background" && /background|cover/.test(key)) return value;
      if (type === "profile" && !/background|cover|wechat/.test(key) && /profile|avatar|photo/.test(key)) return value;
    }
    return "";
  }
  function readFile(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || "")); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  function loadImage(source) {
    return new Promise(function (resolve, reject) {
      var image = new Image();
      image.onload = function () { resolve(image); };
      image.onerror = reject;
      image.src = source;
    });
  }
  async function compress(source, type) {
    if (!/^data:image\//i.test(source)) return source;
    try {
      var image = await loadImage(source);
      var maxWidth = type === "profile" ? 420 : 1200;
      var maxHeight = type === "profile" ? 420 : 420;
      var target = type === "profile" ? 55000 : 110000;
      var scale = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
      var width = Math.max(1, Math.round(image.naturalWidth * scale));
      var height = Math.max(1, Math.round(image.naturalHeight * scale));
      var canvas = document.createElement("canvas"), context = canvas.getContext("2d");
      var quality = .82, result = source;
      for (var i = 0; i < 16; i++) {
        canvas.width = width;
        canvas.height = height;
        context.clearRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        result = canvas.toDataURL("image/webp", quality);
        if (!/^data:image\/webp/i.test(result)) result = canvas.toDataURL("image/jpeg", quality);
        if (result.length <= target) return result;
        if (quality > .42) quality -= .08;
        else {
          width = Math.max(80, Math.round(width * .86));
          height = Math.max(50, Math.round(height * .86));
        }
      }
      return result;
    } catch (e) { return source; }
  }
  function imageType(input) {
    var label = input.id ? document.querySelector('label[for="' + CSS.escape(input.id) + '"]') : null;
    var nearby = input.closest(".field, .form-field, .full, label");
    var words = [input.id, input.name, input.getAttribute("aria-label"), label && label.textContent, nearby && nearby.textContent].join(" ").toLowerCase();
    if (/background|cover/.test(words)) return "background";
    if (/profile|avatar|photo/.test(words) && !/wechat/.test(words)) return "profile";
    return "";
  }
  function editingId() {
    var form = document.getElementById("form");
    var field = form && form.querySelector("#id,[name=id]");
    return field ? String(field.value || "") : "";
  }
  function bindImageInputs() {
    document.querySelectorAll('input[type="file"]').forEach(function (input) {
      if (input.dataset.liveImageBound) return;
      var type = imageType(input);
      if (!type) return;
      input.dataset.liveImageBound = "1";
      input.addEventListener("change", async function () {
        var file = input.files && input.files[0];
        if (!file) return;
        var data = await compress(await readFile(file), type);
        pending[type] = data;
        var id = editingId();
        if (id) {
          var images = loadImages();
          images[id] = images[id] || {};
          images[id][type] = data;
          saveImages(images);
        }
      });
    });
  }
  function bindForm() {
    var form = document.getElementById("form");
    if (!form || form.dataset.liveProfileBound) return;
    form.dataset.liveProfileBound = "1";
    form.addEventListener("submit", function () {
      var id = editingId(), images = loadImages();
      if (id) {
        images[id] = images[id] || {};
        if (pending.profile) images[id].profile = pending.profile;
        if (pending.background) images[id].background = pending.background;
        saveImages(images);
      }
      setTimeout(function () {
        pending = { profile: "", background: "" };
        scheduleSync();
      }, 250);
    }, true);
  }
  async function imagesFor(id) {
    var images = loadImages(), saved = images[id] || {}, record = currentRecord(id);
    var profile = saved.profile || dataImage(record, "profile");
    var background = saved.background || dataImage(record, "background");
    var changed = false;
    if (profile && /^data:image\//i.test(profile) && !saved.profile) {
      profile = await compress(profile, "profile");
      saved.profile = profile;
      changed = true;
    }
    if (background && /^data:image\//i.test(background) && !saved.background) {
      background = await compress(background, "background");
      saved.background = background;
      changed = true;
    }
    if (changed) { images[id] = saved; saveImages(images); }
    return { profile: profile, background: background };
  }

  function hideOldQrControls() {
    var all = document.getElementById("downloadAllQrBtn");
    if (all) all.remove();
    var subtitle = document.querySelector(".panel > .sub");
    if (subtitle && /whatsapp qr|wechat qr|v-?card qr/i.test(subtitle.textContent)) {
      subtitle.textContent = "Manage contacts and share their live public profiles.";
    }
    var notice = document.querySelector(".panel > .notice");
    if (notice && /whatsapp qr|wechat qr|v-?card qr/i.test(notice.textContent)) {
      notice.textContent = "Share the Public URL or Profile QR. Save a contact to update the same QR with the latest profile and images.";
    }
    ["wechatQrUrl", "wechatQrFile"].forEach(function (id) {
      var field = document.getElementById(id);
      var container = field && field.closest(".field, .form-field, .full");
      if (container) container.hidden = true;
    });
    document.querySelectorAll("#form .section").forEach(function (section) {
      var label = section.textContent || "";
      if (/whatsapp qr/i.test(label)) {
        var container = section.closest(".full");
        if (container) container.hidden = true;
      } else if (/qr settings/i.test(label)) {
        section.textContent = label.replace(/QR Settings/i, "Profile details");
      }
    });
    var template = document.getElementById("downloadBtn");
    if (template && !template.dataset.liveTemplateBound) {
      template.dataset.liveTemplateBound = "1";
      template.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        var link = document.createElement("a");
        link.href = "./contact_qr_import_template.csv";
        link.download = "contact_qr_import_template.csv";
        document.body.appendChild(link);
        link.click();
        link.remove();
      }, true);
    }
  }
  function trimOldColumns(table) {
    var header = table.tHead && table.tHead.rows[0];
    if (!header) return;
    var found = [];
    for (var i = 0; i < header.cells.length; i++) {
      var label = (header.cells[i].textContent || "").replace(/\s+/g, " ").trim();
      if (/^(?:WhatsApp|WeChat|V[ -]?card) QR$/i.test(label)) found.push(i);
    }
    if (found.length) {
      oldQrColumns = found;
      originalColumnCount = header.cells.length;
      found.slice().reverse().forEach(function (index) { header.cells[index].remove(); });
    }
    var count = header.cells.length;
    Array.from(table.tBodies[0].rows).forEach(function (row) {
      if (row.cells.length === 1 && row.cells[0].hasAttribute("colspan")) {
        row.cells[0].colSpan = count;
        return;
      }
      if (!oldQrColumns.length || row.cells.length < originalColumnCount) return;
      var vcf = row.querySelector('[data-a="vcf"]');
      var actions = row.querySelector(".actions");
      if (vcf && actions && !actions.querySelector('[data-a="vcf"]')) {
        vcf.className = "btn small";
        vcf.textContent = "Download VCF";
        actions.appendChild(vcf);
      }
      oldQrColumns.slice().reverse().forEach(function (index) {
        if (row.cells[index]) row.cells[index].remove();
      });
    });
  }
  function renderCell(cell, id, state, error) {
    var url = liveUrl(id);
    cell.classList.add("live-profile-cell");
    cell.innerHTML = '<div class="live-profile-url"><a class="live-url-link" target="_blank" rel="noopener noreferrer"></a></div>' +
      '<img class="live-qr-image" alt="Profile QR" width="88" height="88">' +
      '<div class="qractions"><a class="qrbtn live-open-profile" target="_blank" rel="noopener noreferrer">Open Profile</a></div>' +
      '<div class="muted live-qr-state" role="status"></div>' +
      '<div class="live-copy-row"><button class="qrbtn live-copy" type="button">Copy URL</button></div>';
    var link = cell.querySelector(".live-url-link");
    link.href = url;
    link.textContent = url;
    cell.querySelector(".live-open-profile").href = url;
    var image = cell.querySelector(".live-qr-image");
    image.src = qrImage(url);
    var status = cell.querySelector(".live-qr-state");
    status.textContent = state;
    if (error) status.title = error;
    cell.querySelector(".live-copy").onclick = async function () {
      try {
        await navigator.clipboard.writeText(url);
        var button = this;
        button.textContent = "Copied";
        setTimeout(function () { button.textContent = "Copy URL"; }, 1800);
      } catch (e) { status.textContent = "Copy failed · select the URL above"; }
    };
    image.onclick = function () {
      var dialog = document.createElement("dialog");
      dialog.innerHTML = '<div class="live-qr-preview"><h3>Profile QR</h3><img alt="Profile QR" width="320" height="320"><p>Same QR · latest saved profile</p><button type="button">Close</button></div>';
      dialog.querySelector("img").src = image.src;
      dialog.querySelector("button").onclick = function () { dialog.close(); };
      dialog.addEventListener("close", function () { dialog.remove(); }, { once: true });
      document.body.appendChild(dialog);
      dialog.showModal();
    };
  }
  async function syncRow(row, index) {
    var id = rowId(row), cell = row.cells[index];
    if (!id || !cell) return;
    var source = cell.querySelector('a[href*="profile.html"]');
    var profile = source && snapshot(source.href);
    if (profile) profilesByRow.set(row, profile);
    else profile = profilesByRow.get(row);
    if (!profile) { renderCell(cell, id, "Profile data unavailable"); return; }
    renderCell(cell, id, "Saving latest profile…");
    try {
      var images = await imagesFor(id);
      var response = await fetch("/api/live-profile?id=" + encodeURIComponent(id), {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: cleanProfile(profile), profileImage: images.profile || "", profileBackground: images.background || "" })
      });
      if (!(response.headers.get("content-type") || "").toLowerCase().includes("application/json")) {
        throw new Error("Live profile API did not return JSON.");
      }
      var result = await response.json();
      if (!response.ok) throw new Error(result.error || ("HTTP " + response.status));
      renderCell(cell, id, "Live · latest saved profile");
    } catch (e) {
      renderCell(cell, id, "Storage not ready", e && e.message ? e.message : String(e));
    }
  }
  async function sync() {
    if (syncing) { queued = true; return; }
    syncing = true;
    try {
      bindImageInputs();
      bindForm();
      hideOldQrControls();
      var table = document.getElementById("table") || document.querySelector("table");
      if (!table || !table.tHead || !table.tBodies.length) return;
      trimOldColumns(table);
      var header = table.tHead.rows[0], index = publicColumn(header);
      if (index < 0) return;
      header.cells[index].textContent = "Public URL + Profile QR";
      var rows = Array.from(table.tBodies[0].rows);
      for (var i = 0; i < rows.length; i++) {
        var oldDownload = rows[i].querySelector('[data-a="downloadqr"]');
        if (oldDownload) oldDownload.remove();
        await syncRow(rows[i], index);
      }
    } finally {
      syncing = false;
      if (queued) { queued = false; scheduleSync(); }
    }
  }
  function scheduleSync() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(sync, 80);
  }
  function boot() {
    var style = document.createElement("style");
    style.textContent = '.live-profile-cell{min-width:190px;max-width:270px;text-align:center}.live-profile-url{margin-bottom:8px}.live-url-link{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left;font-size:13px}.live-qr-image{display:block;width:88px;height:88px;margin:auto;padding:4px;border:1px solid #eaecf0;border-radius:7px;background:#fff;cursor:zoom-in}.live-open-profile{display:inline-block;text-decoration:none;color:inherit}.live-qr-state{font-size:12px;line-height:1.35;margin-top:5px}.live-copy-row{margin-top:8px}.live-qr-preview{padding:18px;text-align:center}.live-qr-preview img{width:min(320px,75vw);height:auto;max-width:100%}.live-qr-preview p{color:#667085;font-size:13px}#form [hidden]{display:none!important}';
    document.head.appendChild(style);
    var table = document.getElementById("table") || document.querySelector("table");
    if (table && table.tBodies.length) {
      new MutationObserver(scheduleSync).observe(table.tBodies[0], { childList: true });
      table.addEventListener("click", function (event) {
        var button = event.target.closest && event.target.closest("button[data-a]");
        if (!button || !/view profile/i.test(button.textContent || "")) return;
        var row = button.closest("tr"), id = row && rowId(row);
        if (!id) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        window.open(liveUrl(id), "_blank", "noopener");
      }, true);
    }
    sync();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
