(() => {
  "use strict";
  const app = window.KAIROS_APP;
  if (!app) return;
  const byId = id => document.getElementById(id);
  const form = byId("admin-filters");
  const results = byId("admin-results");
  const workspace = byId("admin-workspace");
  const access = byId("admin-access");
  const dialog = byId("admin-detail");
  const roles = { founder: "Apporteur d’idée", partner: "Futur associé", investor: "Investisseur" };
  let userId, requestId = 0, detailId = 0, controller, detailController;
  let currentPage = 0, pageCount = 1, filters = new URLSearchParams();
  const node = (tag, className, value) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (value !== undefined && value !== null) element.textContent = value;
    return element;
  };
  const date = value => {
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(parsed) : "Date non renseignée";
  };
  function clearDetail() {
    detailId++;
    detailController?.abort();
    byId("admin-detail-content").hidden = true;
    for (const id of ["saved-profile-card", "saved-profile-information"]) byId(id).replaceChildren();
    for (const id of ["saved-profile-date", "saved-profile-visibility", "admin-record-reference", "admin-detail-status"]) byId(id).textContent = "";
    byId("saved-profile-title").textContent = "Préinscription";
  }
  function clearPrivateData() {
    controller?.abort();
    requestId++;
    if (dialog.open) dialog.close();
    clearDetail();
    results.replaceChildren();
    results.setAttribute("aria-busy", "false");
    workspace.hidden = true;
    byId("admin-total").textContent = "0";
    byId("admin-list-status").textContent = "";
    byId("admin-pagination").hidden = true;
  }
  function accessMessage(title, message, retry = false) {
    access.hidden = false;
    access.setAttribute("aria-busy", "false");
    byId("admin-access-title").textContent = title;
    byId("admin-access-message").textContent = message;
    byId("admin-retry").hidden = !retry;
  }
  function denied(error) {
    clearPrivateData();
    accessMessage(error.status === 401 ? "Reconnectez-vous." : "Cet espace est réservé à l’équipe.", error.status === 401 ? "Votre session a expiré. Reconnectez-vous à votre compte Kairos." : "Utilisez le compte Kairos dont l’adresse e-mail principale vérifiée a été autorisée pour l’administration. Vous pouvez changer de compte en vous déconnectant.");
  }
  function card(profile) {
    const article = node("article", "admin-person");
    const identity = node("div", "admin-person-identity");
    const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "Profil sans nom";
    const initials = [profile.firstName, profile.lastName].filter(Boolean).map(name => Array.from(name)[0]).join("");
    const visual = node("span", `admin-initials admin-role-${profile.role}`, initials || "K");
    visual.setAttribute("aria-hidden", "true");
    const heading = node("div");
    heading.append(node("h2", "", fullName), node("p", "admin-person-role", roles[profile.role] || "Membre Kairos"));
    identity.append(visual, heading);
    const meta = node("div", "admin-person-meta");
    meta.append(node("p", "", profile.email), node("p", "", [profile.city, profile.department].filter(Boolean).join(" · ") || "Localisation non renseignée"));
    const project = node("div", "admin-person-project");
    project.append(node("span", "eyebrow", "PROJET / INTÉRÊT"), node("h3", "", profile.projectTitle || profile.headline || "Projet à préciser"));
    if (profile.sector) project.append(node("p", "", profile.sector));
    const bottom = node("div", "admin-person-bottom");
    const status = node("span", "admin-person-status", profile.published && profile.publicConsent ? "Publié" : profile.publicConsent ? "Publication en attente" : "Fiche privée");
    const details = node("button", "button button-outline", "Voir la fiche");
    details.type = "button";
    details.setAttribute("aria-label", `Voir la fiche de ${fullName}`);
    details.addEventListener("click", () => openDetail(profile.id));
    bottom.append(status, details);
    const note = node("p", "admin-person-date", `Inscrit le ${date(profile.createdAt)}${profile.hasPhoto ? " · Photo disponible" : ""}`);
    article.append(identity, meta, project, note, bottom);
    return article;
  }
  async function load(page = 0) {
    const activeUser = app.getUserId();
    if (!activeUser) { clearPrivateData(); return; }
    controller?.abort();
    controller = new AbortController();
    const serial = ++requestId;
    const params = new URLSearchParams(filters);
    params.set("page", String(page));
    results.replaceChildren();
    results.setAttribute("aria-busy", "true");
    byId("admin-pagination").hidden = true;
    byId("admin-list-status").textContent = "Chargement des préinscriptions…";
    byId("admin-refresh").disabled = true;
    if (workspace.hidden) {
      accessMessage("Vérification de votre accès…", "Chargement sécurisé des fiches enregistrées.");
      access.setAttribute("aria-busy", "true");
    }
    try {
      const data = await app.fetchJSON(`/api/admin/profiles?${params}`, { signal: controller.signal });
      if (serial !== requestId || activeUser !== app.getUserId()) return;
      if (!Array.isArray(data.profiles) || !Number.isInteger(data.total) || !Number.isInteger(data.pageSize) || data.pageSize <= 0) throw new Error("La liste reçue est incomplète. Réessayez.");
      pageCount = Math.max(1, Math.ceil(data.total / data.pageSize));
      if (page >= pageCount && page > 0) { await load(pageCount - 1); return; }
      currentPage = data.page;
      access.hidden = true;
      workspace.hidden = false;
      byId("admin-total").textContent = new Intl.NumberFormat("fr-FR").format(data.total);
      byId("admin-count-label").textContent = data.total > 1 ? "préinscriptions" : "préinscription";
      results.replaceChildren(...data.profiles.map(card));
      byId("admin-list-status").textContent = data.total === 0 ? "Aucune fiche ne correspond à ces critères. Seules les personnes ayant envoyé leur questionnaire apparaissent ici." : `${data.profiles.length} fiche${data.profiles.length > 1 ? "s" : ""} affichée${data.profiles.length > 1 ? "s" : ""} sur ${data.total}.`;
      byId("admin-pagination").hidden = pageCount < 2;
      byId("admin-page-label").textContent = `Page ${currentPage + 1} sur ${pageCount}`;
      byId("admin-previous").disabled = currentPage === 0;
      byId("admin-next").disabled = currentPage + 1 >= pageCount;
    } catch (error) {
      if (serial !== requestId || activeUser !== app.getUserId() || error.name === "AbortError") return;
      if ([401, 403].includes(error.status)) denied(error);
      else {
        byId("admin-list-status").textContent = "La liste n’a pas pu être actualisée. Utilisez le bouton Actualiser pour réessayer.";
        if (workspace.hidden) accessMessage("Les fiches n’ont pas pu être chargées.", error.message || "Réessayez dans quelques instants.", true);
      }
    } finally {
      if (serial === requestId) { results.setAttribute("aria-busy", "false"); byId("admin-refresh").disabled = false; access.setAttribute("aria-busy", "false"); }
    }
  }
  async function openDetail(id) {
    const activeUser = app.getUserId();
    if (!activeUser) { clearPrivateData(); return; }
    clearDetail();
    const serial = detailId;
    detailController = new AbortController();
    byId("admin-detail-status").textContent = "Chargement de la fiche complète…";
    dialog.showModal();
    try {
      const data = await app.fetchJSON(`/api/admin/profiles/${encodeURIComponent(id)}`, { signal: detailController.signal });
      if (serial !== detailId || activeUser !== app.getUserId() || !dialog.open) return;
      if (!data.profile) throw new Error("Cette fiche n’est pas disponible.");
      app.renderOwnProfile(data.profile, data, "admin");
      byId("admin-record-reference").textContent = `Inscription : ${date(data.createdAt)} · Référence : ${data.id}`;
      byId("admin-detail-status").textContent = "";
      byId("admin-detail-content").hidden = false;
      byId("saved-profile-title").focus();
    } catch (error) {
      if (serial !== detailId || activeUser !== app.getUserId() || error.name === "AbortError") return;
      if ([401, 403].includes(error.status)) denied(error);
      else byId("admin-detail-status").textContent = error.message || "La fiche n’a pas pu être chargée. Fermez-la puis réessayez.";
    }
  }
  function changed(nextUserId) {
    if (nextUserId === userId) return;
    userId = nextUserId;
    clearPrivateData();
    form.reset();
    filters = new URLSearchParams();
    currentPage = 0;
    if (nextUserId) load(0);
  }
  form.addEventListener("submit", event => {
    event.preventDefault();
    filters = new URLSearchParams(new FormData(form));
    filters.set("q", (filters.get("q") || "").trim());
    load(0);
  });
  form.addEventListener("reset", () => { filters = new URLSearchParams(); });
  form.querySelector('[type="reset"]').addEventListener("click", () => { form.reset(); filters = new URLSearchParams(); load(0); });
  byId("admin-refresh").addEventListener("click", () => load(currentPage));
  byId("admin-retry").addEventListener("click", () => load(0));
  byId("admin-previous").addEventListener("click", () => { if (currentPage > 0) load(currentPage - 1); });
  byId("admin-next").addEventListener("click", () => { if (currentPage + 1 < pageCount) load(currentPage + 1); });
  byId("admin-close-detail").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", clearDetail);
  byId("retry-account").addEventListener("click", () => location.reload());
  document.addEventListener("kairos-account", event => changed(event.detail.userId));
  // Do not retain private responses in a page restored from the browser history.
  window.addEventListener("pagehide", clearPrivateData);
  window.addEventListener("pageshow", event => { if (event.persisted) { userId = undefined; changed(app.getUserId()); } });
  app.ready.then(() => changed(app.getUserId()));
})();
