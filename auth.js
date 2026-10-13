// Mada Care shared browser storage.
// Uses localStorage, and also mirrors values into window.name because some previews block
// browser storage; window.name survives page navigation within the same tab.
const MadaStore = (() => {
  const PREFIX = "mada:";
  function bag() {
    try { return window.name.startsWith(PREFIX) ? JSON.parse(window.name.slice(PREFIX.length)) : {}; } catch (e) { return {}; }
  }
  function get(key) {
    try { const v = localStorage.getItem(key); if (v != null) return v; } catch (e) {}
    const b = bag(); return key in b ? b[key] : null;
  }
  function set(key, value) {
    // If localStorage is full (e.g. visit photos), drop its stale copy so reads fall back to window.name.
    try { value == null ? localStorage.removeItem(key) : localStorage.setItem(key, value); } catch (e) { try { localStorage.removeItem(key); } catch (e2) {} }
    const b = bag();
    if (value == null) delete b[key]; else b[key] = String(value);
    window.name = PREFIX + JSON.stringify(b);
  }
  const getJSON = (key, fallback) => { try { const v = get(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; } };
  const setJSON = (key, value) => set(key, JSON.stringify(value));
  return { get, set, getJSON, setJSON };
})();

// Mada Care demo authentication.
// Front-end only: accounts live in this file and the session is kept in the browser.
// Replace with a real backend login before going live.
const MadaAuth = (() => {
  const USERS = [
    {
      username: "admin",
      password: "Mada@2026",
      name: { en: "Sarah Ahmed", ar: "سارة أحمد" },
      firstName: { en: "Sarah", ar: "سارة" },
      role: { en: "Administrator", ar: "مديرة النظام" },
      initials: { en: "SA", ar: "س" },
      kind: "agent", home: "dashboard.html"
    },
    {
      username: "supervisor",
      password: "Super@2026",
      name: { en: "Hanan Saleh", ar: "حنان صالح" },
      firstName: { en: "Hanan", ar: "حنان" },
      role: { en: "Supervisor", ar: "مشرفة" },
      initials: { en: "HS", ar: "ح" },
      kind: "agent", supervisor: true, home: "dashboard.html"
    },
    {
      username: "doctor",
      password: "Doctor@2026",
      name: { en: "Dr. Khalid Al-Mutairi", ar: "د. خالد المطيري" },
      firstName: { en: "Khalid", ar: "خالد" },
      role: { en: "Physician", ar: "طبيب" },
      initials: { en: "KM", ar: "خ" },
      specialty: { en: "Family Medicine", ar: "طب الأسرة" }, doctorId: "D01",
      // SAMPLE DATA ONLY: the demo doctor's staff record, shown on My Account > My Profile.
      profile: { name: { en: "Khalid Abdullah Al-Mutairi", ar: "خالد عبدالله المطيري" }, mobile: "0551234870", email: "k.almutairi@madacare.sa",
        idType: "national", idNumber: "1023456789", gender: "m", license: "13-R-0045812", empNo: "EMP-1001" },
      kind: "doctor", home: "doctor-visits.html"
    }
  ];
  const KEY = "mada-session";

  const save = value => MadaStore.set(KEY, value || null);
  const read = () => MadaStore.get(KEY);

  // Staff added on the Staff page (MadaStore "mada-staff") log in with their employee ID while their account is active.
  // The first time, they must choose a new password (the login page shows the change-password screen).
  // TODO: role-based pages and menus; until then a doctor opens the doctor portal and every other role the main system.
  const ROLE_LABEL = {
    admin: { en: "Administrator", ar: "مدير النظام" }, supervisor: { en: "Supervisor", ar: "مشرف" }, agent: { en: "Call Center Agent", ar: "موظف كول سنتر" },
    doctor: { en: "Doctor", ar: "طبيب" }, nurse: { en: "Nurse", ar: "ممرضة" }, lab: { en: "Laboratory", ar: "مختبر" }, driver: { en: "Driver", ar: "سائق" }, quality: { en: "Quality", ar: "جودة" }
  };
  function staffUsers() {
    return MadaStore.getJSON("mada-staff", []).filter(s => s.status === "active").map(s => {
      const first = n => String(n || "").trim().split(/\s+/).filter(w => !/^(dr|د)\.?$/i.test(w))[0] || "";
      return {
        username: s.id, password: s.password, staffId: s.id, photo: s.photo || null, mustChangePassword: !!s.mustChangePassword,
        name: s.name, firstName: { en: first(s.name.en), ar: first(s.name.ar) },
        role: ROLE_LABEL[s.role] || { en: s.role, ar: s.role },
        initials: { en: s.name.en.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase(), ar: first(s.name.ar).charAt(0) },
        kind: s.role === "doctor" ? "doctor" : "agent", supervisor: s.role === "supervisor", home: s.role === "doctor" ? "doctor-visits.html" : "dashboard.html",
        specialty: s.specialty ? { en: s.specialty, ar: s.specialty } : null, doctorId: s.role === "doctor" ? s.id : null,
        profile: { name: s.name, mobile: s.mobile, email: s.email, idType: s.idType, idNumber: s.idNumber, gender: s.gender, license: s.license, empNo: s.id }
      };
    });
  }
  // Passwords the built-in demo accounts changed on My Account > Security (MadaStore "mada-pw"). Demo only.
  const pwOverrides = () => MadaStore.getJSON("mada-pw", {});
  const users = () => { const o = pwOverrides(); return USERS.map(u => o[u.username] ? { ...u, password: o[u.username] } : u).concat(staffUsers()); };

  // "emp-1", "EMP001" and "EMP-001" all mean EMP-001.
  function normalize(id) {
    const v = String(id).trim(), m = v.match(/^emp-?(\d+)$/i);
    return m ? "EMP-" + m[1].padStart(3, "0") : v;
  }
  // Two entry points: the operating system (index.html) and the Doctor Portal (doctor-login.html).
  // Live, each gets its own address (e.g. doctor.madacare.sa). Returns true, false (wrong details) or "wrong-portal".
  const loginPage = u => u && u.kind === "doctor" ? "doctor-login.html" : "index.html";
  function login(username, password, portal) {
    const name = normalize(username).toLowerCase();
    const u = users().find(x => x.username.toLowerCase() === name && x.password === password);
    if (!u) return false;
    if ((portal === "doctor") !== (u.kind === "doctor")) return "wrong-portal";
    save(u.username);
    return true;
  }

  function currentUser() {
    const name = read();
    return users().find(x => x.username === name) || null;
  }

  // kind: "agent" or "doctor"; a user of the other kind is sent to their own home page.
  function requireAuth(kind) {
    const u = currentUser();
    if (!u) window.location.replace(kind === "doctor" ? "doctor-login.html" : "index.html");
    else if (u.mustChangePassword) window.location.replace(loginPage(u));
    else if (kind && u.kind !== kind) window.location.replace(u.home);
    return u;
  }
  const home = () => (currentUser() || {}).home || "index.html";

  // First login: replace the temporary password. TODO: the backend checks and stores the password.
  function changePassword(newPassword) {
    const u = currentUser();
    if (!u || !u.staffId) return false;
    const list = MadaStore.getJSON("mada-staff", []), s = list.find(x => x.id === u.staffId);
    if (!s) return false;
    s.password = newPassword; s.mustChangePassword = false; s.passwordChangedAt = new Date().toISOString();
    MadaStore.setJSON("mada-staff", list);
    return true;
  }

  // My Account > Change Password. Returns true, or "bad-current" when the current password is wrong.
  // TODO: the backend checks and stores the password (never in the browser).
  function updatePassword(currentPw, newPw) {
    const u = currentUser();
    if (!u) return false;
    if (u.password !== currentPw) return "bad-current";
    if (u.staffId) {
      const list = MadaStore.getJSON("mada-staff", []), s = list.find(x => x.id === u.staffId);
      if (!s) return false;
      s.password = newPw; s.passwordChangedAt = new Date().toISOString();
      MadaStore.setJSON("mada-staff", list);
    } else {
      MadaStore.setJSON("mada-pw", { ...pwOverrides(), [u.username]: newPw });
    }
    return true;
  }

  function logout() {
    const page = loginPage(currentUser());
    save(null);
    window.location.replace(page);
  }

  return { login, currentUser, requireAuth, changePassword, updatePassword, logout, home };
})();
