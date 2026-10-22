// Shared database (Supabase): the Project URL and the "anon public" key from Supabase > Project Settings > API.
// Empty = this browser only (as before). Never put the service_role key here: these files are public.
const MADA_CLOUD = { url: "https://mfkiivwcxmqykpobunpn.supabase.co", key: "sb_publishable_jExWWxO-hv5PcALjkBn6RA_vZuico0F" };

// Mada Care storage. Every page reads and writes through MadaStore.
// Locally it uses localStorage, and also mirrors values into window.name because some previews block
// browser storage; window.name survives page navigation within the same tab.
// With MADA_CLOUD set, the shared values also live in Supabase (table mada_data, see notes/supabase-setup.sql):
//  - each page load reads the latest copy before the page script runs, so every page starts from the shared data;
//  - every save is sent to Supabase (queued and retried when offline);
//  - changes made on other devices arrive live and are given to the page as a "storage" event, which the pages already
//    listen to for their live updates.
// Lists of records (requests, bookings, medical requests, patients, staff, ...) are kept one row per record, so two people
// saving different records at the same time never overwrite each other.
const MadaStore = (() => {
  const PREFIX = "mada:";
  function bag() {
    try { return window.name.startsWith(PREFIX) ? JSON.parse(window.name.slice(PREFIX.length)) : {}; } catch (e) { return {}; }
  }
  function lget(key) {
    try { const v = localStorage.getItem(key); if (v != null) return v; } catch (e) {}
    const b = bag(); return key in b ? b[key] : null;
  }
  function lset(key, value) {
    // If localStorage is full (e.g. visit photos), drop its stale copy so reads fall back to window.name.
    try { value == null ? localStorage.removeItem(key) : localStorage.setItem(key, value); } catch (e) { try { localStorage.removeItem(key); } catch (e2) {} }
    const b = bag();
    if (value == null) delete b[key]; else b[key] = String(value);
    window.name = PREFIX + JSON.stringify(b);
  }
  const get = key => { const v = lget(key); cloud.read(key, v); return v; };
  const set = (key, value) => cloud.on && cloud.shared(key) ? cloud.write(key, value) : lset(key, value);
  const getJSON = (key, fallback) => { try { const v = get(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; } };
  const setJSON = (key, value) => set(key, JSON.stringify(value));

  // ---------- Supabase link ----------
  const cloud = (() => {
    const C = (typeof MADA_CLOUD !== "undefined" && MADA_CLOUD) || {}, on = !!(C.url && C.key);
    const api = String(C.url || "").replace(/\/+$/, "") + "/rest/v1/mada_data";
    // A legacy "anon" key (a JWT) also goes in Authorization; a new "publishable" key (sb_publishable_...) goes in apikey only.
    const hdr = { apikey: C.key, "Content-Type": "application/json", ...(String(C.key).split(".").length === 3 ? { Authorization: "Bearer " + C.key } : {}) };
    // Kept on this device only: the login, language and menu choices, and the demo bookkeeping.
    const LOCAL = /^mada-(session|lang|pay-lang|admin-nav|bk-cols|dr-tips-off-.+|orders-.+-v\d+|dr-demo-.+|lab-demo-.+|dr-orders-demo-.+|dr-report-demo-.+|dr-family-demo|cloud-.+)$/;
    // Lists kept one row per record: key -> the record's id field.
    const LIST = { "mada-orders": "id", "mada-medical": "id", "mada-staff": "id", "mada-patients": "fileNo", "mada-requests": "id", "mada-internal-bookings": "id", "mada-support": "ref", "mada-providers": "id" };
    const QKEY = "mada-cloud-queue", rows = new Map(), lastRead = {}, status = { on, ready: false, offline: false, pending: 0, error: null };
    const rk = (k, rid) => k + "\u0001" + rid;
    const shared = k => /^mada-/.test(k) && !LOCAL.test(k);
    const idOf = (k, x) => x && typeof x === "object" && x[LIST[k]] != null ? String(x[LIST[k]]) : null;
    let queue = []; try { queue = JSON.parse(localStorage.getItem(QKEY) || "[]"); } catch (e) {}
    const saveQueue = () => { status.pending = queue.length; try { localStorage.setItem(QKEY, JSON.stringify(queue)); } catch (e) {} };

    // The value of one key, built from its rows (a list in saved order, or the single value).
    function valueOf(k) {
      if (LIST[k]) {
        const list = [...rows.values()].filter(r => r.k === k && r.rid !== "").sort((a, b) => a.pos - b.pos || (a.rid < b.rid ? -1 : 1));
        const whole = rows.get(rk(k, ""));
        if (!list.length) return whole ? whole.v : null;
        return "[" + list.map(r => r.v).join(",") + "]";
      }
      const r = rows.get(rk(k, "")); return r ? r.v : null;
    }
    const keys = () => [...new Set([...rows.values()].map(r => r.k))];
    function put(op) {
      if (op.del) rows.delete(rk(op.k, op.rid)); else rows.set(rk(op.k, op.rid), { k: op.k, rid: op.rid, v: op.v, pos: op.pos || 0 });
    }

    // Page start: read every shared row (synchronously, so the page script sees the shared data), then re-apply this
    // device's unsent saves on top.
    function boot() {
      if (!on) return;
      const got = [];
      try {
        for (let from = 0; ; from += 1000) {
          const x = new XMLHttpRequest();
          x.open("GET", api + "?select=k,rid,v,pos&order=k.asc,pos.asc", false);
          Object.entries(hdr).forEach(([h, v]) => x.setRequestHeader(h, v));
          x.setRequestHeader("Range-Unit", "items"); x.setRequestHeader("Range", from + "-" + (from + 999));
          x.send();
          if (x.status < 200 || x.status >= 300) throw new Error("HTTP " + x.status + " " + x.responseText.slice(0, 200));
          const page = JSON.parse(x.responseText || "[]"); got.push(...page);
          if (page.length < 1000) break;
        }
      } catch (e) { status.offline = true; status.error = String(e.message || e); console.warn("Mada Care: shared database not reachable, using this device's copy.", e); return; }
      got.forEach(r => rows.set(rk(r.k, r.rid), { k: r.k, rid: r.rid, v: r.v, pos: Number(r.pos) || 0 }));
      queue.forEach(put);
      // Local copies follow the shared copy: keys removed elsewhere are removed here too.
      const remote = new Set(keys());
      let local = []; try { for (let i = 0; i < localStorage.length; i++) local.push(localStorage.key(i)); } catch (e) {}
      try { local = local.concat(Object.keys(bag())); } catch (e) {}
      [...new Set(local)].filter(k => k && shared(k) && !remote.has(k)).forEach(k => lset(k, null));
      remote.forEach(k => { const v = valueOf(k); if (lget(k) !== v) lset(k, v); });
      status.ready = true;
    }

    // Remember which records the page last saw, so a save only removes records the page knew about
    // (a record another device added in the meantime is kept).
    const lastRaw = {};
    function read(k, v) {
      if (!on || !LIST[k] || v == null || lastRaw[k] === v) return;
      lastRaw[k] = v;
      try { const a = JSON.parse(v); if (Array.isArray(a)) lastRead[k] = new Set(a.map(x => idOf(k, x)).filter(Boolean)); } catch (e) {}
    }
    function write(k, value) {
      delete lastRaw[k];
      const ops = [];
      let arr = null;
      if (LIST[k] && value != null) { try { arr = JSON.parse(value); } catch (e) {} }
      if (Array.isArray(arr) && arr.every(x => idOf(k, x) != null)) {
        const cur = new Map([...rows.values()].filter(r => r.k === k && r.rid !== "").map(r => [r.rid, r]));
        let max = Math.max(0, ...[...cur.values()].map(r => r.pos)), seen = new Set();
        arr.forEach(x => { const id = idOf(k, x), v = JSON.stringify(x), r = cur.get(id); seen.add(id);
          if (!r) ops.push({ k, rid: id, v, pos: ++max, isNew: true }); else if (r.v !== v) ops.push({ k, rid: id, v, pos: r.pos }); });
        const knew = lastRead[k] || new Set();
        cur.forEach((r, id) => { if (!seen.has(id) && knew.has(id)) ops.push({ k, rid: id, del: true }); });
        if (rows.has(rk(k, ""))) ops.push({ k, rid: "", del: true });
        lastRead[k] = seen;
      } else {
        // A single value (settings, counters, files, ...), or an empty list.
        if (LIST[k] && Array.isArray(arr) && !arr.length) {
          const knew = lastRead[k] || new Set();
          rows.forEach(r => { if (r.k === k && r.rid !== "" && knew.has(r.rid)) ops.push({ k, rid: r.rid, del: true }); });
        }
        ops.push(value == null ? { k, rid: "", del: true } : { k, rid: "", v: String(value), pos: 0 });
      }
      ops.forEach(put);
      lset(k, valueOf(k));
      if (ops.length) { queue.push(...ops); saveQueue(); flush(); }
    }

    // Sends queued saves in order; stops at the first failure and tries again later.
    let busy = false, timer = null;
    async function flush() {
      if (!on || busy || !queue.length) return;
      busy = true;
      try {
        while (queue.length) {
          const op = queue[0], q = "?k=eq." + encodeURIComponent(op.k) + "&rid=eq." + encodeURIComponent(op.rid);
          // A new record is only added, never written over: if another device already used the same number, it gets the next free one.
          const res = op.del ? await fetch(api + q, { method: "DELETE", headers: hdr, keepalive: true })
            : await fetch(api, { method: "POST", headers: { ...hdr, Prefer: (op.isNew ? "" : "resolution=merge-duplicates,") + "return=minimal" }, keepalive: op.v.length < 60000,
                body: JSON.stringify({ k: op.k, rid: op.rid, v: op.v, pos: op.pos || 0 }) });
          if (res.status === 409 && op.isNew) { await renumber(op); continue; }
          if (!res.ok) throw new Error("HTTP " + res.status + " " + (await res.text()).slice(0, 200));
          queue.shift(); saveQueue(); status.offline = false; status.error = null;
        }
      } catch (e) { status.offline = true; status.error = String(e.message || e); clearTimeout(timer); timer = setTimeout(flush, 8000); }
      finally { busy = false; }
    }

    // Two devices created a record with the same number at the same moment: keep theirs, give ours the next free number
    // (same prefix and width, e.g. ORD-1001 -> ORD-1002) and tell the page.
    async function renumber(op) {
      try {
        const res = await fetch(api + "?select=k,rid,v,pos&k=eq." + encodeURIComponent(op.k), { headers: hdr });
        if (res.ok) (await res.json()).forEach(r => rows.set(rk(r.k, r.rid), { k: r.k, rid: r.rid, v: r.v, pos: Number(r.pos) || 0 }));
      } catch (e) {}
      const m = String(op.rid).match(/^(.*?)(\d+)$/), used = new Set([...rows.values()].filter(r => r.k === op.k).map(r => r.rid));
      let id = op.rid + "-2";
      if (m) { let n = parseInt(m[2], 10); do { id = m[1] + String(++n).padStart(m[2].length, "0"); } while (used.has(id)); }
      const obj = JSON.parse(op.v); obj[LIST[op.k]] = id;
      const nv = JSON.stringify(obj), mine = { k: op.k, rid: id, v: nv, pos: Math.max(0, ...[...rows.values()].filter(r => r.k === op.k).map(r => r.pos)) + 1 };
      rows.set(rk(op.k, id), mine);
      queue.forEach((q, i) => { if (q.k === op.k && q.rid === op.rid) {
        if (i === 0) queue[0] = { ...mine, isNew: true };
        else if (!q.del) { const o = JSON.parse(q.v); o[LIST[q.k]] = id; queue[i] = { ...q, rid: id, v: JSON.stringify(o) }; } else queue[i] = { ...q, rid: id }; } });
      if (lastRead[op.k]) { lastRead[op.k].delete(op.rid); lastRead[op.k].add(id); }
      saveQueue();
      const v = valueOf(op.k); lset(op.k, v);
      console.warn("Mada Care: " + op.rid + " was already used on another device; saved as " + id + ".");
      try { window.dispatchEvent(new StorageEvent("storage", { key: op.k, newValue: v })); } catch (e) {}
    }

    // A change that arrived from another device: update the copy and tell the page.
    function apply(op) {
      const before = valueOf(op.k);
      put(op);
      const v = valueOf(op.k);
      if (v === before && lget(op.k) === v) return;
      lset(op.k, v);
      try { window.dispatchEvent(new StorageEvent("storage", { key: op.k, newValue: v })); } catch (e) {}
    }
    // Live updates (Supabase Realtime, supabase-js from the CDN). When the tab comes back to the front, everything is
    // read again in case an update was missed.
    function live() {
      if (!on) return;
      const sc = document.createElement("script");
      sc.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js";
      sc.onload = () => {
        try {
          const sb = window.supabase.createClient(C.url, C.key, { auth: { persistSession: false } });
          sb.channel("mada-data").on("postgres_changes", { event: "*", schema: "public", table: "mada_data" }, p => {
            if (p.eventType === "DELETE") { const o = p.old || {}; if (o.k != null) apply({ k: o.k, rid: o.rid || "", del: true }); }
            else { const n = p.new || {}; if (queue.some(q => q.k === n.k && q.rid === n.rid)) return; apply({ k: n.k, rid: n.rid, v: n.v, pos: Number(n.pos) || 0 }); }
          }).subscribe();
        } catch (e) { console.warn("Mada Care: live updates are off.", e); }
      };
      document.head.appendChild(sc);
      document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") refresh(); });
      addEventListener("online", flush);
    }
    async function refresh() {
      try {
        const got = [];
        for (let from = 0; ; from += 1000) {
          const res = await fetch(api + "?select=k,rid,v,pos&order=k.asc,pos.asc", { headers: { ...hdr, "Range-Unit": "items", Range: from + "-" + (from + 999) } });
          if (!res.ok) return;
          const page = await res.json(); got.push(...page); if (page.length < 1000) break;
        }
        const fresh = new Map(got.map(r => [rk(r.k, r.rid), r])), touched = new Set();
        rows.forEach((r, key) => { if (!fresh.has(key) && !queue.some(q => rk(q.k, q.rid) === key)) { rows.delete(key); touched.add(r.k); } });
        fresh.forEach((r, key) => { const c = rows.get(key); if ((!c || c.v !== r.v || c.pos !== Number(r.pos)) && !queue.some(q => rk(q.k, q.rid) === key)) { rows.set(key, { k: r.k, rid: r.rid, v: r.v, pos: Number(r.pos) || 0 }); touched.add(r.k); } });
        touched.forEach(k => { const v = valueOf(k); if (lget(k) !== v) { lset(k, v); try { window.dispatchEvent(new StorageEvent("storage", { key: k, newValue: v })); } catch (e) {} } });
      } catch (e) {}
    }
    return { on, shared, read, write, boot, live, flush, status };
  })();
  // Sample data switch. false = the system starts clean for real data: no sample requests, bookings, patients, visits,
  // staff, nurses, drivers or demo doctor account are created, and the demo buttons ("Demo: ...") are hidden.
  // Set to true only to bring the demo back (it is created again on the next page load).
  const SAMPLES = false;
  cloud.boot(); cloud.live(); cloud.flush();
  return { get, set, getJSON, setJSON, SAMPLES, cloud: cloud.status };
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
      kind: "agent", roleKey: "admin", home: "dashboard.html"
    },
    {
      username: "supervisor",
      password: "Super@2026",
      name: { en: "Hanan Saleh", ar: "حنان صالح" },
      firstName: { en: "Hanan", ar: "حنان" },
      role: { en: "Supervisor", ar: "مشرفة" },
      initials: { en: "HS", ar: "ح" },
      kind: "agent", supervisor: true, roleKey: "supervisor", home: "dashboard.html"
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
    gm: { en: "General Manager", ar: "مدير عام" }, admin: { en: "Administrator", ar: "مدير النظام" }, ops: { en: "Operations Manager", ar: "مدير تشغيل" },
    supervisor: { en: "Sales & Call Center Supervisor", ar: "مشرف مبيعات وكول سنتر" }, agent: { en: "Call Center Agent", ar: "موظف كول سنتر" },
    doctor: { en: "Doctor", ar: "طبيب" }, nurse: { en: "Nurse", ar: "ممرضة" }, physio: { en: "Physiotherapist", ar: "أخصائي علاج طبيعي" }, lab: { en: "Laboratory", ar: "مختبر" }, driver: { en: "Driver", ar: "سائق" }, quality: { en: "Quality", ar: "جودة" }
  };
  // Roles with their own portal (login page and home); every other role uses the operating system (index.html).
  const PORTAL = { doctor: { login: "doctor-login.html", home: "doctor-visits.html" }, nurse: { login: "nurse-login.html", home: "nurse-visits.html" },
    physio: { login: "physio-login.html", home: "physio-visits.html" } };
  function staffUsers() {
    return MadaStore.getJSON("mada-staff", []).filter(s => s.status === "active").map(s => {
      const first = n => String(n || "").trim().split(/\s+/).filter(w => !/^(dr|د)\.?$/i.test(w))[0] || "";
      return {
        username: s.id, password: s.password, staffId: s.id, roleKey: s.role, photo: s.photo || null, mustChangePassword: !!s.mustChangePassword,
        name: s.name, firstName: { en: first(s.name.en), ar: first(s.name.ar) },
        role: ROLE_LABEL[s.role] || { en: s.role, ar: s.role },
        initials: { en: s.name.en.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase(), ar: first(s.name.ar).charAt(0) },
        kind: PORTAL[s.role] ? s.role : "agent", supervisor: ["supervisor", "gm", "admin", "ops"].includes(s.role), home: PORTAL[s.role] ? PORTAL[s.role].home : "dashboard.html",
        specialty: s.specialty ? { en: s.specialty, ar: s.specialty } : null, doctorId: s.role === "doctor" ? s.id : null, nurseId: s.role === "nurse" ? s.id : null, physioId: s.role === "physio" ? s.id : null,
        profile: { name: s.name, mobile: s.mobile, email: s.email, idType: s.idType, idNumber: s.idNumber, gender: s.gender, license: s.license, empNo: s.id }
      };
    });
  }
  // Passwords the built-in demo accounts changed on My Account > Security (MadaStore "mada-pw"). Demo only.
  const pwOverrides = () => MadaStore.getJSON("mada-pw", {});
  // The demo doctor account (doctor / D01) only exists with the sample data; real doctors log in with their employee ID.
  const users = () => { const o = pwOverrides(); return USERS.filter(u => MadaStore.SAMPLES || u.username !== "doctor").map(u => o[u.username] ? { ...u, password: o[u.username] } : u).concat(staffUsers()); };

  // "emp-1", "EMP001" and "EMP-001" all mean EMP-001.
  function normalize(id) {
    const v = String(id).trim(), m = v.match(/^emp-?(\d+)$/i);
    return m ? "EMP-" + m[1].padStart(3, "0") : v;
  }
  // Entry points: the operating system (index.html), the Doctor Portal (doctor-login.html) and the Nursing Portal (nurse-login.html).
  // Live, each gets its own address (e.g. doctor.madacare.sa). Returns true, false (wrong details) or "wrong-portal".
  const loginPage = u => u && PORTAL[u.kind] ? PORTAL[u.kind].login : "index.html";
  function login(username, password, portal) {
    const name = normalize(username).toLowerCase();
    const u = users().find(x => x.username.toLowerCase() === name && x.password === password);
    if (!u) return false;
    if ((portal || "agent") !== u.kind) return "wrong-portal";
    save(u.username);
    return true;
  }

  // The login page of the account with this ID (any password), so a login page can point to the right portal.
  const portalOf = username => { const n = normalize(username).toLowerCase(), u = users().find(x => x.username.toLowerCase() === n); return u ? loginPage(u) : null; };

  function currentUser() {
    const name = read();
    return users().find(x => x.username === name) || null;
  }

  // kind: "agent", "doctor", "nurse" or "physio"; a user of the other kind is sent to their own home page.
  function requireAuth(kind) {
    const u = currentUser();
    if (!u) window.location.replace(PORTAL[kind] ? PORTAL[kind].login : "index.html");
    else if (u.mustChangePassword) window.location.replace(loginPage(u));
    else if (kind && u.kind !== kind) window.location.replace(u.home);
    return u;
  }
  // Operating-system staff start on the first page their permissions allow (MadaPerms below).
  const home = () => { const u = currentUser(); if (!u) return "index.html"; return u.kind === "agent" && typeof MadaPerms !== "undefined" ? MadaPerms.homeOf(u) : u.home; };

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

  return { login, portalOf, currentUser, requireAuth, changePassword, updatePassword, logout, home };
})();

