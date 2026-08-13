import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText);

const root = document.documentElement;

/**
 * Marca que GSAP cargó bien. El script inline del <head> vigila esta clase:
 * si nunca aparece, quita `.js` y el CSS vuelve a mostrar todo sin animar.
 */
root.classList.add("gsap-ready");

gsap.defaults({ ease: "power3.out", duration: 0.8 });

// Acceso a gsap desde la consola para depurar (solo en `astro dev`).
if (import.meta.env.DEV) {
  (window as unknown as { gsap: typeof gsap }).gsap = gsap;
}

/* Entrada del hero: eyebrow, título por líneas, subtítulo, texto y botones. */
function heroIntro() {
  const title = document.querySelector<HTMLElement>("[data-hero='title']");

  if (title) {
    // El título ya está oculto por CSS: lo mostramos y animamos sus líneas.
    gsap.set(title, { opacity: 1 });

    SplitText.create(title, {
      type: "lines",
      mask: "lines",
      autoSplit: true,
      // OJO: `onSplit` debe devolver una animación *propia*. SplitText la
      // revierte y la vuelve a crear en cada re-split (al cargar las fuentes
      // o al cambiar el ancho). Si acá devolviéramos la timeline de la intro,
      // ese revert se llevaría puesta toda la entrada del hero.
      onSplit: (self) =>
        gsap.fromTo(
          self.lines,
          { yPercent: 115 },
          { yPercent: 0, duration: 1, stagger: 0.12, delay: 0.3 }
        ),
    });
  }

  // El título va por fuera de la timeline, así que usamos posiciones absolutas
  // en vez de offsets relativos.
  const tl = gsap.timeline({ defaults: { duration: 0.9 } });

  tl.fromTo(
    "[data-hero='eyebrow']",
    { opacity: 0, y: 16 },
    { opacity: 1, y: 0, duration: 0.6 },
    0
  )
    .fromTo(
      "[data-hero='subtitle']",
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0 },
      1
    )
    .fromTo("[data-hero='text']", { opacity: 0, y: 24 }, { opacity: 1, y: 0 }, 1.15)
    .fromTo(
      "[data-hero='actions'] > *",
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.12 },
      1.3
    );

  // El contenedor de botones también arranca oculto por CSS: solo animamos sus hijos.
  gsap.set("[data-hero='actions']", { opacity: 1 });

  // Glow de fondo con respiración infinita.
  const glow = document.querySelector<HTMLElement>("[data-hero-glow]");
  if (glow) {
    gsap.fromTo(
      glow,
      { opacity: 0, scale: 0.7 },
      { opacity: 1, scale: 1, duration: 1.6, ease: "power2.out" }
    );
    gsap.to(glow, {
      xPercent: 12,
      yPercent: -10,
      scale: 1.15,
      duration: 9,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
    });
  }

  return tl;
}

/**
 * Al terminar una entrada, borramos el transform inline que deja GSAP
 * (`translate(0px, 0px)`), porque un estilo inline le gana al `:hover` del CSS
 * y dejaría muerto el efecto de elevación de las tarjetas. La clase
 * `is-revealed` devuelve además las transiciones CSS, que apagamos mientras
 * GSAP anima para que no compitan.
 */
function settle(targets: HTMLElement[]) {
  gsap.set(targets, { clearProps: "transform" });
  targets.forEach((el) => el.classList.add("is-revealed"));
}

/* Revela elementos sueltos ([data-anim]) al entrar en viewport. */
function revealSingles() {
  const map: Record<string, gsap.TweenVars> = {
    "fade-up": { y: 40 },
    "fade-left": { x: -40 },
    "fade-right": { x: 40 },
    zoom: { scale: 0.92 },
  };

  gsap.utils
    .toArray<HTMLElement>("[data-anim]")
    .forEach((el) => {
      const from = map[el.dataset.anim || "fade-up"] ?? map["fade-up"];
      gsap.fromTo(
        el,
        { opacity: 0, ...from },
        {
          opacity: 1,
          x: 0,
          y: 0,
          scale: 1,
          onComplete: () => settle([el]),
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        }
      );
    });
}

