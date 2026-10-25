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
    const r = { id: raw.id.slice(0, 150), preview: false, role: Object.hasOwn(ROLES, p.role) ? p.role : "member", workFields: list(p.workFields, CATALOGS.workFields), photoUrl: safePhoto(p.photoUrl), likesCount: Number.isSafeInteger(raw.likesCount) && raw.likesCount >= 0 ? raw.likesCount : 0, canLike: raw.canLike === true, likedByMe: raw.likedByMe === true };
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
    const card = el("article", `member-card member-card-${p.role}`); const visual = el("div", "member-visual");
    if (p.photoUrl) { const img = el("img"); img.src = p.photoUrl; img.alt = `Photo de ${p.displayName}`; img.loading = "lazy"; img.addEventListener("error", () => { img.remove(); visual.prepend(el("span", "member-initials", Array.from(p.displayName || "V")[0])); }); visual.append(img); }
    else visual.append(el("span", "member-initials", Array.from(p.displayName || "V")[0]));
    visual.append(el("span", "member-role", ROLES[p.role] || ROLES.member));
    const save = el("button", "member-save", "☆"); save.type = "button"; save.dataset.saveProfile = p.id; save.setAttribute("aria-label", p.preview ? "Favoris disponibles à l’ouverture" : `Enregistrer ${p.displayName}`); save.setAttribute("aria-pressed", String(!p.preview && favoriteIds.has(p.id)));
    if (p.preview) { save.disabled = true; save.title = "Disponible à l’ouverture"; } else if (favoriteIds.has(p.id)) save.textContent = "★";
    visual.append(save); const content = el("div", "member-card-content");
    const title = el(p.preview ? "h3" : "button", "member-name", p.displayName + (p.age ? `, ${p.age} ans` : "")); if (!p.preview) { title.type = "button"; title.dataset.openProfile = p.id; }
    content.append(title, el("p", "member-city", [p.city, p.department].filter(Boolean).join(" · ") || "Ville à préciser"), el("p", "member-headline", p.headline || p.projectTitle || "Votre présentation en quelques mots"));
    const tags = el("div", "member-tags"); (p.workFields.length ? p.workFields.slice(0, 3) : ["Compétences à préciser"]).forEach((skill) => tags.append(el("span", "", skill)));
    const bottom = el("div", "member-card-bottom"); const like = el("button", "member-like", p.preview ? "♡ J’aime" : `${p.likedByMe ? "♥" : "♡"} ${p.likesCount}`); like.type = "button"; like.dataset.likeProfile = p.id; like.setAttribute("aria-label", p.preview ? "Likes disponibles à l’ouverture" : `${p.likedByMe ? "Retirer mon like du" : "Aimer le"} profil de ${p.displayName}, ${p.likesCount} likes`); like.setAttribute("aria-pressed", String(Boolean(p.likedByMe)));
    if (p.preview || !p.canLike) { like.disabled = true; like.title = p.preview ? "Aperçu privé" : "Connectez-vous pour aimer ce profil"; }
    bottom.append(like, el("span", "member-stage", p.preview ? "Aperçu privé" : "Sur liste d’attente")); content.append(tags, bottom); card.append(visual, content); return card;
  }
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
    document.querySelectorAll("[data-auth-label]").forEach((label) => { label.textContent = user ? label.dataset.signedIn : label.dataset.signedOut; });
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
      let mounted = false, previousUserId;
      function syncAccount() {
        const user = clerkClient.session ? clerkClient.user : null;
        syncAccountUI(user);
        const userId = user?.id || null;
        if (userId !== previousUserId) { previousUserId = userId; document.dispatchEvent(new CustomEvent("kairos-account", { detail: { userId } })); }
        document.querySelectorAll(".header-account").forEach((button) => { button.hidden = Boolean(user); });
        document.querySelectorAll("[data-account]").forEach((button) => { button.disabled = false; });
        if (userButton) {
          userButton.hidden = !user;
          if (user && !mounted) { clerkClient.mountUserButton(userButton); mounted = true; }
          if (!user && mounted) { clerkClient.unmountUserButton(userButton); mounted = false; }
        }
        if (panel) {
          panel.hidden = false; panel.setAttribute("aria-busy", "false"); panel.querySelector(".account-actions").hidden = Boolean(user); byId("retry-account").hidden = true;
          byId("account-title").textContent = user ? "Votre compte Kairos" : "Commençons par votre compte.";
          byId("account-step").textContent = user ? "COMPTE CONNECTÉ" : "01 / VOTRE COMPTE";
          byId("account-status").textContent = user ? `Connecté${user.firstName ? ` en tant que ${user.firstName}` : ""}. Complétez votre profil ci-dessous ou reprenez votre fiche enregistrée.` : "Créez votre compte sécurisé ou connectez-vous. Le questionnaire s’affichera ensuite, ici même.";
          const form = byId("registration-form");
          if (user && form) {
            const values = { firstName: user.firstName, lastName: user.lastName, email: user.primaryEmailAddress?.emailAddress };
            Object.entries(values).forEach(([name, value]) => { const input = form.elements.namedItem(name); if (input && !input.value && value) input.value = value; });
            form.dispatchEvent(new Event("input", { bubbles: true }));
          }
          const introduction = document.querySelector(".registration-intro > p:last-child");
          if (introduction) introduction.textContent = user ? "Votre compte est prêt. Présentez maintenant votre parcours, vos compétences et votre projet pour rejoindre la liste d’attente. Aucun paiement ne vous sera demandé." : "Créez votre compte ou connectez-vous. Vous pourrez ensuite compléter votre parcours, vos compétences et votre projet pour rejoindre la liste d’attente. Aucun paiement ne vous sera demandé.";
        }
      }
      clerkClient.addListener(syncAccount); syncAccount();
      document.querySelectorAll("[data-account]").forEach((button) => button.addEventListener("click", () => {
        closeHeader();
        if (button.dataset.account === "sign-up") clerkClient.openSignUp(); else clerkClient.openSignIn();
      }));
    } catch {
      clerkClient = null;
      unavailable("La connexion n’a pas pu démarrer. Réessayez pour accéder à votre profil.");
      console.warn("Clerk n’a pas pu démarrer. Vérifiez config.js et les domaines autorisés de votre application.");
    }
  }
  function initLanding() {
    const close = closeHeader;
    function audience(name, focus) { document.querySelectorAll("[data-audience]").forEach((tab) => { const selected = tab.dataset.audience === name; tab.setAttribute("aria-selected", String(selected)); tab.tabIndex = selected ? 0 : -1; byId(tab.getAttribute("aria-controls")).hidden = !selected; if (focus && selected) tab.focus(); }); }
    document.querySelectorAll("[data-audience]").forEach((tab, index, tabs) => {
      tab.addEventListener("click", () => audience(tab.dataset.audience));
      tab.addEventListener("keydown", (event) => { let next;
        if (["ArrowDown", "ArrowRight"].includes(event.key)) next = (index + 1) % tabs.length;
        else if (["ArrowUp", "ArrowLeft"].includes(event.key)) next = (index - 1 + tabs.length) % tabs.length;
        else if (event.key === "Home") next = 0; else if (event.key === "End") next = tabs.length - 1; else return;
        event.preventDefault(); audience(tabs[next].dataset.audience, true);
      });
    });
    document.querySelectorAll("[data-register], [data-interest-plan]").forEach((control) => control.addEventListener("click", (event) => { event.preventDefault(); close(); navigateToRegistration(control.dataset.role, control.dataset.interestPlan); }));
  }
  function initRegistration() {
    const form = byId("registration-form"); form.noValidate = true;
    const panels = [...form.querySelectorAll("[data-panel]")]; let step = 0, photoUrl = "", selectedPlan = "";
    const params = new URLSearchParams(location.search);
    byId("retry-account")?.addEventListener("click", () => location.reload());
    if (Object.hasOwn(PLANS, params.get("offre"))) selectedPlan = params.get("offre");
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
    const resume = el("button", "text-link", "Reprendre ma fiche enregistrée →"); resume.type = "button"; resume.hidden = true;
    byId("account-connection")?.append(resume);
    let profileOwner, restoreRequested = params.get("reprendre") === "1";
    document.addEventListener("kairos-account", (event) => {
      const userId = event.detail.userId;
      resume.hidden = !userId;
      if (profileOwner && profileOwner !== userId) {
        form.reset(); photoUrl = ""; byId("profile-photo").value = ""; byId("remove-photo").hidden = true;
        byId("photo-status").textContent = ""; byId("registration-feedback").textContent = "";
        byId("registration-success").hidden = true; document.querySelector(".registration-layout").hidden = false;
        showStep(0, false);
      }
      profileOwner = userId;
      if (userId && restoreRequested && storedDraft()) { restoreRequested = false; restore(); }
    });
    resume.addEventListener("click", async () => {
      resume.disabled = true;
      const owner = clerkClient?.user?.id;
      try {
        const result = await fetchJSON("/api/waitlist");
        if (!owner || clerkClient?.user?.id !== owner || !clerkClient?.session) return;
        if (!result.profile) { toast("Aucune fiche n’est encore enregistrée pour ce compte."); return; }
        document.querySelector(".registration-layout").hidden = false; byId("registration-success").hidden = true;
        applyProfile(cleanDraft(result.profile));
        byId("draft-status").textContent = "Fiche enregistrée récupérée. Vérifiez vos informations avant de confirmer sa mise à jour.";
      } catch (error) { toast(error.message || "La fiche n’a pas pu être récupérée."); }
      finally { resume.disabled = false; }
    });
    byId("draft-banner").hidden = !storedDraft(); byId("restore-draft").addEventListener("click", restore);
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
      for (let i = 0; i < panels.length; i++) if (!validatePanel(i)) return;
      const data = draft(); const feedback = byId("registration-feedback"), submit = byId("submit-registration"); submit.disabled = true; feedback.classList.remove("error"); feedback.textContent = "Envoi de votre demande…";
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
        const messages = { sent: "Un e-mail de confirmation vous a été envoyé.", test_sent: "Le site utilise encore le mode de test Resend : l’e-mail a été envoyé uniquement à l’équipe Kairos. Votre fiche est bien enregistrée.", pending: "Votre fiche est bien enregistrée. L’envoi de l’e-mail n’a pas encore été confirmé.", not_configured: "Votre fiche est bien enregistrée. Les e-mails de confirmation ne sont pas encore activés." };
        byId("registration-success").querySelector("p:not(.eyebrow)").textContent = `Vous rejoignez la liste d’attente Kairos. ${messages[result.notification] || "Votre fiche est bien enregistrée."} Aucun paiement n’a été déclenché.`;
        document.querySelector(".registration-layout").hidden = true; byId("draft-banner").hidden = true; byId("registration-success").hidden = false; byId("registration-success").focus();
      } catch (error) { feedback.classList.add("error"); feedback.textContent = `${error.message || "L’envoi n’a pas pu être confirmé."} Vous pouvez garder votre brouillon sur cet appareil.`; if (error.status === 401) clerkClient?.openSignIn(); }
      finally { submit.disabled = false; }
    });
    showStep(0, false);
  }
  async function initDirectory() {
    let profiles = [], onlyFavorites = false, available = false;
    const filters = byId("directory-filters");
    const params = new URLSearchParams(location.search);
    filters.elements.q.value = (params.get("q") || "").slice(0, 120);
    onlyFavorites = params.get("favoris") === "1";
    byId("show-favorites").setAttribute("aria-pressed", String(onlyFavorites));
    function filterValues() {
      const values = Object.fromEntries(new FormData(filters).entries());
      values.q = byId("header-query")?.value.trim() || "";
      filters.elements.q.value = values.q;
      return values;
    }
    function render() {
      const values = filterValues(); const shown = profiles.filter((p) => matchesFilters(p, values) && (!onlyFavorites || favoriteIds.has(p.id)));
      byId("directory-results").replaceChildren(); byId("favorite-count").textContent = favoriteIds.size;
      byId("directory-count").textContent = profiles.length ? `${shown.length} profil${shown.length > 1 ? "s" : ""}${onlyFavorites ? " en favoris" : " disponible" + (shown.length > 1 ? "s" : "")}` : "Aucun profil public disponible";
      if (shown.length) shown.forEach((p) => byId("directory-results").append(makeCard(p)));
      else { const empty = el("div", "directory-empty"); empty.append(el("span", "", onlyFavorites ? "♡" : "↗"), el("h2", "", onlyFavorites ? "Votre sélection est encore vide." : profiles.length ? "Aucun profil pour ces critères." : "Les premières rencontres se préparent."), el("p", "", profiles.length ? "Essayez d’autres critères ou ajoutez des profils à vos favoris." : "Préparez votre fiche sur liste d’attente. Seules les personnes ayant autorisé la publication pourront être présentées ici.")); const link = el("a", "button button-outline", "Préparer ma fiche ↗"); link.href = "inscription.html"; empty.append(link); byId("directory-results").append(empty); }
      byId("directory-status").textContent = available ? "Seules les fiches publiées avec consentement sont présentées." : "Le répertoire se prépare. Vous pouvez déjà préparer votre fiche. Votre brouillon reste privé.";
    }
    const local = storedDraft(); if (local) { byId("private-draft-section").hidden = false; byId("private-draft-card").append(makeCard(previewProfile(local))); }
    function updateDirectoryFields() {
      const paris = filters.elements.department.value === "75";
      const field = byId("directory-arrondissement");
      if (field) field.hidden = !paris;
      if (filters.elements.arrondissement) {
        filters.elements.arrondissement.disabled = !paris;
        if (!paris) filters.elements.arrondissement.value = "";
      }
    }
    filters.addEventListener("submit", (event) => { event.preventDefault(); render(); });
    filters.addEventListener("change", () => { updateDirectoryFields(); render(); });
    byId("reset-directory")?.addEventListener("click", () => {
      filters.reset(); byId("header-query").value = ""; onlyFavorites = false;
      byId("show-favorites").setAttribute("aria-pressed", "false");
      updateDirectoryFields(); render();
    });
    updateDirectoryFields();
    let timer; byId("header-query")?.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(render, 180); });
    byId("show-favorites").addEventListener("click", (event) => { onlyFavorites = !onlyFavorites; event.currentTarget.setAttribute("aria-pressed", String(onlyFavorites)); render(); });
    function openProfile(p) {
      const detail = byId("member-detail"); detail.replaceChildren(makeCard({ ...p, preview: true }));
      const items = [["À propos", p.bio], ["Parcours", [p.professionalStatus, p.education, p.experience].filter(Boolean).join(" · ")], ["Compétences", p.skills], ["Projet", p.projectDescription], ["Collaboration", [p.collaborationType, p.lookingFor, p.availability].filter(Boolean).join(" · ")], ["Investissement partagé", [p.investmentSectors, p.investmentProjectTypes, p.investmentAmount, ...(p.investmentRanges || [])].filter(Boolean).join(" · ")]];
      items.filter(([, value]) => value).forEach(([label, value]) => { const section = el("section", "member-detail-section"); section.append(el("h3", "", label), el("p", "", value)); detail.append(section); }); byId("member-dialog").showModal();
    }
    byId("close-member-dialog").addEventListener("click", () => byId("member-dialog").close());
    byId("directory-results").addEventListener("click", async (event) => {
      const save = event.target.closest("[data-save-profile]"), open = event.target.closest("[data-open-profile]"), like = event.target.closest("[data-like-profile]");
      if (save) { const id = save.dataset.saveProfile; if (!profiles.some((p) => p.id === id)) return; const previous = favoriteIds.has(id); if (previous) favoriteIds.delete(id); else favoriteIds.add(id); if (!saveFavorites()) { if (previous) favoriteIds.add(id); else favoriteIds.delete(id); } render(); }
      if (open) { const p = profiles.find((item) => item.id === open.dataset.openProfile); if (p) openProfile(p); }
      if (like) { const p = profiles.find((item) => item.id === like.dataset.likeProfile); if (!p?.canLike) return; like.disabled = true;
        try { const result = await fetchJSON(`/api/waitlist/profiles/${encodeURIComponent(p.id)}/like`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ liked: !p.likedByMe }) }); if (!Number.isSafeInteger(result.likesCount) || result.likesCount < 0 || typeof result.liked !== "boolean") throw new Error("Invalid count"); p.likesCount = result.likesCount; p.likedByMe = result.liked; render(); }
        catch { toast("Votre like n’a pas pu être confirmé. Réessayez plus tard."); like.disabled = false; }
      }
    });
    render();
    let loadGeneration = 0;
    async function load() {
      const generation = ++loadGeneration;
      try { const result = await fetchJSON("/api/waitlist/profiles"); if (!Array.isArray(result.profiles)) throw new Error("Invalid directory"); if (generation !== loadGeneration) return; profiles = result.profiles.map(publicRecord).filter(Boolean); available = true; render(); }
      catch { if (generation === loadGeneration) { profiles = []; available = false; render(); } }
    }
    document.addEventListener("kairos-account", load);
    await accountsReady; await load();
  }
  fillCatalogs();
  const closeHeader = initHeader();
  const accountsReady = initAccounts();
  if (page === "landing") initLanding();
  if (page === "registration") initRegistration();
  if (page === "directory") initDirectory();
})();
