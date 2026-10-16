// Mada Care demo service requests (the "Requests" page).
// Every request the call center finishes in the wizard is saved here: booked, sent to a doctor,
// referred to emergency or declined by the customer.
// Stored in the browser (MadaStore), so it only works within one browser. Replace with the real requests API.
//
// medical:  "emergency" | "non"
// decision: "pending" (waiting for the customer or the doctor) | "approved" | "rejected" | null (emergency referral)
// payment:  "paid" | "unpaid" | null (nothing to pay)
// items:    [{ kind: "test" | "pkg" | "nursing" | "iv", code }]
// status:   "booked" | "awaiting_doctor" | "referred" | "emergency_closed" | "declined" | "cancelled" | "completed" | "on_hold"
// emergency: { checks: [CHECKS keys], notes } for emergency referrals; locked for agents.
// closure:  { outcome, note, by, at } written by a supervisor when the emergency case is closed.
// booking:  { doctorId, nurseId, by, at } team assigned on the Request Details page (appointment holds date, minute, nurse name).
// location: { address, mapLink, lat, lng, shortCode, floor, landmark, image (data URL), requestedAt, savedAt }
// notes:    [{ text, by, at }] staff notes, oldest first.
// driver:   { id, by, at } driver assigned to the booking. arrival: { at, by } when staff confirm the team arrived.
// visit:    { steps: { key: at } } visit progress sent by the doctors / nursing app.
// doctorVisit: { status: "ongoing" | "paused" | "done", startedAt, pausedAt, completedAt, steps } set by the doctor on the Doctor Portal (My Visits).
// reschedules: [{ from: {date, minute, nurseId, doctorId}, to: {...}, reason, note, by, at }] visit time changes after payment.
// bookingId: "BK-5001", bookedAt: set when the request is paid; it then lives on the Bookings page.
// completedAt: when the visit finished (last visit step). A completed visit goes to the Quality page.
// quality:  { score 1-5, checks: [keys], call: { status: "reached" | "noAnswer" | "notCalled", rating, comment },
//             outcome: "approved" | "action", action (what must be fixed), note, by, at, resolved: { note, by, at } }
const MadaOrders = (() => {
  const KEY = "mada-orders";
  const PAY_MINUTES = 60; // a payment link is valid for 1 hour
  const STAFF = [
    { en: "Sarah Ahmed", ar: "سارة أحمد" },
    { en: "Noura Ali", ar: "نورة علي" },
    { en: "Mohammed Saleh", ar: "محمد صالح" },
    { en: "Reem Khalid", ar: "ريم خالد" }
  ];
  const PEOPLE = [
    { en: "Mohammed Saad Al-Qahtani", ar: "محمد سعد القحطاني" }, { en: "Noura Fahad Al-Qahtani", ar: "نورة فهد القحطاني" },
    { en: "Abdullah Nasser Al-Harbi", ar: "عبدالله ناصر الحربي" }, { en: "Fatimah Ali Al-Zahrani", ar: "فاطمة علي الزهراني" },
    { en: "Khalid Omar Al-Dosari", ar: "خالد عمر الدوسري" }, { en: "Hessa Ibrahim Al-Shehri", ar: "حصة إبراهيم الشهري" },
    { en: "Saleh Ahmed Al-Ghamdi", ar: "صالح أحمد الغامدي" }, { en: "Maha Turki Al-Otaibi", ar: "مها تركي العتيبي" },
    { en: "Yousef Majed Al-Anazi", ar: "يوسف ماجد العنزي" }, { en: "Lama Sultan Al-Shammari", ar: "لمى سلطان الشمري" },
    { en: "Fahad Abdulaziz Al-Mutlaq", ar: "فهد عبدالعزيز المطلق" }, { en: "Amal Hamad Al-Subaie", ar: "أمل حمد السبيعي" },
    { en: "Turki Badr Al-Rashid", ar: "تركي بدر الراشد" }, { en: "Sara Nawaf Al-Malki", ar: "سارة نواف المالكي" }
  ];
  // Sample items per service (codes from labs.js, nursing.js and ivtherapy.js).
  const ITEMS = {
    nursing: [["NS-1001", 80], ["NS-1002", 60], ["NS-1007", 60], ["NS-1010", 150]],
    blood: [["CBC", 80], ["HBA1C", 90], ["LIPID", 120], ["VD25", 180]],
    iv: [["IV-1001", 299], ["IV-1002", 399], ["IV-1003", 249]],
    doctor: [["", 0]]
  };

  const REASONS = [{ en: "Severe chest pain", ar: "ألم شديد في الصدر" }, { en: "Difficulty breathing", ar: "صعوبة في التنفس" }, { en: "Loss of consciousness", ar: "فقدان الوعي" }];
  // Emergency checklist (same as the wizard) and supervisor closing outcomes.
  const CHECKS = {
    chest_pain: { en: "Severe chest pain", ar: "ألم شديد في الصدر" }, bleeding: { en: "Heavy bleeding", ar: "نزيف حاد" },
    unconscious: { en: "Loss of consciousness", ar: "فقدان الوعي" }, high_sugar: { en: "Extremely high blood sugar", ar: "ارتفاع شديد في السكر" },
    breathing: { en: "Difficulty breathing", ar: "صعوبة في التنفس" }, unstable: { en: "Unstable condition", ar: "حالة غير مستقرة" }
  };
  const OUTCOMES = {
    hospital: { en: "Patient went to the hospital / ER", ar: "توجّه المريض للمستشفى أو الطوارئ" },
    ambulance: { en: "Ambulance (997) was called", ar: "تم طلب الإسعاف (997)" },
    stable: { en: "Condition stabilised, follow-up booked", ar: "استقرت الحالة وتم حجز متابعة" },
    noContact: { en: "Could not reach the patient", ar: "تعذّر التواصل مع المريض" },
    other: { en: "Other", ar: "أخرى" }
  };
  const CANCEL_OUTCOMES = {
    confirmed: { en: "Cancellation confirmed with the customer", ar: "تم تأكيد الإلغاء مع العميل" },
    later: { en: "Customer will order again later", ar: "العميل بيطلب لاحقاً" },
    offerRefused: { en: "Offered another time or price, customer refused", ar: "عُرض عليه وقت أو سعر آخر ورفض" },
    noReply: { en: "Customer did not reply", ar: "العميل لم يرد" },
    other: { en: "Other", ar: "أخرى" }
  };
  // Why an agent cancels a request (Request Details page).
  const CANCEL_REASONS = {
    changedMind: { en: "Customer changed their mind", ar: "العميل غيّر رأيه" },
    price: { en: "The price is high", ar: "السعر مرتفع" },
    time: { en: "The time is not suitable", ar: "الوقت غير مناسب" },
    otherProvider: { en: "Went to another provider", ar: "توجّه لجهة أخرى" },
    noLocation: { en: "Could not get the location", ar: "تعذّر الحصول على الموقع" },
    other: { en: "Other", ar: "أخرى" }
  };
  // SAMPLE DATA ONLY: doctors who can be assigned to a visit. Replace with the real staff list.
  const DOCTORS = !MadaStore.SAMPLES ? [] : [
    { id: "D01", name: { en: "Dr. Khalid Al-Mutairi", ar: "د. خالد المطيري" }, spec: { en: "Family Medicine", ar: "طب الأسرة" } },
    { id: "D02", name: { en: "Dr. Nada Al-Harbi", ar: "د. ندى الحربي" }, spec: { en: "Internal Medicine", ar: "الباطنة" } },
    { id: "D03", name: { en: "Dr. Faisal Al-Qahtani", ar: "د. فيصل القحطاني" }, spec: { en: "Geriatrics", ar: "طب كبار السن" } }
  ];
  // SAMPLE DATA ONLY: drivers who take the team to the visit. Replace with the real fleet list.
  const DRIVERS = !MadaStore.SAMPLES ? [] : [
    { id: "DR01", name: { en: "Ahmed Al-Zahrani", ar: "أحمد الزهراني" }, car: { en: "Toyota Hiace · ABJ 4821", ar: "تويوتا هايس · أ ب ج 4821" }, mobile: "0551234870" },
    { id: "DR02", name: { en: "Majed Al-Harthi", ar: "ماجد الحارثي" }, car: { en: "Hyundai H1 · RSD 7314", ar: "هيونداي H1 · ر س د 7314" }, mobile: "0569981245" },
    { id: "DR03", name: { en: "Sultan Al-Jahdali", ar: "سلطان الجحدلي" }, car: { en: "Toyota Innova · KHM 2290", ar: "تويوتا إنوفا · ك ح م 2290" }, mobile: "0543307761" }
  ];
  // Doctors added on the Staff page can also be assigned (their id is the employee ID).
  MadaStore.getJSON("mada-staff", []).filter(s => s.role === "doctor").forEach(s => DOCTORS.push({
    id: s.id, staff: true, active: s.status === "active", name: s.name, spec: { en: s.specialty || "", ar: s.specialty || "" } }));
  // Drivers added on the Staff page (role driver). The car is not on the staff form yet (TODO with the fleet list).
  MadaStore.getJSON("mada-staff", []).filter(s => s.role === "driver" && s.status === "active").forEach(s => DRIVERS.push({
    id: s.id, staff: true, name: s.name, car: { en: "", ar: "" }, mobile: s.mobile || "" }));
  // Service area. Only Jeddah is covered for now; add a city here to open it.
  // Polygon points are [lat, lng] (rough city outline, demo only; the backend must hold the real zones).
  const COVERAGE = [
    { id: "jeddah", name: { en: "Jeddah", ar: "جدة" }, center: [21.5433, 39.1728],
      polygon: [[21.98, 39.04], [21.98, 39.30], [21.78, 39.33], [21.55, 39.34], [21.36, 39.31], [21.24, 39.23], [21.24, 39.07], [21.45, 39.08], [21.72, 39.03]] }
  ];
  function inPolygon(lat, lng, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [ai, bi] = poly[i], [aj, bj] = poly[j];
      if ((bi > lng) !== (bj > lng) && lat < (aj - ai) * (lng - bi) / (bj - bi) + ai) inside = !inside;
    }
    return inside;
  }
  // The covered city for a point, or null when the point is outside every service area.
  const coverageAt = (lat, lng) => COVERAGE.find(c => inPolygon(lat, lng, c.polygon)) || null;
  const DECLINES = [{ en: "The time is not suitable", ar: "الوقت غير مناسب" }, { en: "The price is high", ar: "السعر مرتفع" }];
  // Deterministic sample list so the page has something to show on first use.
  function samples() {
    let seed = 7;
    const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    const pick = a => a[Math.floor(rnd() * a.length)];
    const services = ["nursing", "doctor", "blood", "iv", "nursing", "blood"];
    const now = Date.now(), list = [];
    for (let i = 0; i < 36; i++) {
      const service = pick(services);
      const at = new Date(now - (i * 19 + Math.floor(rnd() * 14)) * 3600000 - 40 * 60000);
      at.setHours(8 + Math.floor(rnd() * 12), Math.floor(rnd() * 12) * 5, 0, 0);
      const emergency = rnd() < 0.2;
      let status, decision, payment;
      if (emergency) { status = "referred"; decision = null; payment = null; }
      else {
        const r = rnd();
        if (i < 4 && r < 0.5) { status = service === "doctor" ? "awaiting_doctor" : "booked"; decision = "pending"; payment = null; }
        else if (r < 0.15) { status = "declined"; decision = "rejected"; payment = null; }
        else if (r < 0.3) { status = service === "doctor" ? "awaiting_doctor" : "booked"; decision = "pending"; payment = null; }
        else if (r < 0.5) { status = "booked"; decision = "approved"; payment = "unpaid"; }
        else { status = i < 3 ? "booked" : "completed"; decision = "approved"; payment = "paid"; }
      }
      const pool = ITEMS[service], item = pick(pool);
      const mobile = "05" + String(Math.floor(rnd() * 1e8)).padStart(8, "0");
      list.push({
        id: "ORD-" + (1036 - i), sample: true, service, mobile, patient: pick(PEOPLE),
        mrn: `MC-${at.getFullYear()}-${String(200 - i).padStart(3, "0")}`,
        medical: emergency ? "emergency" : "non", decision, payment, status,
        staff: pick(STAFF), createdAt: at.toISOString(),
        reason: emergency ? pick(REASONS) : status === "declined" ? pick(DECLINES) : null,
        items: service === "doctor" || emergency ? [] : [{ kind: service === "blood" ? "test" : service, code: item[0] }], total: emergency || service === "doctor" ? null : item[1]
      });
    }
    // Order numbers follow the time the request was created.
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).forEach((o, i) => o.id = "ORD-" + (1036 - i));
    return list;
  }

  // Two sample requests on hold (added once, also to lists saved before this feature).
  function heldSamples(list) {
    const next = () => list.reduce((m, o) => o.drDemo ? m : Math.max(m, parseInt(o.id.split("-")[1], 10) || 0), 1000) + 1;
    const mk = (mins, mobile, service, view, items, reason, note) => {
      const at = new Date(Date.now() - mins * 60000).toISOString();
      const snap = { view, mobile, fileNo: "new", source: "whatsapp", otherSource: "", cond: "non", service,
        lab: service === "blood" ? items.map(c => ({ type: "test", id: c })) : [], nurse: service === "nursing" ? items.map(c => ({ id: c })) : [], iv: [],
        doctorFlow: null, s3: {}, appt: null, rel: null, fields: null };
      list.push({ id: "ORD-" + next(), sample: true, service, mobile, patient: null, mrn: null, medical: "non", source: "whatsapp",
        status: "on_hold", decision: "on_hold", payment: null, staff: STAFF[0], createdAt: at,
        items: items.map(c => ({ kind: service === "blood" ? "test" : service, code: c })), total: null,
        hold: { reason, note, at, by: STAFF[0], view, snap } });
    };
    mk(48, "0561112233", "blood", "stepLab", ["CBC", "HBA1C"], "noReply", "");
    mk(9, "0547778899", "nursing", "stepNurse", ["NS-1002"], "waitingInfo", "Waiting for a photo of the wound");
  }
  function all() {
    let list = MadaStore.getJSON(KEY, null), dirty = false;
    // Real data: no sample requests or sample updates.
    if (!MadaStore.SAMPLES) return list || [];
    if (!list) { list = samples(); dirty = true; }
    if (!MadaStore.get("mada-orders-held-v1")) { heldSamples(list); MadaStore.set("mada-orders-held-v1", "1"); dirty = true; }
    // Sample payment links (one still running, one expired) for orders saved before this feature.
    if (!MadaStore.get("mada-orders-paylink-v1")) {
      list.filter(o => o.sample && o.decision === "approved" && o.payment === "unpaid" && !o.payLink).slice(0, 3).forEach((o, i) => {
        const sent = Date.now() - [22, 75, 48][i] * 60000;
        o.payLink = { sentAt: new Date(sent).toISOString(), expiresAt: new Date(sent + PAY_MINUTES * 60000).toISOString() };
      });
      MadaStore.set("mada-orders-paylink-v1", "1"); dirty = true;
    }
    // Emergency details for referrals saved before the checklist was stored, and one sample closed case.
    if (!MadaStore.get("mada-orders-emg-v1")) {
      const notes = { en: "Patient experiencing severe symptoms, advised to go to the nearest ER.", ar: "المريض يعاني أعراضاً شديدة، ونُصح بالتوجه لأقرب طوارئ." };
      list.filter(o => o.medical === "emergency" && !o.emergency).forEach(o => {
        const key = Object.keys(CHECKS).find(k => CHECKS[k].en === (o.reason && o.reason.en)) || "unstable";
        o.emergency = { checks: [key], notes: o.sample ? notes : "" };
      });
      const old = list.filter(o => o.sample && o.status === "referred").sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
      if (old) { old.status = "emergency_closed"; old.closure = { outcome: "hospital", note: { en: "Called the family: the patient was admitted to King Fahad Hospital ER.", ar: "تم التواصل مع الأهل: المريض دخل طوارئ مستشفى الملك فهد." }, by: { en: "Hanan Saleh", ar: "حنان صالح" }, at: new Date(new Date(old.createdAt).getTime() + 40 * 60000).toISOString() }; }
      MadaStore.set("mada-orders-emg-v1", "1"); dirty = true;
    }
    // One sample "Not Approved" request already cancelled by a supervisor.
    if (!MadaStore.get("mada-orders-cancel-v1")) {
      const old = list.filter(o => o.sample && o.status === "declined").sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
      if (old) { old.status = "cancelled"; old.closure = { outcome: "offerRefused", note: { en: "Offered an evening slot, the customer still declined.", ar: "عرضنا عليه موعد مسائي ومع ذلك اعتذر." }, by: { en: "Hanan Saleh", ar: "حنان صالح" }, at: new Date(new Date(old.createdAt).getTime() + 90 * 60000).toISOString() }; }
      MadaStore.set("mada-orders-cancel-v1", "1"); dirty = true;
    }
    // Sample home addresses (as typed in the wizard) so the location section has something to show.
    // v2: samples moved to Jeddah, the only city covered for now.
    if (!MadaStore.get("mada-orders-addr-v2")) {
      const ADDR = [["Al Rawdah", "Prince Sultan Rd", "8228", "23435"], ["Al Zahra", "Sari St", "3141", "23425"], ["Al Shati", "Corniche Rd", "6610", "23511"], ["Al Naeem", "Hira St", "2275", "23621"]];
      list.filter(o => o.sample && o.medical !== "emergency" && (!o.address || o.address.city === "riyadh")).forEach((o, i) => {
        const a = ADDR[i % ADDR.length];
        o.address = { city: "jeddah", district: a[0], street: a[1], building: a[2], postalCode: a[3], floor: "", mapLink: "", landmark: "" };
      });
      MadaStore.set("mada-orders-addr-v2", "1"); dirty = true;
    }
    // SAMPLE DATA ONLY: finished sample visits become completed bookings (team, arrival, visit steps),
    // and the older ones already have a quality review, so the Quality page has something to show.
    if (!MadaStore.get("mada-orders-done-v1")) {
      let bk = list.reduce((m, o) => o.drDemo ? m : Math.max(m, o.bookingId ? parseInt(o.bookingId.split("-")[1], 10) : 0), 5000);
      const NAMES = { N01: { en: "Nurse Huda Al-Otaibi", ar: "الممرضة هدى العتيبي" }, N02: { en: "Nurse Reem Al-Shehri", ar: "الممرضة ريم الشهري" } };
      const LATE = [-4, 2, 9, 24, 0, 6, 3, 13];
      const STEP_MIN = { identity: 3, consent: 6, vitals: 12, assess: 20, service: 35, educate: 50, report: 62 };
      const iso = ms => new Date(ms).toISOString();
      const QA = { en: "Quality Team", ar: "فريق الجودة" };
      list.filter(o => o.sample && o.status === "completed" && o.payment === "paid" && !o.bookingId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)).forEach((o, i) => {
          const made = new Date(o.createdAt).getTime(), appt = new Date(made + 24 * 3600000);
          appt.setMinutes(Math.round(appt.getMinutes() / 30) * 30, 0, 0);
          const day = `${appt.getFullYear()}-${String(appt.getMonth() + 1).padStart(2, "0")}-${String(appt.getDate()).padStart(2, "0")}`;
          const minute = appt.getHours() * 60 + appt.getMinutes(), start = appt.getTime();
          const nurseId = i % 2 ? "N02" : "N01", arrived = start + LATE[i % LATE.length] * 60000;
          const steps = { received: iso(made + 25 * 60000), ontheway: iso(start - 35 * 60000), arrived: iso(arrived) };
          Object.keys(STEP_MIN).forEach(k => steps[k] = iso(arrived + STEP_MIN[k] * 60000));
          o.bookingId = "BK-" + (++bk); o.bookedAt = iso(made + 20 * 60000);
          o.appointment = { date: day, minute, nurse: NAMES[nurseId] };
          o.booking = { nurseId, doctorId: o.service === "doctor" ? DOCTORS[1 + i % (DOCTORS.length - 1)].id : null, by: o.staff, at: o.bookedAt };
          o.driver = { id: DRIVERS[i % DRIVERS.length].id, by: o.staff, at: o.bookedAt };
          o.arrival = { at: iso(arrived), by: o.staff };
          o.visit = { steps }; o.completedAt = steps.report;
          // Visits older than 4 days were already reviewed.
          if (Date.now() - new Date(steps.report) < 4 * 24 * 3600000) return;
          const late = LATE[i % LATE.length] > 15, at = iso(new Date(steps.report).getTime() + 26 * 3600000);
          o.quality = late
            ? { score: 3, checks: ["steps", "documented", "care"], call: { status: "reached", rating: 3, comment: { en: "The team was late but the nurse was very kind.", ar: "الفريق تأخر بس الممرضة كانت لطيفة جداً." } },
                outcome: "action", action: { en: "Team arrived more than 15 minutes late. Review the route and leave time with the driver.", ar: "الفريق وصل متأخر أكثر من 15 دقيقة. مراجعة المسار ووقت الانطلاق مع السائق." }, note: "", by: QA, at,
                ...(i % 3 ? {} : { resolved: { note: { en: "Spoke with the driver; teams now leave 15 minutes earlier.", ar: "تم التنبيه على السائق، والفرق صارت تطلع قبل الموعد بربع ساعة." }, by: QA, at: iso(new Date(at).getTime() + 5 * 3600000) } }) }
            : { score: i % 4 ? 5 : 4, checks: ["onTime", "steps", "documented", "care"], call: i % 3 ? { status: "reached", rating: 5, comment: "" } : { status: "noAnswer", rating: null, comment: "" },
                outcome: "approved", action: "", note: "", by: QA, at };
        });
      MadaStore.set("mada-orders-done-v1", "1"); dirty = true;
    }
    // SAMPLE DATA ONLY: upcoming paid doctor visits for the other doctors (the demo doctor D01 has its own three patients, see seedDoctorDemo).
    if (!MadaStore.get("mada-orders-docvisits-v1")) {
      let n = list.reduce((m, o) => o.drDemo ? m : Math.max(m, parseInt(o.id.split("-")[1], 10) || 0), 1000);
      let bk = list.reduce((m, o) => o.drDemo ? m : Math.max(m, o.bookingId ? parseInt(o.bookingId.split("-")[1], 10) : 0), 5000);
      const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const PLAN = [[0, 600], [0, 690], [0, 855], [1, 570], [1, 780], [2, 960]];
      const MOB = ["0501234567", "0559876543", "0533332211", "0504321987", "0567764433", "0551116677"];
      PLAN.forEach(([day, minute], i) => {
        const d = new Date(); d.setDate(d.getDate() + day);
        const made = new Date(Date.now() - (30 - i) * 3600000).toISOString();
        list.push({ id: "ORD-" + (++n), sample: true, service: "doctor", mobile: MOB[i], patient: PEOPLE[(i * 3 + 1) % PEOPLE.length],
          mrn: `MC-${d.getFullYear()}-${String(301 + i).padStart(3, "0")}`, medical: "non", decision: "approved", payment: "paid", status: "booked",
          staff: STAFF[i % STAFF.length], createdAt: made, items: [], total: null,
          bookingId: "BK-" + (++bk), bookedAt: made, appointment: { date: ymd(d), minute, nurse: null },
          booking: { nurseId: null, doctorId: DOCTORS[1 + i % (DOCTORS.length - 1)].id, by: STAFF[i % STAFF.length], at: made },
          address: { city: "jeddah", district: "Al Rawdah", street: "", building: "", postalCode: "", floor: "", mapLink: "", landmark: "" } });
      });
      MadaStore.set("mada-orders-docvisits-v1", "1"); dirty = true;
    }
    if (dirty) save(list);
    return list;
  }
  const save = list => MadaStore.setJSON(KEY, list);
  const get = id => all().find(o => o.id === id) || null;
  const byReq = reqId => all().find(o => o.reqId === reqId) || null;

  function add(order) {
    const list = all();
    const n = list.reduce((m, o) => o.drDemo ? m : Math.max(m, parseInt(o.id.split("-")[1], 10) || 0), 1000) + 1;
    const item = { decision: "pending", payment: null, ...order, id: "ORD-" + n, createdAt: new Date().toISOString() };
    list.push(item); save(list);
    return item;
  }
  function update(id, patch) {
    const list = all(), i = list.findIndex(o => o.id === id);
    if (i < 0) return null;
    list[i] = { ...list[i], ...patch, updatedAt: new Date().toISOString() };
    // Paying turns the request into a booking (shown on the Bookings page, no longer on Requests).
    if (patch.payment === "paid" && !list[i].bookingId) {
      const n = list.reduce((m, o) => o.drDemo ? m : Math.max(m, o.bookingId ? parseInt(o.bookingId.split("-")[1], 10) : 0), 5000) + 1;
      list[i].bookingId = "BK-" + n; list[i].bookedAt = list[i].updatedAt;
    }
    save(list);
    return list[i];
  }
  // Needs the agent: requests on hold, and doctor requests where the doctor has replied.
  const needsAction = () => all().filter(o => o.status === "on_hold" || o.status === "referred" || o.status === "declined" ||
    (typeof MadaRequests !== "undefined" && o.status === "awaiting_doctor" && o.reqId && (MadaRequests.get(o.reqId) || {}).status === "ready_to_confirm")).length;

  // Hold rules: follow-up SMS after 30 minutes, closed after 24 hours with no reply.
  // Demo: runs whenever a page is open; the backend should run these on a timer.
  const NO_REPLY = { en: "Customer did not reply", ar: "العميل لم يرد" };
  function sweepHolds() {
    const now = Date.now();
    all().filter(o => o.status === "on_hold" && o.hold).forEach(o => {
      const age = now - new Date(o.hold.at);
      if (age > 24 * 3600000) {
        update(o.id, { status: "declined", decision: "rejected", reason: NO_REPLY, closedAuto: true });
      } else if (age > 30 * 60000 && !o.hold.followUp) {
        // TODO: send through the SMS provider.
        update(o.id, { hold: { ...o.hold, followUp: new Date().toISOString() },
          messages: [...(o.messages || []), { type: "followup", auto: true, at: new Date().toISOString() }] });
      }
    });
  }
  const text = (v, lang) => v && typeof v === "object" ? (v[lang] || v.en) : (v || "");

  // SAMPLE DATA ONLY: the Doctor Portal demo has three patients. Each has a completed visit and a new visit booked for today.
  // The first two have lab results approved by the doctor; the third has critical lab results waiting for the doctor,
  // an imaging order booked and a lab order not collected yet (for the Critical Results page). Remove with the real visits API.
  // The first run of this version clears the older doctor demo data (visits, orders, files, notifications).
  const DEMO_V = "mada-dr-demo-v4";
  // SAMPLE payments collected at the demo visits (amounts match the sample prices of the ordered services), so the Invoices page has data.
  const DEMO_PAY = [[{ amount: 340, method: "card", ref: "TRM-48213" }], [{ amount: 360, method: "cash", received: 400 }], [{ amount: 200, method: "cash", received: 200 }, { amount: 420, method: "card", ref: "TRM-51907" }]];
  const DEMO_PATIENTS = [
    { name: { en: "Salem Mohammed", ar: "سالم محمد" }, mobile: "0501234567", mrn: "MC-001245", gender: "m", dob: "1962-04-15", idNumber: "1012345678", today: 600, pastDays: 12 },
    { name: { en: "Aisha Abdullah", ar: "عائشة عبدالله" }, mobile: "0559876543", mrn: "MC-001246", gender: "f", dob: "1990-07-22", idNumber: "1098765432", today: 690, pastDays: 30 },
    { name: { en: "Fahad Al-Harbi", ar: "فهد الحربي" }, mobile: "0543217890", mrn: "MC-001247", gender: "m", dob: "1958-11-03", idNumber: "1023456789", today: 780, pastDays: 2 }
  ];
  const ymdOf = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const ADDR0 = { city: "jeddah", district: "Al Rawdah", street: "", building: "", postalCode: "", floor: "", mapLink: "", landmark: "" };
  // The finished visit of each demo patient, every step filled so the visit record and the medical report can be seen.
  function demoVisit(i, at, by) {
    const s = x => ({ ...x, at, by }), hs = x => ({ ...x, savedAt: at, by }), p = DEMO_PATIENTS[i];
    const common = { arrival: s({ name: p.name.en, idNumber: p.idNumber, dob: p.dob, verified: true }), history: s({}), allergy: s({ status: "no", items: [] }),
      nurse: s({ none: true }), edu: s({ none: true }), consent: s({ signer: "patient", name: p.name.en, agree: true, served: true }) };
    if (i === 0) return { status: "done", completedAt: at,
      history: {
        complaint: hs({ items: [{ type: "resp", text: "Cough with fever", durMode: "set", durN: "3", durU: "days", severity: "moderate", pain: "", details: "Dry cough, worse at night." }] }),
        hpi: hs({ onsetN: "3", onsetU: "days", course: ["gradual", "worsening"], character: "Dry cough with fever up to 38.6 °C and tiredness.", locNA: true, body: [], aggr: "Lying down at night", relief: "Paracetamol", assoc: ["fever", "fatigue"], notes: "" }),
        meds: hs({ status: "current", current: [{ name: "Metformin", dose: "500 mg", freq: "Twice daily" }, { name: "Amlodipine", dose: "5 mg", freq: "Once daily" }], previous: [], nkda: true, allergies: [] }),
        pmh: hs({ chronic: ["diabetes", "htn"], surgeries: "" }),
        ros: hs({ sys: { const: { v: "pos", note: "Fever and tiredness" }, resp: { v: "pos", note: "Dry cough" }, cv: { v: "neg" }, gi: { v: "neg" }, gu: { v: "neg" }, neuro: { v: "neg" } } }),
        social: hs({ occupation: "Retired", marital: "married", smoking: "non", notes: "" }),
        family: hs({ status: "present", conditions: ["diabetes"], notes: "" })
      },
      steps: { ...common,
        vitals: s({ temp: "38.2", bp: "132/84", hr: "96", sugar: "165", spo2: "95", rr: "20" }),
        exam: s({ general: { appear: { status: "ill", findings: ["alert", "oriented"], notes: "" }, cv: { status: "normal", findings: [], notes: "" }, resp: { status: "abn", findings: ["crackles"], notes: "Right lower zone" },
          abd: { status: "normal", findings: ["soft"], notes: "" }, neuro: { status: "normal", findings: ["alertN"], notes: "" }, skin: { status: "normal", findings: [], notes: "" } },
          regions: [{ region: "chest", insp: { f: ["sym"], notes: "" }, palp: { f: [], notes: "" }, ausc: { f: ["crackles"], notes: "Right base" }, extra: "", photos: [] }] }),
        assess: s({ primary: { code: "J20.9", en: "Acute bronchitis, unspecified", ar: "التهاب الشعب الهوائية الحاد، غير محدد" },
          additional: [{ code: "E11.9", en: "Type 2 diabetes mellitus, without complications", ar: "سكري النوع الثاني بدون مضاعفات" }, { code: "I10", en: "Essential (primary) hypertension", ar: "ارتفاع ضغط الدم الأساسي" }], notes: "" }),
        plan: s({ goals: [{ id: "relief" }, { id: "cause" }, { id: "sugar" }], details: "<p>Rest and plenty of fluids.</p><ul><li>Check blood sugar twice a day</li><li>Call us if breathing gets worse</li></ul>", followUp: "Follow-up visit after 5 days",
          meds: [{ id: "m1", drugId: "paracetamol", name: "Paracetamol", generic: { en: "Paracetamol", ar: "باراسيتامول" }, form: "tablet", strength: "500 mg", route: "oral", doseN: "2", doseU: "tab", freq: "q6h", durN: "5", durU: "days", instr: "After food", timing: [], prn: true, prnFor: "Fever" },
            { id: "m2", drugId: "azithromycin", name: "Azithromycin", generic: { en: "Azithromycin", ar: "أزيثرومايسين" }, form: "tablet", strength: "500 mg", route: "oral", doseN: "1", doseU: "tab", freq: "od", durN: "3", durU: "days", instr: "", timing: [], prn: false, prnFor: "" }], none: false }),
        orders: s({ items: [{ uid: "a", svc: "lab", code: "LAB-001", note: "" }, { uid: "b", svc: "lab", code: "LAB-102", note: "" }, { uid: "c", svc: "lab", code: "LAB-101", note: "" }, { uid: "d", svc: "rad", code: "RAD-001", note: "" }] })
      } };
    if (i === 2) return { status: "done", completedAt: at,
      history: {
        complaint: hs({ items: [{ type: "more", text: "Thirst, passing urine often and tiredness", durMode: "set", durN: "1", durU: "weeks", severity: "moderate", pain: "", details: "Very thirsty, up at night to pass urine, feels weak and dizzy." }] }),
        hpi: hs({ onsetN: "1", onsetU: "weeks", course: ["gradual", "worsening"], character: "Thirst and passing urine often, with tiredness and dizziness on standing. Missed his diabetes tablets for two weeks.", locNA: true, body: [], aggr: "Standing up", relief: "Rest", assoc: ["fatigue"], notes: "" }),
        meds: hs({ status: "current", current: [{ name: "Metformin", dose: "1000 mg", freq: "Twice daily" }, { name: "Gliclazide", dose: "60 mg", freq: "Once daily" }], previous: [], nkda: true, allergies: [] }),
        pmh: hs({ chronic: ["diabetes", "htn"], surgeries: "" }),
        ros: hs({ sys: { const: { v: "pos", note: "Tiredness and dizziness" }, gu: { v: "pos", note: "Passing urine often" }, cv: { v: "neg" }, resp: { v: "neg" }, gi: { v: "neg" }, neuro: { v: "neg" } } }),
        social: hs({ occupation: "Retired", marital: "married", smoking: "ex", notes: "" }),
        family: hs({ status: "present", conditions: ["diabetes"], notes: "" })
      },
      steps: { ...common,
        vitals: s({ temp: "37.0", bp: "106/68", hr: "102", sugar: "410", spo2: "97", rr: "18" }),
        exam: s({ general: { appear: { status: "ill", findings: ["alert"], notes: "Looks tired, dry mouth" }, cv: { status: "normal", findings: [], notes: "" }, resp: { status: "normal", findings: [], notes: "" },
          abd: { status: "normal", findings: ["soft"], notes: "" }, neuro: { status: "normal", findings: ["alertN"], notes: "" }, skin: { status: "abn", findings: ["other"], notes: "Dry skin" } }, regions: [] }),
        assess: s({ primary: { code: "E11.65", en: "Type 2 diabetes mellitus with hyperglycaemia", ar: "داء السكري من النوع الثاني مع ارتفاع السكر" }, additional: [], notes: "" }),
        plan: s({ goals: [{ id: "cause" }, { id: "prevent" }], details: "<p>Restart the diabetes tablets today and drink plenty of water.</p><ul><li>Check blood sugar four times a day</li><li>Go to the emergency department if vomiting or confused</li></ul>", followUp: "Doctor call after the lab results", meds: [], none: true }),
        orders: s({ items: [{ uid: "a", svc: "lab", code: "LAB-001", note: "" }, { uid: "b", svc: "lab", code: "LAB-101", note: "" }, { uid: "c", svc: "lab", code: "LAB-105", note: "" }, { uid: "d", svc: "rad", code: "RAD-004", note: "" }, { uid: "e", svc: "lab", code: "LAB-104", note: "" }] })
      } };
    return { status: "done", completedAt: at,
      history: {
        complaint: hs({ items: [{ type: "more", text: "Tiredness and body aches", durMode: "set", durN: "2", durU: "months", severity: "mild", pain: "", details: "Feels tired most days, aches in the legs and back." }] }),
        hpi: hs({ onsetN: "2", onsetU: "months", course: ["gradual"], character: "General tiredness with aches in the legs and lower back.", locNA: true, body: [], aggr: "End of the day", relief: "Rest", assoc: ["fatigue"], notes: "" }),
        meds: hs({ status: "none", current: [], previous: [], nkda: true, allergies: [] }),
        pmh: hs({ chronic: [], surgeries: "" }),
        ros: hs({ sys: { const: { v: "pos", note: "Tiredness" }, msk: { v: "pos", note: "Leg and back aches" }, cv: { v: "neg" }, resp: { v: "neg" }, gi: { v: "neg" }, neuro: { v: "neg" } } }),
        social: hs({ occupation: "Teacher", marital: "married", smoking: "non", notes: "" }),
        family: hs({ status: "present", conditions: ["htn"], notes: "" })
      },
      steps: { ...common,
        vitals: s({ temp: "36.8", bp: "124/78", hr: "78", sugar: "96", spo2: "98", rr: "16" }),
        exam: s({ general: { appear: { status: "normal", findings: ["alert", "oriented"], notes: "" }, cv: { status: "normal", findings: [], notes: "" }, resp: { status: "normal", findings: [], notes: "" },
          abd: { status: "normal", findings: ["soft"], notes: "" }, neuro: { status: "normal", findings: ["alertN"], notes: "" }, skin: { status: "normal", findings: [], notes: "" } }, regions: [] }),
        assess: s({ primary: { code: "E55.9", en: "Vitamin D deficiency, unspecified", ar: "نقص فيتامين د، غير محدد" },
          additional: [{ code: "E78.5", en: "Hyperlipidaemia, unspecified", ar: "ارتفاع الدهون في الدم، غير محدد" }], notes: "" }),
        plan: s({ goals: [{ id: "cause" }, { id: "prevent" }], details: "<p>Less fried and fatty food, walk 30 minutes a day.</p><ul><li>Sun exposure 15 minutes a day</li><li>Repeat the tests after 3 months</li></ul>", followUp: "Follow-up visit after 3 months", meds: [], none: true }),
        orders: s({ items: [{ uid: "a", svc: "lab", code: "LAB-103", note: "" }, { uid: "b", svc: "lab", code: "LAB-105", note: "" }, { uid: "c", svc: "lab", code: "LAB-203", note: "" }] })
      } };
  }
  // Lab (and radiology) results of the finished visit, entered by the lab and approved by the doctor.
  function demoRequest(i, o, n, doctorId, by) {
    const lab = { en: "Nurse Hanan Al-Otaibi", ar: "الممرضة حنان العتيبي" }, t0 = new Date(o.doctorVisit.completedAt).getTime();
    const at = h => new Date(t0 + h * 3600000).toISOString();
    const log = (hours, data, notes) => hours.map((h, s) => ({ step: s, at: at(h), by: s === 0 || s === hours.length - 1 && notes ? by : lab, data: s === hours.length - 1 && notes ? { docNote: notes } : (data || {})[s] || null }));
    const items = i === 2 ? [
      // Results entered by the lab, not approved yet: the critical values raise an alert on the Critical Results page.
      { type: "lab", v2: true, step: 3, orderCodes: ["LAB-001", "LAB-101", "LAB-105"], tests: ["CBC", "FBS", "KFT"], title: { en: "Complete Blood Count (CBC), Glucose (Fasting), Kidney Function Test", ar: "صورة دم كاملة، سكر صائم، وظائف الكلى" },
        details: { en: "", ar: "" }, results: { HGB: 6.8, WBC: 9.1, PLT: 240, LYM: 26, GLU: 465, CREA: 2.1, UREA: 68 }, log: log([0, 2, 4, 20]) },
      { type: "radiology", step: 1, orderCodes: ["RAD-004"], title: { en: "Ultrasound Abdomen", ar: "أشعة صوتية للبطن" }, details: { en: "", ar: "" }, log: log([0, 3]) },
      { type: "lab", v2: true, step: 0, orderCodes: ["LAB-104"], tests: ["LFT"], title: { en: "Liver Function Test", ar: "وظائف الكبد" }, details: { en: "", ar: "" }, log: log([0]) }
    ] : i === 0 ? [
      { type: "lab", v2: true, step: 4, orderCodes: ["LAB-001", "LAB-102", "LAB-101"], tests: ["CBC", "HBA1C", "FBS"], title: { en: "Complete Blood Count (CBC), HbA1c, Glucose (Fasting)", ar: "صورة دم كاملة، السكر التراكمي، سكر صائم" },
        details: { en: "", ar: "" }, results: { HGB: 13.6, WBC: 12.4, PLT: 280, LYM: 18, A1C: 7.4, GLU: 142 }, log: log([0, 2, 4, 22, 26], null, "WBC high, fits the chest infection. HbA1c above target: keep Metformin and recheck in 3 months.") },
      { type: "radiology", step: 3, orderCodes: ["RAD-001"], title: { en: "Chest X-Ray", ar: "أشعة الصدر" }, details: { en: "", ar: "" },
        log: log([0, 3, 20, 26], { 2: { result: "Increased bronchial markings. No consolidation or effusion. Heart size normal." } }) }
    ] : [
      { type: "lab", v2: true, step: 4, orderCodes: ["LAB-103", "LAB-105", "LAB-203"], tests: ["LIPID", "KFT", "VD25"], title: { en: "Lipid Profile, Kidney Function Test, Vitamin D", ar: "الدهون، وظائف الكلى، فيتامين د" },
        details: { en: "", ar: "" }, results: { CHOL: 236, LDL: 158, HDL: 44, TG: 190, CREA: 0.8, UREA: 28, VITD: 14 }, log: log([0, 2, 4, 24, 30], null, "Vitamin D low and LDL high. Start vitamin D3 50,000 IU weekly for 8 weeks, diet advice given, repeat after 3 months.") }
    ];
    items.forEach((it, k) => it.id = "IT-" + (k + 1));
    return { id: "MR-" + n, orderId: o.id, bookingId: o.bookingId, mrn: o.mrn, patient: o.patient, mobile: o.mobile, service: "doctor", doctorId, source: "doctor", byDoctor: by,
      sample: true, drDemo: true, status: "open", contacts: [], createdAt: o.doctorVisit.completedAt, items };
  }
  function seedDoctorDemo(doctorId) {
    if (!doctorId || !MadaStore.SAMPLES) return;
    const doc = DOCTORS.find(d => d.id === doctorId), by = doc ? doc.name : { en: "Doctor", ar: "الطبيب" };
    if (MadaStore.get(DEMO_V + "-" + doctorId)) return;
    // Clear the older demo: every visit booked with this doctor, their medical requests, the demo files and notification state.
    // Call center sample bookings that were given to this doctor move to another doctor; visits opened in the portal are removed.
    const other = (DOCTORS.find(d => d.id !== doctorId) || {}).id || null;
    const gone = new Set(), list = all().filter(o => {
      const mine = o.drDemo || DEMO_PATIENTS.some(p => p.mrn === o.mrn) || (o.booking && o.booking.doctorId === doctorId && (!o.sample || o.doctorVisit));
      if (mine) { gone.add(o.id); return false; }
      if (o.booking && o.booking.doctorId === doctorId) o.booking = { ...o.booking, doctorId: other };
      return true;
    });
    const meds = MadaStore.getJSON("mada-medical", []).filter(r => !(gone.has(r.orderId) || r.doctorId === doctorId || r.drDemo || (r.sample && !r.orderId) || DEMO_PATIENTS.some(p => p.mrn === r.mrn)));
    const files = MadaStore.getJSON("mada-patients", []).filter(f => !(f.sample || f.source === "doctor" || DEMO_PATIENTS.some(p => p.mrn === f.fileNo || p.mobile === f.mobile)));
    let keys = []; try { keys = Object.keys(localStorage).filter(k => k.startsWith("mada-lab-demo-")); } catch (e) {}
    ["mada-dr-seen-" + doctorId, "mada-dr-family-demo", "mada-dr-demo-" + doctorId, "mada-dr-orders-demo-" + doctorId, "mada-dr-report-demo-" + doctorId, ...keys].forEach(k => MadaStore.set(k, null));

    const now = new Date().toISOString(), today = ymdOf(new Date());
    let mr = meds.reduce((m, r) => Math.max(m, parseInt(String(r.id).split("-")[1], 10) || 0), 7000);
    DEMO_PATIENTS.forEach((p, i) => {
      files.push({ fileNo: p.mrn, mobile: p.mobile, name: p.name, gender: p.gender, dateOfBirth: p.dob, idNumber: p.idNumber, idType: "national", openedFor: "self", sample: true, source: "sample", createdAt: now });
      const d = new Date(); d.setDate(d.getDate() - p.pastDays);
      const day = ymdOf(d), minute = 600 + i * 90, at = new Date(day + "T" + String(Math.floor(minute / 60)).padStart(2, "0") + ":" + String(minute % 60).padStart(2, "0") + ":00").toISOString();
      const staff = STAFF[i % STAFF.length], made = new Date(new Date(at).getTime() - 2 * 864e5).toISOString();
      const base = { sample: true, drDemo: true, service: "doctor", mobile: p.mobile, patient: p.name, mrn: p.mrn, medical: "non", decision: "approved", payment: "paid",
        staff, items: [], total: null, address: { ...ADDR0 } };
      const past = { ...base, id: "ORD-" + (20250901 + i), bookingId: "BK-" + (20250901 + i), status: "completed", createdAt: made, bookedAt: made, completedAt: at,
        appointment: { date: day, minute, nurse: null }, booking: { nurseId: null, doctorId, by: staff, at: made } };
      past.doctorVisit = demoVisit(i, at, by);
      past.doctorVisit.payment = { entries: DEMO_PAY[i].map((e, k) => ({ id: "p" + i + k, received: e.amount, ref: "", ...e, at: new Date(new Date(at).getTime() + (40 + k * 5) * 60000).toISOString(), by })) };
      list.push(past);
      meds.push(demoRequest(i, past, ++mr, doctorId, by));
      const booked = new Date(Date.now() - (20 - i * 4) * 3600000).toISOString();
      list.push({ ...base, id: "ORD-" + (20251001 + i), bookingId: "BK-" + (20251001 + i), status: "booked", createdAt: booked, bookedAt: booked,
        appointment: { date: today, minute: p.today, nurse: null }, booking: { nurseId: null, doctorId, by: staff, at: booked } });
    });
    save(list); MadaStore.setJSON("mada-medical", meds); MadaStore.setJSON("mada-patients", files);
    MadaStore.set(DEMO_V + "-" + doctorId, "1");
  }

  return { all, get, byReq, add, update, text, needsAction, sweepHolds, seedDoctorDemo, STAFF, PAY_MINUTES, CHECKS, OUTCOMES, CANCEL_OUTCOMES, CANCEL_REASONS, DOCTORS, DRIVERS, COVERAGE, coverageAt };
})();
