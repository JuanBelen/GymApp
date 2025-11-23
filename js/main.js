
    const STORAGE_KEY  = "gym-entries-v1";
    const GROUPS_KEY   = "gym-groups-v1";
    const PROFILE_KEY  = "gym-profile-v1";
    const MINUTOS_POR_SERIE_DEFAULT = 1.5;

    const form           = document.getElementById("workout-form");
    const dateInput      = document.getElementById("date");
    const exerciseInput  = document.getElementById("exercise");
    const setsInput      = document.getElementById("sets");
    const repsInput      = document.getElementById("reps");
    const weightInput    = document.getElementById("weight");
    const groupSelect    = document.getElementById("group-select");
    const groupAddBtn    = document.getElementById("group-add-btn");
    const groupNewInput  = document.getElementById("group-new");
    const submitSeriesBtn= document.getElementById("submit-series");
    const cancelEditBtn  = document.getElementById("cancel-edit");
    const editIndicator  = document.getElementById("edit-indicator");

    let editingIndex = null;

    const logBody           = document.getElementById("log-body");
    const filterTodayBtn    = document.getElementById("filter-today");
    const filterAllBtn      = document.getElementById("filter-all");
    const clearAllBtn       = document.getElementById("clear-all");
    const deleteSelectedBtn = document.getElementById("delete-selected");
    const groupFilter       = document.getElementById("group-filter");
    const summaryDiv        = document.getElementById("summary");

    const filterFromInput   = document.getElementById("filter-from");
    const filterToInput     = document.getElementById("filter-to");
    const filterRangeBtn    = document.getElementById("filter-range");

    const filterExerciseInput   = document.getElementById("filter-exercise");
    const filterPRsBtn          = document.getElementById("filter-prs");
    const filterAdvancedClear   = document.getElementById("filter-advanced-clear");
    let exerciseSearch = "";
    let onlyPRs = false;

    const exportBtn       = document.getElementById("export-json");
    const importBtn       = document.getElementById("import-json");
    const importFileInput = document.getElementById("import-file");

    const groupAdminForm      = document.getElementById("group-admin-form");
    const groupAdminNameInput = document.getElementById("group-admin-name");
    const groupAdminInfoInput = document.getElementById("group-admin-info");
    const groupsBody          = document.getElementById("groups-body");
    const groupsSaveBtn       = document.getElementById("groups-save-btn");
    const groupsDeleteBtn     = document.getElementById("groups-delete-btn");

    const summaryPeriodLabel = document.getElementById("summary-period-label");
    const summaryStatsDiv    = document.getElementById("summary-stats");
    const summaryPrBody      = document.getElementById("summary-pr-body");
    const summaryPeriodBtns  = document.querySelectorAll(".summary-period");
    const summaryChart       = document.getElementById("summary-chart");
    const chartCtx           = summaryChart.getContext("2d");

    const profileForm          = document.getElementById("profile-form");
    const profileNameInput     = document.getElementById("profile-name");
    const profileBirthYearInput= document.getElementById("profile-birth-year");
    const profileHeightInput   = document.getElementById("profile-height");
    const profileWeightInput   = document.getElementById("profile-weight");
    const profileGoalInput     = document.getElementById("profile-goal");
    const profileNotesInput    = document.getElementById("profile-notes");
    const profileMinutesInput  = document.getElementById("profile-minutes-per-set");

    const tabButtons  = document.querySelectorAll(".tab-button");
    const tabContents = document.querySelectorAll(".tab-content");

    const confirmModal    = document.getElementById("confirm-modal");
    const confirmMessage  = document.getElementById("confirm-message");
    const confirmCancel   = document.getElementById("confirm-cancel");
    const confirmOk       = document.getElementById("confirm-ok");
    let confirmHandler    = null;

    const toastEl = document.getElementById("toast");
    let toastTimeout = null;

    const streakBanner = document.getElementById("streak-banner");

    let profile = null;

    function openConfirm(message, onConfirm) {
      confirmMessage.textContent = message;
      confirmHandler = onConfirm;
      confirmModal.classList.add("active");
    }

    function closeConfirm() {
      confirmModal.classList.remove("active");
      confirmHandler = null;
    }

    confirmCancel.addEventListener("click", () => closeConfirm());
    confirmOk.addEventListener("click", () => {
      if (typeof confirmHandler === "function") confirmHandler();
      closeConfirm();
    });

    function showToast(message, duration = 2500) {
      toastEl.textContent = message;
      toastEl.style.display = "block";
      if (toastTimeout) clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => {
        toastEl.style.display = "none";
      }, duration);
    }

    function activateTab(name) {
      tabButtons.forEach(btn => {
        btn.classList.toggle("active", btn.dataset.tab === name);
      });
      tabContents.forEach(tab => {
        tab.classList.toggle("active", tab.id === "tab-" + name);
      });
    }

    tabButtons.forEach(btn => {
      btn.addEventListener("click", () => activateTab(btn.dataset.tab));
    });

    function setToday() {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm   = String(today.getMonth() + 1).padStart(2, "0");
      const dd   = String(today.getDate()).padStart(2, "0");
      dateInput.value = `${yyyy}-${mm}-${dd}`;
    }

    function loadEntries() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }

    function saveEntries(entries) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    }

    function loadGroups() {
      try {
        const raw = localStorage.getItem(GROUPS_KEY);
        if (!raw) return [];
        const data = JSON.parse(raw);
        if (!Array.isArray(data)) return [];
        if (data.length === 0) return [];
        if (typeof data[0] === "string") {
          return data.map(name => ({ name: String(name), info: "" }));
        }
        if (typeof data[0] === "object" && data[0] && "name" in data[0]) {
          return data.map(g => ({ name: String(g.name), info: g.info ? String(g.info) : "" }));
        }
        return [];
      } catch {
        return [];
      }
    }

    function saveGroups(groups) {
      localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
    }

    function loadProfile() {
      try {
        const raw = localStorage.getItem(PROFILE_KEY);
        return raw ? JSON.parse(raw) : {};
      } catch {
        return {};
      }
    }

    function saveProfile(newProfile) {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(newProfile));
    }

    function ensureGroupStored(groupName) {
      const name = String(groupName || "").trim();
      if (!name) return;
      let groups = loadGroups();
      if (!groups.some(g => g.name === name)) {
        groups.push({ name, info: "" });
        groups.sort((a, b) => a.name.localeCompare(b.name));
        saveGroups(groups);
      }
    }

    function initGroupsFromEntriesIfEmpty() {
      let groups = loadGroups();
      if (groups.length > 0) return;

      const entries = loadEntries();
      const set = new Set();
      entries.forEach(e => {
        if (e.group && String(e.group).trim() !== "") set.add(String(e.group).trim());
      });

      groups = Array.from(set)
        .sort((a, b) => a.localeCompare(b))
        .map(name => ({ name, info: "" }));

      saveGroups(groups);
    }

    function populateGroupSelect(selected = "") {
      const groups = loadGroups();
      groupSelect.innerHTML = "";
      const optNone = document.createElement("option");
      optNone.value = "";
      optNone.textContent = "Sin grupo";
      groupSelect.appendChild(optNone);

      groups.forEach(g => {
        const opt = document.createElement("option");
        opt.value = g.name;
        opt.textContent = g.name;
        groupSelect.appendChild(opt);
      });

      if (selected && groups.some(g => g.name === selected)) {
        groupSelect.value = selected;
      } else {
        groupSelect.value = "";
      }
    }

    function fillProfileForm() {
      const p = profile || {};
      profileNameInput.value      = p.name || "";
      profileBirthYearInput.value = p.birthYear || "";
      profileHeightInput.value    = p.height || "";
      profileWeightInput.value    = p.weight || "";
      profileGoalInput.value      = p.goal || "";
      profileNotesInput.value     = p.notes || "";
      const mins = p.minutesPerSet != null ? p.minutesPerSet : MINUTOS_POR_SERIE_DEFAULT;
      profileMinutesInput.value   = mins;
    }

    function resetEditMode() {
      editingIndex = null;
      submitSeriesBtn.textContent = "Agregar serie";
      cancelEditBtn.style.display = "none";
      editIndicator.style.display = "none";
      editIndicator.textContent   = "";
      form.reset();
      setToday();
      groupNewInput.style.display = "none";
      groupNewInput.value = "";
    }

    let currentFilter = "today";
    let currentGroup  = "all";
    let currentFrom   = "";
    let currentTo     = "";

    function renderEntries() {
      const entries = loadEntries();
      logBody.innerHTML = "";
      summaryDiv.textContent = "";

      let todayStr = null;
      if (currentFilter === "today") {
        const d  = new Date();
        const yy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        todayStr = `${yy}-${mm}-${dd}`;
      }

      let filtered = entries
        .map((e, index) => ({ ...e, index }))
        .filter(e => {
          if (currentFilter === "today") {
            return e.date === todayStr;
          }
          if (currentFilter === "range") {
            if (currentFrom && e.date < currentFrom) return false;
            if (currentTo && e.date > currentTo)   return false;
          }
          return true;
        });

      const uniqueGroups = Array.from(
        new Set(
          filtered.map(r => r.group || "").filter(g => g.trim() !== "")
        )
      ).sort((a, b) => a.localeCompare(b));

      groupFilter.innerHTML = "";
      const optAll = document.createElement("option");
      optAll.value = "all";
      optAll.textContent = "Grupos (todos)";
      groupFilter.appendChild(optAll);
      uniqueGroups.forEach(g => {
        const opt = document.createElement("option");
        opt.value = g;
        opt.textContent = g;
        groupFilter.appendChild(opt);
      });

      if (currentGroup !== "all" && !uniqueGroups.includes(currentGroup)) {
        currentGroup = "all";
      }
      groupFilter.value = currentGroup;

      if (currentGroup !== "all") {
        filtered = filtered.filter(r => (r.group || "") === currentGroup);
      }

      // Filtro por ejercicio
      if (exerciseSearch.trim()) {
        const s = exerciseSearch.trim().toLowerCase();
        filtered = filtered.filter(e => (e.exercise || "").toLowerCase().includes(s));
      }

      // Filtro solo PRs (dentro del conjunto filtrado)
      if (onlyPRs) {
        const maxByExercise = {};
        filtered.forEach(e => {
          const ex = e.exercise || "";
          const w  = Number(e.weight) || 0;
          if (!(ex in maxByExercise) || w > maxByExercise[ex]) {
            maxByExercise[ex] = w;
          }
        });
        filtered = filtered.filter(e => {
          const ex = e.exercise || "";
          const w  = Number(e.weight) || 0;
          return maxByExercise[ex] != null && w === maxByExercise[ex];
        });
      }

      filtered.sort((a, b) => b.date.localeCompare(a.date));

      if (filtered.length === 0) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 8;
        td.textContent = "Sin registros para el filtro actual.";
        tr.appendChild(td);
        logBody.appendChild(tr);
        return;
      }

      if (currentGroup !== "all") {
        const totalSeries = filtered.reduce((acc, r) => acc + (Number(r.sets) || 0), 0);
        const totalReps   = filtered.reduce((acc, r) => acc + (Number(r.sets) || 0) * (Number(r.reps) || 0), 0);
        const maxPeso     = filtered.reduce((max, r) => Math.max(max, Number(r.weight) || 0), 0);

        summaryDiv.textContent =
          `Grupo: ${currentGroup} | Series totales: ${totalSeries} | Reps estimadas: ${totalReps} | Peso máximo: ${maxPeso} kg`;
      }

      filtered.forEach(entry => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><input type="checkbox" class="row-select" data-index="${entry.index}"></td>
          <td><button type="button" class="btn-secondary btn-xs edit-entry" data-index="${entry.index}">✏️</button></td>
          <td>${entry.date}</td>
          <td>${entry.group || "-"}</td>
          <td>${entry.exercise}</td>
          <td>${entry.sets}</td>
          <td>${entry.reps}</td>
          <td>${entry.weight}</td>
        `;
        logBody.appendChild(tr);
      });
    }

    function renderGroupsTab() {
      const groups = loadGroups();
      groupsBody.innerHTML = "";

      if (groups.length === 0) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 4;
        td.textContent = "Todavía no tenés grupos creados.";
        tr.appendChild(td);
        groupsBody.appendChild(tr);
        return;
      }

      groups.forEach((g, idx) => {
        const tr = document.createElement("tr");
        tr.dataset.name = g.name;
        const safeInfo = (g.info || "").replace(/"/g, "&quot;");
        tr.innerHTML = `
          <td><input type="checkbox" class="group-select" data-name="${g.name}"></td>
          <td>${idx + 1}</td>
          <td>${g.name}</td>
          <td><input type="text" value="${safeInfo}" /></td>
        `;
        groupsBody.appendChild(tr);
      });
    }

    function parseDate(dateStr) {
      if (!dateStr) return null;
      const [y, m, d] = dateStr.split("-").map(Number);
      return new Date(y, m - 1, d);
    }

    function getEntriesForPeriod(period) {
      const entries = loadEntries();
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      return entries.filter(e => {
        const d = parseDate(e.date);
        if (!d) return false;
        const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const diffDays = (todayStart - dayStart) / (1000 * 60 * 60 * 24);

        if (period === "week") {
          return diffDays >= 0 && diffDays < 7;
        } else if (period === "month") {
          return d.getFullYear() === today.getFullYear() &&
                 d.getMonth() === today.getMonth();
        } else if (period === "year") {
          return d.getFullYear() === today.getFullYear();
        } else {
          return true;
        }
      });
    }

    function humanLabelForPeriod(period) {
      if (period === "week")  return "Esta semana (últimos 7 días)";
      if (period === "month") return "Este mes";
      if (period === "year")  return "Este año";
      return "Todo el historial";
    }

    function computeStreaks() {
      const entries = loadEntries();
      const datesSet = new Set(entries.map(e => e.date).filter(Boolean));
      const dates = Array.from(datesSet)
        .map(parseDate)
        .filter(Boolean)
        .sort((a, b) => a - b);

      if (dates.length === 0) return { current: 0, best: 0 };

      let best = 1;
      let current = 1;

      for (let i = 1; i < dates.length; i++) {
        const diffDays = (dates[i] - dates[i-1]) / (1000 * 60 * 60 * 24);
        if (diffDays === 1) {
          current++;
          if (current > best) best = current;
        } else if (diffDays > 1) {
          current = 1;
        }
      }

      const today = new Date();
      const last = dates[dates.length - 1];
      const diffToToday = (new Date(today.getFullYear(), today.getMonth(), today.getDate()) -
                           new Date(last.getFullYear(), last.getMonth(), last.getDate())) /
                          (1000 * 60 * 60 * 24);
      let currentFromToday = current;
      if (diffToToday > 1) currentFromToday = 0;

      return { current: currentFromToday, best };
    }

    function updateStreakBanner() {
      const { current, best } = computeStreaks();

      if (current > 0) {
        const daysText = current === 1 ? "1 día" : current + " días";
        streakBanner.textContent =
          `🔥 Llevás una racha de ${daysText} entrenando seguido. ¡Seguí así! 💪 (Mejor racha: ${best} días)`;
      } else if (best > 0) {
        streakBanner.textContent =
          `🏁 Tu mejor racha fue de ${best} días seguidos. ¡Hoy podés arrancar otra!`;
      } else {
        streakBanner.textContent =
          "🏋️ Empezá a registrar tus entrenos para ver tu racha.";
      }
    }

    function computeWeeklyVolume() {
      const entries = loadEntries();
      const weeks = {};

      entries.forEach(e => {
        const d = parseDate(e.date);
        if (!d) return;
        const sets = Number(e.sets) || 0;
        const reps = Number(e.reps) || 0;
        const w    = Number(e.weight) || 0;
        const vol  = sets * reps * w;

        const year = d.getFullYear();
        const startOfYear = new Date(year, 0, 1);
        const dayOfYear = Math.floor((d - startOfYear) / (1000*60*60*24)) + 1;
        const weekNum = Math.ceil(dayOfYear / 7);

        const key = `${year}-W${String(weekNum).padStart(2,"0")}`;
        weeks[key] = (weeks[key] || 0) + vol;
      });

      return Object.entries(weeks)
        .map(([week, volume]) => ({ week, volume }))
        .sort((a, b) => a.week.localeCompare(b.week))
        .slice(-8);
    }

    function drawWeeklyChart() {
      const data = computeWeeklyVolume();
      const ctx = chartCtx;
      const canvas = summaryChart;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (data.length === 0) {
        ctx.fillStyle = "#9ca3af";
        ctx.font = "12px system-ui";
        ctx.fillText("Sin datos suficientes para gráfico semanal.", 10, canvas.height / 2);
        return;
      }

      const padding = 20;
      const w = canvas.width;
      const h = canvas.height;
      const innerW = w - padding * 2;
      const innerH = h - padding * 2;

      const maxVol = Math.max(...data.map(d => d.volume)) || 1;

      const barWidth = innerW / data.length * 0.6;
      const gap = innerW / data.length * 0.4;

      ctx.strokeStyle = "#4b5563";
      ctx.beginPath();
      ctx.moveTo(padding, padding + innerH);
      ctx.lineTo(padding + innerW, padding + innerH);
      ctx.stroke();

      ctx.fillStyle = "#10b981";

      data.forEach((item, idx) => {
        const x = padding + idx * (barWidth + gap) + gap / 2;
        const barHeight = innerH * (item.volume / maxVol);
        const y = padding + innerH - barHeight;
        ctx.fillRect(x, y, barWidth, barHeight);
      });

      ctx.fillStyle = "#9ca3af";
      ctx.font = "10px system-ui";
      data.forEach((item, idx) => {
        const x = padding + idx * (barWidth + gap) + gap / 2;
        const label = item.week.slice(-3);
        ctx.fillText(label, x, h - 5);
      });
    }

    function renderSummary(period) {
      const entries = getEntriesForPeriod(period);
      summaryPeriodLabel.textContent = humanLabelForPeriod(period);
      summaryStatsDiv.innerHTML = "";
      summaryPrBody.innerHTML = "";

      if (entries.length === 0) {
        summaryStatsDiv.innerHTML = "<div class='summary-card'>Sin registros para este período.</div>";
        drawWeeklyChart();
        updateStreakBanner();
        return;
      }

      let totalSeries = 0;
      let totalReps   = 0;
      let totalVolume = 0;
      const daysSet   = new Set();
      const exerciseCounts = {};
      const prs = {};

      entries.forEach(e => {
        const sets = Number(e.sets) || 0;
        const reps = Number(e.reps) || 0;
        const w    = Number(e.weight) || 0;

        totalSeries += sets;
        totalReps   += sets * reps;
        totalVolume += sets * reps * w;

        if (e.date) daysSet.add(e.date);

        const exName = e.exercise || "Sin nombre";
        exerciseCounts[exName] = (exerciseCounts[exName] || 0) + 1;

        const est1RM = w * (1 + (reps / 30));

        if (!prs[exName] || est1RM > prs[exName].est1RM) {
          prs[exName] = {
            weight: w,
            reps,
            est1RM,
            date: e.date,
            group: e.group || ""
          };
        }
      });

      const daysTrained = daysSet.size;
      const avgSeriesPerDay = daysTrained ? (totalSeries / daysTrained) : 0;
      const avgVolumePerDay = daysTrained ? (totalVolume / daysTrained) : 0;

      const minutesPerSet = profile && profile.minutesPerSet
        ? Number(profile.minutesPerSet)
        : MINUTOS_POR_SERIE_DEFAULT;

      const totalMinutes = totalSeries * minutesPerSet;
      const totalHours   = totalMinutes / 60;
      const minutesPerDay = daysTrained ? totalMinutes / daysTrained : 0;

      const streaks = computeStreaks();

      let mostFreqExercise = "-";
      let mostFreqCount = 0;
      Object.entries(exerciseCounts).forEach(([name, count]) => {
        if (count > mostFreqCount) {
          mostFreqCount = count;
          mostFreqExercise = name;
        }
      });

      const formatNumber = (n, dec = 1) =>
        n.toLocaleString("es-AR", { maximumFractionDigits: dec });

      const perfilTexto = (() => {
        const parts = [];
        if (profile && profile.height) parts.push(`${profile.height} cm`);
        if (profile && profile.weight) parts.push(`${profile.weight} kg`);
        if (profile && profile.goal)   parts.push(profile.goal);
        return parts.length ? parts.join(" · ") : "Sin datos de perfil";
      })();

      summaryStatsDiv.innerHTML = `
        <div class="summary-card">
          <div class="summary-card-title">Series totales</div>
          <div>${formatNumber(totalSeries,0)}</div>
        </div>
        <div class="summary-card">
          <div class="summary-card-title">Reps totales</div>
          <div>${formatNumber(totalReps,0)}</div>
        </div>
        <div class="summary-card">
          <div class="summary-card-title">Volumen total</div>
          <div>${formatNumber(totalVolume)} kg</div>
        </div>
        <div class="summary-card">
          <div class="summary-card-title">Días entrenados</div>
          <div>${daysTrained}</div>
        </div>
        <div class="summary-card">
          <div class="summary-card-title">Series / día</div>
          <div>${formatNumber(avgSeriesPerDay)}</div>
        </div>
        <div class="summary-card">
          <div class="summary-card-title">Volumen / día</div>
          <div>${formatNumber(avgVolumePerDay)} kg</div>
        </div>
        <div class="summary-card">
          <div class="summary-card-title">Ejercicio más frecuente</div>
          <div>${mostFreqExercise}</div>
        </div>
        <div class="summary-card">
          <div class="summary-card-title">Tiempo estimado</div>
          <div>${formatNumber(totalHours)} h totales<br>${formatNumber(minutesPerDay)} min/día<br>Serie ~ ${formatNumber(minutesPerSet)} min</div>
        </div>
        <div class="summary-card">
          <div class="summary-card-title">Racha</div>
          <div>Actual: ${streaks.current} días<br>Mejor: ${streaks.best} días</div>
        </div>
        <div class="summary-card">
          <div class="summary-card-title">Datos perfil</div>
          <div>${perfilTexto}</div>
        </div>
      `;

      const exNames = Object.keys(prs).sort((a, b) => a.localeCompare(b));
      exNames.forEach(name => {
        const pr = prs[name];
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${name}</td>
          <td>${formatNumber(pr.weight)}</td>
          <td>${formatNumber(pr.est1RM)}</td>
          <td>${pr.date || "-"}</td>
          <td>${pr.group || "-"}</td>
        `;
        summaryPrBody.appendChild(tr);
      });

      drawWeeklyChart();
      updateStreakBanner();
    }

    summaryPeriodBtns.forEach(btn => {
      btn.addEventListener("click", () => renderSummary(btn.dataset.period));
    });

    groupAddBtn.addEventListener("click", () => {
      if (groupNewInput.style.display === "none") {
        groupNewInput.style.display = "block";
        groupNewInput.focus();
      } else {
        groupNewInput.style.display = "none";
        groupNewInput.value = "";
      }
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const date     = dateInput.value;
      const exercise = exerciseInput.value.trim();
      const sets     = Number(setsInput.value);
      const reps     = Number(repsInput.value);
      const weight   = Number(weightInput.value);

      if (!exercise) {
        showToast("Falta el ejercicio.");
        return;
      }

      let group = "";
      const newGroupName = groupNewInput.value.trim();

      if (newGroupName) {
        group = newGroupName;
        ensureGroupStored(group);
        populateGroupSelect(group);
        groupNewInput.value = "";
        groupNewInput.style.display = "none";
      } else {
        group = groupSelect.value;
      }

      const entries = loadEntries();

      if (editingIndex !== null && editingIndex >= 0 && editingIndex < entries.length) {
        entries[editingIndex] = { date, group, exercise, sets, reps, weight };
      } else {
        entries.push({ date, group, exercise, sets, reps, weight });
      }

      saveEntries(entries);
      resetEditMode();
      renderEntries();
      renderGroupsTab();
      renderSummary("week");
      updateStreakBanner();
    });

    cancelEditBtn.addEventListener("click", () => {
      resetEditMode();
    });

    // Click en editar dentro del historial
    logBody.addEventListener("click", (e) => {
      const btn = e.target.closest(".edit-entry");
      if (!btn) return;
      const index = Number(btn.dataset.index);
      const entries = loadEntries();
      if (index < 0 || index >= entries.length) return;
      const entry = entries[index];

      // asegurar grupo en catálogo
      if (entry.group && entry.group.trim() !== "") {
        ensureGroupStored(entry.group);
      }
      populateGroupSelect(entry.group || "");

      dateInput.value     = entry.date;
      exerciseInput.value = entry.exercise;
      setsInput.value     = entry.sets;
      repsInput.value     = entry.reps;
      weightInput.value   = entry.weight;
      groupSelect.value   = entry.group || "";

      editingIndex = index;
      submitSeriesBtn.textContent = "Guardar cambios";
      cancelEditBtn.style.display = "inline-block";
      editIndicator.style.display = "block";
      editIndicator.textContent = `Editando serie del ${entry.date} – ${entry.exercise}`;
      activateTab("entry");
    });

    filterTodayBtn.addEventListener("click", () => {
      currentFilter = "today";
      currentFrom   = "";
      currentTo     = "";
      filterFromInput.value = "";
      filterToInput.value   = "";
      renderEntries();
    });

    filterAllBtn.addEventListener("click", () => {
      currentFilter = "all";
      currentFrom   = "";
      currentTo     = "";
      filterFromInput.value = "";
      filterToInput.value   = "";
      renderEntries();
    });

    filterRangeBtn.addEventListener("click", () => {
      currentFrom = filterFromInput.value || "";
      currentTo   = filterToInput.value   || "";
      currentFilter = "range";
      renderEntries();
    });

    // filtros extra
    filterExerciseInput.addEventListener("input", () => {
      exerciseSearch = filterExerciseInput.value.toLowerCase();
      renderEntries();
    });

    filterPRsBtn.addEventListener("click", () => {
      onlyPRs = !onlyPRs;
      filterPRsBtn.classList.toggle("btn-active", onlyPRs);
      filterPRsBtn.textContent = onlyPRs ? "Ver todo" : "Solo PRs";
      renderEntries();
    });

    filterAdvancedClear.addEventListener("click", () => {
      exerciseSearch = "";
      onlyPRs = false;
      filterExerciseInput.value = "";
      filterPRsBtn.classList.remove("btn-active");
      filterPRsBtn.textContent = "Solo PRs";
      renderEntries();
    });

    clearAllBtn.addEventListener("click", () => {
      openConfirm("¿Seguro que querés borrar TODOS los registros?", () => {
        localStorage.removeItem(STORAGE_KEY);
        resetEditMode();
        renderEntries();
        renderSummary("week");
        updateStreakBanner();
      });
    });

    deleteSelectedBtn.addEventListener("click", () => {
      const checkboxes = document.querySelectorAll(".row-select:checked");
      if (checkboxes.length === 0) {
        showToast("No hay series seleccionadas para borrar.");
        return;
      }

      const qty = checkboxes.length;
      openConfirm(`¿Borrar ${qty} serie(s) seleccionada(s)?`, () => {
        const entries = loadEntries();
        const indices = Array.from(checkboxes).map(chk => Number(chk.dataset.index));
        indices.sort((a, b) => b - a);
        indices.forEach(i => {
          if (i >= 0 && i < entries.length) entries.splice(i, 1);
        });
        saveEntries(entries);
        resetEditMode();
        renderEntries();
        renderSummary("week");
        updateStreakBanner();
      });
    });

    groupFilter.addEventListener("change", () => {
      currentGroup = groupFilter.value;
      renderEntries();
    });

    // Export / import
    exportBtn.addEventListener("click", () => {
      const data = {
        entries: loadEntries(),
        groups: loadGroups(),
        profile: profile || loadProfile()
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm   = String(now.getMonth() + 1).padStart(2, "0");
      const dd   = String(now.getDate()).padStart(2, "0");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `gym-data-${yyyy}${mm}${dd}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    });

    importBtn.addEventListener("click", () => {
      importFileInput.click();
    });

    importFileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          openConfirm("Esto reemplazará tus datos actuales por los del archivo importado. ¿Continuar?", () => {
            const newEntries = Array.isArray(data.entries) ? data.entries : [];
            const newGroups  = Array.isArray(data.groups)  ? data.groups  : [];
            const newProfile = data.profile && typeof data.profile === "object" ? data.profile : {};
            saveEntries(newEntries);
            saveGroups(newGroups);
            saveProfile(newProfile);
            profile = loadProfile();
            fillProfileForm();
            populateGroupSelect();
            resetEditMode();
            renderEntries();
            renderGroupsTab();
            renderSummary("week");
            updateStreakBanner();
            showToast("Datos importados correctamente.");
          });
        } catch (err) {
          console.error(err);
          showToast("Archivo inválido. Debe ser un JSON exportado de la app.");
        } finally {
          importFileInput.value = "";
        }
      };
      reader.readAsText(file);
    });

    profileForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const minutesPerSet = Number(profileMinutesInput.value) || MINUTOS_POR_SERIE_DEFAULT;

      profile = {
        name:      profileNameInput.value.trim(),
        birthYear: profileBirthYearInput.value ? Number(profileBirthYearInput.value) : "",
        height:    profileHeightInput.value ? Number(profileHeightInput.value) : "",
        weight:    profileWeightInput.value ? Number(profileWeightInput.value) : "",
        goal:      profileGoalInput.value.trim(),
        notes:     profileNotesInput.value.trim(),
        minutesPerSet
      };

      saveProfile(profile);
      showToast("Perfil guardado.");
      renderSummary("week");
    });

    groupsSaveBtn.addEventListener("click", () => {
      let groups = loadGroups();
      const rows = groupsBody.querySelectorAll("tr");
      rows.forEach(row => {
        const name = row.dataset.name;
        const input = row.querySelector("input[type='text']");
        if (!name || !input) return;
        const g = groups.find(gr => gr.name === name);
        if (g) g.info = input.value;
      });
      saveGroups(groups);
      showToast("Información de grupos guardada.");
    });

    groupsDeleteBtn.addEventListener("click", () => {
      const checks = groupsBody.querySelectorAll(".group-select:checked");
      if (checks.length === 0) {
        showToast("No hay grupos seleccionados para borrar.");
        return;
      }
      const qty = checks.length;
      openConfirm(`¿Borrar ${qty} grupo(s) del catálogo?\n(No afecta las series ya registradas.)`, () => {
        let groups = loadGroups();
        const namesToDelete = Array.from(checks).map(chk => chk.dataset.name);
        groups = groups.filter(g => !namesToDelete.includes(g.name));
        saveGroups(groups);

        populateGroupSelect();
        renderGroupsTab();
      });
    });

    groupAdminForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = groupAdminNameInput.value.trim();
      const info = groupAdminInfoInput.value.trim();
      if (!name) {
        showToast("El nombre del grupo no puede estar vacío.");
        return;
      }

      let groups = loadGroups();
      const existing = groups.find(g => g.name === name);
      if (existing) {
        existing.info = info;
      } else {
        groups.push({ name, info });
        groups.sort((a, b) => a.name.localeCompare(b.name));
      }
      saveGroups(groups);

      groupAdminNameInput.value = "";
      groupAdminInfoInput.value = "";

      populateGroupSelect();
      renderGroupsTab();
      showToast("Grupo guardado.");
    });

    setToday();
    initGroupsFromEntriesIfEmpty();
    profile = loadProfile();
    fillProfileForm();
    populateGroupSelect();
    renderEntries();
    renderGroupsTab();
    renderSummary("week");
    updateStreakBanner();
    activateTab("entry");
add main.js
