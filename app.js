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

  // Formularios
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const serieForm = document.getElementById("serie-form");

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

    renderHistorial(username);
    renderResumen(username);
  }

  function switchToAuth() {
    authSection.classList.remove("hidden");
    appSection.classList.add("hidden");
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

  // ====================== CARGAR SERIE =======================

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

    data.historial.push(entry);

    // Opcional: si el ejercicio no existe en rutinas, lo agrego
    if (!data.rutinas.some((r) => r.ejercicio === ejercicio && r.grupo === grupo)) {
      data.rutinas.push({
        grupo,
        ejercicio,
      });
    }

    saveUserData(username, data);

    clearSerieForm();
    renderHistorial(username);
    renderResumen(username);

    showMessage("Serie guardada en tu historial.", "success");
  });

  // ====================== HISTORIAL =======================

  function renderHistorial(username) {
    const data = getUserData(username);
    const historial = data.historial || [];

    historialBody.innerHTML = "";

    if (historial.length === 0) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 7;
      cell.textContent = "Todavía no cargaste ninguna serie.";
      cell.style.textAlign = "center";
      row.appendChild(cell);
      historialBody.appendChild(row);
      return;
    }

    // Ordenar por fecha desc (último arriba)
    const sorted = [...historial].sort((a, b) => {
      if (a.fecha === b.fecha) return 0;
      return a.fecha < b.fecha ? 1 : -1;
    });

    for (c
