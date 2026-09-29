(function () {
  "use strict";

  var chartRoot, refreshTimer, livePage = [], livePageReady = false;
  var imageStoreKey = "contactQrLessDenseImagesV4";
  var colors = {
    active: "#2563eb",
    inactive: "#cbd5e1",
    country: "#2563eb",
    company: "#7c3aed",
    both: "#16a34a",
    one: "#f59e0b",
    neither: "#94a3b8",
    unknown: "#e4e7ec"
  };

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  }
  function contactRows(value) {
    var list = Array.isArray(value) ? value : value && value.contacts;
    if (!Array.isArray(list)) return null;
    var rows = list.filter(function (record) {
      return record && typeof record === "object" && !Array.isArray(record) &&
        ("id" in record || "contactName" in record || "firstName" in record);
    });
    return rows.length || !list.length ? rows : null;
  }
  function tableRecords() {
    var table = document.getElementById("table") || document.querySelector("table");
    if (!table || !table.tHead || !table.tBodies.length) return [];
    var headers = Array.from(table.tHead.rows[0].cells, function (cell) {
      return (cell.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
    });
    function column(name) {
      return headers.findIndex(function (label) { return label.indexOf(name) === 0; });
    }
    var country = column("country"), company = column("company"), status = column("status");
    if (country < 0 && company < 0 && status < 0) return [];
    return Array.from(table.tBodies[0].rows).filter(function (row) {
      return row.cells.length > 1;
    }).map(function (row) {
      function value(index) { return index < 0 ? "" : (row.cells[index] && row.cells[index].textContent || "").trim(); }
      var idNode = row.querySelector("[data-id]");
      var record = {
        id: row.getAttribute("data-id") || idNode && idNode.getAttribute("data-id") || "",
        country: value(country),
        company: value(company),
        isActive: /^active\b/i.test(value(status)),
        __chartSource: "table"
      };
      Array.from(row.querySelectorAll("img")).forEach(function (image) {
        var description = [image.alt, image.className].join(" ").toLowerCase();
        if (/qr/.test(description)) return;
        if (/background|cover/.test(description)) record.profileBackground = image.getAttribute("src") || "";
        else if (/profile|avatar|photo/.test(description)) record.profileImage = image.getAttribute("src") || "";
      });
      return record;
    });
  }
  function records() {
    var direct = contactRows(window.contacts);
    if (direct && direct.length) return { list: direct, scope: "all" };
    try {
      if (typeof contacts !== "undefined") {
        var lexical = contactRows(contacts);
        if (lexical && lexical.length) return { list: lexical, scope: "all" };
      }
    } catch (e) {}
    try {
      var candidates = [];
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key === imageStoreKey) continue;
        try {
          var list = contactRows(JSON.parse(localStorage.getItem(key) || "null"));
          if (list && list.length) candidates.push({
            key: key,
            list: list,
            preferred: /contact.*(?:qr|management)|(?:qr|management).*contact/i.test(key)
          });
        } catch (e) {}
      }
      candidates.sort(function (a, b) {
        return Number(b.preferred) - Number(a.preferred) ||
          (Number((b.key.match(/\d+$/) || [0])[0]) || 0) -
          (Number((a.key.match(/\d+$/) || [0])[0]) || 0) ||
          b.list.length - a.list.length;
      });
      if (candidates.length) return { list: candidates[0].list, scope: "all" };
    } catch (e) {}
    if (livePageReady) return { list: livePage, scope: "page" };
    var visible = tableRecords();
    if (visible.length) return { list: visible, scope: "page" };
    return { list: direct || [], scope: "all" };
  }
  function savedImages() {
    try {
      var value = JSON.parse(localStorage.getItem(imageStoreKey) || "{}");
      return value && typeof value === "object" ? value : {};
    } catch (e) { return {}; }
  }
  function hasImage(record, kind, saved) {
    var keys = kind === "profile"
      ? ["profileImage", "profileImageData", "profilePhotoData", "avatarData"]
      : ["profileBackground", "profileBackgroundData", "backgroundImageData", "coverImageData", "backgroundData"];
    if (saved && typeof saved[kind] === "string" && saved[kind].trim()) return true;
    if (record[kind === "profile" ? "_profileImageStored" : "_profileBackgroundStored"]) return true;
    return keys.some(function (key) {
      return typeof record[key] === "string" && !!record[key].trim();
    }) || Object.keys(record).some(function (key) {
      var label = key.toLowerCase(), value = record[key];
      if (typeof value !== "string" || !value.trim() || /wechat|qr/.test(label)) return false;
      return kind === "background" ? /background|cover/.test(label) :
        /profile|avatar|photo/.test(label) && !/background|cover/.test(label);
    });
  }
  function countsBy(list, field) {
    var grouped = new Map();
    list.forEach(function (record) {
      var label = String(record[field] || "").trim() || "Unspecified";
      grouped.set(label, (grouped.get(label) || 0) + 1);
    });
    return Array.from(grouped, function (entry) {
      return { label: entry[0], count: entry[1] };
    }).sort(function (a, b) {
      return b.count - a.count || a.label.localeCompare(b.label);
    });
  }
  function card(title, subtitle) {
    var node = element("article", "contact-chart-card");
    node.appendChild(element("h3", "", title));
    node.appendChild(element("p", "contact-chart-subtitle", subtitle));
    return node;
  }
  function legend(parent, items) {
    var list = element("ul", "contact-chart-legend");
    items.forEach(function (item) {
      var line = element("li");
      var swatch = element("span", "contact-chart-swatch");
      swatch.style.backgroundColor = item.color;
      swatch.setAttribute("aria-hidden", "true");
      line.appendChild(swatch);
      line.appendChild(element("span", "", item.label));
      line.appendChild(element("strong", "", item.count));
      list.appendChild(line);
    });
    parent.appendChild(list);
  }
  function statusChart(list) {
    var active = list.filter(function (record) {
      return record.isActive === true || /^(true|active|yes|1)$/i.test(String(record.isActive));
    }).length;
    var inactive = list.length - active;
    var node = card("Active vs inactive", "Contact status");
    var figure = element("div", "contact-chart-donut");
    figure.style.background = list.length
      ? "conic-gradient(" + colors.active + " " + (active / list.length * 100) + "%, " + colors.inactive + " 0)"
      : "conic-gradient(#e4e7ec 0 100%)";
    figure.setAttribute("role", "img");
    figure.setAttribute("aria-label", active + " active and " + inactive + " inactive contacts");
    var center = element("div", "contact-chart-donut-center");
    center.appendChild(element("strong", "", list.length));
    center.appendChild(element("span", "", "contacts"));
    figure.appendChild(center);
    node.appendChild(figure);
    legend(node, [
      { label: "Active", count: active, color: colors.active },
      { label: "Inactive", count: inactive, color: colors.inactive }
    ]);
    return node;
  }
  function barChart(list, title, field, color) {
    var grouped = countsBy(list, field);
    var node = card(title, grouped.length > 5 ? "Top 5 and all others" : "Contacts by " + field);
    if (!grouped.length) {
      node.appendChild(element("p", "contact-chart-empty", "No contacts yet"));
      return node;
    }
    var shown = grouped.slice(0, 5);
    if (grouped.length > 5) {
      shown.push({
        label: "Other",
        count: grouped.slice(5).reduce(function (sum, item) { return sum + item.count; }, 0)
      });
    }
    var max = Math.max.apply(null, shown.map(function (item) { return item.count; }));
    var rows = element("div", "contact-chart-bars");
    shown.forEach(function (item) {
      var row = element("div", "contact-chart-bar-row");
      var label = element("span", "contact-chart-bar-label", item.label);
      label.title = item.label;
      var track = element("div", "contact-chart-bar-track");
      var fill = element("div", "contact-chart-bar-fill");
      fill.style.width = (item.count / max * 100) + "%";
      fill.style.backgroundColor = color;
      track.appendChild(fill);
      row.appendChild(label);
      row.appendChild(track);
      row.appendChild(element("strong", "contact-chart-bar-value", item.count));
      row.setAttribute("aria-label", item.label + ": " + item.count + " contacts");
      rows.appendChild(row);
    });
    node.appendChild(rows);
    return node;
  }
  function imageChart(list, images) {
    var counts = { both: 0, one: 0, neither: 0, unknown: 0 };
    list.forEach(function (record) {
      var saved = images[String(record.id || "")] || {};
      var n = Number(hasImage(record, "profile", saved)) +
        Number(hasImage(record, "background", saved));
      counts[record.__chartSource === "table" && n === 0 ? "unknown" :
        n === 2 ? "both" : n === 1 ? "one" : "neither"]++;
    });
    var node = card("Profile image readiness", "Profile photo and background");
    var stack = element("div", "contact-chart-stack");
    stack.setAttribute("role", "img");
    stack.setAttribute("aria-label", counts.both + " with both images, " +
      counts.one + " with one image, " + counts.neither + " with neither image, " +
      counts.unknown + " with image data unavailable");
    ["both", "one", "neither", "unknown"].forEach(function (key) {
      if (!counts[key]) return;
      var segment = element("span");
      segment.style.width = (counts[key] / list.length * 100) + "%";
      segment.style.backgroundColor = colors[key];
      stack.appendChild(segment);
    });
    node.appendChild(stack);
    var items = [
      { label: "Both images", count: counts.both, color: colors.both },
      { label: "One image", count: counts.one, color: colors.one },
      { label: "Neither", count: counts.neither, color: colors.neither }
    ];
    if (counts.unknown) items.push({
      label: "Image data unavailable", count: counts.unknown, color: colors.unknown
    });
    legend(node, items);
    return node;
  }
  function ensureRoot() {
    if (chartRoot && chartRoot.isConnected) return chartRoot;
    chartRoot = element("section", "contact-charts");
    chartRoot.id = "contactCharts";
    chartRoot.setAttribute("aria-labelledby", "contactChartsTitle");
    var old = document.querySelector(".comparison");
    if (old) {
      old.replaceWith(chartRoot);
      document.querySelectorAll(".comparison").forEach(function (node) { node.remove(); });
    } else {
      var table = document.querySelector(".tablewrap") || document.getElementById("table");
      var anchor = document.querySelector(".filters") || table;
      if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(chartRoot, anchor);
      else (document.querySelector(".panel") || document.body).appendChild(chartRoot);
    }
    var heading = element("div", "contact-charts-heading");
    var title = element("h2", "", "Contact overview");
    title.id = "contactChartsTitle";
    heading.appendChild(title);
    heading.appendChild(element("span", "contact-charts-total"));
    chartRoot.appendChild(heading);
    chartRoot.appendChild(element("div", "contact-charts-grid"));
    return chartRoot;
  }
  function render() {
    var root = ensureRoot();
    var source = records(), list = source.list;
    root.querySelector(".contact-charts-total").textContent =
      list.length + (source.scope === "page" ? " on this page" :
        list.length === 1 ? " contact" : " contacts");
    var grid = root.querySelector(".contact-charts-grid");
    grid.replaceChildren(
      statusChart(list),
      barChart(list, "Contacts by country", "country", colors.country),
      barChart(list, "Top companies", "company", colors.company),
      imageChart(list, savedImages())
    );
  }
  function scheduleRender() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(render, 100);
  }
  function boot() {
    var style = element("style");
    style.textContent =
      ".contact-charts{margin:20px 0 22px}" +
      ".contact-charts-heading{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:12px}" +
      ".contact-charts h2{font-size:18px;line-height:1.3;margin:0}.contact-charts-total,.contact-chart-subtitle{color:#667085;font-size:12px}" +
      ".contact-charts-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}" +
      ".contact-chart-card{min-width:0;min-height:246px;border:1px solid var(--line,#dfe4ec);border-radius:12px;background:#fff;padding:16px}" +
      ".contact-chart-card h3{font-size:15px;line-height:1.35;margin:0 0 2px}.contact-chart-subtitle{margin:0 0 16px}" +
      ".contact-chart-donut{width:112px;height:112px;border-radius:50%;margin:0 auto 15px;display:grid;place-items:center}" +
      ".contact-chart-donut-center{width:78px;height:78px;border-radius:50%;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center}" +
      ".contact-chart-donut-center strong{font-size:24px;line-height:1.1}.contact-chart-donut-center span{font-size:11px;color:#667085}" +
      ".contact-chart-legend{list-style:none;margin:0;padding:0;display:grid;gap:7px;font-size:12px}" +
      ".contact-chart-legend li{display:flex;align-items:center;gap:7px}.contact-chart-legend strong{margin-left:auto;font-variant-numeric:tabular-nums}" +
      ".contact-chart-swatch{width:9px;height:9px;border-radius:50%;flex:none}" +
      ".contact-chart-bars{display:grid;gap:12px}.contact-chart-bar-row{display:grid;grid-template-columns:minmax(100px,37%) minmax(0,1fr) 24px;gap:9px;align-items:center;font-size:12px}" +
      ".contact-chart-bar-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.contact-chart-bar-track{height:12px;border-radius:8px;background:#eef2f7;overflow:hidden}" +
      ".contact-chart-bar-fill{height:100%;border-radius:8px}.contact-chart-bar-value{text-align:right;font-variant-numeric:tabular-nums}" +
      ".contact-chart-empty{color:#667085;font-size:13px;margin:36px 0;text-align:center}" +
      ".contact-chart-stack{height:28px;display:flex;border-radius:8px;overflow:hidden;background:#e4e7ec;margin:42px 0 25px}" +
      ".contact-chart-stack span{height:100%}" +
      "@media(max-width:850px){.contact-charts-grid{grid-template-columns:1fr}.contact-chart-card{min-height:0}.contact-chart-bar-row{grid-template-columns:minmax(90px,34%) minmax(0,1fr) 24px}}";
    document.head.appendChild(style);
    render();
    var table = document.getElementById("table") || document.querySelector("table");
    if (table && table.tBodies.length) {
      new MutationObserver(scheduleRender).observe(table.tBodies[0], { childList: true });
    }
    var form = document.getElementById("form");
    if (form) form.addEventListener("submit", function () {
      setTimeout(render, 350);
      setTimeout(render, 1000);
    });
    document.addEventListener("contact-qr-chart-page", function (event) {
      livePage = contactRows(event.detail) || [];
      livePageReady = true;
      scheduleRender();
    });
    window.addEventListener("storage", scheduleRender);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else boot();
})();
