// Mada Care patients.
// Two sources for the demo:
//  - FILES: SAMPLE DATA ONLY, invented records so the mobile-number lookup in the wizard can be tried.
//  - the patient directory (MadaStore "mada-patients"): starts empty; a patient is added from the Patients page,
//    or when a request is saved in the wizard (new file, or an existing sample file that is used for the first time).
// patient: { fileNo: "MC-2026-001", mobile, name (string or {en, ar}), gender: "m" | "f" | null, dateOfBirth: "YYYY-MM-DD" | null,
//            approxAge, idType, idNumber, nationality, address: { city, district, ... }, source: "wizard" | "manual", createdAt, createdBy }
// Replace with calls to the real patients API.
const MadaPatients = (() => {
  const KEY = "mada-patients";
  const FILES = !MadaStore.SAMPLES ? [] : [
    { fileNo: "MC-2025-147", mobile: "0551234567", name: { en: "Mohammed Saad Al-Qahtani", ar: "محمد سعد القحطاني" }, gender: "m", age: 64, lastVisit: "2026-09-28" },
    { fileNo: "MC-2025-148", mobile: "0551234567", name: { en: "Noura Fahad Al-Qahtani", ar: "نورة فهد القحطاني" }, gender: "f", age: 59, lastVisit: "2026-08-14" },
    { fileNo: "MC-2026-004", mobile: "0509876543", name: { en: "Abdullah Nasser Al-Harbi", ar: "عبدالله ناصر الحربي" }, gender: "m", age: 71, lastVisit: "2026-10-02" },
    { fileNo: "MC-2026-011", mobile: "0533332211", name: { en: "Fatimah Ali Al-Zahrani", ar: "فاطمة علي الزهراني" }, gender: "f", age: 45, lastVisit: null }
  ];

  const all = () => MadaStore.getJSON(KEY, []);
  const save = list => MadaStore.setJSON(KEY, list);
  const get = fileNo => all().find(p => p.fileNo === fileNo) || null;

  // Wizard lookup: directory patients first, then the sample files not yet in the directory.
  function findByMobile(mobile) {
    const mine = all().filter(p => p.mobile === mobile).map(p => ({ ...p, name: typeof p.name === "string" ? { en: p.name, ar: p.name } : p.name,
      age: p.dateOfBirth ? ageOf(p.dateOfBirth) : p.approxAge, lastVisit: p.lastVisit || null }));
    return mine.concat(FILES.filter(f => f.mobile === mobile && !mine.some(p => p.fileNo === f.fileNo)));
  }

  // Highest sequence already used this year (so new numbers continue after it).
  function lastSeq(year) {
    return FILES.concat(all()).filter(f => f.fileNo.startsWith("MC-" + year + "-")).reduce((m, f) => Math.max(m, parseInt(f.fileNo.split("-")[2], 10)), 0);
  }
  // Medical record number: MC-YEAR-SEQ (e.g. MC-2026-001). The sequence restarts at 001 every year.
  // Demo: counted in this browser; the backend should issue it so numbers are never repeated.
  function nextFileNo() {
    const year = new Date().getFullYear(), key = "mada-mrn-" + year;
    const seq = Math.max(lastSeq(year), parseInt(MadaStore.get(key), 10) || 0) + 1;
    MadaStore.set(key, seq);
    return `MC-${year}-${String(seq).padStart(3, "0")}`;
  }

  // Add a patient, or update the one with the same file number (empty values never overwrite saved ones).
  function upsert(p) {
    const list = all(), i = list.findIndex(x => x.fileNo === p.fileNo), now = new Date().toISOString();
    if (i < 0) list.push({ ...p, createdAt: p.createdAt || now });
    else list[i] = { ...list[i], ...Object.fromEntries(Object.entries(p).filter(([, v]) => v != null && v !== "")), updatedAt: now };
    save(list);
    return i < 0 ? list[list.length - 1] : list[i];
  }
  const sample = fileNo => FILES.find(f => f.fileNo === fileNo) || null;

  function ageOf(ymd) {
    const [y, m, d] = ymd.split("-").map(Number), now = new Date();
    return now.getFullYear() - y - (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d) ? 1 : 0);
  }

  return { all, get, findByMobile, lastSeq, nextFileNo, upsert, sample, ageOf };
})();
