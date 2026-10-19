// Booking a visit for a service the doctor ordered (medical.js request items): the operations team calls the patient, books a time and
// assigns a nurse or doctor. Used by Medical Requests (medical-request.html) and Doctor Orders (followup-orders.html).
// Nursing, IV, physiotherapy and doctor visits move to step "booked" with { date, time, nurseId | doctorId, provider, note, visitId, bookingId, payWhen }.
// Lab tests the doctor added after a visit stay at "ordered" until the sample is collected; the booking is kept on item.visit.
// The visit is a MadaOrders booking (MadaOrders.book), paid after the service unless the patient already paid for it in the doctor's visit.
// The visit is an internal booking (DBK-, orders.js) that stays unpaid until the patient pays by the link (pay.html, now or before the visit)
// or the nurse or doctor takes the payment at the visit; the visit can't be closed while it is unpaid.
// The time is picked from the provider's free slots (schedule.js work hours and bookings) when schedule.js is loaded.
// Needs medical.js, orders.js, nurses.js and doctor-orders.js (optional: staff.js + schedule.js for the slots).
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
    const who = d.nurseId ? (nurse(d.nurseId) || people().find(p => p.id === d.nurseId)) : (doctor(d.doctorId) || people().find(p => p.id === d.doctorId)), provider = who ? who.name.en || who.name.ar : (d.nurseId || d.doctorId);
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
  // ---------- Provider and free slots ----------
  const SCH = () => typeof MadaSchedule !== "undefined" && typeof MadaStaff !== "undefined";
  // Doctors and nurses who can take the visit: { id, role: "nurse" | "doctor", name }.
  function people() {
    if (SCH()) return MadaSchedule.people().filter(p => p.active);
    return (MadaNurses.NURSES || []).map(n => ({ id: n.id, role: "nurse", name: n.name })).concat((MadaOrders.DOCTORS || []).map(d => ({ id: d.id, role: "doctor", name: d.name })));
  }
  const STEP = 30, OPEN = [8 * 60, 22 * 60];
  // Start times on a date for one provider, every 30 minutes inside their work hours (8 AM to 10 PM when none are set):
  // [{ minute, time "HH:MM", state: "free" | "busy" | "past" }]. null = day off.
  function slots(id, date) {
    const mins = MadaNurses.VISIT_MINUTES || 60, h = SCH() ? MadaSchedule.hoursOn(id, date) : undefined;
    if (h === null) return null;
    const [from, to] = h ? [h.from, Math.min(h.to, 1440)] : OPEN, list = SCH() ? MadaSchedule.entries() : [];
    const now = new Date(), today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`, nowMin = now.getHours() * 60 + now.getMinutes();
    const out = [];
    for (let m = Math.ceil(from / STEP) * STEP; m + mins <= to; m += STEP) {
      const busy = SCH() && MadaSchedule.clashes(id, date, m, mins, null, list).length;
      out.push({ minute: m, time: `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`, state: date === today && m <= nowMin ? "past" : busy ? "busy" : "free" });
    }
    return out;
  }

  // ---------- Payment ----------
  const unpaid = o => !!o && o.payment === "unpaid" && !!o.total;
  // The payment link stays open until the end of the visit day (the patient can pay now or before the visit).
  function sendPay(o, by) {
    const now = new Date(), a = o.appointment, end = a ? new Date(a.date + "T23:59:00") : new Date(+now + 24 * 3600000);
    return MadaOrders.update(o.id, { payLink: { sentAt: now.toISOString(), expiresAt: (end > now ? end : new Date(+now + 3600000)).toISOString() },
      messages: [...(o.messages || []), { type: "payment", at: now.toISOString(), by }] });
  }
  const payUrl = o => new URL((/github\.io$/.test(location.hostname) ? "p?" : "p.html?") + encodeURIComponent(String(o.id).replace(/^ORD-(?=\d+$)/, "")), location.href).href;
  const PAYMSG = {
    ar: "مرحبًا {n}، تم حجز زيارتك مع مدى كير يوم {d} الساعة {t}.\nالمبلغ: {a} ريال. تقدر تدفع الآن من الرابط، أو وقت الزيارة:\n{u}\nنتمنى لك الصحة والعافية 💚",
    en: "Hello {n}, your Mada Care visit is booked for {d} at {t}.\nAmount: {a} SAR. You can pay now by the link, or at the visit:\n{u}\nWishing you good health 💚"
  };
  function payMsg(o, lg) {
    const a = o.appointment || {}, loc = lg === "ar" ? "ar-SA-u-nu-latn-ca-gregory" : "en-GB", h = Math.floor((a.minute || 0) / 60), mm = String((a.minute || 0) % 60).padStart(2, "0");
    const d = a.date ? new Date(a.date + "T00:00").toLocaleDateString(loc, { weekday: "long", day: "numeric", month: "long" }) : "";
    const time = `${h % 12 || 12}:${mm} ${lg === "ar" ? (h < 12 ? "ص" : "م") : (h < 12 ? "AM" : "PM")}`;
    const nm = o.patient && typeof o.patient === "object" ? o.patient[lg] || o.patient.en : o.patient || "";
    return PAYMSG[lg].replace("{n}", nm).replace("{d}", d).replace("{t}", time).replace("{a}", due(o)).replace("{u}", payUrl(o));
  }
  // The amount due with VAT, as on the payment page.
  const due = o => Math.round(Number(o.total || 0) * (1 + (MadaOrders.vatRate ? MadaOrders.vatRate(o) : 0)) * 100) / 100;
  // Payment taken at the visit by the nurse or doctor: method "cash" | "card" (card machine) | "link" (the patient paid by the link on their phone).
  function collect(o, d, by) {
    const now = new Date().toISOString();
    return MadaOrders.update(o.id, { payment: "paid", paidInfo: { method: d.method, amount: due(o), ref: d.ref || null, received: d.received || null, at: now, by, atVisit: true },
      payLink: o.payLink ? { ...o.payLink, paidAt: now } : null });
  }
  // ---------- At the visit (nurse-visit.html, doctor-visit.html) ----------
  // A bar for a visit booked from a doctor's order: internal booking, paid or not, and taking the payment at the visit.
  const PL = {
    en: { tag: "Internal booking from the doctor's order", paid: "Paid", unpaid: "Unpaid", due: "Amount due: {a} SAR", paidBy: "Paid · {m} · {a} SAR",
      sub: "The patient can pay by the link sent to them, or pay you now. The visit can't be completed until it is paid.", how: "Payment method", cash: "Cash", card: "Card (machine)",
      ref: "Receipt or reference no.", refOpt: "(optional)", take: "Confirm payment", taken: "Payment saved.", block: "The patient hasn't paid yet. Take the payment before completing the visit.",
      m_cash: "cash", m_card: "card", m_link: "payment link", m_apple: "Apple Pay", m_tamara: "Tamara", m_tabby: "Tabby", from: "Doctor's order {r}" },
    ar: { tag: "حجز داخلي من طلب الطبيب", paid: "مدفوع", unpaid: "غير مدفوع", due: "المبلغ المطلوب: {a} ريال", paidBy: "مدفوع · {m} · {a} ريال",
      sub: "المريض يقدر يدفع من الرابط اللي وصله، أو يدفع لك الحين. ما تقدر تكمل الزيارة إلا بعد الدفع.", how: "طريقة الدفع", cash: "كاش", card: "بطاقة (جهاز الدفع)",
      ref: "رقم الإيصال أو المرجع", refOpt: "(اختياري)", take: "تأكيد الدفع", taken: "تم حفظ الدفع.", block: "المريض ما دفع للحين. خذ الدفع قبل ما تكمل الزيارة.",
      m_cash: "كاش", m_card: "بطاقة", m_link: "رابط الدفع", m_apple: "Apple Pay", m_tamara: "تمارا", m_tabby: "تابي", from: "طلب الطبيب {r}" }
  };
  const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // Why the visit can't be completed yet, or null.
  const blocked = (o, lg) => o && o.fromMr && o.payment !== "paid" && Number(o.total) > 0 ? PL[lg].block : null;
  function payPanel(o, lg) {
    if (!o || !o.fromMr) return "";
    const t = PL[lg], ok = o.payment === "paid" || !(Number(o.total) > 0), p = o.paidInfo || {};
    const head = `<div class="vb-h"><b>${t.tag}</b><span class="vb-no" dir="ltr">${esc(o.bookingId || "")}</span><span class="vb-pill ${ok ? "ok" : "due"}">${ok ? t.paid : t.unpaid}</span></div>`;
    if (ok) return `<div class="vb-pay ok">${head}${p.method ? `<small>${esc(t.paidBy.replace("{m}", t["m_" + p.method] || p.method).replace("{a}", p.amount != null ? p.amount : due(o)))}</small>` : ""}</div>`;
    return `<div class="vb-pay due">${head}<div class="vb-amt">${esc(t.due.replace("{a}", due(o)))}</div><p>${t.sub}</p>
      <div class="vb-f"><div><label for="vbHow">${t.how}</label><select id="vbHow"><option value="cash">${t.cash}</option><option value="card">${t.card}</option></select></div>
        <div><label for="vbRef">${t.ref} <em>${t.refOpt}</em></label><input id="vbRef" maxlength="40" dir="ltr"></div>
        <button type="button" id="vbTake">${t.take}</button></div></div>`;
  }
  function bindPayPanel(root, o, by, lg, done) {
    const b = root.querySelector("#vbTake"); if (!b) return;
    b.addEventListener("click", () => { collect(MadaOrders.get(o.id), { method: root.querySelector("#vbHow").value, ref: root.querySelector("#vbRef").value.trim() }, by); if (done) done(PL[lg].taken); });
  }
  const PAY_CSS = `.vb-pay{border:1px solid #f3c9c9;background:#fff8f8;border-radius:14px;padding:12px 16px;margin:0 0 14px}.vb-pay.ok{border-color:#bfe3cb;background:#f3faf6}
    .vb-h{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:14px}.vb-no{font-weight:700;color:#6d3fd1;background:#efeafd;border-radius:8px;padding:1px 8px;font-size:12.5px}
    .vb-pill{border-radius:10px;padding:2px 10px;font-size:12px;font-weight:700}.vb-pill.due{background:#fdecec;color:#dc2626}.vb-pill.ok{background:#e7f6ec;color:#15803d}
    .vb-pay small{display:block;color:#15803d;font-weight:600;margin-top:6px;font-size:12.5px}.vb-amt{font-size:16px;font-weight:700;margin-top:8px}.vb-pay p{margin:4px 0 0;color:#6b7a80;font-size:12.5px;line-height:1.55}
    .vb-f{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) auto;gap:10px;align-items:end;margin-top:10px}.vb-f label{display:block;font-size:12px;color:#6b7a80;margin-bottom:4px}.vb-f em{font-style:normal}
    .vb-f select,.vb-f input{width:100%;height:42px;border:1px solid #d9e1e3;border-radius:10px;padding:0 10px;font:inherit;font-size:13.5px;background:#fff;box-sizing:border-box}
    .vb-f button{height:42px;border:0;border-radius:10px;background:#0b6b5c;color:#fff;font:inherit;font-weight:700;padding:0 18px;cursor:pointer}
    @media (max-width:640px){.vb-f{grid-template-columns:1fr}}`;
  if (typeof document !== "undefined" && !document.getElementById("vb-css")) { const st = document.createElement("style"); st.id = "vb-css"; st.textContent = PAY_CSS; document.head.appendChild(st); }
  return { TYPES, canBook, visitOf, visitDone, assignee, book, sync, people, slots, unpaid, sendPay, payUrl, payMsg, due, collect, blocked, payPanel, bindPayPanel };
})();
