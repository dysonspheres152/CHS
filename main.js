/* ==========================================================================
   MAIN.JS
   Generic, reusable front-end behaviour shared by every public page:
     1. Scroll-reveal animation  (.reveal elements)
     2. Animated number counters (.counter-num[data-target])
     3. Lightweight image slider (.slider)
     4. Back-to-top button
   Nothing in this file talks to Supabase — see js/data.js for that.
   ========================================================================== */

/* ---------- 1. Scroll reveal ---------- */
function initScrollReveal() {
  const items = document.querySelectorAll(".reveal");
  if (!items.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  items.forEach((item, i) => {
    item.style.setProperty("--i", i % 8);
    observer.observe(item);
  });
}

/* ---------- 2. Animated counters ---------- */
function animateCounter(el) {
  const target = parseInt(el.getAttribute("data-target"), 10) || 0;
  const duration = 1400; // ms
  const start = performance.now();

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    // ease-out for a natural "settling" feel
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target).toLocaleString();
    if (progress < 1) requestAnimationFrame(tick);
    else el.textContent = target.toLocaleString() + (el.getAttribute("data-suffix") || "");
  }
  requestAnimationFrame(tick);
}

function initCounters() {
  const counters = document.querySelectorAll(".counter-num[data-target]");
  if (!counters.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );
  counters.forEach((c) => observer.observe(c));
}

/* ---------- 3. Image / content slider ---------- */
// Turns any <div class="slider"> containing <div class="slider-track"> and
// several <div class="slide"> children into an auto-playing carousel with
// arrow buttons and dot navigation. Call initSliders() after slide markup
// exists in the DOM (works for both static markup and Supabase-rendered).
function initSliders() {
  document.querySelectorAll(".slider").forEach((slider) => {
    if (slider.dataset.initialized) return; // avoid double-init
    const track = slider.querySelector(".slider-track");
    const slides = Array.from(slider.querySelectorAll(".slide"));
    if (!track || slides.length === 0) return;

    let index = 0;
    let autoTimer = null;

    // Build dots
    let dotsWrap = slider.querySelector(".slider-dots");
    if (!dotsWrap) {
      dotsWrap = document.createElement("div");
      dotsWrap.className = "slider-dots";
      slider.appendChild(dotsWrap);
    }
    dotsWrap.innerHTML = slides
      .map((_, i) => `<button aria-label="Go to slide ${i + 1}" data-i="${i}"></button>`)
      .join("");

    function render() {
      track.style.transform = `translateX(-${index * 100}%)`;
      dotsWrap.querySelectorAll("button").forEach((b, i) => b.classList.toggle("active", i === index));
    }

    function go(i) {
      index = (i + slides.length) % slides.length;
      render();
    }

    dotsWrap.querySelectorAll("button").forEach((b) =>
      b.addEventListener("click", () => {
        go(parseInt(b.dataset.i, 10));
        resetAutoplay();
      })
    );

    // Arrow controls (create once)
    let controls = slider.querySelector(".slider-controls");
    if (!controls) {
      controls = document.createElement("div");
      controls.className = "slider-controls";
      controls.innerHTML = `
        <button class="slider-btn prev" aria-label="Previous slide">&#8249;</button>
        <button class="slider-btn next" aria-label="Next slide">&#8250;</button>`;
      slider.appendChild(controls);
    }
    controls.querySelector(".prev").addEventListener("click", () => {
      go(index - 1);
      resetAutoplay();
    });
    controls.querySelector(".next").addEventListener("click", () => {
      go(index + 1);
      resetAutoplay();
    });

    function resetAutoplay() {
      clearInterval(autoTimer);
      autoTimer = setInterval(() => go(index + 1), 5000);
    }

    render();
    resetAutoplay();
    slider.dataset.initialized = "true";
  });
}

/* ---------- 4. Back to top button ---------- */
function initBackToTop() {
  const btn = document.createElement("button");
  btn.className = "to-top";
  btn.setAttribute("aria-label", "Back to top");
  btn.innerHTML = "&#8593;";
  document.body.appendChild(btn);

  document.addEventListener(
    "scroll",
    () => btn.classList.toggle("show", window.scrollY > 500),
    { passive: true }
  );
  btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

/* ---------- Boot ---------- */
document.addEventListener("DOMContentLoaded", () => {
  initScrollReveal();
  initCounters();
  initSliders();
  initBackToTop();
});

// Expose initSliders/initScrollReveal globally so data.js can re-run them
// after it injects Supabase content dynamically (e.g. gallery images).
window.CHS = window.CHS || {};
window.CHS.initSliders = initSliders;
window.CHS.initScrollReveal = initScrollReveal;
window.CHS.initCounters = initCounters;
