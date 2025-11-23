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
  const serieSubmitBtn = serieForm.querySelector("button[type='submit']");

  // Inputs serie
  const fechaInput = document.getElementById("serie-fecha");
  const grupoInput = document.getElementById("serie-grupo");
  const ejercicioInput = document.getElementById("serie-ejercicio");
  const seriesInput = document.getElementById("serie-series");
  const repsInput = document.getElementById("serie-reps");
  const pesoInput = document.getElementById("serie-peso");

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

  // Para saber si estamos editando una serie
  let editingIndex = null;

  // Setear fecha hoy por defecto
  setToday(fechaInput);

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
    // Estructura inicial
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

  function switchToApp(username) {
    authSection.classList.add("hidden");
    appSection.classList.remove("hidden");
    userNameLabel.textContent = username;

    editingIndex = null;
    serieSubmitBtn.textContent = "Guardar serie";
    clearSerieForm();
    renderHistorial(username);
    renderResumen(username);
  }

  function switchToAuth() {
    authSection.classList.remove("hidden");
    appSection.classList.add("hidden");
    editingIndex = null;
    serieSubmitBtn.textContent = "Guardar serie";
    clearSerieForm();
  }

  function setToday(input) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    input.value = `${yyyy}-${mm}-${dd}`;
  }

  function clearSerieForm() {
    setToday(fechaInput);
    grupoInput.value = "";
    ejercicioInput.value = "";
    seriesInput.value = "";
    repsInput.value = "";
    pesoInput.value = "";
  }

  // ====================== STREAK / FRASE MOTIVACIONAL =======================

  function updateStreakMessage(historial) {
    if (!streakMessageEl) return;

    if (!historial || historial.length === 0) {
      streakMessageEl.textContent =
        "Todavía no registraste ninguna serie. Tu racha arranca hoy 💪";
      return;
    }

    const fechas = historial.map((h) => h.fecha).sort(); // ascendente
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

    // Crear data inicial
    saveUserData(username, { rutinas: [], historial: [] });

    setCurrentSession(username);
    showMessage("Cuenta creada. Sesión iniciada.", "success");
    switchToApp(username);

    // Limpio formulario registro
    registerForm.reset();
  });

  logoutBtn.addEventListener("click", () => {
    setCurrentSession(null);
    switchToAuth();
    showMessage("Sesión cerrada.", "info");
  });

  // ====================== CARGAR / EDITAR SERIE =======================

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
    const series = Number(seriesInput.value);
    const reps = Number(repsInput.value);
    const peso = Number(pesoInput.value);

    if (!fecha || !grupo || !ejercicio || !series || !reps || isNaN(peso)) {
      showMessage("Completá todos los campos de la serie.", "error");
      return;
    }

    const data = getUserData(username);

    const entry = {
      fecha,
      grupo,
      ejercicio,
      series,
      reps,
      peso,
      volumen: series * reps * peso,
    };

    let msg;

    if (editingIndex !== null && data.historial[editingIndex]) {
      // Actualizar serie existente
      data.historial[editingIndex] = entry;
      editingIndex = null;
      serieSubmitBtn.textContent = "Guardar serie";
      msg = "Serie actualizada.";
    } else {
      // Nueva serie
      data.historial.push(entry);

      // Opcional: si el ejercicio no existe en rutinas, lo agrego
      if (
        !data.rutinas.some(
          (r) => r.ejercicio === ejercicio && r.grupo === grupo
        )
      ) {
        data.rutinas.push({
          grupo,
          ejercicio,
        });
      }

      msg = "Serie guardada en tu historial.";
    }

    saveUserData(username, data);

    clearSerieForm();
    renderHistorial(username);
    renderResumen(username);

    showMessage(msg, "success");
  });

  // ====================== HISTORIAL (CON EDITAR/BORRAR) =======================

  function renderHistorial(username) {
    const data = getUserData(username);
    const historial = data.historial || [];

    historialBody.innerHTML = "";

    if (historial.length === 0) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 8;
      cell.textContent = "Todavía no cargaste ninguna serie.";
      cell.style.textAlign = "center";
      row.appendChild(cell);
      historialBody.appendChild(row);
      return;
    }

    // Mapeo con índice original
    const indexed = historial.map((item, index) => ({
      ...item,
      _idx: index,
    }));

    // Ordenar por fecha desc (último arriba)
    const sorted = indexed.sort((a, b) => {
      if (a.fecha === b.fecha) return 0;
      return a.fecha < b.fecha ? 1 : -1;
    });

    for (const item of sorted) {
      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${formatDate(item.fecha)}</td>
        <td>${item.grupo}</td>
        <td>${item.ejercicio}</td>
        <td>${item.series}</td>
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

  // Delegación de eventos para botones Editar / Borrar
  historialBody.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.dataset.action;
    const idx = Number(btn.dataset.index);
    const username = getCurrentSession();

    if (!username) {
      showMessage("Tu sesión expiró. Volvé a iniciar sesión.", "error");
      switchToAuth();
      return;
    }

    const data = getUserData(username);

    if (action === "edit") {
      const entry = data.historial[idx];
      if (!entry) return;

      // Llevar datos al formulario
      fechaInput.value = entry.fecha;
      grupoInput.value = entry.grupo;
      ejercicioInput.value = entry.ejercicio;
      seriesInput.value = entry.series;
      repsInput.value = entry.reps;
      pesoInput.value = entry.peso;

      editingIndex = idx;
      serieSubmitBtn.textContent = "Guardar cambios";

      // Cambiar a la pestaña "Cargar serie"
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

      // Si justo teníamos esa serie en edición, reseteo
      if (editingIndex === idx) {
        editingIndex = null;
        serieSubmitBtn.textContent = "Guardar serie";
        clearSerieForm();
      }

      renderHistorial(username);
      renderResumen(username);
      showMessage("Serie eliminada.", "info");
    }
  });

  function formatDate(isoDate) {
    // yyyy-mm-dd -> dd/mm/yyyy
    const [y, m, d] = isoDate.split("-");
    return `${d}/${m}/${y}`;
  }

  // ====================== RESUMEN =======================

  function renderResumen(username) {
    const data = getUserData(username);
    const historial = data.historial || [];

    resumenGlobalContainer.innerHTML = "";
    resumenGruposContainer.innerHTML = "";

    // Actualizar frase tipo streak
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

    // Globales
    const totalSeries = historial.reduce((acc, h) => acc + h.series, 0);
    const totalVolumen = historial.reduce((acc, h) => acc + h.volumen, 0);

    const diasUnicos = new Set(historial.map((h) => h.fecha));
    const sesiones = diasUnicos.size;

    // Máximo peso por ejercicio
    const maxPorEjercicio = {};
    for (const h of historial) {
      const key = `${h.grupo}__${h.ejercicio}`;
      if (!maxPorEjercicio[key] || h.peso > maxPorEjercicio[key]) {
        maxPorEjercicio[key] = h.peso;
      }
    }
    const mayorPeso = Math.max(...Object.values(maxPorEjercicio));

    // Cards globales
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
        "Suma de todas las series que cargaste."
      )
    );

    resumenGlobalContainer.appendChild(
      makeResumenCard(
        "Volumen total",
        totalVolumen.toLocaleString("es-AR"),
        "Series × reps × peso (kg) de todo tu historial."
      )
    );

    resumenGlobalContainer.appendChild(
      makeResumenCard(
        "Tu mayor peso",
        mayorPeso + " kg",
        "Máximo peso registrado en algún ejercicio."
      )
    );

    // Por grupo muscular
    const gruposMap = {};
    for (const h of historial) {
      if (!gruposMap[h.grupo]) {
        gruposMap[h.grupo] = {
          series: 0,
          volumen: 0,
        };
      }
      gruposMap[h.grupo].series += h.series;
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

  // ====================== NAV TABS =======================

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetView = btn.dataset.view;

      tabButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      Object.values(views).forEach((view) => view.classList.add("hidden"));
      views[targetView].classList.remove("hidden");
    });
  });

  // ====================== SESIÓN AL INICIAR =======================

  const existingSession = getCurrentSession();
  if (existingSession) {
    switchToApp(existingSession);
  } else {
    switchToAuth();
  }

  // ====================== SERVICE WORKER (PWA) =======================

  if ("serviceWorker" in navigator) {
    navigator
      .register("./service-worker.js")
      .catch((err) => {
        console.error("Error registrando service worker:", err);
      });
  }
});
