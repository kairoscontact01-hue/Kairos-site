(() => {
  "use strict";

  /*
   * CONFIGURATION PUBLIQUE
   *
   * Colle uniquement la Publishable Key Clerk :
   * pk_test_... ou pk_live_...
   *
   * Aucune clé secrète Clerk ou Resend dans ce fichier.
   */
  const CONFIG = {
    clerkPublishableKey: "pk_test_YWJvdmUtZXNjYXJnb3QtMTIzMi5jbGVyay5hY2NvdW50cy5kZXYk",
    apiBase: ""
  };

  const $ = (id) => document.getElementById(id);
  const form = $("registration-form");
  const panels = [...document.querySelectorAll("[data-panel]")];

  const ROLES = {
    founder: "Apporteur d’idée",
    partner: "Futur associé",
    investor: "Investisseur",
    member: "Membre Kairos"
  };

  const PLANS = {
    student: "Premium étudiant — 3,99 € / 4 semaines",
    classic: "Premium classique — 9,99 € / 4 semaines",
    vip: "Premium VIP — 19,99 € / 4 semaines"
  };

  const CATALOGS = {
    statuses: [
      "Étudiant·e", "Salarié·e", "Indépendant·e",
      "Entrepreneur·se", "En reconversion",
      "En recherche d’activité", "Autre"
    ],
    education: [
      "Sans diplôme / autodidacte", "CAP / BEP", "Baccalauréat",
      "Bac +2", "Licence / Bachelor / BUT",
      "Master / Bac +5", "Doctorat", "Autre"
    ],
    studyFields: [
      "Informatique & numérique", "Commerce & gestion",
      "Marketing & communication", "Design & création",
      "Finance & comptabilité", "Droit", "Ingénierie & sciences",
      "Santé & social", "Éducation & sciences humaines",
      "Environnement", "Artisanat", "Autre"
    ],
    experience: [
      "Je débute", "Moins de 2 ans", "2 à 5 ans",
      "6 à 10 ans", "Plus de 10 ans"
    ],
    availability: [
      "Quelques heures par semaine", "Un à deux jours par semaine",
      "Temps partiel", "Temps plein", "À définir ensemble"
    ],
    workFields: [
      "Développement informatique", "Data & intelligence artificielle",
      "Design & UX/UI", "Commerce & vente", "Marketing & communication",
      "Gestion de produit", "Finance & comptabilité", "Stratégie & gestion",
      "Droit & administration", "Ingénierie & industrie",
      "Santé & bien-être", "Environnement & climat",
      "Éducation & formation", "Culture & création",
      "Artisanat", "Opérations & logistique", "Autre domaine"
    ],
    sectors: [
      "Technologie & numérique", "Éducation & formation",
      "Santé & bien-être", "Environnement & climat",
      "Alimentation & agriculture", "Commerce & services",
      "Culture & médias", "Finance & assurance",
      "Industrie & mobilité", "Économie sociale & solidaire",
      "Autre secteur", "Je suis encore en exploration"
    ],
    stages: [
      "J’explore une idée", "Je valide un besoin",
      "Je développe un prototype", "J’ai de premiers clients",
      "Mon activité est lancée", "Je cherche un projet à rejoindre",
      "Je souhaite investir ou accompagner"
    ],
    collaborations: [
      "Association / cofondation", "Collaboration à temps partiel",
      "Collaboration à temps plein", "Partenariat ponctuel",
      "Mission rémunérée", "Investissement & accompagnement",
      "Ouvert·e à en discuter"
    ],
    lookingFor: [
      "Un associé / une associée", "Un profil technique / développeur",
      "Un profil commercial", "Un profil design / créatif",
      "Un investisseur", "Un partenaire", "Une équipe à rejoindre",
      "Ouvert·e à plusieurs profils"
    ],
    departments: [
      ["75", "75 · Paris"], ["77", "77 · Seine-et-Marne"],
      ["78", "78 · Yvelines"], ["91", "91 · Essonne"],
      ["92", "92 · Hauts-de-Seine"], ["93", "93 · Seine-Saint-Denis"],
      ["94", "94 · Val-de-Marne"], ["95", "95 · Val-d’Oise"]
    ],
    arrondissements: Array.from(
      { length: 20 },
      (_, i) => `${i + 1}${i === 0 ? "er" : "e"} arrondissement`
    ),
    investmentRanges: [
      "Moins de 10 000 €", "10 000 € à 50 000 €",
      "50 000 € à 150 000 €", "Plus de 150 000 €", "À définir"
    ]
  };

  const DRAFT_KEY = "kairos.preinscription.v1";
  const FAVORITES_KEY = "kairos.favorites.v1";
  const MAX_PHOTO = 1024 * 1024;

  let currentStep = 0;
  let furthestStep = 0;
  let photoUrl = "";
  let selectedPlan = "";
  let clerk = null;
  let userMounted = false;
  let profiles = [];
  let directoryLoaded = false;
  let directoryLoading = false;
  let onlyFavorites = false;
  let toastTimer;
  let photoReadVersion = 0;

  const text = (value, max = 1500) =>
    typeof value === "string" ? value.trim().slice(0, max) : "";

  const normalize = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  function node(tag, className = "", value) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (value !== undefined) element.textContent = value;
    return element;
  }

  function readStorage(key, fallback = null) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  }

  const storedFavorites = readStorage(FAVORITES_KEY, []);
  const favorites = new Set(
    Array.isArray(storedFavorites)
      ? storedFavorites.filter((id) => typeof id === "string").slice(0, 500)
      : []
  );

  function toast(message) {
    $("toast").textContent = message;
    $("toast").classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(
      () => $("toast").classList.remove("visible"),
      5000
    );
  }

  function safePhoto(value) {
    if (typeof value !== "string") return "";

    if (
      /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value) &&
      value.length <= Math.ceil(MAX_PHOTO * 4 / 3) + 60
    ) {
      return value;
    }

    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password
        ? url.href
        : "";
    } catch {
      return "";
    }
  }

  function validAge(value) {
    return /^\d{1,3}$/.test(String(value)) &&
      Number(value) >= 1 &&
      Number(value) <= 120;
  }

  function cleanDraft(raw = {}) {
    const clean = {};

    [
      "firstName", "lastName", "email", "headline", "bio",
      "professionalStatus", "educationLevel", "studyField", "school",
      "experience", "availability", "skills", "projectCategory",
      "projectStage", "projectTitle", "projectDescription",
      "collaborationType", "lookingFor", "city", "arrondissement",
      "investmentSectors", "investmentProjectTypes", "investmentAmount"
    ].forEach((key) => {
      clean[key] = text(raw[key]);
    });

    clean.firstName = clean.firstName.slice(0, 60);
    clean.lastName = clean.lastName.slice(0, 80);
    clean.email = clean.email.slice(0, 254);

    clean.role = ["founder", "partner", "investor"].includes(raw.role)
      ? raw.role
      : "";

    clean.age = validAge(raw.age) ? Number(raw.age) : "";
    clean.region = "ile-de-france";

    clean.department = CATALOGS.departments.some(
      ([value]) => value === raw.department
    ) ? raw.department : "";

    if (clean.department !== "75") clean.arrondissement = "";

    clean.workFields = Array.isArray(raw.workFields)
      ? [...new Set(raw.workFields.filter(
          (value) => CATALOGS.workFields.includes(value)
        ))]
      : [];

    clean.investmentRanges =
      clean.role === "investor" && Array.isArray(raw.investmentRanges)
        ? [...new Set(raw.investmentRanges.filter(
            (value) => CATALOGS.investmentRanges.includes(value)
          ))]
        : [];

    ["showAge", "publicConsent", "consent"].forEach((key) => {
      clean[key] = raw[key] === true;
    });

    clean.showInvestmentIntent =
      clean.role === "investor" && raw.showInvestmentIntent === true;

    clean.showInvestmentAmount =
      clean.showInvestmentIntent && raw.showInvestmentAmount === true;

    if (clean.role !== "investor") {
      clean.investmentSectors = "";
      clean.investmentProjectTypes = "";
      clean.investmentAmount = "";
    }

    clean.photoUrl = safePhoto(raw.photoUrl);
    clean.plan = Object.hasOwn(PLANS, raw.plan) ? raw.plan : "";

    return clean;
  }

  function getDraft() {
    const values = Object.fromEntries(new FormData(form));

    values.workFields = [
      ...form.querySelectorAll('[name="workFields"]:checked')
    ].map((input) => input.value);

    values.investmentRanges = [
      ...form.querySelectorAll('[name="investmentRanges"]:checked')
    ].map((input) => input.value);

    [
      "showAge", "publicConsent", "consent",
      "showInvestmentIntent", "showInvestmentAmount"
    ].forEach((name) => {
      values[name] = form.elements.namedItem(name).checked;
    });

    return cleanDraft({
      ...values,
      photoUrl,
      plan: selectedPlan
    });
  }

  function previewProjection(raw) {
    const d = cleanDraft(raw);

    const profile = {
      id: "private-preview",
      preview: true,
      displayName: d.firstName
        ? `${d.firstName}${d.lastName ? ` ${Array.from(d.lastName)[0]}.` : ""}`
        : "Votre prénom",
      role: d.role === "investor" && !d.showInvestmentIntent
        ? "member"
        : d.role || "member",
      age: d.showAge ? d.age : "",
      photoUrl: d.photoUrl,
      headline: d.headline || d.projectTitle,
      bio: d.bio,
      city: d.city,
      department: d.department,
      workFields: d.workFields,
      skills: d.skills,
      education: [d.educationLevel, d.studyField].filter(Boolean).join(" · "),
      professionalStatus: d.professionalStatus,
      experience: d.experience,
      availability: d.availability,
      projectTitle: d.projectTitle,
      projectCategory: d.projectCategory,
      projectDescription: d.projectDescription,
      collaborationType: d.collaborationType,
      lookingFor: d.lookingFor
    };

    if (d.showInvestmentIntent) {
      profile.investmentSectors = d.investmentSectors;
      profile.investmentProjectTypes = d.investmentProjectTypes;

      if (d.showInvestmentAmount) {
        profile.investmentAmount = d.investmentAmount;
        profile.investmentRanges = d.investmentRanges;
      }
    }

    return profile;
  }

  /*
   * Le serveur doit fournir une projection publique distincte.
   * Aucun nom complet, e-mail ou établissement n’est utilisé ici.
   */
  function publicProfile(raw) {
    if (
      !raw ||
      raw.published !== true ||
      raw.publicConsent !== true ||
      typeof raw.id !== "string" ||
      !raw.publicProfile
    ) {
      return null;
    }

    const source = raw.publicProfile;
    const result = {
      id: raw.id.slice(0, 150),
      preview: false,
      role: Object.hasOwn(ROLES, source.role) ? source.role : "member",
      photoUrl: safePhoto(source.photoUrl),
      age: validAge(source.age) ? Number(source.age) : "",
      likesCount: Number.isSafeInteger(raw.likesCount) && raw.likesCount >= 0
        ? raw.likesCount
        : 0,
      canLike: raw.canLike === true,
      workFields: Array.isArray(source.workFields)
        ? source.workFields.filter((v) => CATALOGS.workFields.includes(v))
        : []
    };

    [
      "displayName", "headline", "bio", "city", "department", "skills",
      "education", "professionalStatus", "experience", "availability",
      "projectTitle", "projectCategory", "projectDescription",
      "collaborationType", "lookingFor",
      "investmentSectors", "investmentProjectTypes", "investmentAmount"
    ].forEach((key) => {
      result[key] = text(source[key]);
    });

    result.investmentRanges = Array.isArray(source.investmentRanges)
      ? source.investmentRanges.filter(
          (v) => CATALOGS.investmentRanges.includes(v)
        )
      : [];

    return result;
  }

  async function api(path, options = {}) {
    const base = CONFIG.apiBase.replace(/\/$/, "");

    if (location.protocol === "file:" && !base) {
      throw new Error("Server unavailable");
    }

    const headers = new Headers(options.headers || {});

    if (clerk?.session) {
      const token = await clerk.session.getToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(base + path, {
      ...options,
      headers,
      credentials: "same-origin"
    });

    if (
      !response.ok ||
      !response.headers.get("content-type")?.includes("application/json")
    ) {
      throw new Error("Request not confirmed");
    }

    return response.json();
  }

  /* Navigation */

  function closeMenu() {
    $("navigation").classList.remove("open");
    $("menu-button").setAttribute("aria-expanded", "false");
    $("menu-button").setAttribute("aria-label", "Ouvrir le menu");
  }

  $("menu-button").addEventListener("click", () => {
    const open = $("menu-button").getAttribute("aria-expanded") !== "true";
    $("navigation").classList.toggle("open", open);
    $("menu-button").setAttribute("aria-expanded", String(open));
    $("menu-button").setAttribute(
      "aria-label",
      open ? "Fermer le menu" : "Ouvrir le menu"
    );
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  function showRoute() {
    const hash = location.hash.slice(1) || "accueil";
    const registration = hash === "inscription";
    const directory = hash === "profils";

    $("page-home").hidden = registration || directory;
    $("page-registration").hidden = !registration;
    $("page-directory").hidden = !directory;

    document.title = registration
      ? "Préparer mon profil — Kairos"
      : directory
        ? "Les profils — Kairos"
        : "Kairos — Entreprendre, ensemble.";

    closeMenu();

    if (directory) {
      renderDirectory();
      loadDirectory();
    }

    requestAnimationFrame(() => {
      if (registration || directory) {
        window.scrollTo({ top: 0, behavior: "auto" });
      } else {
        const target = $(hash);
        if (target) target.scrollIntoView({ block: "start" });
      }
    });
  }

  window.addEventListener("hashchange", showRoute);

  $("header-search").addEventListener("submit", (event) => {
    event.preventDefault();

    if (location.hash === "#profils") {
      renderDirectory();
    } else {
      location.hash = "profils";
    }
  });

  document.querySelectorAll("[data-register]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = form.querySelector(
        `[name="role"][value="${button.dataset.register}"]`
      );

      if (input) input.checked = true;
      updateConditionalFields();
      updatePreview();
      showStep(0);

      if (location.hash === "#inscription") {
        $("page-registration").scrollIntoView();
      } else {
        location.hash = "inscription";
      }
    });
  });

  document.querySelectorAll("[data-plan]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedPlan = button.dataset.plan;
      updatePreview();
      location.hash = "inscription";
    });
  });

  /* Catalogues */

  document.querySelectorAll("[data-catalog]").forEach((select) => {
    (CATALOGS[select.dataset.catalog] || []).forEach((item) => {
      const [value, label] = Array.isArray(item) ? item : [item, item];
      const option = node("option", "", label);
      option.value = value;
      select.append(option);
    });
  });

  function makeChoices(container, values, name) {
    values.forEach((value) => {
      const label = node("label", "choice");
      const input = node("input");
      input.type = "checkbox";
      input.name = name;
      input.value = value;
      label.append(input, node("span", "", value));
      container.append(label);
    });
  }

  makeChoices($("work-choices"), CATALOGS.workFields, "workFields");
  makeChoices(
    $("investment-choices"),
    CATALOGS.investmentRanges,
    "investmentRanges"
  );

  /* Fiches */

  function createCard(profile, preview = false) {
    const card = node("article", "profile-card");
    const portrait = node("div", "portrait");

    portrait.append(
      node(
        "span",
        "portrait-initial",
        Array.from(profile.displayName || "V")[0]
      )
    );

    if (profile.photoUrl) {
      const img = node("img");
      img.src = profile.photoUrl;
      img.alt = `Photo de ${profile.displayName}`;
      img.loading = "lazy";
      img.addEventListener("error", () => img.remove());
      portrait.append(img);
    }

    portrait.append(
      node("span", "profile-role", ROLES[profile.role] || ROLES.member)
    );

    const save = node(
      "button",
      "save-profile",
      !preview && favorites.has(profile.id) ? "♥" : "♡"
    );

    save.type = "button";
    save.disabled = preview;
    save.setAttribute(
      "aria-label",
      preview ? "Aperçu privé" : `Enregistrer ${profile.displayName}`
    );
    save.setAttribute(
      "aria-pressed",
      String(!preview && favorites.has(profile.id))
    );

    save.addEventListener("click", () => toggleFavorite(profile.id));
    portrait.append(save);

    const content = node("div", "profile-content");
    const name = node(
      preview ? "h3" : "button",
      "profile-name",
      `${profile.displayName || "Membre Kairos"}${
        profile.age ? `, ${profile.age} ans` : ""
      }`
    );

    if (!preview) {
      name.type = "button";
      name.addEventListener("click", () => openProfile(profile));
    }

    content.append(
      name,
      node(
        "p",
        "profile-city",
        [profile.city, profile.department].filter(Boolean).join(" · ") ||
          "Ville à préciser"
      ),
      node(
        "p",
        "profile-headline",
        profile.headline || profile.projectTitle ||
          "Votre présentation en quelques mots"
      )
    );

    const tags = node("div", "profile-tags");

    (profile.workFields || []).slice(0, 3).forEach((field) => {
      tags.append(node("span", "", field));
    });

    content.append(tags);

    const bottom = node("div", "profile-bottom");
    const like = node(
      "button",
      "like-profile",
      preview ? "♡ J’aime" : `♡ ${profile.likesCount}`
    );

    like.type = "button";
    like.disabled = preview || !profile.canLike;
    like.setAttribute(
      "aria-label",
      preview
        ? "Likes disponibles à l’ouverture"
        : `Aimer ${profile.displayName}, ${profile.likesCount} likes`
    );

    like.addEventListener("click", () => likeProfile(profile, like));

    bottom.append(
      like,
      node("small", "", preview ? "Aperçu privé" : "Sur liste d’attente")
    );

    content.append(bottom);
    card.append(portrait, content);

    return card;
  }

  function updatePreview() {
    const draft = getDraft();

    $("profile-preview").replaceChildren(
      createCard(previewProjection(draft), true)
    );

    $("selected-offer").hidden = !selectedPlan;
    $("selected-offer").textContent = selectedPlan
      ? `Offre qui vous intéresse : ${PLANS[selectedPlan]}. Aucun paiement.`
      : "";

    const rows = [
      ["Votre nom", [draft.firstName, draft.lastName].filter(Boolean).join(" ")],
      ["Votre rôle", ROLES[draft.role] || "À préciser"],
      ["Votre âge", draft.age ? `${draft.age} ans` : "À préciser"],
      ["Votre e-mail", draft.email],
      ["Votre parcours", [
        draft.professionalStatus, draft.educationLevel, draft.studyField
      ].filter(Boolean).join(" · ")],
      ["Vos domaines", draft.workFields.join(", ")],
      ["Votre projet", draft.projectTitle || draft.projectCategory],
      ["Votre recherche", draft.lookingFor || draft.collaborationType],
      ["Votre localisation", [
        draft.city, draft.department, draft.arrondissement
      ].filter(Boolean).join(" · ")]
    ];

    $("review").replaceChildren();

    rows.forEach(([label, value]) => {
      const row = node("div");
      row.append(node("dt", "", label), node("dd", "", value || "Non renseigné"));
      $("review").append(row);
    });
  }

  /* Formulaire */

  form.noValidate = true;

  function updateConditionalFields() {
    const investor = form.elements.role.value === "investor";
    const paris = $("department").value === "75";

    $("investor-fields").hidden = !investor;
    $("arrondissement-field").hidden = !paris;
    form.elements.arrondissement.disabled = !paris;

    if (!paris) form.elements.arrondissement.value = "";

    const showIntent = investor && form.elements.showInvestmentIntent.checked;
    form.elements.showInvestmentAmount.disabled = !showIntent;

    if (!showIntent) form.elements.showInvestmentAmount.checked = false;
  }

  function showStep(index) {
    currentStep = Math.max(0, Math.min(3, index));

    panels.forEach((panel, i) => {
      panel.hidden = i !== currentStep;
    });

    document.querySelectorAll("[data-step]").forEach((button) => {
      const index = Number(button.dataset.step);
      button.disabled = index > furthestStep;

      if (index === currentStep) {
        button.setAttribute("aria-current", "step");
      } else {
        button.removeAttribute("aria-current");
      }
    });

    $("previous").hidden = currentStep === 0;
    $("next").hidden = currentStep === 3;
    $("submit-registration").hidden = currentStep !== 3;
    updatePreview();
  }

  function validateStep(index) {
    if (index === 1) {
      const first = form.querySelector('[name="workFields"]');
      const selected = form.querySelector('[name="workFields"]:checked');

      first.setCustomValidity(
        selected ? "" : "Choisissez au moins un domaine."
      );
      $("work-error").hidden = Boolean(selected);
    }

    const controls = [
      ...panels[index].querySelectorAll("input, select, textarea")
    ].filter((input) => !input.disabled);

    for (const control of controls) {
      if (!control.checkValidity()) {
        control.reportValidity();
        return false;
      }
    }

    return true;
  }

  $("next").addEventListener("click", () => {
    if (!validateStep(currentStep)) return;

    furthestStep = Math.max(furthestStep, currentStep + 1);
    showStep(currentStep + 1);
    $("registration-layout").scrollIntoView({ block: "start" });
  });

  $("previous").addEventListener("click", () => {
    showStep(currentStep - 1);
    $("registration-layout").scrollIntoView({ block: "start" });
  });

  document.querySelectorAll("[data-step]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = Number(button.dataset.step);

      if (target > currentStep && !validateStep(currentStep)) return;
      if (target <= furthestStep) showStep(target);
    });
  });

  form.addEventListener("input", () => {
    const first = form.querySelector('[name="workFields"]');

    if (form.querySelector('[name="workFields"]:checked')) {
      first.setCustomValidity("");
      $("work-error").hidden = true;
    }

    updateConditionalFields();
    updatePreview();
  });

  form.addEventListener("change", () => {
    updateConditionalFields();
    updatePreview();
  });

  /* Photo */

  $("profile-photo").addEventListener("change", async (event) => {
    const version = ++photoReadVersion;
    const file = event.target.files[0];

    $("photo-status").textContent = "";
    $("photo-status").classList.remove("error");

    if (!file) return;

    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > MAX_PHOTO
    ) {
      event.target.value = "";
      $("photo-status").textContent =
        "Choisissez une image JPG, PNG ou WebP de 1 Mo maximum.";
      $("photo-status").classList.add("error");
      return;
    }

    try {
      const value = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const safe = safePhoto(value);
      if (!safe) throw new Error("Invalid photo");

      const image = new Image();
      image.src = safe;
      await image.decode();

      if (version !== photoReadVersion) return;

      photoUrl = safe;
      $("remove-photo").hidden = false;
      $("photo-status").textContent = "Photo ajoutée à votre aperçu privé.";
      updatePreview();
    } catch {
      if (version !== photoReadVersion) return;
      $("profile-photo").value = "";
      $("photo-status").textContent = "Cette image n’a pas pu être ouverte.";
      $("photo-status").classList.add("error");
    }
  });

  $("remove-photo").addEventListener("click", () => {
    photoReadVersion++;
    photoUrl = "";
    $("profile-photo").value = "";
    $("remove-photo").hidden = true;
    $("photo-status").textContent = "";
    updatePreview();
  });

  /* Brouillon conservé uniquement sur demande */

  function getStoredDraft() {
    const stored = readStorage(DRAFT_KEY);

    return stored?.version === 1 && stored.profile
      ? cleanDraft(stored.profile)
      : null;
  }

  $("draft-banner").hidden = !getStoredDraft();

  $("save-draft").addEventListener("click", () => {
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ version: 1, profile: getDraft() })
      );

      $("draft-status").textContent =
        "Brouillon enregistré sur cet appareil. Évitez un appareil partagé.";
      $("draft-banner").hidden = false;
    } catch {
      $("draft-status").textContent =
        "Le brouillon n’a pas pu être conservé. Vous pouvez télécharger votre fiche.";
    }
  });

  $("restore-draft").addEventListener("click", () => {
    const draft = getStoredDraft();
    if (!draft) return;

    Object.entries(draft).forEach(([name, value]) => {
      const controls = [...form.querySelectorAll(`[name="${name}"]`)];
      if (!controls.length) return;

      controls.forEach((control) => {
        if (control.type === "checkbox") {
          control.checked = Array.isArray(value)
            ? value.includes(control.value)
            : value === true;
        } else if (control.type === "radio") {
          control.checked = control.value === value;
        } else {
          control.value = value;
        }
      });
    });

    photoUrl = draft.photoUrl;
    selectedPlan = draft.plan;
    $("remove-photo").hidden = !photoUrl;
    $("draft-banner").hidden = true;
    furthestStep = 3;

    updateConditionalFields();
    showStep(0);
    toast("Votre brouillon a été repris.");
  });

  $("delete-draft").addEventListener("click", () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
      $("draft-banner").hidden = true;
      $("draft-status").textContent = "Brouillon supprimé de cet appareil.";
    } catch {
      toast("Le brouillon n’a pas pu être supprimé.");
    }
  });

  $("export-draft").addEventListener("click", () => {
    const draft = getDraft();
    const { photoUrl: omittedPhoto, ...exported } = draft;

    const blob = new Blob(
      [JSON.stringify(exported, null, 2)],
      { type: "application/json;charset=utf-8" }
    );

    const url = URL.createObjectURL(blob);
    const link = node("a");
    link.href = url;
    link.download = "ma-fiche-kairos.json";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  /* Envoi réel : aucune confirmation simulée */

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (currentStep < 3) {
      $("next").click();
      return;
    }

    for (let index = 0; index < panels.length; index++) {
      showStep(index);
      if (!validateStep(index)) return;
    }

    const button = $("submit-registration");
    const feedback = $("registration-feedback");

    button.disabled = true;
    feedback.classList.remove("error");
    feedback.textContent = "Envoi de votre demande…";

    try {
      const result = await api("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...getDraft(),
          source: "profile-pre-registration",
          submittedAt: new Date().toISOString()
        })
      });

      if (result.registered !== true && result.status !== "registered") {
        throw new Error("Registration not confirmed");
      }

      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        // La confirmation du serveur reste valable.
      }

      $("registration-layout").hidden = true;
      $("draft-banner").hidden = true;
      $("registration-success").hidden = false;
      $("registration-success").focus();
    } catch {
      feedback.classList.add("error");
      feedback.textContent =
        "Votre préinscription n’a pas été confirmée. " +
        "Vous pouvez conserver votre brouillon ou télécharger votre fiche. " +
        "Si le service d’envoi n’est pas encore activé, réessayez à son ouverture.";
    } finally {
      button.disabled = false;
    }
  });

  /* Répertoire : uniquement des profils réellement publiés */

  async function loadDirectory() {
    if (directoryLoaded || directoryLoading) return;

    directoryLoading = true;
    $("directory-status").textContent = "Chargement des profils…";

    try {
      const result = await api("/api/waitlist/profiles");
      if (!Array.isArray(result.profiles)) throw new Error("Invalid profiles");

      profiles = result.profiles.map(publicProfile).filter(Boolean);
      directoryLoaded = true;
      $("directory-status").textContent =
        "Seules les fiches publiées avec consentement sont présentées.";
    } catch {
      $("directory-status").textContent =
        "Les profils publics ne sont pas encore disponibles.";
    } finally {
      directoryLoading = false;
      renderDirectory();
    }
  }

  function renderDirectory() {
    const filters = Object.fromEntries(
      new FormData($("directory-filters"))
    );

    const query = normalize($("search").value.trim());

    const shown = profiles.filter((profile) => {
      const haystack = normalize([
        profile.displayName, profile.headline, profile.bio,
        profile.skills, profile.projectTitle,
        profile.projectDescription, ...(profile.workFields || [])
      ].join(" "));

      return (
        (!query || haystack.includes(query)) &&
        (!filters.role || profile.role === filters.role) &&
        (!filters.workField || profile.workFields.includes(filters.workField)) &&
        (!filters.department || profile.department === filters.department) &&
        (!filters.city || normalize(profile.city).includes(normalize(filters.city))) &&
        (!onlyFavorites || favorites.has(profile.id))
      );
    });

    $("directory-results").replaceChildren();
    $("favorites-count").textContent = favorites.size;
    $("only-favorites").setAttribute("aria-pressed", String(onlyFavorites));

    $("directory-count").textContent =
      `${shown.length} profil${shown.length > 1 ? "s" : ""}` +
      (onlyFavorites ? " dans vos favoris" : " disponible" + (shown.length > 1 ? "s" : ""));

    if (shown.length) {
      shown.forEach((profile) => {
        $("directory-results").append(createCard(profile));
      });
      return;
    }

    const empty = node("div", "empty-directory");

    empty.append(
      node(
        "h2",
        "",
        onlyFavorites
          ? "Votre sélection est encore vide."
          : profiles.length
            ? "Aucun profil pour ces critères."
            : "Les premières rencontres se préparent."
      ),
      node(
        "p",
        "",
        profiles.length
          ? "Essayez d’autres critères ou ajoutez des profils à vos favoris."
          : "Préparez votre fiche sur liste d’attente. " +
            "Les profils apparaîtront après l’ouverture du répertoire " +
            "et avec l’accord de leurs auteurs."
      )
    );

    const link = node("a", "button button-outline", "Préparer mon profil ↗");
    link.href = "#inscription";
    empty.append(link);
    $("directory-results").append(empty);
  }

  $("directory-filters").addEventListener("submit", (event) => {
    event.preventDefault();
    renderDirectory();
  });

  $("directory-filters").addEventListener("change", renderDirectory);

  let searchTimer;
  $("search").addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(renderDirectory, 180);
  });

  $("only-favorites").addEventListener("click", () => {
    onlyFavorites = !onlyFavorites;
    renderDirectory();
  });

  $("favorites-link").addEventListener("click", () => {
    onlyFavorites = true;
    renderDirectory();
  });

  function toggleFavorite(id) {
    const previous = favorites.has(id);

    if (previous) favorites.delete(id);
    else favorites.add(id);

    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
      renderDirectory();
    } catch {
      if (previous) favorites.add(id);
      else favorites.delete(id);
      toast("Les favoris n’ont pas pu être conservés sur cet appareil.");
    }
  }

  async function likeProfile(profile, button) {
    if (!profile.canLike) return;
    button.disabled = true;

    try {
      const result = await api(
        `/api/waitlist/profiles/${encodeURIComponent(profile.id)}/like`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "toggle" })
        }
      );

      if (!Number.isSafeInteger(result.likesCount) || result.likesCount < 0) {
        throw new Error("Like not confirmed");
      }

      profile.likesCount = result.likesCount;
      renderDirectory();
    } catch {
      toast("Votre like n’a pas pu être confirmé.");
      button.disabled = false;
    }
  }

  function openProfile(profile) {
    const detail = $("profile-detail");
    detail.replaceChildren(createCard(profile, true));

    const sections = [
      ["À propos", profile.bio],
      ["Parcours", [
        profile.professionalStatus, profile.education, profile.experience
      ].filter(Boolean).join(" · ")],
      ["Compétences", profile.skills],
      ["Projet", profile.projectDescription],
      ["Collaboration", [
        profile.collaborationType, profile.lookingFor, profile.availability
      ].filter(Boolean).join(" · ")],
      ["Investissement partagé", [
        profile.investmentSectors, profile.investmentProjectTypes,
        profile.investmentAmount, ...(profile.investmentRanges || [])
      ].filter(Boolean).join(" · ")]
    ];

    sections.filter(([, value]) => value).forEach(([title, value]) => {
      const section = node("section", "detail-section");
      section.append(node("h3", "", title), node("p", "", value));
      detail.append(section);
    });

    $("profile-dialog").showModal();
  }

  $("close-dialog").addEventListener("click", () => {
    $("profile-dialog").close();
  });

  /* Clerk : connexion et création de compte */

  function clerkDomain(key) {
    if (!/^pk_(test|live)_/.test(key)) return "";

    try {
      const encoded = key
        .split("_")
        .slice(2)
        .join("_")
        .replace(/-/g, "+")
        .replace(/_/g, "/");

      const domain = atob(encoded).replace(/\$$/, "");

      return domain.length <= 253 &&
        /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9-]+$/i.test(domain)
          ? domain
          : "";
    } catch {
      return "";
    }
  }

  function loadScript(src, key = "") {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.crossOrigin = "anonymous";

      if (key) script.dataset.clerkPublishableKey = key;

      script.onload = resolve;
      script.onerror = reject;
      document.head.append(script);
    });
  }

  async function initializeClerk() {
    const key = CONFIG.clerkPublishableKey.trim();
    if (!key) return;

    const domain = clerkDomain(key);

    if (!domain) {
      console.warn("La clé publique Clerk est invalide.");
      return;
    }

    try {
      await loadScript(
        `https://${domain}/npm/@clerk/ui@1/dist/ui.browser.js`
      );

      await loadScript(
        `https://${domain}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`,
        key
      );

      if (!window.Clerk || !window.__internal_ClerkUICtor) {
        throw new Error("Clerk unavailable");
      }

      clerk = window.Clerk;

      await clerk.load({
        ui: { ClerkUI: window.__internal_ClerkUICtor },
        appearance: {
          variables: {
            colorPrimary: "#193d30",
            borderRadius: "2px"
          }
        }
      });

      function syncUser() {
        const user = clerk.user;

        document.querySelectorAll(".login-button").forEach((button) => {
          button.hidden = Boolean(user);
        });

        $("user-button").hidden = !user;
        $("account-panel").hidden = false;
        $("account-actions").hidden = Boolean(user);

        $("account-status").textContent = user
          ? `Connecté${user.firstName ? ` en tant que ${user.firstName}` : ""}. Complétez votre fiche ci-dessous.`
          : "Créez votre compte sécurisé ou connectez-vous avant de préparer votre fiche.";

        if (user && !userMounted) {
          clerk.mountUserButton($("user-button"));
          userMounted = true;
        }

        if (!user && userMounted) {
          clerk.unmountUserButton($("user-button"));
          userMounted = false;
        }

        if (user) {
          const values = {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.primaryEmailAddress?.emailAddress
          };

          Object.entries(values).forEach(([name, value]) => {
            const field = form.elements.namedItem(name);
            if (field && !field.value && value) field.value = value;
          });

          updatePreview();
        }
      }

      clerk.addListener(syncUser);
      syncUser();

      document.querySelectorAll("[data-auth]").forEach((button) => {
        button.addEventListener("click", () => {
          closeMenu();

          if (button.dataset.auth === "sign-up") {
            clerk.openSignUp();
          } else {
            clerk.openSignIn();
          }
        });
      });
    } catch {
      clerk = null;
      console.warn(
        "Clerk n’a pas pu démarrer. Vérifiez la clé publique et la configuration du domaine."
      );
    }
  }

  updateConditionalFields();
  showStep(0);
  showRoute();
  initializeClerk();
})();
