// js/storage.js
const STORAGE_KEY = "gym-entries-v1";
const GROUPS_KEY  = "gym-groups-v1";
const PROFILE_KEY = "gym-profile-v1";

// --- SERIES ---
export function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

// --- GRUPOS ---
export function loadGroups() {
  try {
    const raw = localStorage.getItem(GROUPS_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    if (data.length === 0) return [];

    // Compatibilidad vieja: array de strings
    if (typeof data[0] === "string") {
      return data.map(name => ({ name: String(name), info: "" }));
    }

    // Formato nuevo: objetos {name, info}
    if (typeof data[0] === "object" && data[0] && "name" in data[0]) {
      return data.map(g => ({ name: String(g.name), info: g.info ? String(g.info) : "" }));
    }

    return [];
  } catch {
    return [];
  }
}

export function saveGroups(groups) {
  localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
}

export function ensureGroupStored(groupName) {
  const name = String(groupName || "").trim();
  if (!name) return;
  let groups = loadGroups();
  if (!groups.some(g => g.name === name)) {
    groups.push({ name, info: "" });
    groups.sort((a, b) => a.name.localeCompare(b.name));
    saveGroups(groups);
  }
}

export function initGroupsFromEntriesIfEmpty() {
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

// --- PERFIL ---
export function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveProfile(profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

// --- Export / Import global ---
export function exportAll(profileOverride) {
  return {
    entries: loadEntries(),
    groups: loadGroups(),
    profile: profileOverride || loadProfile()
  };
}

export function importAll(data) {
  const newEntries = Array.isArray(data.entries) ? data.entries : [];
  const newGroups  = Array.isArray(data.groups)  ? data.groups  : [];
  const newProfile = data.profile && typeof data.profile === "object" ? data.profile : {};

  saveEntries(newEntries);
  saveGroups(newGroups);
  saveProfile(newProfile);
}
