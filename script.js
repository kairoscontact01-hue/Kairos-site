(() => {
  "use strict";

  const API = {
    profile: "/api/profiles/me",
    discovery: "/api/discovery",
    favorites: "/api/favorites",
    waitlist: "/api/waitlist",
    interaction: (id) => `/api/profiles/${encodeURIComponent(id)}/interactions`,
  };

  const byId = (id) => document.getElementById(id);
  const toast = byId("toast");
  let clerk = null;
  let toastTimer;

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("show"), 4200);
  }

  function setStatus(element, message, isError = false) {
    if (!element) return;
    element.textContent = message;
    element.classList.toggle("error", isError);
  }

  function clerkConfiguration() {
    const key = document.querySelector('meta[name="clerk-publishable-key"]')?.content.trim();
    const frontendApi = document.querySelector('meta[name="clerk-frontend-api"]')?.content.trim();
    if (!key || !frontendApi || key.startsWith("__") || frontendApi.startsWith("__")) return null;
    return { key, frontendApi: frontendApi.replace(/^https?:\/\//, "").replace(/\/$/, "") };
  }

  function loadClerkScript(config) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.defer = true;
      script.crossOrigin = "anonymous";
      script.dataset.clerkPublishableKey = config.key;
      script.src = `https://${config.frontendApi}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`;
      script.onload = resolve;
      script.onerror = () => reject(new Error("Impossible de charger Clerk."));
      document.head.append(script);
    });
  }

  async function request(path, options = {}) {
    if (!clerk?.session) throw new Error("Connectez-vous pour continuer.");
    const token = await clerk.session.getToken();
    const response = await fetch(path, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
    if (!response.ok) {
      const error = new Error(`La demande n’a pas abouti (${response.status}).`);
      error.status = response.status;
      throw error;
    }
    return response.status === 204 ? null : response.json();
  }

  function showWorkspace() {
    const app = byId("app");
    if (!app || !clerk?.user) return;
    app.hidden = false;
    document.querySelectorAll("body > header, body > main, body > footer").forEach((node) => { node.hidden = true; });
    const firstName = clerk.user.firstName || clerk.user.username || "";
    byId("app-greeting").textContent = firstName ? `Bonjour ${firstName}` : "Bienvenue sur Kairos";
    const userButton = byId("clerk-user-button");
    if (userButton && !userButton.dataset.mounted && clerk.mountUserButton) {
      clerk.mountUserButton(userButton);
      userButton.dataset.mounted = "true";
    }
    let requestedRole = "";
    try { requestedRole = sessionStorage.getItem("kairos_requested_role") || ""; } catch { /* Storage may be blocked for local-file previews. */ }
    if (requestedRole && byId("role-select")) {
      byId("role-select").value = requestedRole;
      try { sessionStorage.removeItem("kairos_requested_role"); } catch { /* Storage may be blocked for local-file previews. */ }
    }
    request(API.profile).then((profile) => {
      if (!profile) return;
      const form = byId("profile-form");
      Object.entries(profile).forEach(([name, value]) => {
        const field = form?.elements.namedItem(name);
        if (!field) return;
        if (field instanceof RadioNodeList && field.length && field[0].type === "checkbox") {
          const selected = Array.isArray(value) ? value.map(String) : [];
          Array.from(field).forEach((checkbox) => { checkbox.checked = selected.includes(checkbox.value); });
        } else if (field.type === "checkbox") {
          field.checked = Boolean(value);
        } else if (typeof value === "string") {
          field.value = value;
        }
      });
      updateRoleFields();
      setStatus(byId("profile-status"), "Votre profil est enregistré.");
    }).catch((error) => {
      if (error.status === 404) setStatus(byId("profile-status"), "Complétez votre profil. L’enregistrement sera disponible dès que le service de profils sera activé.");
      else setStatus(byId("profile-status"), "Profil prêt à compléter. Le service de profils n’est pas encore disponible.");
    });
  }

  function showPublicSite() {
    byId("app").hidden = true;
    document.querySelectorAll("body > header, body > main, body > footer").forEach((node) => { node.hidden = false; });
  }

  async function initializeClerk() {
    const config = clerkConfiguration();
    if (!config) return;
    try {
      await loadClerkScript(config);
      if (!window.Clerk) throw new Error("Clerk n’est pas disponible.");
      clerk = window.Clerk;
      await clerk.load();
      clerk.addListener(({ user }) => user ? showWorkspace() : showPublicSite());
      if (clerk.user) showWorkspace();
    } catch (error) {
      console.error("Clerk", error);
      showToast("La connexion n’a pas pu être initialisée. Vérifiez la configuration Clerk.");
    }
  }

  async function openAuth(mode, role) {
    if (role) {
      try { sessionStorage.setItem("kairos_requested_role", role); } catch { /* Storage may be blocked for local-file previews. */ }
    }
    const config = clerkConfiguration();
    if (!config) {
      showToast("Clerk est relié à Vercel, mais sa clé publique et son domaine Frontend API doivent être ajoutés à index.html.");
      return;
    }
    if (!clerk) {
      showToast("La connexion se prépare. Réessayez dans quelques secondes.");
      await initializeClerk();
    }
    if (!clerk) return;
    if (mode === "sign-up") clerk.openSignUp();
    else if (mode === "sign-in") clerk.openSignIn();
    else if (mode === "sign-out") await clerk.signOut();
  }

  function updateRoleFields() {
    const isInvestor = byId("role-select")?.value === "investor";
    byId("investor-fields").hidden = !isInvestor;
    byId("investor-fields").querySelectorAll("input,select,textarea").forEach((field) => { field.disabled = !isInvestor; });
    const arrField = document.querySelector('[name="arrondissement"]');
    if (arrField) arrField.disabled = byId("department-select").value !== "75";
    byId("arrondissement-field").hidden = byId("department-select").value !== "75";
    const isParisSearch = document.querySelector('#discover-filters [name="department"]')?.value === "75";
    byId("filter-arrondissement-field").hidden = !isParisSearch;
    byId("filter-arrondissement-field").querySelector("select").disabled = !isParisSearch;
    const showIntent = document.querySelector('[name="showInvestmentIntent"]')?.checked;
    const publishAmount = document.querySelector('[name="showInvestmentAmount"]');
    const amount = document.querySelector('[name="investmentAmount"]');
    if (!showIntent && publishAmount) publishAmount.checked = false;
    if (publishAmount) publishAmount.disabled = !isInvestor || !showIntent;
    if (amount) amount.disabled = !isInvestor;
  }

  function formDataObject(form) {
    const data = Object.fromEntries(new FormData(form).entries());
    form.querySelectorAll('input[type="checkbox"][name]').forEach((checkbox) => {
      const named = form.querySelectorAll(`input[type="checkbox"][name="${CSS.escape(checkbox.name)}"]`);
      if (named.length > 1) {
        data[checkbox.name] = Array.from(named).filter((item) => item.checked).map((item) => item.value);
      } else {
        data[checkbox.name] = checkbox.checked;
      }
    });
    if (data.role && data.role !== "investor") {
      data.investmentRanges = [];
      data.investmentSectors = "";
      data.investmentProjectTypes = "";
      data.investmentAmount = "";
      data.showInvestmentIntent = false;
      data.showInvestmentAmount = false;
    }
    return data;
  }

  async function saveProfile(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('[type="submit"]');
    const status = byId("profile-status");
    button.disabled = true;
    setStatus(status, "Enregistrement en cours…");
    try {
      await request(API.profile, { method: "PUT", body: JSON.stringify(formDataObject(form)) });
      setStatus(status, "Profil enregistré. Vous pourrez le modifier à tout moment.");
      showToast("Votre profil Kairos est enregistré.");
    } catch (error) {
      const message = error.status === 404 || error.status === 405
        ? "Le profil est prêt, mais l’API de sauvegarde n’est pas encore installée. Rien n’a été envoyé ni enregistré."
        : "Impossible d’enregistrer pour le moment. Vos informations n’ont pas été sauvegardées.";
      setStatus(status, message, true);
    } finally {
      button.disabled = false;
    }
  }

  function roleLabel(role) {
    return ({ founder: "Porteur de projet", partner: "Futur associé", investor: "Investisseur" })[role] || "Membre Kairos";
  }

  function createProfileCard(profile) {
    const card = document.createElement("article");
    card.className = "discovery-card";
    const top = document.createElement("div");
    top.className = "discovery-card-top";
    const name = document.createElement("h2");
    name.textContent = profile.projectTitle || profile.headline || profile.displayName || "Membre Kairos";
    const role = document.createElement("span");
    role.textContent = roleLabel(profile.role);
    top.append(name, role);
    const bio = document.createElement("p");
    bio.textContent = profile.projectDescription || profile.bio || "Ce membre n’a pas encore ajouté de présentation.";
    const place = document.createElement("p");
    place.className = "discovery-location";
    place.textContent = [profile.city, profile.department && `${profile.department} · Île-de-France`].filter(Boolean).join(" · ");
    const tags = document.createElement("div");
    tags.className = "discovery-tags";
    [profile.projectCategory, profile.projectStage, profile.skills, profile.sectors].filter(Boolean).join(", ").split(",").map((text) => text.trim()).filter(Boolean).slice(0, 5).forEach((text) => {
      const tag = document.createElement("span");
      tag.textContent = text;
      tags.append(tag);
    });
    const actions = document.createElement("div");
    actions.className = "discovery-actions";
    [{ type: "like", label: `J’aime · ${Number(profile.likesCount) || 0}` }, { type: "favorite", label: profile.isFavorite ? "♥ Enregistré" : "♡ Ajouter aux favoris" }].forEach(({ type, label }) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "inline-action profile-interaction";
      button.dataset.action = type;
      button.dataset.profileId = profile.id;
      button.textContent = label;
      actions.append(button);
    });
    card.append(top, bio, place, tags, actions);
    return card;
  }

  async function loadDiscovery(filters = {}) {
    const results = byId("discover-results");
    results.replaceChildren();
    const loading = document.createElement("p");
    loading.className = "discovery-message";
    loading.textContent = "Recherche des profils…";
    results.append(loading);
    const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
    try {
      const data = await request(`${API.discovery}${params.size ? `?${params}` : ""}`);
      const profiles = Array.isArray(data) ? data : data.profiles;
      results.replaceChildren();
      if (!profiles?.length) {
        const empty = document.createElement("div");
        empty.className = "empty-state";
        empty.innerHTML = '<span class="empty-mark" aria-hidden="true">k</span><h2>Aucun profil pour ces critères.</h2><p>Essayez d’élargir votre recherche ou revenez plus tard.</p>';
        results.append(empty);
        return;
      }
      const grid = document.createElement("div");
      grid.className = "discovery-grid";
      profiles.forEach((profile) => grid.append(createProfileCard(profile)));
      results.append(grid);
    } catch {
      results.replaceChildren();
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.innerHTML = '<span class="empty-mark" aria-hidden="true">k</span><h2>La découverte ouvrira dès que les profils seront disponibles.</h2><p>Aucun faux profil n’est affiché. Le service de profils doit être activé pour découvrir les membres de Kairos.</p>';
      results.append(empty);
    }
  }

  async function sendInteraction(button) {
    const { profileId, action } = button.dataset;
    button.disabled = true;
    try {
      const result = await request(API.interaction(profileId), { method: "POST", body: JSON.stringify({ action }) });
      if (action === "like") button.textContent = `J’aime · ${Number(result.likesCount) || 0}`;
      else button.textContent = result.isFavorite ? "♥ Enregistré" : "♡ Ajouter aux favoris";
      showToast(action === "like" ? "Votre appréciation a été prise en compte." : "Votre sélection a été mise à jour.");
    } catch {
      showToast("Cette action sera disponible lorsque le service de profils sera activé.");
    } finally {
      button.disabled = false;
    }
  }

  async function loadFavorites() {
    const results = byId("favorites-results");
    results.replaceChildren();
    try {
      const data = await request(API.favorites);
      const profiles = Array.isArray(data) ? data : data.profiles;
      if (profiles?.length) {
        const grid = document.createElement("div");
        grid.className = "discovery-grid";
        profiles.forEach((profile) => grid.append(createProfileCard(profile)));
        results.append(grid);
        return;
      }
    } catch { /* An empty state is more useful than showing invented saved profiles. */ }
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = '<span class="empty-mark" aria-hidden="true">♡</span><h2>Votre sélection est vide.</h2><p>Enregistrez un profil lors de votre découverte pour le retrouver ici.</p><button class="button button-outline" type="button" data-switch-view="discover">Découvrir les profils</button>';
    results.append(empty);
  }

  async function submitWaitlist(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    setStatus(byId("waitlist-status"), "Envoi en cours…");
    try {
      const response = await fetch(API.waitlist, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.elements.email.value.trim(), consent: form.elements.consent.checked }),
      });
      if (!response.ok) throw new Error("Service indisponible");
      setStatus(byId("waitlist-status"), "Votre demande est bien enregistrée. Merci de votre intérêt pour Kairos.");
      form.reset();
    } catch {
      setStatus(byId("waitlist-status"), "L’inscription aux nouvelles n’est pas encore disponible. Votre adresse n’a pas été envoyée.", true);
    } finally {
      button.disabled = false;
    }
  }

  function setView(name) {
    document.querySelectorAll(".view-panel").forEach((panel) => { panel.hidden = panel.id !== `${name}-view`; });
    document.querySelectorAll(".app-nav").forEach((button) => button.classList.toggle("active", button.dataset.view === name));
    if (name === "discover") loadDiscovery();
    if (name === "saved") loadFavorites();
  }

  document.addEventListener("click", (event) => {
    const authButton = event.target.closest("[data-auth]");
    if (authButton) {
      event.preventDefault();
      openAuth(authButton.dataset.auth, authButton.dataset.role);
      return;
    }
    const navButton = event.target.closest("[data-view]");
    if (navButton) setView(navButton.dataset.view);
    const switchButton = event.target.closest("[data-switch-view]");
    if (switchButton) setView(switchButton.dataset.switchView);
    const interaction = event.target.closest(".profile-interaction");
    if (interaction) sendInteraction(interaction);
  });

  byId("role-select").addEventListener("change", updateRoleFields);
  byId("department-select").addEventListener("change", updateRoleFields);
  document.querySelector('#discover-filters [name="department"]').addEventListener("change", updateRoleFields);
  document.querySelector('[name="showInvestmentIntent"]').addEventListener("change", updateRoleFields);
  document.querySelector('[name="showInvestmentAmount"]').addEventListener("change", updateRoleFields);
  byId("profile-form").addEventListener("submit", saveProfile);
  byId("waitlist-form").addEventListener("submit", submitWaitlist);
  byId("discover-filters").addEventListener("submit", (event) => {
    event.preventDefault();
    loadDiscovery(formDataObject(event.currentTarget));
  });
  byId("menu-toggle").addEventListener("click", (event) => {
    const button = event.currentTarget;
    const open = button.getAttribute("aria-expanded") !== "true";
    button.setAttribute("aria-expanded", String(open));
    document.querySelector(".main-nav").classList.toggle("open", open);
  });
  document.querySelectorAll(".main-nav a").forEach((link) => link.addEventListener("click", () => {
    document.querySelector(".main-nav").classList.remove("open");
    byId("menu-toggle").setAttribute("aria-expanded", "false");
  }));

  updateRoleFields();
  initializeClerk();
})();
