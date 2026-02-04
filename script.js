// Portfolio interactions (no dependencies)
(function () {
  const $ = (s, p=document) => p.querySelector(s);
  const $$ = (s, p=document) => Array.from(p.querySelectorAll(s));

  // Year
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Scroll progress
  const bar = $("#scrollBar");
  const onScroll = () => {
    const h = document.documentElement;
    const scrolled = h.scrollTop || document.body.scrollTop;
    const height = (h.scrollHeight - h.clientHeight) || 1;
    const pct = Math.min(100, Math.max(0, (scrolled / height) * 100));
    if (bar) bar.style.width = pct.toFixed(2) + "%";
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Mobile menu
  const navToggle = $("#navToggle");
  const navLinks = $("#navLinks");
  if (navToggle && navLinks) {
    navToggle.addEventListener("click", () => {
      const open = navLinks.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", String(open));
    });

    // Close on click
    $$("#navLinks a").forEach(a => a.addEventListener("click", () => {
      navLinks.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    }));

    // Close if click outside
    document.addEventListener("click", (e) => {
      const t = e.target;
      if (!navLinks.contains(t) && !navToggle.contains(t)) {
        navLinks.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  // Theme toggle (persist)
  const themeToggle = $("#themeToggle");
  const body = document.body;
  const stored = localStorage.getItem("theme");
  if (stored === "light") body.classList.add("theme-light");
  if (stored === "dark") body.classList.remove("theme-light");

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      body.classList.toggle("theme-light");
      localStorage.setItem("theme", body.classList.contains("theme-light") ? "light" : "dark");
    });
  }

  // Reveal on scroll
  const items = $$("[data-reveal]");
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!reduce && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    items.forEach((el, idx) => {
      el.style.transitionDelay = (Math.min(idx, 10) * 60) + "ms";
      io.observe(el);
    });
  } else {
    items.forEach(el => el.classList.add("revealed"));
  }

  // Projects carousel (2 at a time)
  const track = $("#projTrack");
  const viewport = $("#projViewport");
  const prevBtn = $("#projPrev");
  const nextBtn = $("#projNext");
  const dotsWrap = $("#projDots");

  if (track && viewport && prevBtn && nextBtn && dotsWrap) {
    const pages = () => Array.from(track.children).filter(el => el.classList.contains("carousel-page"));
    let index = 0;

    const buildDots = () => {
      dotsWrap.innerHTML = "";
      pages().forEach((_, i) => {
        const b = document.createElement("button");
        b.className = "dot";
        b.type = "button";
        b.setAttribute("aria-label", `Go to projects ${i + 1}`);
        b.addEventListener("click", () => { index = i; update(); });
        dotsWrap.appendChild(b);
      });
    };

    const update = () => {
      const p = pages();
      const max = Math.max(0, p.length - 1);
      index = Math.min(max, Math.max(0, index));
      track.style.transform = `translateX(${-index * 100}%)`;

      prevBtn.disabled = index === 0;
      nextBtn.disabled = index === max;

      Array.from(dotsWrap.children).forEach((d, i) => {
        d.classList.toggle("active", i === index);
      });
    };

    prevBtn.addEventListener("click", () => { index -= 1; update(); });
    nextBtn.addEventListener("click", () => { index += 1; update(); });

    // Keyboard support (when focused inside carousel)
    viewport.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") { index -= 1; update(); }
      if (e.key === "ArrowRight") { index += 1; update(); }
    });
    viewport.tabIndex = 0;

    // Swipe / drag (does NOT block normal link clicks)
    let startX = 0;
    let startY = 0;
    let isDown = false;
    let moved = false;
    let pointerId = null;
    let justSwiped = false;

    const isInteractive = (el) => !!(el && el.closest && el.closest("a,button,input,textarea,select,label"));

    const onDown = (e) => {
      // Only left-click / primary touch
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (isInteractive(e.target)) return; // allow link/button clicks

      isDown = true;
      moved = false;
      pointerId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      viewport.classList.add("is-dragging");

      try { viewport.setPointerCapture(pointerId); } catch (_) {}
    };

    const onMove = (e) => {
      if (!isDown) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      // Don't treat tiny movements as a swipe.
      if (!moved) {
        if (Math.abs(dx) < 6) return;
        // If user is scrolling vertically, bail out.
        if (Math.abs(dy) > Math.abs(dx)) {
          isDown = false;
          viewport.classList.remove("is-dragging");
          try { viewport.releasePointerCapture(pointerId); } catch (_) {}
          pointerId = null;
          return;
        }
        moved = true;
      }

      // Prevent selecting text while swiping
      e.preventDefault();
    };

    const onUp = (e) => {
      if (!isDown) return;
      isDown = false;
      viewport.classList.remove("is-dragging");

      const dx = e.clientX - startX;
      const threshold = Math.min(80, viewport.clientWidth * 0.18);

      if (moved) {
        if (dx > threshold) index -= 1;
        else if (dx < -threshold) index += 1;
        update();

        // Block the "click" that can fire after a swipe.
        justSwiped = true;
        setTimeout(() => { justSwiped = false; }, 0);
      }

      if (pointerId != null) {
        try { viewport.releasePointerCapture(pointerId); } catch (_) {}
      }
      pointerId = null;
    };

    // If the browser still tries to click after swiping, cancel that click.
    viewport.addEventListener("click", (e) => {
      if (!justSwiped) return;
      if (isInteractive(e.target)) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);

    viewport.addEventListener("pointerdown", onDown);
    viewport.addEventListener("pointermove", onMove, { passive: false });
    viewport.addEventListener("pointerup", onUp);
    viewport.addEventListener("pointercancel", () => {
      isDown = false;
      moved = false;
      viewport.classList.remove("is-dragging");
      pointerId = null;
    });

    // Init
    buildDots();
    update();

    window.addEventListener("resize", () => update(), { passive: true });
  }

})();
