// Mada Care critical results and alerts (Doctor Portal > Critical Results, doctor-alerts.html).
// Every lab result set (medical.js item, type "lab") with a high or critical value becomes an alert for the ordering doctor
// as soon as the results are entered (step "resulted"), before the doctor approves them. Critical includes critically low values.
// The alert itself is built from the result; what the doctor does with it is kept in MadaStore "mada-critical-alerts" by key "MR-7001:IT-1":
// { status: "new" | "progress" | "closed", seenAt, need: "yes" | "no", noNote,
//   assessment, action, contact: { method: "phone" | "visit" | "message", reached: "yes" | "no", at, note },
//   escalation: { need: "yes" | "no", to, note }, followUp: { date, plan }, closure: { note, at, by }, updatedAt, updatedBy }
// Needs medical.js. TODO: the lab system should push these alerts (and SMS the doctor for critical values); keep the handling log on the server.
const MadaAlerts = (() => {
  const KEY = "mada-critical-alerts";
  const ALERT = ["critical", "high"];
  const recs = () => MadaStore.getJSON(KEY, {});
  // Alerts for one doctor, newest result first.
  function list(doctorId) {
    const s = recs(), out = [];
    MadaStore.getJSON("mada-medical", []).filter(r => r.doctorId === doctorId).forEach(r => (r.items || []).forEach(it => {
      if (it.type !== "lab" || !it.results || it.step < MadaMedical.STEPS.lab.indexOf("resulted")) return;
      const rows = MadaMedical.analytesOf(it).map(a => ({ a, v: it.results[a.code], s: MadaMedical.labStatus(a, it.results[a.code]) })).filter(x => ALERT.includes(x.s));
      if (!rows.length) return;
      const res = it.log.find(l => MadaMedical.STEPS.lab[l.step] === "resulted"), key = r.id + ":" + it.id, rec = s[key] || {};
      out.push({ key, r, it, rows, at: res ? res.at : r.createdAt, critical: rows.some(x => x.s === "critical"), rec, status: rec.status || "new" });
    }));
    return out.sort((a, b) => String(b.at).localeCompare(String(a.at)));
  }
  const get = (doctorId, key) => list(doctorId).find(x => x.key === key) || null;
  const open = doctorId => list(doctorId).filter(x => x.status !== "closed");
  function save(key, patch, by) {
    const s = recs(), rec = { ...(s[key] || {}), ...patch, updatedAt: new Date().toISOString(), updatedBy: by || null };
    s[key] = rec; MadaStore.setJSON(KEY, s);
    if (JSON.stringify(recs()[key]) !== JSON.stringify(rec)) throw new Error("not saved");
    return rec;
  }
  // Opening an alert marks it seen, so the bell stops counting it.
  const seen = (key, by) => { const r = recs()[key]; if (r && r.seenAt) return; try { save(key, { seenAt: new Date().toISOString(), status: (r && r.status) || "progress" }, by); } catch (e) {} };
  return { KEY, list, get, open, save, seen };
})();
