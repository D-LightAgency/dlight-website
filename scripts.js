/* ============================================================================
   DLight Creatives :: Site Scripts
   ----------------------------------------------------------------------------
   Header scroll state, mobile nav + services accordion, reveal-on-scroll,
   marquee loop, contact form submission, and the footer year.
   All features attach only if their target elements exist.
   ============================================================================ */

(() => {
  "use strict";

  /* ------------------------------------------------------------------------
     Helpers & media queries
     ------------------------------------------------------------------------ */
  const DESKTOP_QUERY = window.matchMedia("(min-width: 961px)");
  const MOTION_QUERY = window.matchMedia("(prefers-reduced-motion: reduce)");

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const isDesktop = () => DESKTOP_QUERY.matches;
  const prefersReduced = () => MOTION_QUERY.matches;

  /* ------------------------------------------------------------------------
     Footer year
     ------------------------------------------------------------------------ */
  const setYear = () => {
    const el = $("#year");
    if (el) el.textContent = new Date().getFullYear();
  };

  /* ------------------------------------------------------------------------
     Header scroll state
     ------------------------------------------------------------------------ */
  const initHeaderScroll = () => {
    const header = $(".site-header");
    if (!header) return;

    let ticking = false;
    const update = () => {
      header.dataset.scrolled = window.scrollY > 16 ? "true" : "false";
      ticking = false;
    };
    update();

    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          window.requestAnimationFrame(update);
          ticking = true;
        }
      },
      { passive: true },
    );
  };

  /* ------------------------------------------------------------------------
     Navigation: mobile menu + services dropdown
     Uses data-open attributes (no class toggling) for clean state mgmt.
     ------------------------------------------------------------------------ */
  const initNav = () => {
    const toggle = $(".nav-toggle");
    const navList = $("#primary-menu");
    const dropdowns = $$(".dropdown");

    if (!toggle || !navList) return;

    const closeMobileMenu = () => {
      toggle.setAttribute("aria-expanded", "false");
      navList.removeAttribute("data-open");
      document.body.style.overflowY = "";
    };

    const openMobileMenu = () => {
      toggle.setAttribute("aria-expanded", "true");
      navList.dataset.open = "true";
      document.body.style.overflowY = "hidden";
    };

    const closeDropdown = (dropdown) => {
      dropdown.removeAttribute("data-open");
      const btn = dropdown.querySelector(".drop-toggle");
      if (btn) btn.setAttribute("aria-expanded", "false");
    };

    const closeAllDropdowns = () => dropdowns.forEach(closeDropdown);

    const openDropdown = (dropdown) => {
      dropdowns.forEach((d) => {
        if (d !== dropdown) closeDropdown(d);
      });
      dropdown.dataset.open = "true";
      const btn = dropdown.querySelector(".drop-toggle");
      if (btn) btn.setAttribute("aria-expanded", "true");
    };

    /* ---- Hamburger ---- */
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      if (open) {
        closeMobileMenu();
        closeAllDropdowns();
      } else {
        openMobileMenu();
      }
    });

    /* ---- Dropdown buttons (click) ---- */
    dropdowns.forEach((dropdown) => {
      const btn = dropdown.querySelector(".drop-toggle");
      if (!btn) return;

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = dropdown.dataset.open === "true";
        if (isOpen) closeDropdown(dropdown);
        else openDropdown(dropdown);
      });

      /* Hover behaviour on desktop only */
      let hoverTimer;
      dropdown.addEventListener("mouseenter", () => {
        if (!isDesktop()) return;
        window.clearTimeout(hoverTimer);
        openDropdown(dropdown);
      });
      dropdown.addEventListener("mouseleave", () => {
        if (!isDesktop()) return;
        hoverTimer = window.setTimeout(() => closeDropdown(dropdown), 160);
      });
    });

    /* ---- Click outside (desktop) closes dropdowns ---- */
    document.addEventListener("click", (e) => {
      if (!isDesktop()) return;
      if (!e.target.closest(".dropdown")) closeAllDropdowns();
    });

    /* ---- Escape key closes everything ---- */
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      closeAllDropdowns();
      if (toggle.getAttribute("aria-expanded") === "true") {
        closeMobileMenu();
        toggle.focus();
      }
    });

    /* ---- Tapping any nav link on mobile closes the menu ---- */
    $$(".nav-item a", navList).forEach((link) => {
      link.addEventListener("click", () => {
        if (!isDesktop()) closeMobileMenu();
      });
    });

    /* ---- If viewport crosses to desktop while menu is open, tidy up ---- */
    DESKTOP_QUERY.addEventListener("change", () => {
      if (isDesktop()) {
        closeMobileMenu();
        closeAllDropdowns();
      }
    });
  };

  /* ------------------------------------------------------------------------
     Reveal on scroll (fires once per element)
     ------------------------------------------------------------------------ */
  const initReveals = () => {
    const els = $$("[data-reveal], [data-reveal-stagger]");
    if (!els.length) return;

    /* Reduced motion: reveal immediately, no observer */
    if (prefersReduced() || !("IntersectionObserver" in window)) {
      els.forEach((el) => {
        el.dataset.revealed = "true";
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.dataset.revealed = "true";
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -8% 0px",
      },
    );

    els.forEach((el) => observer.observe(el));
  };

  /* ------------------------------------------------------------------------
     Marquee: clone children so the loop is seamless.
     CSS does translateX(-50%) on the track; we duplicate content to fill.
     ------------------------------------------------------------------------ */
  const initMarquees = () => {
    $$(".marquee__track").forEach((track) => {
      if (track.dataset.duplicated === "true") return;
      const originals = Array.from(track.children);
      originals.forEach((item) => {
        const clone = item.cloneNode(true);
        clone.setAttribute("aria-hidden", "true");
        clone.dataset.cloned = "true";
        track.appendChild(clone);
      });
      track.dataset.duplicated = "true";
    });
  };

  /* ------------------------------------------------------------------------
     Contact form (only attaches if present)
     Expects:
       <form class="contact-form" action="..." method="POST">
         ... fields ...
         <input type="text" name="website" tabindex="-1" autocomplete="off"
                aria-hidden="true" class="honeypot" /> (anti-spam)
         <button type="submit">...</button>
         <p class="form-status" data-form-status aria-live="polite"></p>
       </form>
     ------------------------------------------------------------------------ */
  const initContactForm = () => {
    const form = $(".contact-form");
    if (!form) return;

    const submitBtn = form.querySelector('[type="submit"]');
    const statusEl = form.querySelector("[data-form-status]");
    const honeypot = form.querySelector('[name="website"]');

    const setStatus = (message, state) => {
      if (!statusEl) return;
      statusEl.textContent = message;
      statusEl.dataset.state = state || "";
    };

    const setLoading = (loading) => {
      if (!submitBtn) return;
      submitBtn.disabled = loading;
      submitBtn.dataset.loading = loading ? "true" : "false";
      form.setAttribute("aria-busy", loading ? "true" : "false");
    };

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      /* Honeypot: if filled, fake success and do nothing. Bots get nowhere. */
      if (honeypot && honeypot.value.trim() !== "") {
        setStatus("Thanks. We will be in touch shortly.", "success");
        form.reset();
        return;
      }

      setLoading(true);
      setStatus("Sending your message\u2026", "loading");

      const data = Object.fromEntries(new FormData(form).entries());
      delete data.website;

      try {
        const res = await fetch(form.action, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (res.ok) {
          setStatus("Message sent. We will reply within 24 hours.", "success");
          form.reset();
        } else {
          setStatus(
            "That didn\u2019t go through. Please try again, or email us directly at hello.dlightagency@gmail.com.",
            "error",
          );
        }
      } catch (err) {
        setStatus(
          "Connection issue. Please check your network and try again.",
          "error",
        );
      } finally {
        setLoading(false);
      }
    });
  };

  /* ------------------------------------------------------------------------
     Init
     ------------------------------------------------------------------------ */
  const init = () => {
    setYear();
    initHeaderScroll();
    initNav();
    initReveals();
    initMarquees();
    initContactForm();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
