/* Coco Villas: click-through walk around the villa, enquiry form and section reveals.
   Plain JavaScript, no build step. */
(() => {
  "use strict";

  document.documentElement.classList.add("sg-js");

  const CLIP_WAIT_MS = 9000;
  const CLIP_WATCHDOG_MS = 11000;
  const FADE_MS = 800;

  // The walk, in order. Spot x and y are fractions of the 16:9 picture; a spot with `to`
  // moves the camera to that scene, a spot with `note` opens a short description.
  const SCENES = [
    {
      id: "bok",
      name: "Ogród",
      title: "Od strony ogrodu",
      text: "Dwie kondygnacje szkła, kamienia i bieli. Basen wisi nad ogrodem, a na taras prowadzą szerokie kamienne schody.",
      spots: [
        { to: "front", label: "Obejdź basen", x: 0.62, y: 0.7 },
        { id: "mury", label: "Kamienne mury", x: 0.52, y: 0.9, note: "Cokół i ściany oporowe z kamienia łamanego, tego samego co we wnętrzach." },
        { id: "pergola", label: "Jadalnia pod pergolą", x: 0.84, y: 0.6, note: "Zadaszony stół i grill tuż przy basenie." },
      ],
    },
    {
      id: "front",
      name: "Basen",
      title: "Front i basen",
      text: "Basen z przelewem biegnie wzdłuż całego salonu. Na piętrze sypialnie z widokiem na wodę.",
      spots: [
        { to: "salon", label: "Wejdź do salonu", x: 0.5, y: 0.58 },
        { id: "basen", label: "Basen z przelewem", x: 0.62, y: 0.8, note: "Szklana krawędź od strony ogrodu i podświetlenie na wieczór." },
      ],
    },
    {
      id: "salon",
      name: "Salon",
      title: "Salon",
      text: "Parter to jedna przestrzeń: salon, kuchnia i jadalnia. Szklana ściana otwiera się prosto na taras i basen.",
      spots: [
        { to: "kuchnia", label: "Kuchnia i jadalnia", x: 0.58, y: 0.5 },
        { id: "sufit", label: "Sufit z listew", x: 0.6, y: 0.16, note: "Drewniane listwy nad salonem i ciche wentylatory w suficie." },
      ],
    },
    {
      id: "kuchnia",
      name: "Kuchnia",
      title: "Kuchnia i jadalnia",
      text: "Marmurowa wyspa z barem na cztery hokery i stół z litego drewna na osiem osób, z widokiem na basen.",
      spots: [
        { to: "sypialnia", label: "Na piętro, do sypialni", x: 0.84, y: 0.3 },
        { id: "wyspa", label: "Wyspa z marmuru", x: 0.47, y: 0.6, note: "Blat z marmuru, zabudowa z jasnego drewna i sprzęt w zabudowie w cenie." },
      ],
    },
    {
      id: "sypialnia",
      name: "Sypialnia",
      title: "Sypialnia główna",
      text: "Szkło z dwóch stron, kamienna ściana i drewniane łóżko z wbudowanym zagłówkiem.",
      spots: [
        { to: "lazienka", label: "Łazienka", x: 0.86, y: 0.45 },
        { id: "naroznik", label: "Szklany narożnik", x: 0.15, y: 0.38, note: "Przesuwne szyby od podłogi do sufitu, a za nimi tropikalny ogród." },
      ],
    },
    {
      id: "lazienka",
      name: "Łazienka",
      title: "Łazienka z wanną",
      text: "Wolnostojąca wanna z marmuru przy ścianie z kamienia. Każda z trzech sypialni ma własną łazienkę.",
      spots: [
        { to: "bok", label: "Wyjdź do ogrodu", x: 0.84, y: 0.5 },
        { id: "kamien", label: "Ściana z kamienia", x: 0.5, y: 0.3, note: "Ten sam kamień co na zewnątrz, więc łazienka i ogród wyglądają jak jedno." },
      ],
    },
  ];

  // Camera moves between neighbouring scenes. Going back plays the same film reversed.
  const CLIPS = {
    "bok>front": "t1",
    "front>salon": "t2",
    "salon>kuchnia": "t3",
    "sypialnia>lazienka": "t4",
  };

  const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const compactQuery = window.matchMedia("(max-width: 1023px)");
  const motionOk = () => !reducedQuery.matches;
  const pad = (n) => String(n).padStart(2, "0");

  // Start buffering a clip that was created with preload="none".
  function warm(video) {
    if (!video || !video.getAttribute("src")) return;
    if (video.preload !== "auto") video.preload = "auto";
    if (video.readyState === 0 && video.networkState !== HTMLMediaElement.NETWORK_LOADING) video.load();
  }

  // Resolves when the clip can play through, or with whatever is buffered at the deadline.
  function waitReady(video, ms) {
    return new Promise((resolve, reject) => {
      if (video.readyState >= 4) {
        resolve();
        return;
      }
      const finish = (ok) => {
        window.clearTimeout(timer);
        video.removeEventListener("canplaythrough", onReady);
        video.removeEventListener("error", onError);
        if (ok) resolve();
        else reject(new Error("clip unavailable"));
      };
      const onReady = () => finish(true);
      const onError = () => finish(false);
      const timer = window.setTimeout(() => finish(video.readyState >= 3), ms);
      video.addEventListener("canplaythrough", onReady);
      video.addEventListener("error", onError);
    });
  }

  function initWalk() {
    const section = document.getElementById("spacer");
    if (!section) return;
    const pick = (selector) => section.querySelector(selector);
    const layersEl = pick("[data-layers]");
    const spotsEl = pick("[data-spots]");
    const titleEl = pick("[data-title]");
    const textEl = pick("[data-text]");
    const notesEl = pick("[data-notes]");
    const countEl = pick("[data-count]");
    const actionsEl = pick("[data-actions]");
    const mapEl = pick("[data-map]");
    const liveEl = pick("[data-live]");
    pick("[data-total]").textContent = pad(SCENES.length);

    const byId = Object.fromEntries(SCENES.map((scene, index) => [scene.id, { ...scene, index }]));
    const state = { current: SCENES[0].id, note: null, busy: false, loading: null };
    let watchdog = 0;

    const stills = {};
    for (const scene of SCENES) {
      const img = document.createElement("img");
      img.className = "tr-layer";
      img.alt = scene.title;
      img.width = 1920;
      img.height = 1080;
      img.decoding = "async";
      img.sizes = "(max-width: 1023px) 100vw, 120vw";
      img.srcset = `assets/scenes/${scene.id}-1280.webp 1280w, assets/scenes/${scene.id}-1920.webp 1920w`;
      img.src = `assets/scenes/${scene.id}-1920.webp`;
      if (scene.id !== state.current) img.loading = "lazy";
      layersEl.appendChild(img);
      stills[scene.id] = img;
    }

    const videos = {};
    function clipFor(from, to) {
      if (CLIPS[`${from}>${to}`]) return CLIPS[`${from}>${to}`];
      if (CLIPS[`${to}>${from}`]) return `${CLIPS[`${to}>${from}`]}-r`;
      return null;
    }

    function video(name) {
      if (videos[name]) return videos[name];
      const el = document.createElement("video");
      el.className = "tr-layer";
      el.muted = true;
      el.playsInline = true;
      el.setAttribute("muted", "");
      el.setAttribute("playsinline", "");
      el.setAttribute("disablepictureinpicture", "");
      el.setAttribute("aria-hidden", "true");
      el.preload = "none";
      el.tabIndex = -1;
      el.src = `assets/video/${name}${compactQuery.matches ? "-m" : ""}.mp4`;
      layersEl.appendChild(el);
      videos[name] = el;
      return el;
    }

    // Buffer the films that leave the current scene, so the next click starts at once.
    function warmAround(id) {
      if (!motionOk()) return;
      for (const other of SCENES) {
        const name = clipFor(id, other.id);
        if (name) warm(video(name));
      }
    }

    function setBusy(busy) {
      state.busy = busy;
      section.dataset.busy = String(busy);
    }

    function show(id, instant) {
      const img = stills[id];
      if (instant) img.style.transition = "none";
      img.dataset.on = "true";
      if (instant) {
        void img.offsetWidth;
        img.style.transition = "";
      }
    }

    function hideOthers(id, instant) {
      for (const [key, img] of Object.entries(stills)) {
        if (key === id) continue;
        if (instant) img.style.transition = "none";
        img.dataset.on = "false";
        if (instant) {
          void img.offsetWidth;
          img.style.transition = "";
        }
      }
    }

    function arrive(id, instant) {
      window.clearTimeout(watchdog);
      state.current = id;
      state.note = null;
      show(id, instant);
      hideOthers(id, instant);
      for (const el of Object.values(videos)) {
        el.dataset.on = "false";
        el.pause();
      }
      setBusy(false);
      render(true);
      warmAround(id);
    }

    async function go(to) {
      if (state.busy || to === state.current || !byId[to]) return;
      const from = state.current;
      const name = clipFor(from, to);
      if (!name || !motionOk()) {
        crossfade(to);
        return;
      }
      const clip = video(name);
      state.loading = to;
      render(false);
      try {
        warm(clip);
        await waitReady(clip, CLIP_WAIT_MS);
        if (state.current !== from) return;
        state.loading = null;
        setBusy(true);
        clip.currentTime = 0;
        clip.dataset.on = "true";
        clip.onended = () => {
          if (state.busy) arrive(to, true);
        };
        // A stalled film never traps the visitor: move on after a generous deadline.
        watchdog = window.setTimeout(() => {
          if (state.busy) arrive(to, false);
        }, CLIP_WATCHDOG_MS);
        await clip.play();
      } catch {
        state.loading = null;
        crossfade(to);
      }
    }

    async function crossfade(to) {
      setBusy(true);
      const img = stills[to];
      // Never fade into a picture that is still downloading on a slow connection.
      img.loading = "eager";
      if (!(img.complete && img.naturalWidth)) {
        await Promise.race([img.decode().catch(() => {}), new Promise((resolve) => window.setTimeout(resolve, 2500))]);
      }
      img.style.zIndex = "1";
      show(to, false);
      window.setTimeout(() => {
        img.style.zIndex = "";
        arrive(to, true);
      }, FADE_MS);
    }

    function step(delta) {
      const next = SCENES[byId[state.current].index + delta];
      if (next) go(next.id);
    }

    function spotEl(spot) {
      const wrap = document.createElement("div");
      wrap.className = "tr-spot";
      wrap.dataset.side = spot.x > 0.68 ? "left" : "right";
      wrap.style.left = `${spot.x * 100}%`;
      wrap.style.top = `${spot.y * 100}%`;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "tr-spot-btn";
      button.dataset.kind = spot.to ? "go" : "info";
      if (!spot.to) button.setAttribute("aria-expanded", String(state.note === spot.id));
      const ring = document.createElement("span");
      ring.className = "tr-spot-ring";
      ring.setAttribute("aria-hidden", "true");
      const label = document.createElement("span");
      label.className = "tr-spot-label";
      label.textContent = spot.label;
      if (spot.to) {
        const arrow = document.createElement("span");
        arrow.className = "tr-spot-go";
        arrow.setAttribute("aria-hidden", "true");
        arrow.textContent = "→";
        label.appendChild(arrow);
      }
      button.append(ring, label);
      button.addEventListener("click", () => (spot.to ? go(spot.to) : toggleNote(spot.id)));
      wrap.appendChild(button);
      if (!spot.to && state.note === spot.id) {
        const note = document.createElement("p");
        note.className = "tr-note";
        note.textContent = spot.note;
        wrap.appendChild(note);
      }
      return wrap;
    }

    function actionButton(label, kind, onClick, loading) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "tr-btn";
      button.dataset.kind = kind;
      button.dataset.loading = String(Boolean(loading));
      button.textContent = loading ? "Wczytuję" : label;
      button.addEventListener("click", onClick);
      return button;
    }

    function toggleNote(id) {
      state.note = state.note === id ? null : id;
      render(false);
    }

    function render(arrived) {
      const scene = byId[state.current];
      countEl.textContent = pad(scene.index + 1);
      if (arrived) {
        titleEl.textContent = scene.title;
        titleEl.style.animation = "none";
        void titleEl.offsetWidth;
        titleEl.style.animation = "";
        textEl.textContent = scene.text;
        liveEl.textContent = `${scene.title}. ${scene.text}`;
      }

      spotsEl.replaceChildren(...scene.spots.map(spotEl));

      const goSpots = scene.spots.filter((spot) => spot.to);
      const notes = scene.spots.filter((spot) => spot.note);
      actionsEl.replaceChildren(
        ...goSpots.map((spot) => actionButton(`${spot.label} →`, "go", () => go(spot.to), state.loading === spot.to)),
        ...(scene.index > 0 ? [actionButton("← Wstecz", "back", () => step(-1), false)] : []),
      );
      // On phones the spots are hidden, so their notes join the caption as plain text.
      notesEl.hidden = !(compactQuery.matches && notes.length);
      notesEl.textContent = notes.map((spot) => spot.note).join(" ");

      mapEl.querySelectorAll("button").forEach((button) => {
        if (button.dataset.scene === state.current) button.setAttribute("aria-current", "step");
        else button.removeAttribute("aria-current");
      });
    }

    for (const scene of SCENES) {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.scene = scene.id;
      button.textContent = scene.name;
      button.addEventListener("click", () => go(scene.id));
      item.appendChild(button);
      mapEl.appendChild(item);
    }

    spotsEl.addEventListener("pointerdown", (event) => {
      if (state.note && !event.target.closest(".tr-spot")) toggleNote(state.note);
    });
    section.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && state.note) toggleNote(state.note);
    });
    compactQuery.addEventListener("change", () => {
      for (const [name, el] of Object.entries(videos)) el.src = `assets/video/${name}${compactQuery.matches ? "-m" : ""}.mp4`;
      render(false);
    });

    arrive(state.current, true);
  }

  // Concept version: the form checks the fields and shows the thank-you state, but sends nothing.
  function initForm() {
    const form = document.querySelector("[data-form]");
    const done = document.querySelector("[data-form-done]");
    if (!form || !done) return;
    const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const PHONE = /^[+\d\s()-]{9,20}$/;
    const CHECKED = ["name", "email", "phone", "consent"];
    const CHANNELS = {
      whatsapp: "na WhatsAppie",
      wideo: "e-mailem z linkiem do wideorozmowy",
      telefon: "telefonicznie",
      email: "e-mailem",
    };
    const field = (name) => form.elements.namedItem(name);
    const value = (name) => (field(name).value || "").trim();

    function check() {
      const errors = {};
      const channel = field("channel").value;
      if (value("name").length < 2) errors.name = "Wpisz imię i nazwisko.";
      if (!EMAIL.test(value("email"))) errors.email = "Wpisz poprawny adres e-mail.";
      if (value("phone") && !PHONE.test(value("phone"))) errors.phone = "Numer może mieć cyfry, spacje i znak +.";
      else if (!value("phone") && (channel === "whatsapp" || channel === "telefon"))
        errors.phone = channel === "whatsapp" ? "Podaj numer, żebyśmy mogli napisać na WhatsAppie." : "Podaj numer, żebyśmy mogli zadzwonić.";
      if (!field("consent").checked) errors.consent = "Bez tej zgody nie możemy odpowiedzieć.";
      return errors;
    }

    function showError(name, message) {
      const wrap = form.querySelector(`[data-field="${name}"]`);
      const input = field(name);
      const error = document.getElementById(`f-${name}-error`);
      wrap.dataset.invalid = String(Boolean(message));
      input.setAttribute("aria-invalid", String(Boolean(message)));
      if (message) {
        error.textContent = message;
        error.hidden = false;
        input.setAttribute("aria-describedby", error.id);
      } else {
        error.hidden = true;
        input.removeAttribute("aria-describedby");
      }
    }

    for (const name of CHECKED) {
      field(name).addEventListener(name === "consent" ? "change" : "input", () => showError(name, ""));
    }
    form.querySelectorAll('input[name="channel"]').forEach((input) => input.addEventListener("change", () => showError("phone", "")));

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const errors = check();
      for (const name of CHECKED) showError(name, errors[name] || "");
      const first = CHECKED.find((name) => errors[name]);
      if (first) {
        field(first).focus();
        return;
      }
      const firstName = value("name").split(/\s+/)[0];
      const villa = field("villa").value;
      done.querySelector("[data-done-title]").textContent = `Dziękujemy, ${firstName}.`;
      done.querySelector("[data-done-text]").textContent =
        `Odezwiemy się ${CHANNELS[field("channel").value]} w ciągu jednego dnia roboczego${villa ? ` z dostępnością willi ${villa}` : " z porównaniem czterech willi"}.`;
      form.hidden = true;
      done.hidden = false;
    });
  }

  function initReveal() {
    const items = document.querySelectorAll("[data-reveal]");
    if (!("IntersectionObserver" in window)) {
      items.forEach((el) => el.setAttribute("data-shown", ""));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-shown", "");
          io.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    items.forEach((el) => io.observe(el));
  }

  initWalk();
  initForm();
  initReveal();
})();
