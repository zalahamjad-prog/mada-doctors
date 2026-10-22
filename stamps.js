// Mada Care doctor stamps (MadaStore "mada-doctor-stamps"): one stamp image per doctor, added on doctor-stamps.html (admin).
// The medical report shows the stamp of the visit's doctor as soon as it is saved here.
// stamp: { data (PNG or JPEG data URL), name (original file name, or "generated"), at, by }
//   Made by the system on doctor-stamps.html: also generated: true, fields { nameEn, nameAr, specEn, specAr, facility, emp, reg } and approvedBy.
// Replace with the real staff API; the backend should keep the stamp with the doctor's record.
const MadaStamps = (() => {
  const KEY = "mada-doctor-stamps";
  const all = () => MadaStore.getJSON(KEY, {});
  const get = id => (id && all()[id]) || null;
  function set(id, rec) {
    const list = all(); list[id] = { ...rec, at: new Date().toISOString() };
    MadaStore.setJSON(KEY, list);
    if (!(MadaStore.getJSON(KEY, {})[id] || {}).data) throw new Error("not saved");
    return list[id];
  }
  function remove(id) { const list = all(); delete list[id]; MadaStore.setJSON(KEY, list); }
  // Doctors who can have a stamp: MadaOrders.DOCTORS (the sample doctors and doctors added on the Staff page).
  const doctors = () => MadaOrders.DOCTORS.map(d => ({ id: d.id, name: d.name, spec: d.spec, active: d.active !== false }));
  return { KEY, all, get, set, remove, doctors };
})();