// Permissions of the operating system (dashboard pages), per staff member.
// Each role starts with a set of sections (DEFAULTS); the Staff profile's Permissions tab can change them for one person
// (staff.perms: [section] | null = the role's set). admin-nav.js hides the menu links and blocks the pages a person can't open.
// FRONT-END ONLY: anyone can change what the browser shows. The real check must be on the backend (Supabase Auth + row rules)
// before real patient data goes in.
const MadaPerms = (() => {
  const SECTIONS = [
    { k: "dashboard", pages: ["dashboard.html"] },
    { k: "newRequest", pages: ["new-request.html"] },
    { k: "requests", pages: ["requests.html", "request-details.html"] },
    { k: "bookings", pages: ["bookings.html", "booking-schedule.html"] },
    { k: "patients", pages: ["patients.html", "patient.html"] },
    { k: "medical", pages: ["medical-requests.html", "medical-request.html", "followup-orders.html"] },
    { k: "results", pages: ["lab-results.html", "lab-test.html", "xray-results.html"] },
    { k: "physio", pages: ["physio-requests.html"] },
    { k: "invoices", pages: ["invoices.html"] },
    { k: "coupons", pages: ["coupons.html"] },
    { k: "services", pages: ["services.html", "services-lab.html", "services-nurse.html", "services-physio.html", "services-iv.html", "services-rad.html"] },
    { k: "providers", pages: ["providers.html", "coverage.html"] },
    { k: "clinical", pages: ["diagnoses.html", "medications.html"] },
    { k: "quality", pages: ["quality.html"] },
    { k: "staff", pages: ["staff.html", "staff-add.html", "staff-profile.html", "doctor-stamps.html"] },
    { k: "policies", pages: ["policies.html"] }
  ];
  const ALL = SECTIONS.map(x => x.k);
  const DEFAULTS = {
    gm: ALL, admin: ALL,
    ops: ALL.filter(k => !["staff", "policies"].includes(k)),
    supervisor: ["dashboard", "newRequest", "requests", "bookings", "patients", "medical", "physio", "invoices", "coupons"],
    agent: ["dashboard", "newRequest", "requests", "bookings", "patients"],
    quality: ["dashboard", "requests", "patients", "results", "quality"],
    lab: ["dashboard", "medical", "results"],
    driver: ["dashboard", "bookings"]
  };
  const sectionOf = page => (SECTIONS.find(x => x.pages.includes(page)) || {}).k || null;
  const staffRec = id => id ? MadaStore.getJSON("mada-staff", []).find(x => x.id === id) || null : null;
  // The sections this user may open.
  function of(u) {
    if (!u) return [];
    const rec = staffRec(u.staffId), role = (rec && rec.role) || u.roleKey || "agent";
    if (rec && Array.isArray(rec.perms)) return rec.perms.filter(k => ALL.includes(k));
    return (DEFAULTS[role] || DEFAULTS.agent).slice();
  }
  const canSection = (u, k) => of(u).includes(k);
  // A page that is not in any section (e.g. a new page) stays open.
  const canPage = (u, page) => { const k = sectionOf(page); return !k || canSection(u, k); };
  function homeOf(u) {
    const list = of(u), first = SECTIONS.find(x => list.includes(x.k));
    return !list.includes("dashboard") && first ? first.pages[0] : "dashboard.html";
  }
  return { SECTIONS, ALL, DEFAULTS, sectionOf, of, canSection, canPage, homeOf };
})();
