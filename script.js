(() => {
  "use strict";
  const CATALOGS = {
    statuses: ["Étudiant·e", "Salarié·e", "Indépendant·e", "Entrepreneur·se", "En reconversion", "En recherche d’activité", "Autre"],
    education: ["Sans diplôme / parcours autodidacte", "CAP / BEP", "Baccalauréat", "Bac +2 / BTS / BUT en cours", "Licence / Bachelor / BUT", "Master / Bac +5", "Doctorat", "Autre parcours"],
    studyFields: ["Informatique & numérique", "Commerce & gestion", "Marketing & communication", "Design & création", "Finance & comptabilité", "Droit & sciences politiques", "Ingénierie & sciences", "Santé & social", "Éducation & sciences humaines", "Environnement & agriculture", "Artisanat & métiers manuels", "Autre / autodidacte"],
    experience: ["Je débute", "Moins de 2 ans", "2 à 5 ans", "6 à 10 ans", "Plus de 10 ans"],
    availability: ["Quelques heures par semaine", "Un à deux jours par semaine", "Temps partiel", "Temps plein", "À définir ensemble"],
    workFields: ["Développement informatique", "Data & intelligence artificielle", "Design & UX/UI", "Commerce & vente", "Marketing & communication", "Gestion de produit", "Finance & comptabilité", "Stratégie & gestion", "Droit & administration", "Ingénierie & industrie", "Santé & bien-être", "Environnement & climat", "Éducation & formation", "Culture & création", "Artisanat", "Opérations & logistique", "Autre domaine"],
    sectors: ["Technologie & numérique", "Éducation & formation", "Santé & bien-être", "Environnement & climat", "Alimentation & agriculture", "Commerce & services", "Culture & médias", "Finance & assurance", "Industrie & mobilité", "Économie sociale & solidaire", "Autre secteur", "Je suis encore en exploration"],
    stages: ["J’explore une idée", "Je valide un besoin", "Je développe un prototype", "J’ai de premiers clients", "Mon activité est lancée", "Je cherche un projet à rejoindre", "Je souhaite investir ou accompagner"],
    collaborations: ["Association / cofondation", "Collaboration à temps partiel", "Collaboration à temps plein", "Partenariat ponctuel", "Mission rémunérée", "Investissement & accompagnement", "Ouvert·e à en discuter"],
    lookingFor: ["Un associé / une associée", "Un profil technique / développeur", "Un profil commercial", "Un profil design / créatif", "Un investisseur", "Un partenaire", "Une équipe à rejoindre", "Ouvert·e à plusieurs profils"],
    departments: [["75", "75 · Paris"], ["77", "77 · Seine-et-Marne"], ["78", "78 · Yvelines"], ["91", "91 · Essonne"], ["92", "92 · Hauts-de-Seine"], ["93", "93 · Seine-Saint-Denis"], ["94", "94 · Val-de-Marne"], ["95", "95 · Val-d’Oise"]],
    arrondissements: Array.from({ length: 20 }, (_, i) => `${i + 1}${i ? "e" : "er"} arrondissement`),
    investmentRanges: ["Moins de 10 000 €", "10 000 € à 50 000 €", "50 000 € à 150 000 €", "Plus de 150 000 €", "À définir"],
  };
  const ROLES = { founder: "Apporteur d’idée", partner: "Futur associé", investor: "Investisseur", member: "Membre Kairos" };
  const PLANS = { student: "Premium étudiant — 3,99 € / 4 semaines", classic: "Premium classique — 9,99 € / 4 semaines", vip: "Premium VIP — 19,99 € / 4 semaines" };
  const DRAFT_KEY = "kairos.preinscription.v1";
  const FAVORITES_KEY = "kairos.favorites.v1";
  const MAX_PHOTO_BYTES = 1024 * 1024;
  const text = (value, max = 1500) => typeof value === "string" ? value.trim().slice(0, max) : "";
  const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const list = (value, allowed) => Array.isArray(value) ? [...new Set(value.filter((item) => typeof item === "string" && (!allowed || allowed.includes(item))))].slice(0, 500) : [];
  const validAge = (value) => /^\d{1,3}$/.test(String(value)) && Number(value) >= 1 && Number(value) <= 120;
  function safePhoto(value) {
    const photo = text(value, MAX_PHOTO_BYTES * 2);
    if (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(photo) && photo.length <= Math.ceil(MAX_PHOTO_BYTES * 4 / 3) + 60) return photo;
    try { const url = new URL(photo); return url.protocol === "https:" && !url.username && !url.password ? url.href : ""; } catch { return ""; }
  }
  function cleanDraft(raw = {}) {
    const d = {};
    ["firstName", "lastName", "email", "headline", "bio", "professionalStatus", "educationLevel", "studyField", "school", "experience", "availability", "skills", "projectCategory", "projectStage", "projectTitle", "projectDescription", "collaborationType", "lookingFor", "city", "arrondissement", "investmentSectors", "investmentProjectTypes", "investmentAmount"].forEach((key) => { d[key] = text(raw[key]); });
    d.firstName = d.firstName.slice(0, 60); d.lastName = d.lastName.slice(0, 80); d.email = d.email.slice(0, 254);
    d.role = ["founder", "partner", "investor"].includes(raw.role) ? raw.role : "";
    d.age = validAge(raw.age) ? Number(raw.age) : ""; d.region = "ile-de-france";
    d.department = CATALOGS.departments.some(([value]) => value === raw.department) ? raw.department : "";
    if (d.department !== "75") d.arrondissement = "";
    d.workFields = list(raw.workFields, CATALOGS.workFields);
    d.investmentRanges = d.role === "investor" ? list(raw.investmentRanges, CATALOGS.investmentRanges) : [];
    ["showAge", "publicConsent", "consent"].forEach((key) => { d[key] = raw[key] === true; });
    d.showInvestmentIntent = d.role === "investor" && raw.showInvestmentIntent === true;
    d.showInvestmentAmount = d.showInvestmentIntent && raw.showInvestmentAmount === true;
    if (d.role !== "investor") ["investmentSectors", "investmentProjectTypes", "investmentAmount"].forEach((key) => { d[key] = ""; });
    d.photoUrl = safePhoto(raw.photoUrl); d.plan = Object.hasOwn(PLANS, raw.plan) ? raw.plan : ""; return d;
  }
  // Public cards never receive contact details, the full surname, school, or private investment preferences.
  function previewProfile(raw) {
    const d = cleanDraft(raw);
    const p = { id: "private-preview", preview: true,
      displayName: d.firstName ? `${d.firstName}${d.lastName ? ` ${Array.from(d.lastName)[0]}.` : ""}` : "Votre prénom",
      role: d.role === "investor" && !d.showInvestmentIntent ? "member" : d.role || "member",
      age: d.showAge ? d.age : "", photoUrl: d.photoUrl,
      headline: d.headline, bio: d.bio, education: [d.educationLevel, d.studyField].filter(Boolean).join(" · "),
      professionalStatus: d.professionalStatus, experience: d.experience, availability: d.availability,
      workFields: d.workFields, skills: d.skills, city: d.city, department: d.department,
      projectTitle: d.projectTitle, projectCategory: d.projectCategory, projectStage: d.projectStage,
      projectDescription: d.projectDescription, collaborationType: d.collaborationType, lookingFor: d.lookingFor };
    if (d.showInvestmentIntent) { p.investmentSectors = d.investmentSectors; p.investmentProjectTypes = d.investmentProjectTypes; if (d.showInvestmentAmount) { p.investmentAmount = d.investmentAmount; p.investmentRanges = d.investmentRanges; } }
    return p;
  }
  // Future API: each public record must be published AND explicitly consented on the server.
  function publicRecord(raw) {
    if (!raw || raw.published !== true || raw.publicConsent !== true || typeof raw.id !== "string" || !raw.publicProfile) return null;
    const p = raw.publicProfile;
    const r = { hasProject: p.hasProject === true, detailsAvailable: raw.detailsAvailable === true, id: raw.id.slice(0, 150), preview: false, role: Object.hasOwn(ROLES, p.role) ? p.role : "member", workFields: list(p.workFields, CATALOGS.workFields), photoUrl: safePhoto(p.photoUrl), likesCount: Number.isSafeInteger(raw.likesCount) && raw.likesCount >= 0 ? raw.likesCount : 0, canLike: raw.canLike === true, likedByMe: raw.likedByMe === true };
    ["displayName", "headline", "bio", "education", "professionalStatus", "experience", "availability", "skills", "city", "department", "arrondissement", "projectTitle", "projectCategory", "projectStage", "projectDescription", "collaborationType", "lookingFor", "investmentSectors", "investmentProjectTypes", "investmentAmount"].forEach((key) => { r[key] = text(p[key]); });
    r.age = validAge(p.age) ? Number(p.age) : ""; r.investmentRanges = list(p.investmentRanges, CATALOGS.investmentRanges); return r;
  }
  function matchesFilters(p, f) {
    const haystack = normalize([p.displayName, p.headline, p.bio, p.skills, p.projectTitle, p.projectDescription, ...p.workFields].join(" "));
    return (!f.q || haystack.includes(normalize(f.q))) && (!f.role || p.role === f.role) && (!f.department || p.department === f.department) && (!f.workField || p.workFields.includes(f.workField)) && (!f.city || normalize(p.city).includes(normalize(f.city))) && (!f.sector || p.projectCategory === f.sector) && (!f.arrondissement || p.arrondissement === f.arrondissement);
  }
  function clerkDomain(key) {
    if (typeof key !== "string" || !/^pk_(test|live)_/.test(key)) return "";
    try {
      const encoded = key.split("_").slice(2).join("_").replace(/-/g, "+").replace(/_/g, "/");
      const domain = atob(encoded).replace(/\$$/, "");
      return domain.length <= 253 && /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9-]+$/i.test(domain) ? domain : "";
    } catch { return ""; }
  }
  if (typeof module !== "undefined" && module.exports) module.exports = { cleanDraft, previewProfile, publicRecord, matchesFilters, validAge, safePhoto, clerkDomain };
  if (typeof document === "undefined") return;
  const byId = (id) => document.getElementById(id);
  const page = document.body.dataset.page;
  const publicConfig = window.KAIROS_CONFIG || {};
  const apiBase = (publicConfig.apiBase || document.querySelector('meta[name="kairos-api-base"]')?.content || "").replace(/\/$/, "");
  let clerkClient = null;
  let toastTimer;
  function toast(message) { const box = byId("toast"); if (!box) return; box.textContent = message; box.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => box.classList.remove("show"), 5000); }
  function el(tag, className, value) { const node = document.createElement(tag); if (className) node.className = className; if (value !== undefined) node.textContent = value; return node; }
  function storageRead(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
  function storedDraft() { const value = storageRead(DRAFT_KEY, null); return value?.version === 1 && value.profile ? cleanDraft(value.profile) : null; }
  function navigateToRegistration(role = "", plan = "") { const q = new URLSearchParams(); if (Object.hasOwn(ROLES, role)) q.set("role", role); if (Object.hasOwn(PLANS, plan)) q.set("offre", plan); location.href = `inscription.html${q.size ? `?${q}` : ""}`; }
  async function fetchJSON(path, options) {
    if (location.protocol === "file:" && !apiBase) throw new Error("Ouvrez le site déployé sur Vercel pour envoyer votre fiche. Un fichier ouvert sur votre ordinateur ne peut pas enregistrer l’inscription.");
    const headers = new Headers(options?.headers || {});
    if (clerkClient?.session) {
      const token = await clerkClient.session.getToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
    }
    const response = await fetch(`${apiBase}${path}`, { credentials: "same-origin", ...options, headers });
    const isJSON = response.headers.get("content-type")?.includes("application/json");
    const data = isJSON ? await response.json() : null;
    if (!response.ok || !isJSON) {
      const fallback = response.status === 404 ? "Le service d’inscription manque sur ce déploiement. L’équipe Kairos doit publier les fichiers serveur sur Vercel." : "Le serveur n’a pas confirmé votre demande. Conservez votre brouillon et réessayez plus tard.";
      const error = new Error(text(data?.error?.message, 400) || fallback);
      error.status = response.status; error.code = data?.error?.code; throw error;
    }
    return data;
  }
  function fillCatalogs() {
    document.querySelectorAll("select[data-catalog]").forEach((select) => { (CATALOGS[select.dataset.catalog] || []).forEach((item) => { const [value, label] = Array.isArray(item) ? item : [item, item]; const option = el("option", "", label); option.value = value; select.append(option); }); });
    document.querySelectorAll("[data-choice-catalog]").forEach((container) => { (CATALOGS[container.dataset.choiceCatalog] || []).forEach((value) => { const label = el("label", "skill-choice"); const input = el("input"); input.type = "checkbox"; input.name = container.dataset.choiceName; input.value = value; label.append(input, el("span", "", value)); container.append(label); }); });
  }
  const favoriteIds = new Set(list(storageRead(FAVORITES_KEY, [])));
  function saveFavorites() { try { localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favoriteIds])); return true; } catch { toast("Ce navigateur ne permet pas de conserver vos favoris sur cet appareil."); return false; } }
  function makeCard(p) {
    const isProject = !p.preview && p.hasProject;
    const name = isProject ? p.projectTitle || "Projet en préparation" : p.displayName + (p.age ? `, ${p.age} ans` : "");
    const card = el("article", `member-card member-card-${p.role}`);
    if (!p.preview) card.dataset.openProfile = p.id;
    const visual = el("div", "member-visual");
    if (p.photoUrl) {
      const img = el("img"); img.src = p.photoUrl; img.alt = `Photo de ${p.displayName}`; img.loading = "lazy";
      img.addEventListener("error", () => { img.remove(); visual.prepend(el("span", "member-initials", Array.from(p.displayName || "K")[0])); }); visual.append(img);
    } else visual.append(el("span", "member-initials", Array.from(p.displayName || "K")[0]));
    visual.append(el("span", "member-role", isProject ? "Projet" : ROLES[p.role] || ROLES.member));
    if (!p.preview) {
      const imageButton = el("button", "member-open-visual"); imageButton.type = "button"; imageButton.dataset.openProfile = p.id;
      imageButton.setAttribute("aria-label", `Consulter ${name}`); visual.append(imageButton);
    }
    const save = el("button", "member-save", favoriteIds.has(p.id) && !p.preview ? "★" : "☆");
    save.type = "button"; save.dataset.saveProfile = p.id; save.setAttribute("aria-label", p.preview ? "Aperçu de votre fiche" : `Enregistrer ${name}`);
    save.setAttribute("aria-pressed", String(!p.preview && favoriteIds.has(p.id)));
    if (p.preview) save.disabled = true;
    visual.append(save);
    const content = el("div", "member-card-content");
    const title = el(p.preview ? "h3" : "button", "member-name", name);
    if (!p.preview) { title.type = "button"; title.dataset.openProfile = p.id; }
    content.append(title);
    if (isProject) content.append(el("p", "member-owner", `Par ${p.displayName}`));
    content.append(el("p", "member-city", [p.city, p.department].filter(Boolean).join(" · ") || "Île-de-France"), el("p", "member-headline", p.headline || p.projectCategory || "Une envie d’entreprendre"));
    const tags = el("div", "member-tags");
    const skills = p.workFields.length ? p.workFields.slice(0, 3) : [p.projectCategory || "Compétences à préciser"];
    skills.forEach(skill => tags.append(el("span", "", skill)));
    const bottom = el("div", "member-card-bottom");
    const like = el("button", "member-like", p.preview ? "♡ J’aime" : `${p.likedByMe ? "♥" : "♡"} ${p.likesCount}`);
    like.type = "button"; like.dataset.likeProfile = p.id;
    like.setAttribute("aria-label", p.preview ? "Aperçu des likes" : `${p.likedByMe ? "Retirer mon like" : "Aimer cette fiche"}, ${p.likesCount} likes`);
    like.setAttribute("aria-pressed", String(Boolean(p.likedByMe)));
    if (p.preview) like.disabled = true;
    else if (!p.canLike) like.title = "Connectez-vous gratuitement pour aimer cette fiche";
    bottom.append(like, el("span", "member-stage", p.preview ? "Aperçu privé" : isProject ? p.projectStage || "Projet" : "Liste d’attente"));
    content.append(tags, bottom); card.append(visual, content); return card;
  }
  const DISCOVERY_INTENT_KEY = "kairos.discovery.intent.v1";
  const profileId = value => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ? value : "";
  let discoveryIntent = null;
  function pendingProfile() {
    let value = discoveryIntent;
    if (!value) { try { value = JSON.parse(sessionStorage.getItem(DISCOVERY_INTENT_KEY)); } catch {} }
    return value && Number.isFinite(value.at) && Date.now() - value.at < 20 * 60 * 1000 ? profileId(value.id) : "";
  }
  function rememberProfile(id) {
    const value = profileId(id); if (!value) return;
    discoveryIntent = { id: value, at: Date.now() };
    try { sessionStorage.setItem(DISCOVERY_INTENT_KEY, JSON.stringify(discoveryIntent)); } catch {}
  }
  function forgetProfile() { discoveryIntent = null; try { sessionStorage.removeItem(DISCOVERY_INTENT_KEY); } catch {} }
  function discoveryURL(id = "") { return `profils.html${profileId(id) ? `?fiche=${encodeURIComponent(id)}` : ""}`; }
  function accountGate(id = "") {
    rememberProfile(id);
    const gate = byId("discovery-gate");
    if (!gate) { location.href = "inscription.html"; return; }
    const status = byId("discovery-gate-status");
    if (status) status.textContent = clerkClient ? "Votre compte est gratuit. Aucun abonnement n’est activé." : "Chargement de la connexion sécurisée…";
    if (!gate.open) gate.showModal();
    accountsReady.then(() => { if (status && gate.open) status.textContent = clerkClient ? "Votre compte est gratuit. Aucun abonnement n’est activé." : "La connexion est indisponible pour le moment. Rechargez la page pour réessayer."; });
  }
  function initDiscoveryGate() { byId("close-discovery-gate")?.addEventListener("click", () => byId("discovery-gate").close()); }
  function initHeader() {
    const toggle = byId("menu-toggle"), nav = byId("main-nav");
    function close() { nav?.classList.remove("open"); toggle?.setAttribute("aria-expanded", "false"); toggle?.setAttribute("aria-label", "Ouvrir le menu"); }
    toggle?.addEventListener("click", () => { const open = toggle.getAttribute("aria-expanded") !== "true"; toggle.setAttribute("aria-expanded", String(open)); toggle.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu"); nav.classList.toggle("open", open); });
    nav?.querySelectorAll("a").forEach((link) => link.addEventListener("click", close)); document.addEventListener("keydown", (event) => { if (event.key === "Escape") close(); });
    const params = new URLSearchParams(location.search);
    if (byId("header-query")) byId("header-query").value = params.get("q") || "";
    byId("header-search")?.addEventListener("submit", (event) => {
      event.preventDefault(); const query = byId("header-query").value.trim();
      location.href = `profils.html${query ? `?q=${encodeURIComponent(query)}` : ""}`;
    });
    nav?.querySelectorAll("a").forEach((link) => { if (page === "directory" && link.getAttribute("href") === "profils.html") link.setAttribute("aria-current", "page"); });
    return close;
  }
  function syncAccountUI(user) {
    document.body.dataset.accountState = user ? "signed-in" : "signed-out";
    document.querySelectorAll('a[href="index.html"]').forEach(link => { link.dataset.homeLink = "true"; });
    document.querySelectorAll("[data-home-link]").forEach(link => { link.href = user ? "profils.html" : "index.html"; });
    document.querySelectorAll("[data-auth-label]").forEach((label) => {
      label.textContent = user ? label.dataset.signedIn : label.dataset.signedOut;
      const link = label.closest("a"); if (link) link.href = user ? "mon-profil.html" : "inscription.html";
    });
    document.querySelectorAll("[data-member-nav]").forEach(link => { link.hidden = !user; });
    const content = byId("registration-content"), form = byId("registration-form");
    if (content) { content.hidden = !user; content.inert = !user; }
    if (form) form.inert = !user;
  }
  async function initAccounts() {
    function unavailable(message) {
      syncAccountUI(null);
      const panel = byId("account-connection");
      if (panel) { panel.hidden = false; panel.setAttribute("aria-busy", "false"); panel.querySelector(".account-actions").hidden = true; byId("account-status").textContent = message; byId("retry-account").hidden = false; }
    }
    const key = typeof publicConfig.clerkPublishableKey === "string" ? publicConfig.clerkPublishableKey.trim() : "";
    if (!key) { unavailable("La connexion est momentanément indisponible. Réessayez dans quelques instants pour accéder à votre profil."); return; }
    const domain = clerkDomain(key);
    if (!domain) { unavailable("La connexion est momentanément indisponible. Réessayez dans quelques instants."); return; }
    const loadScript = (src, publishableKey) => new Promise((resolve, reject) => {
      const script = document.createElement("script"); script.src = src; script.async = true; script.crossOrigin = "anonymous";
      if (publishableKey) script.dataset.clerkPublishableKey = publishableKey;
      const timeout = setTimeout(() => reject(new Error("Account loading timeout")), 20000);
      script.onload = () => { clearTimeout(timeout); resolve(); }; script.onerror = () => { clearTimeout(timeout); reject(new Error("Account script unavailable")); }; document.head.append(script);
    });
    try {
      await loadScript(`https://${domain}/npm/@clerk/ui@1/dist/ui.browser.js`);
      await loadScript(`https://${domain}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`, key);
      if (!window.Clerk || !window.__internal_ClerkUICtor) throw new Error("Clerk SDK unavailable");
      clerkClient = window.Clerk;
      await clerkClient.load({ ui: { ClerkUI: window.__internal_ClerkUICtor }, appearance: { variables: { colorPrimary: getComputedStyle(document.documentElement).getPropertyValue("--ink").trim(), borderRadius: "2px" } } });
      document.querySelector(".site-header")?.classList.add("accounts-enabled");
      const panel = byId("account-connection"), userButton = byId("clerk-user-button");
      let previousUserId;
      function syncAccount() {
        const user = clerkClient.session ? clerkClient.user : null;
        syncAccountUI(user);
        const userId = user?.id || null;
        if (userId !== previousUserId) {
          previousUserId = userId;
          document.querySelectorAll("[data-admin-link]").forEach(link => { link.hidden = true; });
          document.dispatchEvent(new CustomEvent("kairos-account", { detail: { userId } }));
          if (userId) fetchJSON("/api/admin/session").then(result => {
            if (clerkClient?.session && clerkClient.user?.id === userId && result.administrator === true) document.querySelectorAll("[data-admin-link]").forEach(link => { link.hidden = false; });
          }).catch(() => {});
        }
        document.querySelectorAll(".header-account").forEach((button) => { button.hidden = Boolean(user); });
        document.querySelectorAll("[data-account]").forEach((button) => { button.disabled = false; });
        if (userButton) {
          userButton.hidden = !user; userButton.replaceChildren();
          userButton.style.width = "36px"; userButton.style.flex = "0 0 36px";
          if (user) {
            const avatar = el("a", "header-profile-avatar"); avatar.href = "mon-profil.html"; avatar.setAttribute("aria-label", "Voir mon profil Kairos"); avatar.title = "Mon profil";
            Object.assign(avatar.style, { display: "grid", placeItems: "center", position: "relative", width: "36px", height: "36px", overflow: "hidden", borderRadius: "50%" });
            avatar.append(el("span", "", Array.from(user.firstName || "M")[0]));
            const photo = safePhoto(user.imageUrl);
            if (photo) { const img = el("img"); img.src = photo; img.alt = ""; img.width = 36; img.height = 36; Object.assign(img.style, { position: "absolute", inset: "0", width: "36px", height: "36px", objectFit: "cover" }); img.addEventListener("error", () => img.remove()); avatar.append(img); }
            userButton.append(avatar);
          }
        }
        if (panel) {
          panel.hidden = Boolean(user); panel.setAttribute("aria-busy", "false"); panel.querySelector(".account-actions").hidden = Boolean(user); byId("retry-account").hidden = true;
          byId("account-title").textContent = user ? "Votre compte Kairos" : "Commençons par votre compte.";
          byId("account-step").textContent = user ? "COMPTE CONNECTÉ" : "01 / VOTRE COMPTE";
          const profileState = document.body.dataset.profileState;
          byId("account-status").textContent = user ? profileState === "saved" ? "Votre compte est connecté et votre préinscription est enregistrée." : profileState === "editing" ? "Vous modifiez votre fiche enregistrée." : ["waiting", "loading"].includes(profileState) ? "Votre compte est connecté. Nous récupérons votre fiche." : profileState === "error" ? "Votre compte est connecté. Votre fiche n’a pas pu être récupérée." : `Connecté${user.firstName ? ` en tant que ${user.firstName}` : ""}. Vous pouvez compléter votre profil ci-dessous.` : "Créez votre compte sécurisé ou connectez-vous. Le questionnaire s’affichera ensuite, ici même.";
          if (page === "admin" && !user) {
            byId("account-title").textContent = "Connectez-vous à l’espace équipe.";
            byId("account-step").textContent = "ÉQUIPE KAIROS";
            byId("account-status").textContent = "Utilisez votre compte Kairos autorisé pour consulter les préinscriptions privées.";
          }
          const form = byId("registration-form");
          if (user && form) {
            const values = { firstName: user.firstName, lastName: user.lastName, email: user.primaryEmailAddress?.emailAddress };
            Object.entries(values).forEach(([name, value]) => { const input = form.elements.namedItem(name); if (input && !input.value && value) input.value = value; });
            form.dispatchEvent(new Event("input", { bubbles: true }));
          }
          const introduction = document.querySelector(".registration-intro > p:last-child");
          if (introduction) introduction.textContent = user ? ["saved", "editing"].includes(profileState) ? "Retrouvez votre fiche et vos choix de visibilité. Vous êtes sur la liste d’attente Kairos ; aucun paiement n’a été déclenché." : "Votre compte est prêt. Présentez maintenant votre parcours, vos compétences et votre projet pour rejoindre la liste d’attente. Aucun paiement ne vous sera demandé." : "Créez votre compte ou connectez-vous. Vous pourrez ensuite compléter votre parcours, vos compétences et votre projet pour rejoindre la liste d’attente. Aucun paiement ne vous sera demandé.";
        }
      }
      clerkClient.addListener(syncAccount); syncAccount();
      document.querySelectorAll("[data-account]").forEach((button) => button.addEventListener("click", async () => {
        closeHeader();
        if (["sign-in", "sign-up"].includes(button.dataset.account) && byId("discovery-gate")?.open) byId("discovery-gate").close();
        try {
          if (button.dataset.account === "sign-up") clerkClient.openSignUp();
          else if (button.dataset.account === "manage") clerkClient.openUserProfile();
          else if (button.dataset.account === "sign-out") await clerkClient.signOut({ redirectUrl: new URL("index.html", location.href).href });
          else clerkClient.openSignIn();
        } catch { toast("Cette action n’a pas pu être effectuée. Réessayez."); }
      }));
    } catch {
      clerkClient = null;
      unavailable("La connexion n’a pas pu démarrer. Réessayez pour accéder à votre profil.");
      console.warn("Clerk n’a pas pu démarrer. Vérifiez config.js et les domaines autorisés de votre application.");
    }
  }
  function initLanding() {
    const grid = byId("home-discovery-results"); let generation = 0, redirected = false;
    function redirectMember(userId) {
      if (userId && !redirected) { redirected = true; location.replace(discoveryURL(pendingProfile())); }
    }
    document.addEventListener("kairos-account", event => redirectMember(event.detail.userId));
    accountsReady.then(() => redirectMember(clerkClient?.session ? clerkClient.user?.id : null));
    window.addEventListener("pageshow", event => { if (event.persisted) { redirected = false; redirectMember(clerkClient?.session ? clerkClient.user?.id : null); } });
    async function loadPreview() {
      if (!grid) return;
      const ticket = ++generation;
      grid.setAttribute("aria-busy", "true");
      try {
        const result = await fetchJSON("/api/waitlist/profiles");
        if (ticket !== generation) return;
        if (!Array.isArray(result.profiles)) throw new Error("Invalid directory");
        const profiles = result.profiles.map(publicRecord).filter(Boolean).slice(0, 6);
        grid.replaceChildren();
        if (profiles.length) profiles.forEach(p => grid.append(makeCard(p)));
        else {
          const empty = el("div", "discovery-empty");
          empty.append(el("p", "eyebrow", "LA COMMUNAUTÉ SE CONSTRUIT"), el("h3", "", "Les premiers projets se préparent."), el("p", "", "Présentez votre projet ou vos compétences pour rejoindre la communauté."));
          const link = el("a", "button button-outline", "Préparer mon profil"); link.href = "inscription.html"; empty.append(link); grid.append(empty);
        }
        byId("home-discovery-status").textContent = "Les aperçus sont publics. Un compte gratuit permet d’ouvrir les fiches validées.";
      } catch {
        if (ticket !== generation) return;
        grid.replaceChildren(); const message = el("div", "discovery-empty");
        message.append(el("h3", "", "Les aperçus ne sont pas disponibles pour le moment."), el("p", "", "Vous pouvez déjà préparer votre profil ou réessayer depuis Découvrir."));
        const link = el("a", "button button-outline", "Ouvrir Découvrir"); link.href = "profils.html"; message.append(link); grid.append(message);
        byId("home-discovery-status").textContent = "Le chargement du répertoire n’a pas pu aboutir.";
      } finally { if (ticket === generation) grid.setAttribute("aria-busy", "false"); }
    }
    grid?.addEventListener("click", event => {
      const control = event.target.closest("[data-save-profile],[data-like-profile],[data-open-profile]");
      if (!control) return;
      const id = profileId(control.dataset.saveProfile || control.dataset.likeProfile || control.dataset.openProfile);
      if (!id) return;
      if (clerkClient?.session) location.href = discoveryURL(id); else accountGate(id);
    });
    document.querySelectorAll("[data-register]").forEach(control => control.addEventListener("click", event => { event.preventDefault(); closeHeader(); navigateToRegistration(control.dataset.role); }));
    loadPreview();
  }
  function renderOwnProfile(data, metadata = {}, context = "owner") {
    const savedData = cleanDraft(data);
      byId("saved-profile-title").textContent = `${savedData.firstName} ${savedData.lastName}`.trim() || "Votre profil Kairos";
      const date = new Date(metadata.updatedAt || "");
      byId("saved-profile-date").textContent = Number.isFinite(date.getTime()) ? `Dernière mise à jour : ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date)}` : "Votre fiche est enregistrée dans votre compte.";
      const identity = el("article", "own-profile-card");
      identity.style.maxWidth = "320px";
      const portrait = el("div", "own-profile-photo");
      Object.assign(portrait.style, { position: "relative", aspectRatio: "1.1", overflow: "hidden" });
      const initials = el("span", "", [savedData.firstName, savedData.lastName].filter(Boolean).map(name => Array.from(name)[0]).join("")); portrait.append(initials);
      if (savedData.photoUrl) { const img = el("img"); img.src = savedData.photoUrl; img.alt = context === "admin" ? "Photo de profil" : "Votre photo de profil"; img.width = 260; img.height = 236; Object.assign(img.style, { position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover" }); img.addEventListener("error", () => img.remove()); portrait.append(img); }
      identity.append(portrait, el("h3", "", `${savedData.firstName} ${savedData.lastName}`.trim()), el("p", "own-profile-role", ROLES[savedData.role] || "Membre Kairos"));
      if (savedData.headline) identity.append(el("p", "", savedData.headline));
      identity.append(el("p", "", [savedData.city, savedData.department].filter(Boolean).join(" · ")));
      byId("saved-profile-card").replaceChildren(identity);
      byId("saved-profile-visibility").textContent = metadata.published === true && savedData.publicConsent ? "Votre fiche est publiée avec votre accord. Les informations privées ci-contre sont visibles uniquement dans votre espace personnel." : savedData.publicConsent ? "Vous avez autorisé la publication. Votre fiche attend la validation de l’équipe et n’est pas encore publique." : "Votre fiche reste privée. Vous n’avez pas autorisé sa publication.";
      if (context === "admin") byId("saved-profile-visibility").textContent = metadata.published === true && savedData.publicConsent ? "Fiche publiée avec l’accord de la personne. Les réponses détaillées restent privées." : savedData.publicConsent ? "Publication autorisée par la personne. Fiche en attente de validation, non publique." : "Fiche privée. La personne n’a pas autorisé sa publication.";
      const content = byId("saved-profile-information"); content.replaceChildren();
      const groups = [
        ["Votre parcours", [["Nom et prénom", `${savedData.firstName} ${savedData.lastName}`], ["E-mail privé", savedData.email], ["Âge", `${savedData.age} ans`], ["Votre rôle", ROLES[savedData.role]], ["Présentation", savedData.headline], ["À propos", savedData.bio], ["Situation", savedData.professionalStatus], ["Études", [savedData.educationLevel, savedData.studyField].filter(Boolean).join(" · ")], ["Établissement privé", savedData.school], ["Expérience", savedData.experience], ["Domaines de travail", savedData.workFields.join(", ")], ["Compétences", savedData.skills], ["Disponibilité", savedData.availability]]],
        ["Votre projet et vos envies", [["Nom du projet", savedData.projectTitle], ["Secteur", savedData.projectCategory], ["Avancement", savedData.projectStage], ["Description", savedData.projectDescription], ["Collaboration", savedData.collaborationType], ["Profils recherchés", savedData.lookingFor], ["Localisation", [savedData.city, savedData.department, savedData.arrondissement, "Île-de-France"].filter(Boolean).join(" · ")], ["Offre qui vous intéresse", PLANS[savedData.plan]]]],
        ["Vos choix de visibilité", [["Publication autorisée", savedData.publicConsent ? "Oui, après validation de l’équipe" : "Non, fiche privée"], ["Affichage de l’âge", savedData.showAge ? "Autorisé" : "Âge privé"], ["Traitement de la préinscription", savedData.consent ? "Accord donné" : "Non confirmé"]]]
      ];
      if (savedData.role === "investor") groups.splice(2, 0, ["Vos préférences d’investissement", [["Tranches", savedData.investmentRanges.join(", ")], ["Secteurs", savedData.investmentSectors], ["Types de projets", savedData.investmentProjectTypes], ["Montant envisagé", savedData.investmentAmount], ["Intention rendue publique", savedData.showInvestmentIntent ? "Oui" : "Non"], ["Montant et tranches rendus publics", savedData.showInvestmentAmount ? "Oui" : "Non"]]]);
      for (const [title, entries] of groups) {
        const section = el("section", "saved-information-section"); section.append(el("h3", "", context === "admin" ? title.replace(/^Votre /, "").replace(/^Vos /, "").replace("et vos envies", "et envies") : title)); const dl = el("dl", "review-summary");
        for (const [label, value] of entries.filter(([, value]) => value)) { const row = el("div", "review-row"); row.append(el("dt", "", label), el("dd", "", value)); dl.append(row); }
        section.append(dl); content.append(section);
      }
  }
  function initRegistration() {
    const form = byId("registration-form"); form.noValidate = true;
    const panels = [...form.querySelectorAll("[data-panel]")]; let step = 0, photoUrl = "", selectedPlan = "";
    const params = new URLSearchParams(location.search);
    byId("retry-account")?.addEventListener("click", () => location.reload());
    if (Object.hasOwn(PLANS, params.get("offre"))) selectedPlan = params.get("offre");
    const offer = byId("selected-offer");
    if (offer && selectedPlan) { offer.hidden = false; offer.textContent = `Offre qui vous intéresse : ${PLANS[selectedPlan]}. Essai de quatre semaines prévu au lancement. Vous rejoignez la liste d’attente : aucun paiement ni abonnement n’est activé.`; }
    if (["founder", "partner", "investor"].includes(params.get("role"))) form.querySelector(`[name="role"][value="${params.get("role")}"]`).checked = true;
    function draft() {
      const fd = new FormData(form); const value = Object.fromEntries(fd.entries()); value.workFields = fd.getAll("workFields"); value.investmentRanges = fd.getAll("investmentRanges");
      ["showAge", "publicConsent", "consent", "showInvestmentIntent", "showInvestmentAmount"].forEach((name) => { value[name] = form.elements.namedItem(name).checked; });
      return cleanDraft({ ...value, photoUrl, plan: selectedPlan });
    }
    function updateFields() {
      const investor = form.querySelector('[name="role"]:checked')?.value === "investor";
      byId("registration-investor").hidden = !investor; byId("registration-investor").querySelectorAll("input,select,textarea").forEach((field) => { field.disabled = !investor; });
      const paris = form.elements.department.value === "75"; byId("registration-arrondissement").hidden = !paris; form.elements.arrondissement.disabled = !paris;
      form.elements.showInvestmentAmount.disabled = !investor || !form.elements.showInvestmentIntent.checked;
      if (!form.elements.showInvestmentIntent.checked) form.elements.showInvestmentAmount.checked = false;
    }
    function renderReview(data) {
      const summary = byId("review-summary"); summary.replaceChildren();
      const entries = [["Identité privée", `${data.firstName} ${data.lastName}`.trim()], ["Âge", data.age ? `${data.age} ans · ${data.showAge ? "affichage autorisé" : "privé"}` : "À préciser"], ["Contact privé", data.email], ["Votre rôle", ROLES[data.role]], ["Études", [data.educationLevel, data.studyField].filter(Boolean).join(" · ")], ["Établissement privé", data.school], ["Domaines de travail", data.workFields.join(", ")], ["Projet", data.projectTitle || data.projectCategory], ["Localisation", [data.city, data.department, data.arrondissement].filter(Boolean).join(" · ")], ["Visibilité de la fiche", data.publicConsent ? "Publication facultative autorisée, après traitement" : "Fiche privée"]];
      entries.filter(([, value]) => value).forEach(([label, value]) => { const row = el("div", "review-row"); row.append(el("dt", "", label), el("dd", "", value)); summary.append(row); });
      byId("registration-offer").hidden = !data.plan; byId("registration-offer").textContent = data.plan ? `Offre qui vous intéresse : ${PLANS[data.plan]}. Aucun abonnement n’est souscrit.` : "";
    }
    function update() { updateFields(); const data = draft(); byId("profile-preview").replaceChildren(makeCard(previewProfile(data))); if (step === 3) renderReview(data); }
    function validatePanel(index) {
      const fields = [...panels[index].querySelectorAll("input,select,textarea")].filter((field) => !field.disabled && field.type !== "file");
      const invalid = fields.find((field) => !field.checkValidity());
      if (invalid) { showStep(index, false); invalid.reportValidity(); invalid.focus(); return false; }
      if (index === 1 && !form.querySelector('[name="workFields"]:checked')) { showStep(index, false); byId("work-fields-error").hidden = false; form.querySelector('[name="workFields"]').focus(); return false; } return true;
    }
    function showStep(index, focus = true) {
      step = Math.max(0, Math.min(index, panels.length - 1)); panels.forEach((panel, i) => { panel.hidden = i !== step; });
      document.querySelectorAll("[data-step]").forEach((button, i) => { if (i === step) button.setAttribute("aria-current", "step"); else button.removeAttribute("aria-current"); button.classList.toggle("completed", i < step); });
      byId("previous-step").hidden = step === 0; byId("next-step").hidden = step === panels.length - 1; byId("submit-registration").hidden = step !== panels.length - 1; update();
      if (focus) { const heading = panels[step].querySelector("h2"); heading.tabIndex = -1; heading.focus({ preventScroll: true }); document.querySelector(".wizard-progress").scrollIntoView({ block: "start", behavior: "auto" }); }
    }
    form.addEventListener("input", () => { byId("work-fields-error").hidden = true; update(); }); form.addEventListener("change", update);
    byId("next-step").addEventListener("click", () => { if (validatePanel(step)) showStep(step + 1); }); byId("previous-step").addEventListener("click", () => showStep(step - 1));
    document.querySelectorAll("[data-step]").forEach((button) => button.addEventListener("click", () => { const target = Number(button.dataset.step); for (let i = 0; i < target; i++) if (!validatePanel(i)) return; showStep(target); }));
    form.addEventListener("keydown", (event) => { if (event.key === "Enter" && event.target.tagName === "INPUT" && !["checkbox", "radio", "file"].includes(event.target.type) && step < 3) { event.preventDefault(); if (validatePanel(step)) showStep(step + 1); } });
    byId("profile-photo").addEventListener("change", async (event) => {
      const file = event.target.files[0]; if (!file) return; const status = byId("photo-status");
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > MAX_PHOTO_BYTES) { status.textContent = "Choisissez un JPG, PNG ou WebP de 1 Mo maximum."; event.target.value = ""; return; }
      try {
        const value = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
        const checked = safePhoto(value); if (!checked) throw new Error("Invalid photo");
        await new Promise((resolve, reject) => { const image = new Image(); image.onload = resolve; image.onerror = reject; image.src = checked; });
        photoUrl = checked; byId("remove-photo").hidden = false; status.textContent = "Photo ajoutée à votre aperçu. Elle n’a pas été envoyée."; update();
      } catch { status.textContent = "Cette image n’a pas pu être lue. Essayez une autre photo."; }
    });
    byId("remove-photo").addEventListener("click", () => { photoUrl = ""; byId("profile-photo").value = ""; byId("remove-photo").hidden = true; byId("photo-status").textContent = "Photo retirée de votre fiche."; update(); });
    function applyProfile(data) {
      Object.entries(data).forEach(([name, value]) => { const fields = [...form.querySelectorAll("[name]")].filter((field) => field.name === name); fields.forEach((field) => { if (field.type === "checkbox") field.checked = Array.isArray(value) ? value.includes(field.value) : value === true; else if (field.type === "radio") field.checked = field.value === value; else if (field.type !== "file") field.value = value; }); });
      photoUrl = data.photoUrl; selectedPlan = data.plan || selectedPlan; byId("remove-photo").hidden = !photoUrl; form.elements.consent.checked = false;
      showStep(0);
    }
    function restore() {
      const data = storedDraft(); if (!data) return; applyProfile(data);
      byId("draft-status").textContent = "Brouillon récupéré. Vérifiez vos informations et confirmez votre consentement avant l’envoi.";
    }
    const layout = document.querySelector(".registration-layout");
    let profileOwner = null, loadGeneration = 0, savedData = null, view = "waiting";
    let restoreRequested = params.get("reprendre") === "1";
    function setView(next) {
      view = next; document.body.dataset.profileState = next;
      layout.hidden = !["new", "editing"].includes(next);
      byId("profile-load-panel").hidden = !["loading", "error"].includes(next);
      byId("retry-profile-load").hidden = next !== "error";
      byId("profile-load-panel").setAttribute("aria-busy", String(next === "loading"));
      byId("draft-banner").hidden = next !== "new" || !storedDraft();
      byId("edit-profile-notice").hidden = next !== "editing";
      form.inert = !clerkClient?.session || !["new", "editing"].includes(next);
      byId("submit-registration").textContent = savedData ? "Enregistrer mes modifications" : "Envoyer ma préinscription";
      if (offer) offer.hidden = !selectedPlan || next === "saved";
      if (clerkClient?.session) {
        byId("account-status").textContent = next === "saved" ? "Votre compte est connecté et votre préinscription est enregistrée." : next === "loading" ? "Votre compte est connecté. Nous récupérons votre fiche." : next === "editing" ? "Vous modifiez votre fiche. Les changements seront enregistrés après votre confirmation." : next === "error" ? "Votre compte est connecté. Votre fiche n’a pas pu être récupérée." : "Votre compte est prêt. Vous pouvez compléter votre profil ci-dessous.";
        const intro = document.querySelector(".registration-intro > p:last-child");
        if (intro) intro.textContent = savedData ? "Retrouvez votre fiche et vos choix de visibilité. Vous êtes sur la liste d’attente Kairos ; aucun paiement n’a été déclenché." : "Présentez votre parcours, vos compétences et votre projet pour rejoindre la liste d’attente. Aucun paiement ne vous sera demandé.";
      }
    }
    async function loadSavedProfile() {
      const owner = clerkClient?.session && clerkClient?.user?.id;
      if (!owner) return;
      const generation = ++loadGeneration;
      setView("loading"); byId("profile-load-message").textContent = "Chargement de votre fiche enregistrée…";
      try {
        const result = await fetchJSON("/api/waitlist");
        if (generation !== loadGeneration || clerkClient?.user?.id !== owner || !clerkClient?.session) return;
        if (result.profile === null) {
          savedData = null; setView("new"); showStep(0, false);
          if (restoreRequested && storedDraft()) { restoreRequested = false; restore(); }
        } else if (result.profile && typeof result.profile === "object") {
          if (params.get("modifier") === "1") { savedData = cleanDraft(result.profile); setView("editing"); applyProfile(savedData); }
          else location.replace("mon-profil.html");
        }
        else throw new Error("La réponse du serveur ne permet pas de retrouver votre fiche.");
      } catch (error) {
        if (generation !== loadGeneration || clerkClient?.user?.id !== owner) return;
        setView("error"); byId("profile-load-message").textContent = `${error.message || "Votre fiche n’a pas pu être récupérée."} Réessayez pour consulter votre fiche ou savoir si elle est déjà enregistrée.`;
      }
    }
    document.addEventListener("kairos-account", (event) => {
      const userId = event.detail.userId;
      ++loadGeneration;
      if (profileOwner !== userId) {
        form.reset(); photoUrl = ""; savedData = null;
        const requestedRole = params.get("role");
        if (["founder", "partner", "investor"].includes(requestedRole)) form.querySelector(`[name="role"][value="${requestedRole}"]`).checked = true;
        byId("profile-photo").value = ""; byId("remove-photo").hidden = true;
        byId("photo-status").textContent = ""; byId("registration-feedback").textContent = "";
      }
      profileOwner = userId; setView("waiting");
      if (userId) loadSavedProfile();
    });
    byId("retry-profile-load").addEventListener("click", loadSavedProfile);
    byId("cancel-profile-edit").addEventListener("click", () => { location.href = "mon-profil.html"; });
    byId("draft-banner").hidden = true; byId("restore-draft").addEventListener("click", restore);
    byId("delete-draft").addEventListener("click", () => { try { localStorage.removeItem(DRAFT_KEY); byId("draft-banner").hidden = true; byId("draft-status").textContent = "Le brouillon conservé sur cet appareil a été supprimé."; } catch { toast("Le brouillon n’a pas pu être supprimé."); } });
    byId("save-draft").addEventListener("click", () => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ version: 1, savedAt: new Date().toISOString(), profile: draft() })); byId("draft-banner").hidden = false; byId("draft-status").textContent = "Brouillon conservé uniquement sur cet appareil. Cette action ne vous inscrit pas auprès de Kairos."; } catch { byId("draft-status").textContent = "Le navigateur ne permet pas de garder ce brouillon. Vous pouvez télécharger votre fiche."; } });
    byId("download-profile").addEventListener("click", () => {
      const data = draft(); const lines = ["MA FICHE KAIROS — BROUILLON PRIVÉ", "Ce document n’est pas une confirmation d’inscription.", ""];
      const labels = { firstName: "Prénom", lastName: "Nom", age: "Âge", email: "E-mail", role: "Rôle", headline: "Présentation courte", bio: "À propos", professionalStatus: "Situation", educationLevel: "Études", studyField: "Domaine d’études", school: "Établissement", experience: "Expérience", availability: "Disponibilité", workFields: "Domaines de travail", skills: "Compétences", projectCategory: "Secteur", projectStage: "Avancement", projectTitle: "Projet", projectDescription: "Description", collaborationType: "Collaboration", lookingFor: "Profils recherchés", city: "Ville", department: "Département", arrondissement: "Arrondissement", investmentRanges: "Tranches d’investissement", investmentSectors: "Secteurs d’investissement", investmentProjectTypes: "Projets d’investissement", investmentAmount: "Montant envisagé" };
      Object.entries(labels).forEach(([key, label]) => { const value = Array.isArray(data[key]) ? data[key].join(", ") : data[key]; if (value) lines.push(`${label} : ${key === "role" ? ROLES[value] : value}`); });
      lines.push("", `Photo : ${photoUrl ? "sélectionnée dans le formulaire, non incluse dans ce document" : "non renseignée"}`, `Visibilité autorisée : ${data.publicConsent ? "oui" : "non"}`, `Affichage de l’âge : ${data.showAge ? "oui" : "non"}`);
      const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" })); const link = el("a"); link.href = url; link.download = "ma-fiche-kairos.txt"; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!clerkClient?.session) { toast("Connectez-vous avant de compléter votre profil."); return; }
      if (!["new", "editing"].includes(view)) return;
      if (byId("submit-registration").disabled) return;
      for (let i = 0; i < panels.length; i++) if (!validatePanel(i)) return;
      const data = draft(); const feedback = byId("registration-feedback"), submit = byId("submit-registration"); submit.disabled = true; feedback.classList.remove("error"); feedback.textContent = savedData ? "Enregistrement de vos modifications…" : "Envoi de votre demande…";
      try {
        await accountsReady;
        if (!clerkClient?.session) {
          if (clerkClient) clerkClient.openSignIn();
          throw new Error(clerkClient ? "Connectez-vous ou créez votre compte dans la fenêtre qui s’ouvre, puis cliquez à nouveau sur Envoyer. Votre saisie reste dans ce formulaire." : "La connexion au compte n’est pas disponible. Gardez votre brouillon ; l’équipe Kairos doit vérifier la configuration Clerk.");
        }
        // Server must validate consent, persist the request, and only then return { registered: true }.
        const owner = clerkClient.user.id;
        const result = await fetchJSON("/api/waitlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, source: "profile-pre-registration", submittedAt: new Date().toISOString() }) });
        if (!clerkClient?.session || clerkClient?.user?.id !== owner) return;
        if (result.registered !== true && result.status !== "registered") throw new Error("Registration not confirmed");
        // The server has persisted the profile. Remove only this browser's matching draft.
        const local = storedDraft();
        if (local && normalize(local.email) === normalize(data.email)) { try { localStorage.removeItem(DRAFT_KEY); } catch {} }
        location.replace("mon-profil.html");
      } catch (error) { feedback.classList.add("error"); feedback.textContent = `${error.message || "L’envoi n’a pas pu être confirmé."} Vous pouvez garder votre brouillon sur cet appareil.`; if (error.status === 401) clerkClient?.openSignIn(); }
      finally { submit.disabled = false; }
    });
    showStep(0, false); setView("waiting");
  }
  function initOwnProfile() {
    const panel = byId("profile-load-panel"), message = byId("profile-load-message"), retry = byId("retry-profile-load"), saved = byId("registered-profile"), empty = byId("own-profile-empty");
    let generation = 0, accountId;
    byId("retry-account").addEventListener("click", () => location.reload());
    async function load() {
      const owner = clerkClient?.session && clerkClient?.user?.id;
      if (!owner) return;
      const ticket = ++generation;
      panel.hidden = false; panel.setAttribute("aria-busy", "true"); message.textContent = "Chargement de votre profil…"; retry.hidden = true; saved.hidden = true; empty.hidden = true;
      try {
        const result = await fetchJSON("/api/waitlist");
        if (ticket !== generation || clerkClient?.user?.id !== owner || !clerkClient?.session) return;
        if (result.profile === null) { panel.hidden = true; empty.hidden = false; }
        else if (result.profile && typeof result.profile === "object") { renderOwnProfile(result.profile, result); panel.hidden = true; saved.hidden = false; }
        else throw new Error("Le serveur n’a pas pu retrouver votre fiche.");
      } catch (error) {
        if (ticket !== generation || clerkClient?.user?.id !== owner) return;
        message.textContent = `${error.message || "Le chargement a échoué."} Votre fiche ne peut pas être affichée pour le moment.`; retry.hidden = false;
      } finally { if (ticket === generation) panel.setAttribute("aria-busy", "false"); }
    }
    function changed(userId) {
      if (accountId === userId) return;
      accountId = userId; ++generation;
      saved.hidden = true; empty.hidden = true; byId("saved-profile-card").replaceChildren(); byId("saved-profile-information").replaceChildren(); byId("saved-profile-title").textContent = "Votre profil"; byId("saved-profile-date").textContent = ""; byId("saved-profile-visibility").textContent = "";
      if (userId) load();
    }
    document.addEventListener("kairos-account", event => changed(event.detail.userId));
    retry.addEventListener("click", load);
    accountsReady.then(() => changed(clerkClient?.session ? clerkClient.user?.id || null : null));
  }
  async function initDirectory() {
    const filters = byId("directory-filters"), grid = byId("directory-results"), dialog = byId("member-dialog");
    const params = new URLSearchParams(location.search);
    let profiles = [], onlyFavorites = params.get("favoris") === "1", available = false, loading = true;
    let category = ["projets", "profils", "investisseurs"].includes(params.get("categorie")) ? params.get("categorie") : "tout";
    let loadGeneration = 0, detailGeneration = 0, detailController, activeProfile = null, accountId;
    filters.elements.q.value = (params.get("q") || "").slice(0, 120);
    byId("show-favorites").setAttribute("aria-pressed", String(onlyFavorites));
    const local = storedDraft(); if (local) byId("private-draft-card")?.append(makeCard(previewProfile(local)));
    function filterValues() { return Object.fromEntries(new FormData(filters).entries()); }
    function categoryMatches(p) { return category === "projets" ? p.hasProject : category === "profils" ? !p.hasProject && p.role !== "investor" : category === "investisseurs" ? p.role === "investor" : true; }
    function render() {
      const values = filterValues();
      const shown = profiles.filter(p => categoryMatches(p) && matchesFilters(p, values) && (!onlyFavorites || favoriteIds.has(p.id)));
      grid.replaceChildren(); grid.setAttribute("aria-busy", String(loading));
      byId("favorite-count").textContent = favoriteIds.size;
      byId("directory-count").textContent = loading ? "Chargement des propositions…" : !available ? "Répertoire indisponible" : `${shown.length} fiche${shown.length > 1 ? "s" : ""}${onlyFavorites ? " en favoris" : ""}`;
      document.querySelectorAll("[data-discovery-category]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.discoveryCategory === category)));
      if (shown.length) shown.forEach(p => grid.append(makeCard(p)));
      else if (loading) grid.append(el("p", "discovery-loading", "Nous récupérons les aperçus disponibles…"));
      else {
        const empty = el("div", "discovery-empty");
        const title = !available ? "Le répertoire n’a pas pu être chargé." : onlyFavorites ? "Votre sélection est encore vide." : profiles.length ? "Aucune fiche pour ces critères." : "Les premiers projets se préparent.";
        const message = !available ? "Réessayez dans quelques instants. Vous pouvez toujours retrouver votre propre fiche dans votre espace." : onlyFavorites ? "Enregistrez les fiches qui vous intéressent pour les retrouver ici." : profiles.length ? "Essayez une autre catégorie ou élargissez vos filtres." : "Présentez votre projet ou vos compétences pour rejoindre la communauté. Les fiches apparaissent après accord de leur auteur et validation par Kairos.";
        empty.append(el("h2", "", title), el("p", "", message));
        const link = el("a", "button button-outline", clerkClient?.session ? "Mon profil" : "Préparer mon profil"); link.href = clerkClient?.session ? "mon-profil.html" : "inscription.html"; empty.append(link);
        if (!available) { const retry = el("button", "button button-outline", "Réessayer"); retry.type = "button"; retry.dataset.retryDirectory = "true"; empty.append(retry); }
        grid.append(empty);
      }
      byId("directory-status").textContent = available ? "Fiches validées et publiées avec accord. L’ouverture d’une fiche nécessite un compte gratuit." : loading ? "" : "Le chargement n’a pas abouti ; aucun résultat n’a pu être confirmé.";
      byId("private-draft-section").hidden = Boolean(clerkClient?.session) || !local;
    }
    function updateFields() {
      const paris = filters.elements.department.value === "75";
      byId("directory-arrondissement").hidden = !paris;
      filters.elements.arrondissement.disabled = !paris;
      if (!paris) filters.elements.arrondissement.value = "";
    }
    function clearDetail() {
      ++detailGeneration; detailController?.abort(); activeProfile = null;
      byId("member-detail").replaceChildren();
    }
    function actionButtons(p) {
      const actions = el("div", "discovery-detail-actions");
      const save = el("button", "button button-outline", favoriteIds.has(p.id) ? "Fiche enregistrée" : "Enregistrer la fiche"); save.type = "button"; save.dataset.saveProfile = p.id; save.setAttribute("aria-pressed", String(favoriteIds.has(p.id)));
      const like = el("button", "button button-outline", `${p.likedByMe ? "♥" : "♡"} ${p.likesCount}`); like.type = "button"; like.dataset.likeProfile = p.id; like.setAttribute("aria-pressed", String(p.likedByMe)); like.setAttribute("aria-label", p.likedByMe ? "Retirer mon like" : "Aimer cette fiche");
      actions.append(save, like); return actions;
    }
    function updateDetailActions() {
      if (activeProfile && dialog.open) byId("member-detail").querySelector(".discovery-detail-actions")?.replaceWith(actionButtons(activeProfile));
    }
    function renderDetail(p) {
      const detail = byId("member-detail"); detail.replaceChildren();
      const heading = el("div", "discovery-detail-heading");
      const portrait = el("div", "discovery-detail-photo", Array.from(p.displayName || "K")[0]);
      if (p.photoUrl) { const image = el("img"); image.src = p.photoUrl; image.alt = `Photo de ${p.displayName}`; image.width = 130; image.height = 130; image.addEventListener("error", () => image.remove()); portrait.append(image); }
      const identity = el("div"); identity.append(el("p", "eyebrow", p.hasProject ? "PROJET" : ROLES[p.role] || "MEMBRE KAIROS"), el("h2", "", p.hasProject ? p.projectTitle || "Projet en préparation" : p.displayName));
      if (p.hasProject) identity.append(el("p", "", `Présenté par ${p.displayName}`));
      if (p.age) identity.append(el("p", "", `${p.age} ans`));
      identity.append(el("p", "", [p.city, p.department, p.arrondissement].filter(Boolean).join(" · ")));
      heading.append(portrait, identity); detail.append(heading);
      if (p.headline) detail.append(el("p", "discovery-detail-headline", p.headline));
      const items = [["À propos", p.bio], ["Parcours", [p.professionalStatus, p.education, p.experience].filter(Boolean).join(" · ")], ["Compétences", [p.workFields.join(", "), p.skills].filter(Boolean).join(" · ")], ["Le projet", [p.projectTitle, p.projectCategory, p.projectStage, p.projectDescription].filter(Boolean).join("\n\n")], ["Collaboration recherchée", [p.collaborationType, p.lookingFor, p.availability].filter(Boolean).join(" · ")], ["Investissement partagé", [p.investmentSectors, p.investmentProjectTypes, p.investmentAmount, ...(p.investmentRanges || [])].filter(Boolean).join(" · ")]];
      items.filter(([, value]) => value).forEach(([label, value]) => { const section = el("section", "member-detail-section"); section.append(el("h3", "", label), el("p", "", value)); detail.append(section); });
      detail.append(actionButtons(p), el("p", "discovery-member-note", "Kairos est en phase de liste d’attente. La messagerie entre membres n’est pas encore ouverte."));
    }
    async function openProfile(id) {
      if (!profileId(id)) return;
      if (!clerkClient?.session) { accountGate(id); return; }
      const currentUser = clerkClient.user?.id;
      clearDetail(); const ticket = detailGeneration; detailController = new AbortController();
      const detail = byId("member-detail"); detail.append(el("h2", "", "Chargement de la fiche…"));
      if (!dialog.open) dialog.showModal();
      try {
        const data = await fetchJSON(`/api/waitlist/profiles/${encodeURIComponent(id)}`, { signal: detailController.signal });
        if (ticket !== detailGeneration || currentUser !== clerkClient?.user?.id || !clerkClient?.session || !dialog.open) return;
        const record = publicRecord(data.profile);
        if (!record || data.profile.detailsAvailable !== true) throw new Error("La fiche reçue est incomplète.");
        activeProfile = record; renderDetail(record); forgetProfile();
      } catch (error) {
        if (ticket !== detailGeneration || currentUser !== clerkClient?.user?.id || error.name === "AbortError") return;
        if (error.status === 401) { dialog.close(); clearDetail(); accountGate(id); }
        else { detail.replaceChildren(el("h2", "", error.status === 404 ? "Cette fiche n’est plus disponible." : "La fiche n’a pas pu être chargée."), el("p", "", error.status === 404 ? "Elle a pu être retirée ou remise en attente de validation." : "Fermez cette fenêtre puis réessayez dans quelques instants.")); }
      }
    }
    async function interact(event) {
      const retry = event.target.closest("[data-retry-directory]"); if (retry) { load(); return; }
      const save = event.target.closest("[data-save-profile]"), like = event.target.closest("[data-like-profile]"), open = event.target.closest("[data-open-profile]");
      const id = profileId(save?.dataset.saveProfile || like?.dataset.likeProfile || open?.dataset.openProfile);
      if (!id) return;
      if (!clerkClient?.session) { accountGate(id); return; }
      const p = activeProfile?.id === id ? activeProfile : profiles.find(item => item.id === id);
      if (!p) return;
      if (save) {
        const previous = favoriteIds.has(id); if (previous) favoriteIds.delete(id); else favoriteIds.add(id);
        if (!saveFavorites()) { if (previous) favoriteIds.add(id); else favoriteIds.delete(id); }
        render(); updateDetailActions(); return;
      }
      if (like) {
        const currentUser = clerkClient.user?.id; like.disabled = true;
        try {
          const result = await fetchJSON(`/api/waitlist/profiles/${encodeURIComponent(id)}/like`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ liked: !p.likedByMe }) });
          if (currentUser !== clerkClient?.user?.id || !clerkClient?.session) return;
          if (!Number.isSafeInteger(result.likesCount) || result.likesCount < 0 || typeof result.liked !== "boolean") throw new Error("Invalid count");
          for (const item of [p, ...profiles.filter(item => item.id === id)]) { item.likesCount = result.likesCount; item.likedByMe = result.liked; }
          render(); updateDetailActions();
        } catch (error) { if (currentUser === clerkClient?.user?.id) { if (error.status === 401) { if (dialog.open) dialog.close(); clearDetail(); accountGate(id); } else toast("Votre like n’a pas pu être confirmé. Réessayez."); like.disabled = false; } }
        return;
      }
      if (open) openProfile(id);
    }
    async function load() {
      const ticket = ++loadGeneration; loading = true; render();
      try {
        const result = await fetchJSON("/api/waitlist/profiles");
        if (ticket !== loadGeneration) return;
        if (!Array.isArray(result.profiles)) throw new Error("Invalid directory");
        profiles = result.profiles.map(publicRecord).filter(Boolean); available = true;
      } catch { if (ticket === loadGeneration) { profiles = []; available = false; } }
      finally { if (ticket === loadGeneration) { loading = false; render(); } }
    }
    function changed(nextUser) {
      if (nextUser === accountId) return;
      accountId = nextUser; clearDetail(); if (dialog.open) dialog.close();
      if (byId("discovery-gate")?.open && nextUser) byId("discovery-gate").close();
      profiles = []; load();
      const selected = profileId(new URLSearchParams(location.search).get("fiche")) || pendingProfile();
      if (selected) {
        if (nextUser) {
          const address = new URL(location.href); address.searchParams.delete("fiche"); history.replaceState(null, "", address.pathname + address.search + address.hash);
          openProfile(selected);
        } else if (params.get("fiche")) accountGate(selected);
      }
    }
    filters.addEventListener("submit", event => { event.preventDefault(); if (byId("header-query")) byId("header-query").value = filters.elements.q.value; render(); });
    filters.addEventListener("change", () => { updateFields(); render(); });
    let timer; filters.elements.q.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(render, 180); });
    byId("reset-directory").addEventListener("click", () => { filters.reset(); if (byId("header-query")) byId("header-query").value = ""; onlyFavorites = false; category = "tout"; byId("show-favorites").setAttribute("aria-pressed", "false"); updateFields(); render(); });
    document.querySelectorAll("[data-discovery-category]").forEach(button => button.addEventListener("click", () => { category = button.dataset.discoveryCategory; render(); }));
    byId("show-favorites").addEventListener("click", event => { onlyFavorites = !onlyFavorites; event.currentTarget.setAttribute("aria-pressed", String(onlyFavorites)); render(); });
    grid.addEventListener("click", interact); byId("member-detail").addEventListener("click", interact);
    byId("close-member-dialog").addEventListener("click", () => dialog.close());
    dialog.addEventListener("close", () => { if (!dialog.open) clearDetail(); });
    document.addEventListener("kairos-account", event => changed(event.detail.userId));
    window.addEventListener("pagehide", () => { ++loadGeneration; if (dialog.open) dialog.close(); clearDetail(); });
    window.addEventListener("pageshow", event => { if (event.persisted) { accountId = undefined; changed(clerkClient?.session ? clerkClient.user?.id || null : null); } });
    updateFields(); load();
    accountsReady.then(() => changed(clerkClient?.session ? clerkClient.user?.id || null : null));
  }
  fillCatalogs();
  const closeHeader = initHeader();
  initDiscoveryGate();
  const accountsReady = initAccounts();
  window.KAIROS_APP = Object.freeze({
    ready: accountsReady,
    fetchJSON,
    renderOwnProfile,
    getUserId: () => clerkClient?.session ? clerkClient.user?.id || null : null
  });
  if (page === "landing") initLanding();
  if (page === "registration") initRegistration();
  if (page === "profile") initOwnProfile();
  if (page === "directory") initDirectory();
})();
