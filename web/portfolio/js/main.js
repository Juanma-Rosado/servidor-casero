/* ==========================================================
   main.js: JavaScript nativo compartido por todas las páginas.
   Cada bloque comprueba que existe el elemento que necesita,
   así el mismo archivo sirve para las 5 páginas.
   ========================================================== */

// Activa los estilos de .reveal (si JS falla, el contenido sigue visible)
document.documentElement.classList.add("js");

// ¿El usuario prefiere menos animaciones? Lo respetamos en los efectos más pesados
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.addEventListener("DOMContentLoaded", () => {

  /* ---------- 1. MENÚ HAMBURGUESA ---------- */
  const toggle = document.querySelector(".nav__toggle");
  const menu = document.querySelector(".nav__menu");

  function setMenu(open) {
    menu.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
  }
  toggle.addEventListener("click", () => setMenu(!menu.classList.contains("open")));

  /* ---------- 2. ENLACE ACTIVO SEGÚN LA PÁGINA ACTUAL ---------- */
  // Ejemplo: en /sobre-mi.html la última parte de la ruta es "sobre-mi.html"
  const current = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav__menu a").forEach((a) => {
    if (a.getAttribute("href") === current) a.classList.add("active");
  });

  /* ---------- 3. TRANSICIÓN ENTRE PÁGINAS ---------- */
  // Al pulsar un enlace interno, desvanecemos la página y luego navegamos
  document.querySelectorAll('a[href$=".html"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      if (e.ctrlKey || e.metaKey || link.target === "_blank" || reduceMotion) return;
      e.preventDefault();
      document.body.classList.add("leaving");
      setTimeout(() => (window.location.href = link.href), 250);
    });
  });
  // Si el usuario vuelve atrás, quitamos el desvanecido
  window.addEventListener("pageshow", () => document.body.classList.remove("leaving"));

  /* ---------- 4. BARRA DE PROGRESO DEL SCROLL ---------- */
  const progress = document.querySelector(".progress");
  window.addEventListener("scroll", () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + "%";
  }, { passive: true });

  /* ---------- 5. APARICIÓN AL HACER SCROLL (.reveal) ---------- */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("show");
      revealObserver.unobserve(entry.target);          // solo la primera vez
    });
  }, { threshold: 0.15 });

  document.querySelectorAll(".reveal").forEach((el, i) => {
    el.style.transitionDelay = (i % 4) * 90 + "ms";    // efecto escalonado
    revealObserver.observe(el);
  });

  /* ---------- 6. INCLINACIÓN 3D DE LAS TARJETAS (.tilt) ---------- */
  if (!reduceMotion) {
    document.querySelectorAll(".tilt").forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;   // de -0.5 a 0.5
        const y = (e.clientY - r.top) / r.height - 0.5;
        card.style.setProperty("--ry", x * 10 + "deg");
        card.style.setProperty("--rx", -y * 10 + "deg");
      });
      card.addEventListener("mouseleave", () => {
        card.style.setProperty("--rx", "0deg");
        card.style.setProperty("--ry", "0deg");
      });
    });
  }

  /* ---------- 7. LUZ QUE SIGUE AL RATÓN ---------- */
  if (!reduceMotion && window.matchMedia("(hover: hover)").matches) {
    const glow = document.createElement("div");
    glow.className = "glow";
    document.body.prepend(glow);
    window.addEventListener("mousemove", (e) => {
      glow.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    });
  }

  /* ---------- 8. EFECTO DE ESCRITURA (solo en el inicio) ---------- */
  const typed = document.getElementById("typed");
  if (typed) {
    const words = typed.dataset.words.split("|");
    let w = 0, i = 0, deleting = false;

    function type() {
      const word = words[w];
      typed.textContent = word.slice(0, i);

      if (!deleting && i === word.length) {            // palabra completa: pausa
        deleting = true;
        return setTimeout(type, 1500);
      }
      if (deleting && i === 0) {                        // borrada: siguiente palabra
        deleting = false;
        w = (w + 1) % words.length;
      }
      i += deleting ? -1 : 1;
      setTimeout(type, deleting ? 35 : 75);
    }
    reduceMotion ? (typed.textContent = words[0]) : type();
  }

  /* ---------- 9. RED DE PARTÍCULAS EN EL HERO ---------- */
  const canvas = document.getElementById("net");
  if (canvas && !reduceMotion) {
    const ctx = canvas.getContext("2d");
    let w, h, dots;

    // Ajusta el tamaño del canvas y crea los puntos
    function init() {
      w = canvas.width = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
      dots = Array.from({ length: Math.min(70, Math.floor(w / 18)) }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
      }));
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      dots.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy;                       // mover
        if (p.x < 0 || p.x > w) p.vx *= -1;             // rebotar en los bordes
        if (p.y < 0 || p.y > h) p.vy *= -1;

        ctx.fillStyle = "rgba(43,179,201,.8)";
        ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fill();

        // Unir con línea los puntos cercanos (más transparente cuanto más lejos)
        for (let j = i + 1; j < dots.length; j++) {
          const d = Math.hypot(p.x - dots[j].x, p.y - dots[j].y);
          if (d < 120) {
            ctx.strokeStyle = `rgba(124,92,255,${0.35 * (1 - d / 120)})`;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(dots[j].x, dots[j].y); ctx.stroke();
          }
        }
      });
      requestAnimationFrame(draw);
    }

    init();
    draw();
    window.addEventListener("resize", init);
  }

  /* ---------- 10. FORMULARIO DE CONTACTO ---------- */
  const form = document.getElementById("form");
  if (form) {
    const status = form.querySelector(".form__status");
    const EMAIL_DESTINO = "rosadotrujillojuanma@gmail.com";
    const inputs = form.querySelectorAll("input, textarea");

    // Valida un campo y muestra el error debajo de él
    function validate(input) {
      const field = input.closest(".field");
      let message = "";

      if (!input.value.trim()) {
        message = "Este campo es obligatorio.";
      } else if (input.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) {
        message = "Escribe un correo válido, por ejemplo nombre@correo.com.";
      } else if (input.name === "mensaje" && input.value.trim().length < 10) {
        message = "El mensaje debe tener al menos 10 caracteres.";
      }

      field.querySelector(".error").textContent = message;
      field.classList.toggle("invalid", Boolean(message));
      return !message;
    }

    inputs.forEach((input) => input.addEventListener("blur", () => validate(input)));

    form.addEventListener("submit", (e) => {
      e.preventDefault();                               // evita recargar la página
      if (![...inputs].map(validate).every(Boolean)) {
        status.textContent = "Revisa los campos marcados.";
        return;
      }

      // Sin servidor: abrimos el correo con el mensaje escrito.
      // Más adelante puedes sustituirlo por fetch() a un servicio como Formspree.
      const nombre = form.nombre.value.trim();
      const cuerpo = `${form.mensaje.value.trim()}\n\nDe: ${nombre} (${form.email.value.trim()})`;
      window.location.href =
        `mailto:${EMAIL_DESTINO}?subject=${encodeURIComponent("Contacto desde el portfolio: " + nombre)}` +
        `&body=${encodeURIComponent(cuerpo)}`;

      status.textContent = "Abriendo tu aplicación de correo…";
      form.reset();
    });
  }

  /* ---------- 11. AÑO AUTOMÁTICO EN EL PIE ---------- */
  document.getElementById("year").textContent = new Date().getFullYear();
});
