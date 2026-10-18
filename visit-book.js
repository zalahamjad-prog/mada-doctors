// Booking a visit for a service the doctor ordered (medical.js request items): the operations team calls the patient, books a time and
// assigns a nurse or doctor. Used by Medical Requests (medical-request.html) and Doctor Orders (followup-orders.html).
// Nursing, IV, physiotherapy and doctor visits move to step "booked" with { date, time, nurseId | doctorId, provider, note, visitId, bookingId, payWhen }.
// Lab tests the doctor added after a visit stay at "ordered" until the sample is collected; the booking is kept on item.visit.
// The visit is a MadaOrders booking (MadaOrders.book), paid after the service unless the patient already paid for it in the doctor's visit.
// Needs medical.js, orders.js, nurses.js and doctor-orders.js.
const MadaVisitBook = (() => {
  const TYPES = ["doctor", "nursing", "physio", "iv"];
  const canBook = it => TYPES.includes(it.type) || (it.type === "lab" && !!it.addedBy);
  const nurse = id => (MadaNurses.NURSES || []).find(n => n.id === id);
  const doctor = id => (MadaOrders.DOCTORS || []).find(d => d.id === id);
  const assignee = o => { const b = (o && o.booking) || {}; return ((b.nurseId ? nurse(b.nurseId) : doctor(b.doctorId)) || {}).name || null; };
  // The booked visit of an item, or null.
  const visitOf = it => {
    if (it.visit && it.visit.visitId) return MadaOrders.get(it.visit.visitId);
    const l = [...(it.log || [])].reverse().find(x => x.data && x.data.visitId); return l ? MadaOrders.get(l.data.visitId) : null;
  };
  const visitDone = o => !!o && (o.status === "completed" || (o.nurseVisit && o.nurseVisit.status === "done") || (o.doctorVisit && o.doctorVisit.status === "done"));
  // d: { date "YYYY-MM-DD", time "HH:MM", nurseId | doctorId, note }. Returns the new visit (MadaOrders order).
  function book(r, it, d, by, lg) {
    const src = MadaOrders.get(r.orderId) || {}, [h, m] = d.time.split(":").map(Number), x = it.order || {}, lab = it.type === "lab";
    const kind = it.type === "iv" ? "iv" : "nursing";
    const price = lab ? Number(x.price || (it.orderCodes || []).reduce((a, c) => a + Number((DrOrders.item(c) || {}).price || 0), 0)) : Number(x.price || 0);
    const paid = !it.addedBy && src.doctorVisit && typeof DrOrders !== "undefined" && DrOrders.payState(src, lg || "en").status === "paid";
    const who = d.nurseId ? nurse(d.nurseId) : doctor(d.doctorId), provider = who ? who.name.en || who.name.ar : (d.nurseId || d.doctorId);
    const o = MadaOrders.book({ service: lab ? "blood" : it.type === "doctor" ? "doctor" : it.type === "iv" ? "iv" : "nursing", mrn: r.mrn, patient: r.patient, mobile: r.mobile,
      location: src.location, address: src.address, items: lab ? (it.tests || []).map(c => ({ kind: "test", code: c })) : x.code && it.type !== "doctor" ? [{ kind, code: x.code }] : [], total: price || null,
      appointment: { date: d.date, minute: h * 60 + (m || 0), nurse: d.nurseId && who ? who.name : null }, payment: paid ? "paid" : "unpaid", payWhen: paid ? null : "after",
      booking: { nurseId: d.nurseId || null, doctorId: d.doctorId || null, by, at: new Date().toISOString() }, staff: by, title: it.title, fromMr: { id: r.id, itemId: it.id } });
    const data = { date: d.date, time: d.time, nurseId: d.nurseId || null, doctorId: d.doctorId || null, provider, note: d.note || null, visitId: o.id, bookingId: o.bookingId, payWhen: o.payWhen || null };
    if (lab) MadaMedical.patchItem(r.id, it.id, { visit: { ...data, by, at: new Date().toISOString() } });
    else MadaMedical.advance(r.id, it.id, by, Object.fromEntries(Object.entries(data).filter(([, v]) => v != null)));
    return o;
  }
  // A booked service is delivered when its visit is finished in the nurse's or doctor's app. Returns true when something changed.
  function sync(r, note) {
    let ch = false;
    r.items.forEach(it => { if (!TYPES.includes(it.type) || MadaMedical.isDone(it) || MadaMedical.STEPS[it.type][MadaMedical.nextIdx(it)] !== "done") return;
      const o = visitOf(it); if (!visitDone(o)) return;
      MadaMedical.advance(r.id, it.id, assignee(o), { note }); ch = true; });
    return ch;
  }
  return { TYPES, canBook, visitOf, visitDone, assignee, book, sync };
})();
