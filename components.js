/* ==========================================================================
   COMPONENTS.JS
   Builds the shared <header> and <footer> and mounts them into every page.
   ========================================================================== */

const CHS_NAV_LINKS = [
  { label: "Home", href: "index.html", match: ["", "index.html"] },
  { label: "About Us", href: "about.html", match: ["about.html"] },
  { label: "Admissions", href: "admissions.html", match: ["admissions.html"] },
  { label: "Events & News", href: "events.html", match: ["events.html"] },
  { label: "Past Papers", href: "past-papers.html", match: ["past-papers.html"] },
  { label: "Constitution", href: "constitution.html", match: ["constitution.html"] },
  { label: "Gallery", href: "gallery.html", match: ["gallery.html"] },
  { label: "Contact Us", href: "contact.html", match: ["contact.html"] },
];

function buildHeader() {
  const currentPath = window.location.pathname.split("/").pop() || "index.html";

  const linksHtml = CHS_NAV_LINKS.map((link) => {
    const isActive = link.match.includes(currentPath);
    return `<li><a href="${link.href}" class="${isActive ? "active" : ""}">${link.label}</a></li>`;
  }).join("");

  return `
    <div class="container header-inner">
      <a href="index.html" class="brand">
        <img src="congress.jpeg" alt="Congress High School Emblem" class="brand-logo">
        <div class="brand-text">
          <strong>Congress High School</strong>
          <span>Atya Omusana</span>
        </div>
      </a>

      <nav class="nav-menu" id="navLinks">
        <ul>
          ${linksHtml}
          <li>
            <a href="login.html" class="btn btn-navy btn-sm" style="margin-left: 10px; color: #fff;">Staff Login</a>
          </li>
        </ul>
      </nav>

      <button class="nav-toggle" id="navToggle" aria-label="Toggle navigation">
        <span></span><span></span><span></span>
      </button>
    </div>
  `;
}

function buildFooter() {
  const currentYear = new Date().getFullYear();

  return `
    <div class="container">
      <div class="footer-grid">
        <div class="footer-col">
          <div class="brand footer-brand">
            <img src="congress.jpeg" alt="Congress High School Emblem" class="brand-logo">
            <div class="brand-text">
              <strong style="color:#fff;">Congress High School</strong>
              <span style="color:var(--gold-light);">Atya Omusana</span>
            </div>
          </div>
          <p style="margin-top:14px; font-size:.9rem; color:rgba(255,255,255,.7);">
            Nurturing disciplined, academic, and morally upright leaders for tomorrow.
          </p>
        </div>

        <div class="footer-col">
          <h4>Quick Links</h4>
          <ul>
            <li><a href="about.html">About Us</a></li>
            <li><a href="admissions.html">Admissions</a></li>
            <li><a href="events.html">Events & News</a></li>
            <li><a href="past-papers.html">Past Papers</a></li>
            <li><a href="gallery.html">Photo Gallery</a></li>
          </ul>
        </div>

        <div class="footer-col">
          <h4>Portal & Governance</h4>
          <ul>
            <li><a href="constitution.html">School Constitution</a></li>
            <li><a href="contact.html">Contact Office</a></li>
            <li><a href="login.html">Staff Portal Login</a></li>
          </ul>
        </div>
      </div>

      <div class="footer-bottom">
        <p>&copy; ${currentYear} Congress High School. All rights reserved.</p>
      </div>
    </div>
  `;
}

function chsMountLayout() {
  const headerMount = document.getElementById("site-header");
  const footerMount = document.getElementById("site-footer");

  if (headerMount) {
    headerMount.innerHTML = `<header class="site-header" id="siteHeader">${buildHeader()}</header>`;
  }
  if (footerMount) {
    footerMount.innerHTML = `<footer class="site-footer">${buildFooter()}</footer>`;
  }

  // Mobile menu toggle logic
  const toggle = document.getElementById("navToggle");
  const links = document.getElementById("navLinks");
  if (toggle && links) {
    toggle.addEventListener("click", () => {
      const isOpen = links.classList.toggle("open");
      toggle.classList.toggle("open", isOpen);
      toggle.setAttribute("aria-expanded", String(isOpen));
    });

    links.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        links.classList.remove("open");
        toggle.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      })
    );
  }

  // Add scroll shadow to header
  const header = document.getElementById("siteHeader");
  if (header) {
    const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 8);
    document.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }
}

// Automatically mount layout when page loads
document.addEventListener("DOMContentLoaded", chsMountLayout);