/**
 * Revela grupos ([data-anim-group]) con stagger.
 *
 * Usamos `batch` y no un único trigger por grupo: la grilla de proyectos mide
 * ~10 filas, y con un solo trigger las 30 tarjetas arrancan juntas y las de
 * abajo terminan de animarse mucho antes de que el usuario llegue a verlas.
 * `batch` agrupa las que entran al viewport juntas, o sea fila por fila.
 */
function revealGroups() {
  gsap.utils
    .toArray<HTMLElement>("[data-anim-group]")
    .forEach((group) => {
      const items = gsap.utils.toArray<HTMLElement>(group.children);
      if (!items.length) return;

      gsap.set(items, { y: 36 });

      ScrollTrigger.batch(items, {
        start: "top 90%",
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, {
            opacity: 1,
            y: 0,
            duration: 0.7,
            stagger: 0.07,
            overwrite: true,
            onComplete: () => settle(batch as HTMLElement[]),
          }),
      });
    });
}

/* Barras de idiomas: crecen desde la izquierda al llegar a la sección. */
function progressBars() {
  gsap.utils.toArray<HTMLElement>("[data-bar]").forEach((track) => {
    const fill = track.firstElementChild;
    if (!fill) return;

    gsap.fromTo(
      fill,
      { scaleX: 0 },
      {
        scaleX: 1,
        duration: 1.2,
        ease: "power2.inOut",
        transformOrigin: "left center",
        scrollTrigger: { trigger: track, start: "top 92%", once: true },
      }
    );
  });
}

/* Nav: entrada, barra de progreso de scroll, fondo al bajar y link activo. */
function navEffects() {
  gsap.from("[data-nav]", { yPercent: -100, duration: 0.7, ease: "power2.out" });

  const progress = document.querySelector<HTMLElement>("[data-scroll-progress]");
  if (progress) {
    gsap.fromTo(
      progress,
      { scaleX: 0 },
      {
        scaleX: 1,
        ease: "none",
        transformOrigin: "left center",
        scrollTrigger: { start: 0, end: () => ScrollTrigger.maxScroll(window), scrub: 0.3 },
      }
    );
  }

  ScrollTrigger.create({
    start: "top -80",
    end: 99999,
    onToggle: (self) =>
      document.querySelector("[data-nav]")?.classList.toggle("is-scrolled", self.isActive),
  });

  document
    .querySelectorAll<HTMLAnchorElement>('.nav-links a[href^="#"]')
    .forEach((link) => {
      const section = document.querySelector(link.hash);
      if (!section) return;

      ScrollTrigger.create({
        trigger: section,
        start: "top 40%",
        end: "bottom 40%",
        onToggle: (self) => link.classList.toggle("is-active", self.isActive),
      });
    });
}

/* Efecto magnético en los botones (solo mouse fino). */
function magneticButtons() {
  const cleanups: Array<() => void> = [];

  document.querySelectorAll<HTMLElement>(".btn").forEach((btn) => {
    const xTo = gsap.quickTo(btn, "x", { duration: 0.4, ease: "power3" });
    const yTo = gsap.quickTo(btn, "y", { duration: 0.4, ease: "power3" });

    const move = (e: MouseEvent) => {
      const r = btn.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * 0.3);
      yTo((e.clientY - (r.top + r.height / 2)) * 0.5);
    };
    const reset = () => {
      xTo(0);
      yTo(0);
    };

    btn.addEventListener("mousemove", move);
    btn.addEventListener("mouseleave", reset);
    cleanups.push(() => {
      btn.removeEventListener("mousemove", move);
      btn.removeEventListener("mouseleave", reset);
      gsap.set(btn, { clearProps: "x,y" });
    });
  });

  return () => cleanups.forEach((fn) => fn());
}

const mm = gsap.matchMedia();

mm.add(
  {
    motionOk: "(prefers-reduced-motion: no-preference)",
    hoverOk: "(hover: hover) and (pointer: fine)",
  },
  (self) => {
    const { motionOk, hoverOk } = self.conditions as {
      motionOk: boolean;
      hoverOk: boolean;
    };

    // Con "reducir movimiento" el CSS ya deja todo visible: no animamos nada.
    if (!motionOk) return;

    heroIntro();
    revealSingles();
    revealGroups();
    progressBars();
    navEffects();

    if (hoverOk) return magneticButtons();
  }
);

// Las tarjetas de proyectos dependen de fuentes/emoji: recalcular al cargar todo.
window.addEventListener("load", () => ScrollTrigger.refresh());
