/* =====================================================================
   LEAD College — Interactions (Review 1)
   Theme toggle · mega menu · mobile menu · tabs · in-page nav
   scrollspy · announcement rotator · reveal on scroll.
   Every feature degrades gracefully: content is readable without JS.
   ===================================================================== */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* ---------- Theme ---------- */
  function syncThemeButtons() {
    var dark = root.getAttribute("data-theme") === "dark";
    $$("[data-theme-toggle]").forEach(function (b) {
      b.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
      b.setAttribute("aria-pressed", String(dark));
    });
  }
  // Delegated: the footer (which holds the theme switch) is mounted after this script runs
  document.addEventListener("click", function (e) {
    if (!e.target.closest("[data-theme-toggle]")) return;
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("lead-theme", next); } catch (err) {}
    syncThemeButtons();
  });
  syncThemeButtons();
  document.addEventListener("DOMContentLoaded", syncThemeButtons);

  /* ---------- Site search dialog ---------- */
  var searchDlg = $("#site-search");
  if (searchDlg && window.LEAD && window.LEAD.SEARCH) {
    var sInput = $("[data-search-input]", searchDlg);
    var sList = $("[data-search-results]", searchDlg);
    var sEmpty = $("[data-search-empty]", searchDlg);
    var sLabel = $("[data-search-label]", searchDlg);
    var popularEl = $("[data-search-popular]", searchDlg);
    var popular = [];
    try { popular = JSON.parse(popularEl.textContent); } catch (e) {}
    var index = window.LEAD.SEARCH;
    var active = -1, shown = [], lastFocus = null;

    function escHTML(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
    function mark(text, q) {
      if (!q) return escHTML(text);
      var i = text.toLowerCase().indexOf(q);
      if (i === -1) return escHTML(text);
      return escHTML(text.slice(0, i)) + "<mark>" + escHTML(text.slice(i, i + q.length)) + "</mark>" + escHTML(text.slice(i + q.length));
    }
    function score(item, q) {
      var l = item.label.toLowerCase();
      if (l === q) return 100;
      if (l.indexOf(q) === 0) return 80;
      if ((" " + l).indexOf(" " + q) !== -1) return 60;
      if (l.indexOf(q) !== -1) return 40;
      if (item.trail.toLowerCase().indexOf(q) !== -1) return 20;
      if (item.keywords.toLowerCase().indexOf(q) !== -1) return 15;
      return 0;
    }
    function render() {
      var q = sInput.value.trim().toLowerCase();
      if (!q) {
        shown = popular.map(function (p) { return index.filter(function (it) { return it.label === p; })[0]; }).filter(Boolean);
      } else {
        shown = index.map(function (it) { return { it: it, s: score(it, q) }; })
          .filter(function (x) { return x.s > 0; })
          .sort(function (a, b) { return b.s - a.s || a.it.label.localeCompare(b.it.label); })
          .slice(0, 10).map(function (x) { return x.it; });
      }
      sLabel.textContent = q ? (shown.length ? shown.length + (shown.length === 1 ? " result" : " results") : "") : "Popular";
      sLabel.hidden = q && !shown.length;
      sEmpty.hidden = !q || shown.length > 0;
      sList.innerHTML = shown.map(function (it, i) {
        return '<li role="option" id="sr-' + i + '" aria-selected="false"><a href="' + escHTML(it.href) + '"' + (it.external ? ' target="_blank" rel="noopener"' : "") + ' tabindex="-1">' +
          '<span class="sr-label">' + mark(it.label, q) + "</span>" +
          '<span class="sr-trail">' + escHTML(it.trail) + "</span>" +
          window.LEAD.icon(it.external ? "arrow" : "right", "sr-go") + "</a></li>";
      }).join("");
      setActive(shown.length ? 0 : -1);
    }
    function setActive(i) {
      active = i;
      $$("[role=option]", sList).forEach(function (li, n) { li.setAttribute("aria-selected", String(n === i)); });
      if (i >= 0) {
        sInput.setAttribute("aria-activedescendant", "sr-" + i);
        var el = document.getElementById("sr-" + i);
        if (el) el.scrollIntoView({ block: "nearest" });
      } else sInput.removeAttribute("aria-activedescendant");
    }
    function openSearch() {
      if (!searchDlg.hidden) return;
      lastFocus = document.activeElement;
      searchDlg.hidden = false;
      document.body.classList.add("is-locked");
      requestAnimationFrame(function () { searchDlg.classList.add("is-open"); });
      sInput.value = "";
      render();
      sInput.focus();
    }
    function closeSearch() {
      if (searchDlg.hidden) return;
      searchDlg.classList.remove("is-open");
      document.body.classList.remove("is-locked");
      setTimeout(function () { searchDlg.hidden = true; }, reduceMotion ? 0 : 160);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    $$("[data-search-open]").forEach(function (b) { b.addEventListener("click", openSearch); });
    $$("[data-search-close]", searchDlg).forEach(function (b) { b.addEventListener("click", closeSearch); });
    sInput.addEventListener("input", render);
    sInput.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown" && shown.length) { e.preventDefault(); setActive((active + 1) % shown.length); }
      else if (e.key === "ArrowUp" && shown.length) { e.preventDefault(); setActive((active - 1 + shown.length) % shown.length); }
      else if (e.key === "Enter" && active >= 0) {
        e.preventDefault();
        var a = $("#sr-" + active + " a");
        if (a) { closeSearch(); a.click(); }
      }
    });
    sList.addEventListener("mousemove", function (e) {
      var li = e.target.closest("[role=option]");
      if (li) { var n = $$("[role=option]", sList).indexOf(li); if (n !== active) setActive(n); }
    });
    sList.addEventListener("click", function (e) { if (e.target.closest("a")) closeSearch(); });
    searchDlg.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { e.stopPropagation(); closeSearch(); }
      if (e.key === "Tab") { // keep focus inside: input ↔ close button
        var close = $(".search-close", searchDlg);
        e.preventDefault();
        (document.activeElement === sInput ? close : sInput).focus();
      }
    });
    document.addEventListener("keydown", function (e) {
      var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) || document.activeElement.isContentEditable;
      if ((e.key === "k" || e.key === "K") && (e.ctrlKey || e.metaKey)) { e.preventDefault(); searchDlg.hidden ? openSearch() : closeSearch(); }
      else if (e.key === "/" && !typing && searchDlg.hidden) { e.preventDefault(); openSearch(); }
    });
  }

  /* ---------- Beyond the classroom: expanding cards ----------
     Pointer: hovering a card opens it. Keyboard: focusing its link opens it.
     Touch: the first tap on a closed card opens it instead of following a link. */
  $$("[data-beyond]").forEach(function (wrap) {
    var cards = $$(".bcard", wrap);
    function activate(card) {
      cards.forEach(function (c) {
        var on = c === card;
        c.classList.toggle("is-active", on);
        c.setAttribute("aria-expanded", String(on));
      });
    }
    cards.forEach(function (card) {
      // Each card is a tab stop so keyboard users can open it; its link becomes reachable once open
      card.tabIndex = 0;
      // Only real mouse movement opens a card. Cards resize under a resting pointer,
      // and the browser's layout-driven enter events (zero movement) would otherwise flip-flop them.
      card.addEventListener("pointermove", function (e) {
        if (e.pointerType === "mouse" && (e.movementX || e.movementY) && !card.classList.contains("is-active")) activate(card);
      });
      card.addEventListener("focusin", function () { activate(card); });
      card.addEventListener("click", function (e) {
        if (!card.classList.contains("is-active")) { e.preventDefault(); activate(card); }
      });
    });
  });

  /* ---------- Events page filter ---------- */
  $$("[data-ev-filter]").forEach(function (group) {
    var btns = $$("button", group);
    var target = document.getElementById(group.getAttribute("data-ev-filter"));
    if (!target) return;
    var cards = $$("[data-when]", target);
    var empty = $("[data-ev-empty]", target.parentElement);
    btns.forEach(function (b) {
      b.addEventListener("click", function () {
        var f = b.getAttribute("data-value");
        btns.forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        var any = false;
        cards.forEach(function (c) {
          var hit = f === "all" || c.getAttribute("data-when") === f;
          c.hidden = !hit;
          if (hit) any = true;
        });
        if (empty) empty.hidden = any;
      });
    });
  });

  /* ---------- Header: on scroll, hide the quick-links bar, then the notice ----------
     Two stages, always played in order: scrolling down hides the top
     quick-links bar first, then the notice; scrolling back up brings the
     notice back first, then the quick-links bar. A fast jump still steps
     through each stage one at a time so it never snaps.
     The whole block is sticky and only transforms/clips, so the page never
     jumps. Each stage has its own on/off thresholds to stop flicker. */
  var header = $(".site-header");
  var siteTop = $("[data-site-top]");
  var STAGE_GAP = 200;          // ms between stages when several are due
  var stage = 0;                // 0 = all shown, 1 = top bar hidden, 2 = notice hidden too
  var stepTimer = null;
  function targetStage(y) {
    var t = stage;
    // Stage 1: quick-links bar
    if (t < 1 && y > 60) t = 1;
    if (t >= 1 && y < 24) t = 0;
    // Stage 2: notice
    if (t >= 1 && t < 2 && y > 170) t = 2;
    if (t === 2 && y < 110) t = 1;
    if (t === 0 && y > 170) t = 2;
    return t;
  }
  function applyStage() {
    siteTop.classList.toggle("is-condensed", stage >= 1);
    siteTop.classList.toggle("is-notice-hidden", stage >= 2);
  }
  function stepToward() {
    stepTimer = null;
    var t = targetStage(window.scrollY);
    if (t === stage) return;
    stage += t > stage ? 1 : -1;
    applyStage();
    if (targetStage(window.scrollY) !== stage) stepTimer = setTimeout(stepToward, STAGE_GAP);
  }
  function onScroll() {
    var y = window.scrollY;
    if (header) header.classList.toggle("is-scrolled", y > 8);
    if (!siteTop || stepTimer) return;
    stepToward();
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Desktop mega menu ---------- */
  var navBtns = $$(".nav-btn");
  var openBtn = null;
  var hoverTimer = null;
  var canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  function closeMega(focusBtn) {
    if (!openBtn) return;
    var panel = document.getElementById(openBtn.getAttribute("aria-controls"));
    openBtn.setAttribute("aria-expanded", "false");
    if (panel) panel.hidden = true;
    if (focusBtn) openBtn.focus();
    openBtn = null;
    document.body.classList.remove("mega-open");
  }
  function openMega(btn) {
    if (openBtn === btn) return;
    closeMega(false);
    var panel = document.getElementById(btn.getAttribute("aria-controls"));
    btn.setAttribute("aria-expanded", "true");
    if (panel) panel.hidden = false;
    openBtn = btn;
    document.body.classList.add("mega-open");
  }

  navBtns.forEach(function (btn) {
    var item = btn.parentElement;
    btn.addEventListener("click", function () {
      if (openBtn === btn) closeMega(false); else openMega(btn);
    });
    btn.addEventListener("keydown", function (e) {
      var i = navBtns.indexOf(btn);
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        var next = navBtns[(i + (e.key === "ArrowRight" ? 1 : navBtns.length - 1)) % navBtns.length];
        next.focus();
        if (openBtn) openMega(next);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        openMega(btn);
        var first = $(".mega a", item);
        if (first) first.focus();
      }
    });
    if (canHover) {
      item.addEventListener("mouseenter", function () {
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(function () { openMega(btn); }, openBtn ? 0 : 120);
      });
      item.addEventListener("mouseleave", function () {
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(function () { if (openBtn === btn) closeMega(false); }, 180);
      });
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (openBtn) closeMega(true);
      if (mobileMenu && !mobileMenu.hidden) closeMobile();
    }
  });
  document.addEventListener("click", function (e) {
    if (openBtn && !e.target.closest(".nav-item")) closeMega(false);
  });
  document.addEventListener("focusin", function (e) {
    if (openBtn && !e.target.closest(".nav-item")) closeMega(false);
  });

  /* ---------- Mobile menu ---------- */
  var mobileMenu = $("#mobile-menu");
  var menuToggle = $(".menu-toggle");
  function openMobile() {
    if (!mobileMenu) return;
    mobileMenu.hidden = false;
    requestAnimationFrame(function () { mobileMenu.classList.add("is-open"); });
    menuToggle.setAttribute("aria-expanded", "true");
    document.body.classList.add("is-locked");
    var close = $("[data-menu-close]", mobileMenu);
    if (close) close.focus();
  }
  function closeMobile() {
    if (!mobileMenu || mobileMenu.hidden) return;
    mobileMenu.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("is-locked");
    setTimeout(function () { mobileMenu.hidden = true; }, reduceMotion ? 0 : 200);
    menuToggle.focus();
  }
  if (menuToggle) menuToggle.addEventListener("click", openMobile);
  $$("[data-menu-close]").forEach(function (b) { b.addEventListener("click", closeMobile); });
  window.addEventListener("resize", function () {
    if (window.innerWidth > 1120 && mobileMenu && !mobileMenu.hidden) closeMobile();
  });

  // Keep focus inside the open mobile menu
  if (mobileMenu) {
    mobileMenu.addEventListener("keydown", function (e) {
      if (e.key !== "Tab") return;
      var f = $$("a[href], button, input, summary", mobileMenu).filter(function (el) { return el.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  // Filter the mobile menu
  var search = $("[data-menu-search]");
  if (search) {
    search.addEventListener("input", function () {
      var q = search.value.trim().toLowerCase();
      var any = false;
      $$(".m-group", mobileMenu).forEach(function (group) {
        var groupHit = false;
        $$(".m-sub", group).forEach(function (sub) {
          var subHit = false;
          $$(".m-link", sub).forEach(function (link) {
            var hit = !q || link.textContent.toLowerCase().indexOf(q) !== -1;
            link.hidden = !hit;
            if (hit) subHit = true;
          });
          sub.hidden = !subHit;
          if (subHit) groupHit = true;
        });
        group.hidden = !groupHit;
        if (q) group.open = groupHit;
        if (groupHit) any = true;
      });
      $("[data-menu-empty]").hidden = any;
    });
  }

  /* ---------- Tabs (WAI-ARIA tabs pattern) ---------- */
  $$("[data-tabs]").forEach(function (wrap) {
    var tabs = $$('[role="tab"]', wrap);
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute("aria-controls"));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
    }
    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { select(tab, false); });
      tab.addEventListener("keydown", function (e) {
        var n = null;
        if (e.key === "ArrowRight") n = tabs[(i + 1) % tabs.length];
        if (e.key === "ArrowLeft") n = tabs[(i - 1 + tabs.length) % tabs.length];
        if (e.key === "Home") n = tabs[0];
        if (e.key === "End") n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); select(n, true); }
      });
    });
    var initial = tabs.filter(function (t) { return t.getAttribute("aria-selected") === "true"; })[0] || tabs[0];
    // Deep links: open the tab that contains the #hash target (e.g. faculty.html#mca)
    function fromHash() {
      if (!location.hash) return null;
      var target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      var panel = target && target.closest('[role="tabpanel"]');
      return panel ? tabs.filter(function (t) { return t.getAttribute("aria-controls") === panel.id; })[0] : null;
    }
    var hashTab = fromHash();
    if (hashTab) initial = hashTab;
    if (initial) select(initial, false);
    if (hashTab) {
      var t = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (t && t.tagName === "DETAILS") t.open = true;
      setTimeout(function () { t.scrollIntoView(); }, 0);
    }
    window.addEventListener("hashchange", function () { var h = fromHash(); if (h) select(h, false); });
  });

  /* ---------- In-page section nav: scrollspy ---------- */
  var pageNav = $(".page-nav");
  if (pageNav && "IntersectionObserver" in window) {
    var links = $$("a[href^='#']", pageNav);
    var map = {};
    links.forEach(function (a) {
      var t = document.getElementById(a.getAttribute("href").slice(1));
      if (t) map[t.id] = a;
    });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && map[en.target.id]) {
          links.forEach(function (l) { l.removeAttribute("aria-current"); });
          map[en.target.id].setAttribute("aria-current", "true");
          var a = map[en.target.id];
          var scroller = a.parentElement;
          if (scroller && scroller.scrollWidth > scroller.clientWidth) {
            scroller.scrollTo({ left: a.offsetLeft - 24, behavior: reduceMotion ? "auto" : "smooth" });
          }
        }
      });
    }, { rootMargin: "-35% 0px -60% 0px" });
    Object.keys(map).forEach(function (id) { spy.observe(document.getElementById(id)); });
  }

  /* ---------- Show all / show fewer (e.g. the recruiters wall) ---------- */
  $$("[data-expand]").forEach(function (btn) {
    var target = document.getElementById(btn.getAttribute("data-expand"));
    if (!target) return;
    btn.addEventListener("click", function () {
      var open = target.classList.toggle("is-expanded");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.textContent = btn.getAttribute(open ? "data-label-open" : "data-label-closed");
    });
  });

  /* ---------- Announcement rotator ---------- */
  $$("[data-rotator]").forEach(function (rot) {
    var items = $$("li", rot);
    if (items.length < 2 || reduceMotion) return;
    var i = 0, paused = false;
    items.forEach(function (li, n) { li.classList.toggle("is-active", n === 0); });
    rot.classList.add("is-rotating");
    rot.addEventListener("mouseenter", function () { paused = true; });
    rot.addEventListener("mouseleave", function () { paused = false; });
    rot.addEventListener("focusin", function () { paused = true; });
    rot.addEventListener("focusout", function () { paused = false; });
    setInterval(function () {
      if (paused || document.hidden) return;
      items[i].classList.remove("is-active");
      i = (i + 1) % items.length;
      items[i].classList.add("is-active");
    }, 4500);
  });

  /* ---------- Horizontal rails with prev/next ---------- */
  $$("[data-rail]").forEach(function (wrap) {
    var track = $(".rail-track", wrap);
    var prev = $("[data-rail-prev]", wrap);
    var next = $("[data-rail-next]", wrap);
    if (!track) return;
    function step() { var c = track.firstElementChild; return c ? c.getBoundingClientRect().width + 24 : 320; }
    function update() {
      if (prev) prev.disabled = track.scrollLeft < 4;
      if (next) next.disabled = track.scrollLeft + track.clientWidth > track.scrollWidth - 4;
    }
    if (prev) prev.addEventListener("click", function () { track.scrollBy({ left: -step(), behavior: reduceMotion ? "auto" : "smooth" }); });
    if (next) next.addEventListener("click", function () { track.scrollBy({ left: step(), behavior: reduceMotion ? "auto" : "smooth" }); });
    track.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  });

  /* ---------- Hide external logos that fail to load (show text fallback) ---------- */
  $$("img[data-fallback]").forEach(function (img) {
    function fail() { img.closest("[data-logo]").classList.add("is-fallback"); }
    if (img.complete && img.naturalWidth === 0) fail();
    img.addEventListener("error", fail);
  });

  /* ---------- Reveal on scroll ---------- */
  if (!reduceMotion && "IntersectionObserver" in window) {
    root.classList.add("reveal-ready");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    $$("[data-reveal]").forEach(function (el) { io.observe(el); });
  }
})();
