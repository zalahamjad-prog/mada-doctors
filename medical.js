// Mada Care medical requests (the "Medical Requests" page).
// After a visit the doctor orders additional services from the doctors system: a referral to another
// specialty, lab tests, another doctor visit, imaging, sick leave, physiotherapy or nursing. Each order arrives here as one
// medical request that stays open until every item is done, then goes to the quality team.
// Stored in the browser (MadaStore) for the demo. Replace with the real medical requests API.
//
// request: { id: "MR-7001", orderId, bookingId, mrn, patient, mobile, service, doctorId, source: "doctor" | "staff",
//            createdAt, items: [item], contacts: [{ channel, topic, note, by, at }],
//            status: "open" | "quality" (closed, waiting for quality review) | "done" (quality reviewed),
//            closed: { by, at, note }, quality: { score, checks: [keys], note, by, at } }
// item:    { id, type, title: {en, ar}, details: {en, ar}, step (index into STEPS[type]), log: [{ step, by, at, data }] }
const MadaMedical = (() => {
  const KEY = "mada-medical";
  const TYPES = ["referral", "lab", "doctor", "radiology", "leave", "physio", "nursing"];
  // Steps of each item type; the last step means the item is done.
  const STEPS = {
    referral: ["requested", "referred", "attended"],
    doctor: ["requested", "booked", "done"],
    nursing: ["requested", "booked", "done"],
    physio: ["requested", "booked", "done"],
    iv: ["requested", "booked", "done"],
    lab: ["ordered", "collected", "received", "resulted", "reviewed"],
    radiology: ["ordered", "scheduled", "resulted", "reviewed"],
    medication: ["prescribed", "dispensed", "delivered"],
    leave: ["requested", "issued", "sent"],
    plan: ["written", "explained"],
    // Older request types, kept so requests saved before still open.
    followup: ["requested", "booked", "done"]
  };
  // Quality review checklist.
  const CHECKS = ["onTime", "informed", "reviewed", "documented"];

  // SAMPLE DATA ONLY: what each lab test reports, with reference and critical limits. The lab system sends the real ones.
  const ANALYTES = {
    CBC: [{ code: "HGB", name: { en: "Hemoglobin (HGB)", ar: "الهيموجلوبين (HGB)" }, unit: "g/dL", low: 13, high: 17, critLow: 7, critHigh: 20 },
      { code: "WBC", name: { en: "White Blood Cells (WBC)", ar: "كريات الدم البيضاء (WBC)" }, unit: "10³/µL", low: 4, high: 11, critLow: 2, critHigh: 30 },
      { code: "PLT", name: { en: "Platelets (PLT)", ar: "الصفائح الدموية (PLT)" }, unit: "10³/µL", low: 150, high: 400, critLow: 50, critHigh: 1000 },
      { code: "LYM", name: { en: "Lymphocytes (%)", ar: "الخلايا الليمفاوية (%)" }, unit: "%", low: 20, high: 40 }],
    FBS: [{ code: "GLU", name: { en: "Fasting Blood Sugar", ar: "سكر الدم الصائم" }, unit: "mg/dL", low: 70, high: 100, critLow: 40, critHigh: 400 }],
    HBA1C: [{ code: "A1C", name: { en: "HbA1c", ar: "السكر التراكمي HbA1c" }, unit: "%", low: 4, high: 5.6, critHigh: 14 }],
    LIPID: [{ code: "CHOL", name: { en: "Total Cholesterol", ar: "الكوليسترول الكلي" }, unit: "mg/dL", low: 0, high: 200 },
      { code: "LDL", name: { en: "LDL Cholesterol", ar: "الكوليسترول الضار LDL" }, unit: "mg/dL", low: 0, high: 130 },
      { code: "HDL", name: { en: "HDL Cholesterol", ar: "الكوليسترول النافع HDL" }, unit: "mg/dL", low: 40, high: 100 },
      { code: "TG", name: { en: "Triglycerides", ar: "الدهون الثلاثية" }, unit: "mg/dL", low: 0, high: 150, critHigh: 1000 }],
    KFT: [{ code: "CREA", name: { en: "Creatinine", ar: "الكرياتينين" }, unit: "mg/dL", low: 0.6, high: 1.3, critHigh: 10 },
      { code: "UREA", name: { en: "Urea", ar: "اليوريا" }, unit: "mg/dL", low: 15, high: 45 }],
    LFT: [{ code: "ALT", name: { en: "ALT (SGPT)", ar: "إنزيم ALT" }, unit: "U/L", low: 7, high: 56, critHigh: 1000 },
      { code: "AST", name: { en: "AST (SGOT)", ar: "إنزيم AST" }, unit: "U/L", low: 10, high: 40, critHigh: 1000 },
      { code: "ALP", name: { en: "Alkaline Phosphatase (ALP)", ar: "الفوسفاتيز القلوي ALP" }, unit: "U/L", low: 44, high: 147 },
      { code: "TBIL", name: { en: "Total Bilirubin", ar: "البيليروبين الكلي" }, unit: "mg/dL", low: 0.1, high: 1.2, critHigh: 15 }],
    VD25: [{ code: "VITD", name: { en: "Vitamin D (25-OH)", ar: "فيتامين د" }, unit: "ng/mL", low: 30, high: 100, critLow: 10 }]
  };
  // SAMPLE DATA ONLY: Doctor Portal catalogue code (doctor-orders.js) to the lab's test code above. The lab system sends the real mapping.
  const CATALOG = { "LAB-001": "CBC", "LAB-101": "FBS", "LAB-102": "HBA1C", "LAB-103": "LIPID", "LAB-104": "LFT", "LAB-105": "KFT", "LAB-203": "VD25" };
  const analytesOf = it => (it.tests || []).flatMap(c => ANALYTES[c] || []);
  // normal | low | high | critical for one value.
  function labStatus(a, v) {
    if (v === "" || v == null || isNaN(v)) return null;
    v = +v;
    if ((a.critLow != null && v < a.critLow) || (a.critHigh != null && v > a.critHigh)) return "critical";
    return v < a.low ? "low" : v > a.high ? "high" : "normal";
  }
  const LAB_LATE_HOURS = 24;
  // Sample at the lab for more than a day and no results yet.
  function labLate(it) {
    if (it.type !== "lab" || isDone(it)) return false;
    const rcv = (it.log.find(l => STEPS.lab[l.step] === "received") || {}).at;
    return !!rcv && STEPS.lab[it.step] === "received" && Date.now() - new Date(rcv) > LAB_LATE_HOURS * 3600000;
  }
  const openEsc = it => (it.escalations || []).filter(e => !e.resolved);

  // Lab items saved before the "sample at the lab" step was added move one step on.
  function migrate(list) {
    let dirty = false;
    list.forEach(r => r.items.forEach(it => {
      if (it.type !== "lab" || it.v2) return;
      it.v2 = true; dirty = true;
      if (it.step >= 2) it.step += 1;
      it.log.forEach(l => { if (l.step >= 2) l.step += 1; });
    }));
    return dirty;
  }
  const all = () => { const list = MadaStore.getJSON(KEY, []); if (migrate(list)) MadaStore.setJSON(KEY, list); return list; };
  const save = list => MadaStore.setJSON(KEY, list);
  const get = id => all().find(r => r.id === id) || null;
  const byOrder = oid => all().filter(r => r.orderId === oid);
  const isDone = it => it.step >= STEPS[it.type].length - 1;
  const progress = r => ({ done: r.items.filter(isDone).length, total: r.items.length });

  function add(req) {
    const list = all();
    const n = list.reduce((m, r) => Math.max(m, parseInt(r.id.split("-")[1], 10) || 0), 7000) + 1;
    const item = { status: "open", contacts: [], ...req, id: "MR-" + n, createdAt: new Date().toISOString() };
    item.items = item.items.map((it, i) => ({ step: 0, log: [{ step: 0, at: item.createdAt, by: req.byDoctor || null }], ...it, id: it.id || "IT-" + (i + 1) }));
    list.push(item); save(list);
    return item;
  }
  function update(id, patch) {
    const list = all(), i = list.findIndex(r => r.id === id);
    if (i < 0) return null;
    list[i] = { ...list[i], ...patch, updatedAt: new Date().toISOString() };
    save(list);
    return list[i];
  }
  // Every request belongs to a booking: a paid visit without a booking number gets one here.
  function linkBookings() {
    if (typeof MadaOrders === "undefined") return;
    all().forEach(r => {
      let o = MadaOrders.get(r.orderId); if (!o) return;
      if (o.payment === "paid" && !o.bookingId) o = MadaOrders.update(o.id, { payment: "paid" });
      if (o.bookingId && r.bookingId !== o.bookingId) update(r.id, { bookingId: o.bookingId });
    });
  }
  // Staff add another service to an open request.
  function addItem(id, it, by) {
    const r = get(id); if (!r) return null;
    const n = r.items.reduce((m, x) => Math.max(m, parseInt(String(x.id).split("-")[1], 10) || 0), 0) + 1;
    const at = new Date().toISOString();
    return update(id, { items: [...r.items, { step: 0, log: [{ step: 0, at, by: by || null }], ...it, id: "IT-" + n, addedBy: by || null }] });
  }
  // Change fields on one item (lab results, notes, escalations).
  function patchItem(id, itemId, patch) {
    const r = get(id); if (!r) return null;
    return update(id, { items: r.items.map(it => it.id === itemId ? { ...it, ...(typeof patch === "function" ? patch(it) : patch) } : it) });
  }
  // Move one item to its next step, keeping who did it and what they entered.
  function advance(id, itemId, by, data) {
    const r = get(id); if (!r) return null;
    const items = r.items.map(it => {
      if (it.id !== itemId || isDone(it)) return it;
      const step = it.step + 1;
      return { ...it, step, log: [...it.log, { step, by, at: new Date().toISOString(), data: data || null }] };
    });
    return update(id, { items });
  }
  // Waiting on the team for more than a day (or a result the doctor has not reviewed yet).
  function needsFollowUp(r) {
    if (r.status !== "open") return false;
    const day = 24 * 3600000;
    return r.items.some(it => openEsc(it).length || labLate(it) || !isDone(it) && (Date.now() - new Date(it.log[it.log.length - 1].at) > day || STEPS[it.type][it.step] === "resulted"));
  }

  // SAMPLE DATA ONLY: what a doctor might order after a visit (demo button on the page).
  const SAMPLE = {
    referral: [{ en: "Referral to Cardiology", ar: "تحويل إلى أمراض القلب" }, { en: "Irregular heartbeat on exam, needs an echo", ar: "عدم انتظام في نبض القلب أثناء الكشف، يحتاج إيكو" }],
    doctor: [{ en: "Follow-up doctor visit after 14 days", ar: "زيارة طبيب متابعة بعد 14 يوم" }, { en: "Review lab results and adjust the treatment", ar: "مراجعة نتائج التحاليل وتعديل العلاج" }],
    nursing: [{ en: "Wound dressing · 5 sessions", ar: "تغيير ضماد الجرح · 5 جلسات" }, { en: "Daily dressing for the diabetic foot wound", ar: "تغيير يومي لضماد جرح القدم السكري" }],
    physio: [{ en: "Physiotherapy · 6 sessions", ar: "علاج طبيعي · 6 جلسات" }, { en: "Knee rehab after surgery, twice a week", ar: "تأهيل الركبة بعد العملية، مرتين في الأسبوع" }],
    iv: [{ en: "IV hydration · Normal saline 1 L", ar: "محلول وريدي · محلول ملحي 1 لتر" }, { en: "One session at home", ar: "جلسة واحدة في البيت" }],
    lab: [{ en: "CBC, HbA1c and fasting blood sugar", ar: "صورة الدم والسكر التراكمي والسكر الصائم" }, { en: "Fasting 8 to 12 hours", ar: "صيام 8 إلى 12 ساعة" }],
    radiology: [{ en: "Chest X-ray", ar: "أشعة سينية للصدر" }, { en: "Persistent cough for 3 weeks", ar: "كحة مستمرة من 3 أسابيع" }],
    medication: [{ en: "Metformin 500 mg", ar: "ميتفورمين 500 ملغ" }, { en: "One tablet twice a day after meals · 30 days", ar: "حبة مرتين يومياً بعد الأكل · 30 يوم" }],
    leave: [{ en: "Sick leave · 3 days", ar: "إجازة مرضية · 3 أيام" }, { en: "Acute bronchitis, rest at home", ar: "التهاب شعب هوائية حاد، راحة في البيت" }],
    plan: [{ en: "Diabetes care plan", ar: "خطة علاج السكري" }, { en: "Low sugar diet, check blood sugar every morning, walk 30 minutes a day, review in 2 weeks", ar: "حمية قليلة السكر، قياس السكر كل صباح، مشي 30 دقيقة يومياً، مراجعة بعد أسبوعين" }],
    followup: [{ en: "Follow-up visit after 14 days", ar: "زيارة متابعة بعد 14 يوم" }, { en: "Review lab results and the treatment plan", ar: "مراجعة نتائج التحاليل والخطة العلاجية" }]
  };
  const sampleItem = type => ({ type, title: SAMPLE[type][0], details: SAMPLE[type][1], ...(type === "lab" ? { tests: ["CBC", "HBA1C", "FBS"], v2: true } : {}) });

  return { CATALOG, all, get, byOrder, add, addItem, linkBookings, update, patchItem, advance, ANALYTES, analytesOf, labStatus, labLate, openEsc, LAB_LATE_HOURS, isDone, progress, needsFollowUp, sampleItem, TYPES, STEPS, CHECKS };
})();
