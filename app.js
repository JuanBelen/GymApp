// Claves de almacenamiento
const STORAGE_USERS = "gymApp_users";
const STORAGE_SESSION = "gymApp_session";
const STORAGE_USER_PREFIX = "gymApp_data_";

document.addEventListener("DOMContentLoaded", () => {
  // Elementos generales
  const authSection = document.getElementById("auth-section");
  const appSection = document.getElementById("app-section");
  const messageBox = document.getElementById("message-box");
  const userNameLabel = document.getElementById("user-name");
  const streakMessageEl = document.getElementById("streak-message");

  // Formularios
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const serieForm = document.getElementById("serie-form");
  const guardarSeriesBtn = document.getElementById("guardar-series-btn");

  // Inputs principales
  const fechaInput = document.getElementById("serie-fecha");
  const grupoInput = document.getElementById("serie-grupo");
  const ejercicioInput = document.getElementById("serie-ejercicio");

  const seriesContainer = document.getElementById("series-container");
  const addSerieBtn = document.getElementById("add-serie-btn");

  // Botón logout
  const logoutBtn = document.getElementById("logout-btn");

  // Vistas
  const tabButtons = document.querySelectorAll(".tab-btn");
  const views = {
    "cargar-view": document.getElementById("cargar-view"),
    "historial-view": document.getElementById("historial-view"),
    "resumen-view": document.getElementById("resumen-view"),
  };

  // Historial y resumen
  const historialBody = document.getElementById("historial-body");
  const resumenGlobalContainer = document.getElementById("resumen-global");
  const resumenGruposContainer = document.getElementById("resumen-grupos");

  // Filtro de historial
  const historialGrupoFilter = document.getElementById("historial-grupo-filter");
  let filtroGrupo = "TODOS";

  // Config carga múltiple
  const MIN_SERIES = 3;
  const MAX_SERIES = 5;
  let seriesCount = 0;

  // Editar serie existente
  let editingIndex = null; // índice en historial de la serie que se edita (o null)

  // ====================== HELPERS STORAGE =======================

  function getUsers() {
    const raw = localStorage.getItem(STORAGE_USERS);
    return raw ? JSON.parse(raw) : [];
  }

  function saveUsers(users) {
    localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
  }

  function getCurrentSession() {
    return localStorage.getItem(STORAGE_SESSION);
  }

  function setCurrentSession(username) {
    if (username) {
      localStorage.setItem(STORAGE_SESSION, username);
    } else {
      localStorage.removeItem(STORAGE_SESSION);
    }
  }

  function getUserData(username) {
    const raw = localStorage.getItem(STORAGE_USER_PREFIX + username);
    if (raw) return JSON.parse(raw);
    return { rutinas: [], historial: [] };
  }

  function saveUserData(username, data) {
    localStorage.setItem(STORAGE_USER_PREFIX + username, JSON.stringify(data));
  }

  // ====================== UI HELPERS =======================

  function showMessage(text, type = "info", timeout = 2500) {
    messageBox.textContent = text;
    messageBox.className = `message ${type}`;
    messageBox.classList.remove("hidden");

    if (timeout) {
      setTimeout(() => {
        messageBox.classList.add("hidden");
      }, timeout);
    }
  }

  function setToday(input) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    input.value = `${yyyy}-${mm}-${dd}`;
  }

  function resetSeriesRows() {
    seriesContainer.innerHTML = "";
    seriesCount = 0;
    for (let i = 0; i < MIN_SERIES; i++) {
      addSerieRow();
    }
  }

  function addSerieRow() {
    if (seriesCount >= MAX_SERIES) {
      showMessage("Máximo 5 series por ejercicio.", "info");
      return;
    }
    seriesCount += 1;
    const row = document.createElement("div");
    row.className = "series-row";
    row.dataset.serieNumero = String(seriesCount);

    row.innerHTML = `
      <div class="series-label">Serie ${seriesCount}</div>
      <input type="number" min="1" step="1" class="serie-reps" placeholder="Reps" />
      <input type="number" min="0" step="0.5" class="serie-peso" placeholder="Peso (kg)" />
    `;

    seriesContainer.appendChild(row);
  }

  function clearMainForm() {
    setToday(fechaInput);
    grupoInput.value = "";
    ejercicioInput.value = "";
    editingIndex = null;
    guardarSeriesBtn.textContent = "Guardar series";
    resetSeriesRows();
  }

  function switchToApp(username) {
    authSection.classList.add("hidden");
    appSection.classList.remove("hidden");
    userNameLabel.textContent = username;
    clearMainForm();
    renderHistorial(username);
    renderResumen(username);
  }

  function switchToAuth() {
    authSection.classList.remove("hidden");
    appSection.classList.add("hidden");
    editingIndex = null;
    resetSeriesRows();
  }

  // ====================== STREAK / FRASE MOTIVACIONAL =======================

  function updateStreakMessage(historial) {
    if (!streakMessageEl) return;

    if (!historial || historial.length === 0) {
      streakMessageEl.textContent =
        "Todavía no registraste ninguna serie. Tu racha arranca hoy 💪";
      return;
    }

    const fechas = historial.map((h) => h.fecha).sort(); // asc
    const ultima = fechas[fechas.length - 1];

    const today = new Date();
    const [y, m, d] = ultima.split("-");
    const ultimaDate = new Date(Number(y), Number(m) - 1, Number(d));

    const diffMs =
      today.setHours(0, 0, 0, 0) - ultimaDate.setHours(0, 0, 0, 0);
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    const diasUnicos = new Set(fechas);
    const sesiones = diasUnicos.size;

    let msg = "";

    if (sesiones === 1 && diffDias === 0) {
      msg = "Primer día registrado. No rompas la racha 🔥";
    } else if (diffDias === 0) {
      msg = `Entrenaste hoy. Llevás ${sesiones} días registrados, seguí así 💪`;
    } else if (diffDias === 1) {
      msg = "Ayer entrenaste. Hoy podés mantener viva la racha 🔥";
    } else if (diffDias <= 3) {
      msg = `Hace ${diffDias} días que no registrás nada. Volvé a sumar un día a tu racha 💥`;
    } else {
      msg = `Llevás ${sesiones} días entrenados en total. Siempre podés arrancar una nueva racha 💪`;
    }

    streakMessageEl.textContent = msg;
  }

  // ====================== AUTH =======================

  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value;

    if (!username || !password) {
      showMessage("Completá usuario y contraseña.", "error");
      return;
    }

    const users = getUsers();
    const found = users.find((u) => u.username === username);

    if (!found || found.password !== password) {
      showMessage("Usuario o contraseña incorrectos.", "error");
      return;
    }

    setCurrentSession(username);
    showMessage("Sesión iniciada correctamente.", "success");
    switchToApp(username);
  });

  registerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = document.getElementById("register-username").value.trim();
    const password = document
      .getElementById("register-password")
      .value.trim();

    if (!username || !password) {
      showMessage("Completá usuario y contraseña.", "error");
      return;
    }

    if (password.length < 4) {
      showMessage("La contraseña debe tener al menos 4 caracteres.", "error");
      return;
    }

    const users = getUsers();
    if (users.some((u) => u.username === username)) {
      showMessage("Ese usuario ya existe. Probá con otro nombre.", "error");
      return;
    }

    users.push({ username, password });
    saveUsers(users);
    saveUserData(username, { rutinas: [], historial: [] });

    setCurrentSession(username);
    showMessage("Cuenta creada. Sesión iniciada.", "success");
    switchToApp(username);
    registerForm.reset();
  });

  logoutBtn.addEventListener("click", () => {
    setCurrentSession(null);
    switchToAuth();
    showMessage("Sesión cerrada.", "info");
  });

  // ====================== CARGA DE SERIES (3–5 A LA VEZ) =======================

  addSerieBtn.addEventListener("click", () => {
    if (editingIndex !== null) {
      showMessage(
        "Estás editando una serie. Guardá los cambios antes de agregar nuevas filas.",
        "info"
      );
      return;
    }
    addSerieRow();
  });

  serieForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = getCurrentSession();
    if (!username) {
      showMessage("Tu sesión expiró. Volvé a iniciar sesión.", "error");
      switchToAuth();
      return;
    }

    const fecha = fechaInput.value;
    const grupo = grupoInput.value.trim();
    const ejercicio = ejercicioInput.value.trim();

    if (!fecha || !grupo || !ejercicio) {
      showMessage("Completá fecha, grupo y ejercicio.", "error");
      return;
    }

    const data = getUserData(username);

    // Si estoy en modo edición, sólo hay una fila que representa esa serie
    if (editingIndex !== null) {
      const row = seriesContainer.querySelector(".series-row");
      if (!row) {
        showMessage("No se encontró la serie a editar.", "error");
        return;
      }

      const reps = Number(row.querySelector(".serie-reps").value);
      const peso = Number(row.querySelector(".serie-peso").value);
      const serieNumero = Number(row.dataset.serieNumero);

      if (!reps || isNaN(peso)) {
        showMessage("Completá reps y peso para la serie.", "error");
        return;
      }

      data.historial[editingIndex] = {
        fecha,
        grupo,
        ejercicio,
        serieNumero,
        reps,
        peso,
        volumen: reps * peso,
      };

      saveUserData(username, data);
      editingIndex = null;
      guardarSeriesBtn.textContent = "Guardar series";
      clearMainForm();
      renderHistorial(username);
      renderResumen(username);
      showMessage("Serie actualizada.", "success");
      return;
    }

    // NUEVO BLOQUE DE SERIES
    const rows = Array.from(seriesContainer.querySelectorAll(".series-row"));
    const nuevasSeries = [];

    rows.forEach((row) => {
      const serieNumero = Number(row.dataset.serieNumero);
      const reps = Number(row.querySelector(".serie-reps").value);
      const peso = Number(row.querySelector(".serie-peso").value);

      // Sólo tomamos filas completas
      if (reps && !isNaN(peso)) {
        nuevasSeries.push({
          fecha,
          grupo,
          ejercicio,
          serieNumero,
          reps,
          peso,
          volumen: reps * peso,
        });
      }
    });

    if (nuevasSeries.length < MIN_SERIES) {
      showMessage(
        `Cargá al menos ${MIN_SERIES} series completas (reps y peso).`,
        "error"
      );
      return;
    }

    // Guardar todas las series nuevas
    data.historial = data.historial.concat(nuevasSeries);

    // Actualizar lista de rutinas (ejercicios únicos)
    if (
      !data.rutinas.some(
        (r) => r.ejercicio === ejercicio && r.grupo === grupo
      )
    ) {
      data.rutinas.push({ grupo, ejercicio });
    }

    saveUserData(username, data);

    clearMainForm();
    renderHistorial(username);
    renderResumen(username);
    showMessage("Series guardadas en tu historial.", "success");
  });

  // ====================== HISTORIAL (EDITAR / BORRAR + FILTRO) =======================

  function formatDate(isoDate) {
    const [y, m, d] = isoDate.split("-");
    return `${d}/${m}/${y}`;
  }

  function renderHistorial(username) {
    const data = getUserData(username);
    const rawHistorial = data.historial || [];

    const historial =
      filtroGrupo === "TODOS"
        ? rawHistorial
        : rawHistorial.filter((h) => h.grupo === filtroGrupo);

    historialBody.innerHTML = "";

    if (historial.length === 0) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 8;
      cell.textContent =
        "Todavía no cargaste ninguna serie (o no hay en este grupo).";
      cell.style.textAlign = "center";
      row.appendChild(cell);
      historialBody.appendChild(row);
      return;
    }

    const indexed = historial.map((item) => {
      const idx = rawHistorial.indexOf(item);
      return { ...item, _idx: idx };
    });

    const sorted = indexed.sort((a, b) => {
      if (a.fecha === b.fecha && a.ejercicio === b.ejercicio) {
        return a.serieNumero - b.serieNumero;
      }
      if (a.fecha === b.fecha) {
        return a.ejercicio.localeCompare(b.ejercicio);
      }
      return a.fecha < b.fecha ? 1 : -1;
    });

    for (const item of sorted) {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${formatDate(item.fecha)}</td>
        <td>${item.grupo}</td>
        <td>${item.ejercicio}</td>
        <td>${item.serieNumero}</td>
        <td>${item.reps}</td>
        <td>${item.peso}</td>
        <td>${item.volumen}</td>
        <td>
          <button class="table-btn edit" data-action="edit" data-index="${item._idx}">Editar</button>
          <button class="table-btn delete" data-action="delete" data-index="${item._idx}">Borrar</button>
        </td>
      `;
      historialBody.appendChild(row);
    }
  }

  historialBody.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const username = getCurrentSession();
    if (!username) {
      showMessage("Tu sesión expiró. Volvé a iniciar sesión.", "error");
      switchToAuth();
      return;
    }

    const action = btn.dataset.action;
    const idx = Number(btn.dataset.index);
    const data = getUserData(username);

    if (action === "edit") {
      const entry = data.historial[idx];
      if (!entry) return;

      // Llevar datos al formulario
      fechaInput.value = entry.fecha;
      grupoInput.value = entry.grupo;
      ejercicioInput.value = entry.ejercicio;

      // Mostrar UNA fila con esa serie para editar
      seriesContainer.innerHTML = "";
      seriesCount = 1;
      const row = document.createElement("div");
      row.className = "series-row";
      row.dataset.serieNumero = String(entry.serieNumero);
      row.innerHTML = `
        <div class="series-label">Serie ${entry.serieNumero}</div>
        <input type="number" min="1" step="1" class="serie-reps" value="${entry.reps}" />
        <input type="number" min="0" step="0.5" class="serie-peso" value="${entry.peso}" />
      `;
      seriesContainer.appendChild(row);

      editingIndex = idx;
      guardarSeriesBtn.textContent = "Guardar cambios";

      // Cambiar a pestaña Cargar serie
      tabButtons.forEach((b) => {
        b.classList.toggle("active", b.dataset.view === "cargar-view");
      });
      Object.values(views).forEach((view) =>
        view.classList.toggle("hidden", view.id !== "cargar-view")
      );

      showMessage("Editando serie seleccionada.", "info");
    }

    if (action === "delete") {
      if (!data.historial[idx]) return;
      data.historial.splice(idx, 1);
      saveUserData(username, data);

      if (editingIndex === idx) {
        editingIndex = null;
        guardarSeriesBtn.textContent = "Guardar series";
        clearMainForm();
      }

      renderHistorial(username);
      renderResumen(username);
      showMessage("Serie eliminada.", "info");
    }
  });

  // ====================== RESUMEN =======================

  function makeResumenCard(label, value, note) {
    const card = document.createElement("div");
    card.className = "resumen-card";
    card.innerHTML = `
      <div class="resumen-label">${label}</div>
      <div class="resumen-value">${value}</div>
      <div class="resumen-note">${note}</div>
    `;
    return card;
  }

  function renderResumen(username) {
    const data = getUserData(username);
    const historial = data.historial || [];

    resumenGlobalContainer.innerHTML = "";
    resumenGruposContainer.innerHTML = "";

    updateStreakMessage(historial);

    if (historial.length === 0) {
      const card = document.createElement("div");
      card.className = "resumen-card";
      card.innerHTML = `
        <div class="resumen-label">Sin datos</div>
        <div class="resumen-value">—</div>
        <div class="resumen-note">Cargá tu primera serie para ver estadísticas.</div>
      `;
      resumenGlobalContainer.appendChild(card);
      return;
    }

    const totalSeries = historial.length;
    const totalVolumen = historial.reduce((acc, h) => acc + h.volumen, 0);
    const diasUnicos = new Set(historial.map((h) => h.fecha));
    const sesiones = diasUnicos.size;

    const maxPorEjercicio = {};
    for (const h of historial) {
      const key = `${h.grupo}__${h.ejercicio}`;
      if (!maxPorEjercicio[key] || h.peso > maxPorEjercicio[key]) {
        maxPorEjercicio[key] = h.peso;
      }
    }
    const mayorPeso = Math.max(...Object.values(maxPorEjercicio));

    resumenGlobalContainer.appendChild(
      makeResumenCard(
        "Sesiones registradas",
        sesiones,
        "Cantidad de días diferentes en los que cargaste series."
      )
    );
    resumenGlobalContainer.appendChild(
      makeResumenCard(
        "Series totales",
        totalSeries,
        "Cantidad total de series registradas."
      )
    );
    resumenGlobalContainer.appendChild(
      makeResumenCard(
        "Volumen total",
        totalVolumen.toLocaleString("es-AR"),
        "Suma de (reps × peso) de todas las series."
      )
    );
    resumenGlobalContainer.appendChild(
      makeResumenCard(
        "Tu mayor peso",
        mayorPeso + " kg",
        "Máximo peso registrado en algún ejercicio."
      )
    );

    const gruposMap = {};
    for (const h of historial) {
      if (!gruposMap[h.grupo]) {
        gruposMap[h.grupo] = { series: 0, volumen: 0 };
      }
      gruposMap[h.grupo].series += 1;
      gruposMap[h.grupo].volumen += h.volumen;
    }

    Object.entries(gruposMap).forEach(([grupo, stats]) => {
      resumenGruposContainer.appendChild(
        makeResumenCard(
          grupo,
          `${stats.series} series`,
          `Volumen: ${stats.volumen.toLocaleString("es-AR")}`
        )
      );
    });
  }

  // ====================== NAV TABS / FILTRO =======================

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetView = btn.dataset.view;
      tabButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      Object.values(views).forEach((view) =>
        view.classList.add("hidden")
      );
      views[targetView].classList.remove("hidden");
    });
  });

  historialGrupoFilter.addEventListener("change", () => {
    filtroGrupo = historialGrupoFilter.value;
    const username = getCurrentSession();
    if (username) {
      renderHistorial(username);
    }
  });

  // ====================== INICIALIZACIÓN =======================

  setToday(fechaInput);
  resetSeriesRows();

  const existingSession = getCurrentSession();
  if (existingSession) {
    switchToApp(existingSession);
  } else {
    switchToAuth();
  }

  // ====================== SERVICE WORKER (PWA) =======================

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("./service-worker.js")
      .catch((err) => {
        console.error("Error registrando service worker:", err);
      });
  }
});
