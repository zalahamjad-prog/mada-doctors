// Mada Care Medical Report: one report per completed doctor visit, built from what was written in the visit and the patient file.
// Nothing is typed again: personal details come from the patient file (or the identity confirmed on arrival), the clinical
// sections from order.doctorVisit (Case History, Vital Signs, Clinical Examination, Allergy History, Diagnosis, Orders,
// Medications and Treatment Plan) and lab or radiology results from the follow-up workflow (medical.js).
// MadaReport.html(order, lang, opt) gives the report page; MadaReport.download(order, lang, toast) saves it as a branded PDF.
// Before it can be viewed or downloaded the doctor approves it (doctor-reports.html, Review & Approve): per visit step they choose what shows,
// can change the text of a section, add their own sections (title + text) and show the patient's insurance company. Kept in
// order.doctorVisit.report: { status: "draft" | "approved", hidden: [visit step keys], edits: { en: { section: html }, ar: {...} },
//   custom: [{ id, title, text }], insurance: { show, name }, updatedAt, approvedAt, approvedBy }.
// The doctor's stamp (stamps.js, added by the admin on doctor-stamps.html) is read each time the report is drawn.
// Needs: orders.js, patients.js, doctor-history.js, doctor-exam.js, doctor-allergy.js, doctor-plan.js, doctor-orders.js, doctor-nurse.js,
// doctor-edu.js, doctor-idform.js (labels), stamps.js, and medical.js for results (optional).
// TODO: the backend should issue and keep the signed report so the same version can be sent again later.
const MadaReport = (() => {
  const LOGO = "data:image/png;base64,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";
  const R = {
    en: {
      title: "Medical Report", reportNo: "Report No.", issued: "Issued", patientT: "Patient Information", name: "Patient Name", fileNo: "Medical File No.", idNo: "ID Number",
      dob: "Date of Birth", age: "Age", years: "{n} years", gender: "Gender", g_m: "Male", g_f: "Female", mobile: "Mobile Number", nat: "Nationality",
      visitT: "Visit Information", visitDate: "Visit Date", visitNo: "Visit No.", doctor: "Doctor", specialty: "Specialty", place: "Place of Visit", home: "Home visit",
      s1: "History", s2: "Vital Signs", s3: "Clinical Examination", s4: "Diagnosis", s5: "Investigations", s6: "Medications", s7: "Treatment Plan",
      cc: "Chief Complaint", hpi: "History of Present Illness", pmh: "Past Medical History", medHx: "Medication History", allergy: "Allergies", social: "Personal & Social History", family: "Family History", ros: "Review of Systems",
      onset: "Onset", course: "Course", character: "Character", location: "Location", aggr: "Aggravating factors", relief: "Relieving factors", assoc: "Associated symptoms", notes: "Notes",
      duration: "Duration", severity: "Severity", pain: "Pain score", chronic: "Chronic conditions", surgeries: "Surgeries / admissions", current: "Current medications", previous: "Previous medications",
      nkda: "No known drug allergies", nka: "No known allergies", unkAllergy: "Allergy status not confirmed", occupation: "Occupation", marital: "Marital status", smoking: "Smoking",
      rosNeg: "All other systems reviewed and negative.", rosNone: "No positive findings.", ago: "{n} {u} ago",
      vital: "Measurement", value: "Value", normal: "Normal range", low: "Low", high: "High", ok: "Normal",
      general: "General Examination", local: "Local Examination", findings: "Findings",
      primary: "Primary diagnosis", additional: "Additional diagnoses", code: "ICD-10",
      test: "Test", result: "Result", range: "Reference range", status: "Status", pending: "Pending", ordered: "Ordered", approvedBy: "Reviewed by {n}", inReport: "See the lab report",
      radT: "Radiology", labT: "Laboratory",
      medicine: "Medicine", dose: "Dose", route: "Route", freq: "Frequency", dur: "Duration", instr: "Instructions", noMeds: "No medications prescribed.", prn: "As needed",
      goals: "Treatment goals", plan: "Plan details", followUp: "Follow-up", services: "Services ordered",
      sAl: "Allergies", sSvc: "Services Ordered", sNurse: "Nurse Note", sEdu: "Family Education", sIdf: "Identity Confirmation", insurance: "Insurance Company",
      nurseBy: "Written by {n}", idfBy: "Confirmed and signed by {n} on {d}", draftTag: "Draft · not approved yet", apprBy: "Approved by {n} on {d}", stampT: "Doctor's stamp",
      none: "Not recorded", sign: "Doctor's name", signNote: "Generated from the Mada Care medical record on {d}.", page: "Mada Care · Home healthcare",
      making: "Preparing the PDF…", done: "{f} downloaded.", fail: "Could not create the file here. Use Save as PDF in the print window.",
      refTitle: "Medical Referral", refNo: "Referral No.", refDate: "Referral Date", clinT: "Clinical Summary", measured: "Measured on {d}", vitNone: "Vital signs not recorded.", ccNone: "Not recorded",
      workDx: "Working diagnosis", refT: "Referral Details", rf_spec: "Specialty", rf_pri: "Priority", rf_routine: "Routine", rf_urgent: "Urgent", rf_dest: "Referred to", rf_mada: "Mada Care service", rf_ext: "External healthcare provider",
      rf_prov: "Preferred provider", rf_reason: "Reason for referral", rf_rec: "Clinical recommendation", rf_notes: "Additional notes", rf_by: "Referring doctor", refSign: "Signature", refNote: "Issued from the Mada Care medical record on {d}. Please present this form at the receiving facility."
    },
    ar: {
      title: "التقرير الطبي", reportNo: "رقم التقرير", issued: "تاريخ الإصدار", patientT: "بيانات المريض", name: "اسم المريض", fileNo: "رقم الملف الطبي", idNo: "رقم الهوية",
      dob: "تاريخ الميلاد", age: "العمر", years: "{n} سنة", gender: "الجنس", g_m: "ذكر", g_f: "أنثى", mobile: "رقم الجوال", nat: "الجنسية",
      visitT: "بيانات الزيارة", visitDate: "تاريخ الزيارة", visitNo: "رقم الزيارة", doctor: "الطبيب", specialty: "التخصص", place: "مكان الزيارة", home: "زيارة منزلية",
      s1: "التاريخ المرضي", s2: "العلامات الحيوية", s3: "الفحص السريري", s4: "التشخيص", s5: "الفحوصات", s6: "الأدوية", s7: "الخطة العلاجية",
      cc: "الشكوى الرئيسية", hpi: "تاريخ المرض الحالي", pmh: "التاريخ المرضي السابق", medHx: "التاريخ الدوائي", allergy: "الحساسية", social: "التاريخ الشخصي والاجتماعي", family: "التاريخ العائلي", ros: "مراجعة الأجهزة",
      onset: "البداية", course: "المسار", character: "الوصف", location: "المكان", aggr: "يزيد مع", relief: "يخف مع", assoc: "أعراض مصاحبة", notes: "ملاحظات",
      duration: "المدة", severity: "الشدة", pain: "درجة الألم", chronic: "الأمراض المزمنة", surgeries: "العمليات / التنويم", current: "الأدوية الحالية", previous: "الأدوية السابقة",
      nkda: "لا توجد حساسية أدوية معروفة", nka: "لا توجد حساسية معروفة", unkAllergy: "حالة الحساسية غير مؤكدة", occupation: "الوظيفة", marital: "الحالة الاجتماعية", smoking: "التدخين",
      rosNeg: "باقي الأجهزة تمت مراجعتها وسليمة.", rosNone: "لا توجد نتائج إيجابية.", ago: "قبل {n} {u}",
      vital: "القياس", value: "القيمة", normal: "المعدل الطبيعي", low: "منخفض", high: "مرتفع", ok: "طبيعي",
      general: "الفحص العام", local: "الفحص الموضعي", findings: "النتائج",
      primary: "التشخيص الرئيسي", additional: "تشخيصات إضافية", code: "ICD-10",
      test: "الفحص", result: "النتيجة", range: "المعدل الطبيعي", status: "الحالة", pending: "بانتظار النتيجة", ordered: "تم الطلب", approvedBy: "راجعها {n}", inReport: "في تقرير المختبر",
      radT: "الأشعة", labT: "المختبر",
      medicine: "الدواء", dose: "الجرعة", route: "الطريقة", freq: "التكرار", dur: "المدة", instr: "التعليمات", noMeds: "لم تُوصف أدوية.", prn: "عند الحاجة",
      goals: "أهداف العلاج", plan: "تفاصيل الخطة", followUp: "المتابعة", services: "الخدمات المطلوبة",
      sAl: "الحساسية", sSvc: "الخدمات المطلوبة", sNurse: "ملاحظة الممرضة", sEdu: "تثقيف الأسرة", sIdf: "تأكيد الهوية", insurance: "شركة التأمين",
      nurseBy: "كتبتها {n}", idfBy: "أكّدها ووقّع عليها {n} بتاريخ {d}", draftTag: "مسودة · لم يُعتمد بعد", apprBy: "اعتمده {n} بتاريخ {d}", stampT: "ختم الطبيب",
      none: "غير مسجل", sign: "اسم الطبيب", signNote: "صدر من السجل الطبي لمدى كير بتاريخ {d}.", page: "مدى كير · رعاية صحية منزلية",
      making: "جاري تجهيز الملف…", done: "تم تحميل {f}.", fail: "تعذر إنشاء الملف هنا. استخدم حفظ كـ PDF من نافذة الطباعة.",
      refTitle: "نموذج تحويل طبي", refNo: "رقم التحويل", refDate: "تاريخ التحويل", clinT: "الملخص السريري", measured: "وقت القياس: {d}", vitNone: "لم تُسجل العلامات الحيوية.", ccNone: "غير مسجلة",
      workDx: "التشخيص المبدئي", refT: "تفاصيل التحويل", rf_spec: "التخصص", rf_pri: "الأولوية", rf_routine: "عادي", rf_urgent: "عاجل", rf_dest: "جهة التحويل", rf_mada: "خدمة من مدى كير", rf_ext: "جهة صحية خارجية",
      rf_prov: "مقدم الخدمة المفضل", rf_reason: "سبب التحويل", rf_rec: "التوصية السريرية", rf_notes: "ملاحظات إضافية", rf_by: "الطبيب المحوّل", refSign: "التوقيع", refNote: "صادر من السجل الطبي لمدى كير بتاريخ {d}. يُرجى تقديم هذا النموذج لدى الجهة المحوَّل إليها."
    }
  };
  // Same ranges as the Vital Signs step (doctor-visit.html).
  const VITALS = [
    { k: "temp", en: "Temperature", ar: "الحرارة", unit: "°C", lo: 36, hi: 37.9, rng: "36 - 37.9" }, { k: "bp", en: "Blood Pressure", ar: "ضغط الدم", unit: "mmHg", rng: "90/60 - 139/89" },
    { k: "hr", en: "Heart Rate", ar: "النبض", unit: "bpm", lo: 60, hi: 100, rng: "60 - 100" }, { k: "spo2", en: "Oxygen (SpO₂)", ar: "الأكسجين (SpO₂)", unit: "%", lo: 94, hi: 100, rng: "94 - 100" },
    { k: "rr", en: "Respiratory Rate", ar: "معدل التنفس", unit: "/min", lo: 12, hi: 20, rng: "12 - 20" }, { k: "sugar", en: "Blood Sugar", ar: "سكر الدم", unit: "mg/dL", lo: 70, hi: 180, rng: "70 - 180" }
  ];
  const EXAM_SYS = ["appear", "cv", "resp", "abd", "neuro", "skin"], ROS = ["const", "cv", "resp", "gi", "gu", "msk", "neuro", "skin", "ent", "endo", "heme", "psych", "other"];
  const G = "#0b6b5c", GD = "#07463d", INK = "#10232b", MU = "#6b7a80", LINE = "#e3e8ea", SOFT = "#f4f8f7", GOLD = "#c8a45a";

  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const nm = v => v && typeof v === "object" ? v : { en: v || "", ar: v || "" };
  const has = v => v != null && String(v).trim() !== "";

  // Everything the report shows, read from the order, the patient file and the follow-up workflow.
  function data(o) {
    const dv = o.doctorVisit || {}, st = dv.steps || {}, f = (typeof MadaPatients !== "undefined" && (MadaPatients.get(o.mrn) || MadaPatients.sample(o.mrn))) || {}, arr = st.arrival || {};
    const doc = (MadaOrders.DOCTORS || []).find(d => d.id === (o.booking && o.booking.doctorId)) || null;
    const reqs = typeof MadaMedical !== "undefined" ? MadaMedical.byOrder(o.id) : [];
    return { o, dv, st, hist: dv.history || {}, reqs, doc,
      p: { name: nm(f.name || o.patient), fileNo: o.mrn || f.fileNo, idNumber: f.idNumber || arr.idNumber || "", idType: f.idType || "", dob: f.dateOfBirth || arr.dob || "",
        age: f.dateOfBirth || arr.dob ? MadaPatients.ageOf(f.dateOfBirth || arr.dob) : f.age || f.approxAge || "", gender: f.gender || "", mobile: f.mobile || o.mobile || "", nat: f.nationality || "" },
      date: String((o.appointment && o.appointment.date) || dv.completedAt || o.createdAt || "") };
  }

  // opt: { rp: report settings (default: the saved ones), edit: true draws the section texts as editable (approval screen) }.
  function html(o, lang, opt) {
    opt = opt || {};
    const d = data(o), t = R[lang], rtl = lang === "ar", al = rtl ? "right" : "left", rp = opt.rp || (o.doctorVisit || {}).report || {};
    const H = typeof DrHistory !== "undefined" ? DrHistory.L[lang] : {}, X = typeof DrExam !== "undefined" ? DrExam.L[lang] : {}, A = typeof DrAllergy !== "undefined" ? DrAllergy.L[lang] : {}, P = typeof DrPlan !== "undefined" ? DrPlan.L[lang] : {};
    const lb = (dict, k, fb) => dict[k] || fb || k;
    const loc = rtl ? "ar-SA-u-nu-latn-ca-gregory" : "en-GB";
    const fmtD = s => { if (!s) return ""; const dt = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + "T00:00") : new Date(s); return dt.toLocaleDateString(loc, { day: "numeric", month: "long", year: "numeric" }); };
    const ltr = v => `<span dir="ltr" style="unicode-bidi:isolate">${esc(v)}</span>`;
    const txt = v => `<span dir="auto" style="unicode-bidi:plaintext">${esc(v)}</span>`;
    const kv = (k, v) => `<div style="flex:1 1 30%;min-width:130px;padding:6px 0"><div style="color:${MU};font-size:10.5px">${k}</div><div style="font-weight:600;color:${INK};font-size:12.5px;margin-top:1px">${v || `<span style="color:${MU};font-weight:400">—</span>`}</div></div>`;
    const sub = (k, v) => v ? `<div class="pdf-avoid" style="margin-top:8px;break-inside:avoid;page-break-inside:avoid"><div style="font-size:11.5px;font-weight:700;color:${GD};margin-bottom:2px">${k}</div><div style="font-size:12px;color:#2c3d43;line-height:1.7">${v}</div></div>` : "";
    const line = (k, v) => v ? `<div style="font-size:12px;line-height:1.7;color:#2c3d43"><span style="color:${MU}">${k}:</span> ${v}</div>` : "";
    const chips = list => list.filter(Boolean).map(x => `<span style="display:inline-block;margin:2px 0;margin-${rtl ? "left" : "right"}:6px;padding:1px 8px;border-radius:10px;background:${SOFT};border:1px solid ${LINE};font-size:11px;color:${INK}">${esc(x)}</span>`).join("");
    const empty = `<div style="font-size:12px;color:${MU}">${t.none}</div>`;
    const ic = p => `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${G}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
    const SEC_IC = {
      s1: '<path d="M12 8v4l3 2"/><path d="M3.5 12a8.5 8.5 0 1 0 2.5-6"/><path d="M3 4v4h4"/>', s2: '<path d="M3 12h4l2-5 4 10 2-5h6"/>',
      s3: '<path d="M6 3v6a4 4 0 0 0 8 0V3"/><path d="M10 13v2a5 5 0 0 0 10 0v-2"/><circle cx="20" cy="11" r="2"/>', s4: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 11h6M9 15h4"/>',
      s5: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/>', s6: '<rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-45 12 12)"/><path d="m9.5 9.5 5 5"/>',
      s7: '<path d="M4 6h16M4 12h16M4 18h10"/>', pt: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
      al: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>', svc: '<path d="M4 6h16M4 12h16M4 18h16"/><path d="M8 3v6M16 9v6M11 15v6"/>',
      nurse: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/><path d="M9 12h6M9 16h4"/>', edu: '<path d="M3 8.5 12 4l9 4.5-9 4.5z"/><path d="M7 10.5V15c0 1.5 2.2 3 5 3s5-1.5 5-3v-4.5"/>',
      idf: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6 16c.6-1.5 1.7-2.2 3-2.2s2.4.7 3 2.2M14 10h4M14 13h3"/>', cu: '<path d="M4 20h4L19 9l-4-4L4 16z"/>', vs: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'
    };
    // sec: the section key; its text can be changed on the approval screen (rp.edits) and is then shown as the doctor wrote it.
    const card = (k, title, body, sec) => { const ed = sec && ((rp.edits || {})[lang] || {})[sec];
      return `<div style="border:1px solid ${LINE};border-radius:12px;padding:12px 16px;margin-top:10px;background:#fff">
      <div class="pdf-avoid" style="display:flex;align-items:center;gap:8px;margin-bottom:6px;break-inside:avoid;page-break-inside:avoid;break-after:avoid;page-break-after:avoid"><span style="width:28px;height:28px;border-radius:8px;background:#e6f3ef;display:inline-flex;align-items:center;justify-content:center">${ic(SEC_IC[k])}</span><span style="font-size:14px;font-weight:700;color:${INK}">${title}</span></div>${
        sec ? `<div data-sec="${sec}" ${opt.edit ? `class="mr-ed${ed != null ? " edited" : ""}" contenteditable="true" spellcheck="false"` : ""}>${ed != null ? clean(ed) : body}</div>` : body}</div>`; };
    const table = (heads, rows) => `<table style="width:100%;border-collapse:collapse;font-size:11.5px;margin-top:4px"><thead><tr>${heads.map(h => `<th style="text-align:${al};padding:6px 8px;background:${SOFT};color:${MU};font-weight:600;border-bottom:1px solid ${LINE}">${h}</th>`).join("")}</tr></thead>
      <tbody>${rows.map(r => `<tr class="pdf-avoid" style="break-inside:avoid;page-break-inside:avoid">${r.map(c => `<td style="padding:6px 8px;border-bottom:1px solid #f0f3f4;color:#2c3d43;vertical-align:top">${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    const flag = s => s ? `<span style="display:inline-block;padding:0 7px;border-radius:8px;font-size:10.5px;font-weight:700;${s === "ok" || s === "normal" ? "background:#e7f6ec;color:#15803d" : s === "critical" ? "background:#fdecec;color:#dc2626" : "background:#fef3e2;color:#b45309"}">${s === "ok" || s === "normal" ? t.ok : s === "low" ? t.low : s === "critical" ? (rtl ? "حرج" : "Critical") : t.high}</span>` : "";
    const ok = s => s && !s.draft;

    // 1. History
    const h = d.hist, hx = [];
    if (ok(h.complaint) && (h.complaint.items || []).length) hx.push(sub(t.cc, h.complaint.items.map(c => `<div>${c.type ? `<b>${esc(lb(H, "t_" + c.type, c.type))}:</b> ` : ""}${txt(c.text)}${
      [c.durMode === "set" && c.durN ? `${t.duration}: ${esc(c.durN)} ${esc(lb(H, "u_" + c.durU, c.durU))}` : "", c.severity ? `${t.severity}: ${esc(lb(H, "sv_" + c.severity, c.severity))}` : "", has(c.pain) ? `${t.pain}: ${ltr(c.pain + "/10")}` : ""].filter(Boolean).map(x => ` <span style="color:${MU}">· ${x}</span>`).join("")}${c.details ? `<div style="color:${MU}">${txt(c.details)}</div>` : ""}</div>`).join("")));
    if (ok(h.hpi)) { const x = h.hpi;
      const onset = x.onsetUnknown ? lb(H, "unknown") : x.onsetDate ? fmtD(x.onsetDate) : x.onsetN ? tx(t.ago, { n: x.onsetN, u: lb(H, "u_" + x.onsetU, x.onsetU) }) : "";
      const where = x.locNA ? lb(H, "notApplicable") : [x.location, ...(x.body || []).map(b => lb(H, "b_" + b, b))].filter(Boolean).join(", ");
      hx.push(sub(t.hpi, [line(t.onset, esc(onset)), line(t.course, esc((x.course || []).map(c => lb(H, "c_" + c, c)).join(", "))), line(t.character, x.character && txt(x.character)), line(t.location, where && txt(where)),
        line(t.aggr, x.aggr && txt(x.aggr)), line(t.relief, x.relief && txt(x.relief)), line(t.assoc, esc((x.assoc || []).map(a => lb(H, "a_" + a, a)).join(", "))), line(t.notes, x.notes && txt(x.notes))].join(""))); }
    if (ok(h.pmh)) { const x = h.pmh; hx.push(sub(t.pmh, line(t.chronic, esc((x.chronic || []).map(c => lb(H, "ch_" + c, c)).join(", "))) + line(t.surgeries, x.surgeries && txt(x.surgeries)))); }
    if (ok(h.meds)) { const x = h.meds;
      const cur = x.status === "current" ? (x.current || []).filter(m => m.name).map(m => [m.name, m.dose, m.freq].filter(Boolean).join(" · ")).join(rtl ? "، " : ", ") : x.status ? lb(H, "ms_" + x.status) : "";
      hx.push(sub(t.medHx, line(t.current, cur && txt(cur)) + line(t.previous, (x.previous || []).filter(m => m.name).length ? txt(x.previous.filter(m => m.name).map(m => m.name + (m.note ? ` (${m.note})` : "")).join(", ")) : ""))); }
    // Allergies: the Allergy History step, or the drug allergies from Medication History.
    const al_ = st => {
      const s = d.st.allergy;
      if (s && s.status === "yes" && (s.items || []).length) return s.items.map(it => `<div>• <b>${esc(typeof DrAllergy !== "undefined" ? DrAllergy.nameIn(it, lang) : it.id)}</b>${it.cat ? ` <span style="color:${MU}">(${esc(lb(A, "c_" + it.cat, it.cat))})</span>` : ""}${
        [(it.reactions || []).map(r => typeof DrAllergy !== "undefined" ? DrAllergy.nameIn({ id: r }, lang) : r).join(", "), it.severity ? lb(A, "sv_" + it.severity, it.severity) : "", it.notes].filter(Boolean).map(v => ` <span style="color:${MU}">· ${txt(v)}</span>`).join("")}</div>`).join("");
      if (s && s.status === "no") return esc(t.nka);
      if (s && s.status === "unknown") return esc(t.unkAllergy);
      const m = h.meds; if (m && m.nkda) return esc(t.nkda);
      if (m && (m.allergies || []).length) return m.allergies.map(a => `<div>• <b>${txt(a.drug)}</b>${a.reaction ? ` <span style="color:${MU}">· ${txt(a.reaction)}</span>` : ""}</div>`).join("");
      return "";
    };
    const alg = al_();
    if (ok(h.social)) { const x = h.social; const v = [line(t.occupation, x.occupation && txt(x.occupation)), line(t.marital, x.marital && esc(lb(H, "m_" + x.marital))), line(t.smoking, x.smoking && esc(lb(H, "sm_" + x.smoking))), line(t.notes, x.notes && txt(x.notes))].join(""); if (v) hx.push(sub(t.social, v)); }
    if (ok(h.family)) { const x = h.family; const v = x.status === "present" ? line(lb(H, "famCond"), esc((x.conditions || []).map(c => lb(H, "fc_" + c, c)).join(", "))) + line(t.notes, x.notes && txt(x.notes)) : x.status ? esc(lb(H, "fs_" + x.status)) : ""; if (v) hx.push(sub(t.family, v)); }
    if (ok(h.ros)) { const sys = h.ros.sys || {}, pos = ROS.filter(k => sys[k] && sys[k].v === "pos"), neg = ROS.filter(k => sys[k] && sys[k].v === "neg");
      if (pos.length || neg.length) hx.push(sub(t.ros, (pos.length ? pos.map(k => `<div>• <b>${esc(lb(H, "ros_" + k, k))}</b>${sys[k].note ? `: ${txt(sys[k].note)}` : ""}</div>`).join("") : esc(t.rosNone)) + (neg.length ? `<div style="color:${MU}">${esc(t.rosNeg)}</div>` : ""))); }

    // 2. Vital signs
    const vs = d.st.vitals || {};
    const vState = (v, val) => { if (!has(val)) return ""; if (v.k === "bp") { const m = String(val).match(/^(\d+)\/(\d+)$/); if (!m) return ""; return +m[1] >= 140 || +m[2] >= 90 ? "high" : +m[1] < 90 || +m[2] < 60 ? "low" : "ok"; } return +val < v.lo ? "low" : +val > v.hi ? "high" : "ok"; };
    const vrows = VITALS.filter(v => has(vs[v.k])).map(v => [esc(v[lang]), `<b>${ltr(vs[v.k])}</b> <span style="color:${MU}">${ltr(v.unit)}</span>`, `<span style="color:${MU}">${ltr(v.rng)}</span>`, flag(vState(v, vs[v.k]))]);

    // 3. Examination
    const ex = d.st.exam || {}, gen = ex.general || {};
    const grows = EXAM_SYS.filter(k => gen[k] && gen[k].status).map(k => { const g = gen[k];
      return [`<b>${esc(lb(X, "sys_" + k, k))}</b>`, esc(lb(X, "st_" + g.status, g.status)), [(g.findings || []).map(f => lb(X, "f_" + f, f)).join(", "), g.notes].filter(Boolean).map(txt).join(" · ") || "—"]; });
    const regions = (ex.regions || []).filter(r => r.region).map(r => `<div style="margin-top:6px;font-size:12px;line-height:1.7"><b>${esc(lb(X, "r_" + r.region, r.region))}</b>${["insp", "palp", "ausc"].map(g => { const x = r[g] || {}, v = [(x.f || []).map(f => lb(X, "f_" + f, f)).join(", "), x.notes].filter(Boolean).join(" · "); return v ? `<div><span style="color:${MU}">${esc(lb(X, "g_" + g, g))}:</span> ${txt(v)}</div>` : ""; }).join("")}${r.extra ? `<div><span style="color:${MU}">${esc(lb(X, "extra"))}:</span> ${txt(r.extra)}</div>` : ""}${
      (r.photos || []).length ? `<div style="display:flex;gap:6px;margin-top:4px">${r.photos.slice(0, 4).map(p => `<img src="${p}" style="width:80px;height:60px;object-fit:cover;border-radius:6px;border:1px solid ${LINE}" alt="">`).join("")}</div>` : ""}</div>`).join("");

    // 4. Diagnosis
    const dx = d.st.assess || {}, dxName = x => x ? `${x.code ? `<span dir="ltr" style="unicode-bidi:isolate;display:inline-block;padding:0 6px;border-radius:6px;background:#e6f3ef;color:${G};font-weight:700;font-size:11px;margin-${rtl ? "left" : "right"}:6px">${esc(x.code)}</span>` : ""}${txt(x[lang] || x.en || x.ar)}` : "";

    // 5. Investigations: labs and radiology ordered in the visit, with results when the workflow has them.
    const ordItems = ((d.st.orders || {}).items || []), labItems = d.reqs.flatMap(r => r.items.filter(i => i.type === "lab")), radItems = d.reqs.flatMap(r => r.items.filter(i => i.type === "radiology"));
    const iName = c => { const r = typeof DrOrders !== "undefined" && DrOrders.item(c); return r ? r[lang] : c; };
    const stepOf = it => MadaMedical.STEPS[it.type][it.step];
    const reviewer = it => { const l = [...it.log].reverse().find(x => MadaMedical.STEPS[it.type][x.step] === "reviewed"); return l ? nm(l.by)[lang] || nm(l.by).en : ""; };
    let inv = "";
    const labCodes = [...new Set(ordItems.filter(x => x.svc === "lab").flatMap(x => typeof DrOrders !== "undefined" ? DrOrders.labTests(x.code) : [x.code]))];
    if (labCodes.length || labItems.length) {
      const rows = [], it = labItems[0], res = (it && it.results) || {}, entered = it && it.step >= 3;
      const codes = labCodes.length ? labCodes : (it.orderCodes || []);
      codes.forEach(c => { const an = typeof MadaMedical !== "undefined" && MadaMedical.CATALOG[c] ? MadaMedical.ANALYTES[MadaMedical.CATALOG[c]] || [] : [];
        if (!an.length) rows.push([`<b>${esc(iName(c))}</b> <span style="color:${MU}">${ltr(c)}</span>`, entered ? `<span style="color:${MU}">${t.inReport}</span>` : `<span style="color:#b45309">${t.pending}</span>`, "", ""]);
        else an.forEach((a, i) => { const v = res[a.code], hv = has(v);
          rows.push([`${i ? "" : `<b>${esc(iName(c))}</b><br>`}<span style="color:${MU}">${esc(a.name[lang])}</span>`, hv ? `<b>${ltr(v)}</b> <span style="color:${MU}">${ltr(a.unit)}</span>` : `<span style="color:#b45309">${t.pending}</span>`,
            `<span style="color:${MU}">${ltr((a.low ? a.low + " - " + a.high : "< " + a.high) + " " + a.unit)}</span>`, hv ? flag(MadaMedical.labStatus(a, v)) : ""]); }); });
      inv += `<div style="font-size:12px;font-weight:700;color:${GD};margin-top:4px">${t.labT}${it && reviewer(it) ? ` <span style="font-weight:400;color:${MU}">· ${esc(tx(t.approvedBy, { n: reviewer(it) }))}</span>` : ""}</div>${table([t.test, t.result, t.range, t.status], rows)}`;
    }
    const rads = ordItems.filter(x => x.svc === "rad");
    if (rads.length || radItems.length) {
      const list = rads.length ? rads.map(x => ({ code: x.code, it: radItems.find(i => (i.orderCodes || []).includes(x.code)) })) : radItems.map(i => ({ code: (i.orderCodes || [])[0], it: i, title: i.title }));
      inv += `<div style="font-size:12px;font-weight:700;color:${GD};margin-top:10px">${t.radT}</div>` + list.map(({ code, it, title }) => { const rl = it && [...it.log].reverse().find(l => MadaMedical.STEPS.radiology[l.step] === "resulted"), r = rl && rl.data && rl.data.result;
        return `<div style="font-size:12px;line-height:1.7;margin-top:4px">• <b>${esc(code ? iName(code) : nm(title)[lang])}</b>${code ? ` <span style="color:${MU}">${ltr(code)}</span>` : ""}: ${r ? txt(r) : `<span style="color:#b45309">${t.pending}</span>`}${it && reviewer(it) ? ` <span style="color:${MU}">· ${esc(tx(t.approvedBy, { n: reviewer(it) }))}</span>` : ""}</div>`; }).join("");
    }

    // 6. Medications
    const pl = d.st.plan || {}, meds = pl.meds || [];
    const mrows = meds.map(m => [`<b>${txt((m.generic && (m.generic[lang] || m.generic.en)) || m.name)}</b>${m.strength ? ` ${ltr(m.strength)}` : ""}${m.form ? `<br><span style="color:${MU}">${esc(lb(P, "f_" + m.form, m.form))}</span>` : ""}`,
      esc(`${m.doseN || ""} ${lb(P, "us_" + m.doseU, m.doseU || "")}`.trim()), esc(lb(P, "r_" + m.route, m.route || "")), esc(m.prn ? `${t.prn}${m.prnFor ? " · " + m.prnFor : ""}` : lb(P, "q_" + m.freq, m.freq || "")),
      esc(m.durU === "ongoing" ? lb(P, "ongoing") : m.durN ? `${m.durN} ${lb(P, "ds_" + m.durU, m.durU)}` : "—"), m.instr ? txt(m.instr) : "—"]);

    // 7. Plan
    const goals = (pl.goals || []).map(g => { const c = typeof DrPlan !== "undefined" && (DrPlan.GOALS || []).find(x => x[0] === g.id); return c ? c[rtl ? 2 : 1] : g.text; }).filter(Boolean);
    const details = planText(pl.details);
    const svcs = ordItems.filter(x => !["lab", "rad"].includes(x.svc)).map(x => typeof DrOrders !== "undefined" ? DrOrders.titleOf(x)[lang] : x.code);

    // 9. Nurse note, 10. Family education, 11. Identity confirmation
    const nu = d.st.nurse || {}, NU = typeof DrNurse !== "undefined" ? DrNurse.L[lang] : {};
    const nurseBody = nu.none ? `<div style="font-size:12px">${esc(NU.none || t.none)}</div>` : nu.note ? `<div style="font-size:12px;line-height:1.7;white-space:pre-line">${txt(nu.note)}</div>${nu.nurse ? `<div style="font-size:11px;color:${MU};margin-top:4px">${esc(tx(t.nurseBy, { n: nm(nu.nurse)[lang] || nm(nu.nurse).en }))}</div>` : ""}` : empty;
    const ed = d.st.edu || {}, EL = typeof DrEdu !== "undefined" ? DrEdu.L[lang] : {};
    const eduBody = ed.none ? `<div style="font-size:12px">${esc(EL.none || t.none)}</div>` : ed.at ? [line(EL.sDate || "Date", ed.date && esc(fmtD(ed.date))), line(EL.sMethod || "Method", ed.method && esc(lb(EL, "m_" + ed.method, ed.method))),
      line(EL.sWho || "Educated", esc((ed.who || []).map(w => lb(EL, "w_" + w, w)).concat(ed.whoOther ? [ed.whoOther] : []).join(rtl ? "، " : ", "))),
      line(EL.sDiff || "Understanding", ed.difficulty && esc(ed.difficulty === "yes" ? lb(EL, "hadDiff") + (ed.diffNote ? " · " + ed.diffNote : "") : lb(EL, "noDiff"))),
      sub(EL.sTopics || "Topics", ((ed.topics || []).map(x => typeof DrEdu !== "undefined" ? DrEdu.topicIn(x, lang) : x).concat(ed.custom || [], ed.otherTopic ? [ed.otherTopic] : [])).map(x => `<div>• ${txt(x)}</div>`).join("")),
      line(EL.sNotes || "Notes", ed.notes && txt(ed.notes))].join("") : empty;
    const idf = d.st.idform, IL = typeof DrIdForm !== "undefined" ? DrIdForm.L[lang] : {};
    const idfBody = idf ? `<div style="display:flex;flex-wrap:wrap;column-gap:16px">${kv(lb(IL, "name"), txt(idf.name))}${kv(lb(IL, "nat"), esc(lb(IL, "nat_" + idf.nationality, idf.nationality)))}${kv(lb(IL, "idType"), esc(lb(IL, "id_" + idf.idType, idf.idType)))}
        ${kv(lb(IL, "idNo"), ltr(idf.idNumber))}${kv(lb(IL, "exp"), esc(fmtD(idf.idExpiry)))}${kv(lb(IL, "birthPlace"), txt(idf.birthPlace))}${kv(lb(IL, "employer"), txt(idf.employer))}${kv(lb(IL, "marital"), esc(lb(IL, "ms_" + idf.marital, idf.marital)))}</div>
        <div style="font-size:11px;color:${MU};margin-top:4px">${esc(tx(t.idfBy, { n: idf.signerName, d: fmtD(idf.at) }))}</div>` : empty;

    const pt = d.p, doc = d.doc, now = new Date().toISOString(), hid = new Set(rp.hidden || STEP_KEYS.filter(k => !stepHas(o, k)));
    const ins = rp.insurance && rp.insurance.show && has(rp.insurance.name) ? rp.insurance.name : "";
    const stamp = doc && typeof MadaStamps !== "undefined" ? MadaStamps.get(doc.id) : null, approved = rp.status === "approved";
    // Clinical sections in report order, each tied to the visit step it comes from; the doctor's own sections follow.
    const SEC = [
      ["hx", "history", "s1", t.s1, hx.join("") || empty], ["al", "allergy", "al", t.sAl, alg || empty], ["vit", "vitals", "s2", t.s2, vrows.length ? table([t.vital, t.value, t.normal, t.status], vrows) : empty],
      ["ex", "exam", "s3", t.s3, (grows.length ? `<div style="font-size:12px;font-weight:700;color:${GD}">${t.general}</div>${table([rtl ? "الجهاز" : "System", t.status, t.findings], grows)}` : "") + (regions ? `<div style="font-size:12px;font-weight:700;color:${GD};margin-top:10px">${t.local}</div>${regions}` : "") || empty],
      ["dx", "assess", "s4", t.s4, dx.primary ? sub(t.primary, dxName(dx.primary)) + ((dx.additional || []).length ? sub(t.additional, dx.additional.map(x => `<div>• ${dxName(x)}</div>`).join("")) : "") + (dx.notes ? sub(t.notes, txt(dx.notes)) : "") : empty],
      ["inv", "orders", "s5", t.s5, inv || empty],
      ["meds", "plan", "s6", t.s6, mrows.length ? table([t.medicine, t.dose, t.route, t.freq, t.dur, t.instr], mrows) : pl.none ? `<div style="font-size:12px">${t.noMeds}</div>` : empty],
      ["plan", "plan", "s7", t.s7, (goals.length ? sub(t.goals, goals.map(g => `<div>• ${txt(g)}</div>`).join("")) : "") + (details ? sub(t.plan, details) : "") + (pl.followUp ? sub(t.followUp, txt(pl.followUp)) : "") || empty],
      ["svc", "orders", "svc", t.sSvc, svcs.length ? svcs.map(s => `<div style="font-size:12px;line-height:1.7">• ${txt(s)}</div>`).join("") : null],
      ["nurse", "nurse", "nurse", t.sNurse, nurseBody], ["edu", "edu", "edu", t.sEdu, eduBody], ["idf", "idform", "idf", t.sIdf, idfBody]
    ].filter(x => !hid.has(x[1]) && (x[4] != null || ((rp.edits || {})[lang] || {})[x[0]] != null));
    let n = 0;
    const secs = SEC.map(x => card(x[2], `${++n}. ${x[3]}`, x[4], x[0])).join("")
      + (rp.custom || []).filter(c => has(c.title) || has(c.text)).map(c => card("cu", `${++n}. ${txt(c.title)}`, `<div style="font-size:12px;line-height:1.7;white-space:pre-line">${txt(c.text)}</div>`)).join("");
    return `<div class="mr-doc" dir="${rtl ? "rtl" : "ltr"}" lang="${lang}" style="width:794px;max-width:100%;margin:0 auto;background:#fff;color:${INK};font-family:${rtl ? "Tajawal, Inter" : "Inter, Tajawal"}, Arial, sans-serif;text-align:${al};box-sizing:border-box">
      <div style="background:linear-gradient(120deg, ${GD}, ${G});color:#fff;padding:18px 24px;display:flex;align-items:center;gap:14px;border-radius:0 0 18px 18px">
        <span style="width:58px;height:58px;border-radius:50%;background:#fff;display:inline-flex;align-items:center;justify-content:center;flex:none"><img src="${LOGO}" style="height:40px;width:auto" alt=""></span>
        <div style="flex:1"><div style="font-size:20px;font-weight:700">Mada Care <span style="font-weight:500">| مدى كير</span></div><div style="font-size:11.5px;opacity:.85">${rtl ? "رعاية كالعائلة" : "Caring Like Family"}</div></div>
        <div style="text-align:${rtl ? "left" : "right"}"><div style="font-size:18px;font-weight:700">${t.title}</div><div style="font-size:11px;opacity:.85">${t.reportNo}: ${ltr("MR-" + o.id.replace(/^ORD-/, ""))}</div><div style="font-size:11px;opacity:.85">${t.issued}: ${esc(fmtD(approved ? rp.approvedAt : now))}</div></div>
      </div>
      <div style="height:3px;background:${GOLD};margin:0 40px;border-radius:2px"></div>
      ${approved ? "" : `<div style="margin:10px 20px 0;padding:6px 12px;border-radius:8px;background:#fef3e2;color:#b45309;font-size:11.5px;font-weight:700;text-align:center">${t.draftTag}</div>`}
      <div style="padding:6px 20px 16px">
        ${hid.has("arrival") ? "" : card("pt", t.patientT, `<div style="display:flex;flex-wrap:wrap;column-gap:16px">${kv(t.name, txt(pt.name[lang] || pt.name.en))}${kv(t.fileNo, pt.fileNo && ltr(pt.fileNo))}${kv(t.idNo, pt.idNumber && ltr(pt.idNumber))}
          ${kv(t.dob, pt.dob && esc(fmtD(pt.dob)))}${kv(t.age, has(pt.age) ? esc(tx(t.years, { n: pt.age })) : "")}${kv(t.gender, pt.gender ? t["g_" + pt.gender] : "")}${kv(t.mobile, pt.mobile && ltr(pt.mobile))}</div>`)}
        ${card("vs", t.visitT, `<div style="display:flex;flex-wrap:wrap;column-gap:16px">${kv(t.visitDate, esc(fmtD(d.date)))}${kv(t.visitNo, ltr(o.id))}${kv(t.doctor, doc ? esc(doc.name[lang]) : "")}${kv(t.specialty, doc ? esc(doc.spec[lang]) : "")}${kv(t.place, t.home)}${ins ? kv(t.insurance, txt(ins)) : ""}</div>`)}
        ${secs}
        <div class="pdf-avoid" style="break-inside:avoid;page-break-inside:avoid;display:flex;justify-content:space-between;align-items:flex-end;gap:16px;margin-top:16px;padding-top:12px;border-top:1px solid ${LINE}">
          <div style="display:flex;align-items:flex-end;gap:16px"><div><div style="color:${MU};font-size:10.5px">${t.sign}</div><div style="font-weight:700;font-size:13px">${doc ? esc(doc.name[lang]) : ""}</div><div style="color:${MU};font-size:11px">${doc ? esc(doc.spec[lang]) : ""}</div>
            ${approved ? `<div style="color:${G};font-size:11px;font-weight:600;margin-top:4px">${esc(tx(t.apprBy, { n: nm(rp.approvedBy)[lang] || nm(rp.approvedBy).en || (doc ? doc.name[lang] : ""), d: fmtD(rp.approvedAt) }))}</div>` : ""}</div>
            ${stamp ? `<img src="${esc(stamp.data)}" alt="${t.stampT}" style="max-height:96px;max-width:170px;object-fit:contain">` : ""}</div>
          <div style="color:${MU};font-size:10.5px;text-align:${rtl ? "left" : "right"}">${esc(tx(t.signNote, { d: fmtD(approved ? rp.approvedAt : now) }))}<br>${t.page}</div>
        </div>
      </div></div>`;
  }
  // Visit steps the doctor can show or hide in the report (Patient Consent is not one of them), and whether the visit has anything saved for them.
  const STEP_KEYS = ["arrival", "history", "vitals", "exam", "allergy", "assess", "plan", "orders", "nurse", "edu", "idform"];
  function stepHas(o, k) {
    const dv = o.doctorVisit || {}, s = (dv.steps || {})[k];
    if (k === "history") { const h = dv.history || {}; return Object.keys(h).some(x => h[x] && !h[x].draft); }
    if (k === "allergy") return !!(s && s.status) || !!((dv.history || {}).meds || {}).nkda;
    if (k === "nurse" || k === "edu") return !!(s && !s.none);
    if (k === "orders") return !!(s && (s.items || []).length);
    return !!s;
  }
  // Sections whose text the doctor can change (the key in rp.edits), by visit step.
  const STEP_SECS = { history: ["hx"], allergy: ["al"], vitals: ["vit"], exam: ["ex"], assess: ["dx"], orders: ["inv", "svc"], plan: ["meds", "plan"], nurse: ["nurse"], edu: ["edu"], idform: ["idf"] };
  // Edited section text comes from the doctor (contenteditable): only plain formatting, tables and data images are kept.
  const OK_TAGS = /^(B|STRONG|I|EM|U|BR|DIV|P|SPAN|UL|OL|LI|TABLE|THEAD|TBODY|TR|TH|TD|IMG|SUB|SUP)$/;
  function clean(h) {
    const doc = new DOMParser().parseFromString(`<div>${h}</div>`, "text/html"), root = doc.body.firstChild;
    const walk = el => [...el.children].forEach(c => {
      if (!OK_TAGS.test(c.tagName)) { if (/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|LINK|META|svg|SVG)$/.test(c.tagName)) c.remove(); else { walk(c); c.replaceWith(...c.childNodes); } return; }
      [...c.attributes].forEach(a => { const n = a.name.toLowerCase();
        if (n === "src" ? !/^data:image\/(png|jpe?g|webp);/i.test(a.value) : !["style", "dir", "colspan", "rowspan"].includes(n) || /url\(|expression|javascript:/i.test(a.value)) c.removeAttribute(a.name); });
      walk(c);
    });
    walk(root);
    return root.innerHTML;
  }
  const tx = (s, v) => s.replace(/\{(\w+)\}/g, (_, x) => v[x]);
  // The plan editor keeps limited HTML: shown here as plain text with its lines and list items.
  function planText(h) {
    if (!h) return "";
    const doc = new DOMParser().parseFromString(`<div>${h}</div>`, "text/html"), out = [];
    const walk = (n, pre) => n.childNodes.forEach(c => {
      if (c.nodeType === 3) { if (c.nodeValue.trim()) out.push({ t: c.nodeValue, pre }); return; }
      const tag = c.nodeName.toLowerCase();
      if (tag === "br") return out.push({ br: 1 });
      if (tag === "li") { out.push({ br: 1 }); return walk(c, "• "); }
      if (["p", "div", "ul", "ol"].includes(tag)) { out.push({ br: 1 }); walk(c, pre); return out.push({ br: 1 }); }
      walk(c, pre);
    });
    walk(doc.body.firstChild, "");
    let s = "", lineStart = true;
    out.forEach(x => { if (x.br) { if (!lineStart) { s += "\n"; lineStart = true; } return; } s += (lineStart && x.pre ? x.pre : "") + x.t; lineStart = false; });
    s = s.trim(); if (!s) return "";
    return s.split("\n").map(l => `<div dir="auto" style="unicode-bidi:plaintext">${esc(l)}</div>`).join("");
  }

  // ---------- PDF ----------
  const H2P = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
  const loadH2p = () => window.html2pdf ? Promise.resolve() : new Promise((ok, bad) => { const sc = document.createElement("script"); sc.src = H2P; sc.onload = ok; sc.onerror = bad; document.head.appendChild(sc); });
  const withTimeout = (pr, ms) => Promise.race([pr, new Promise((_, bad) => setTimeout(() => bad(new Error("timeout")), ms))]);
  // The PDF renderer draws each line left to right, which drops the spaces between Arabic words and moves punctuation:
  // every word gets its own box so the browser's layout is kept (same as the lab results PDF).
  // An English page (onlyAr) only splits text that has Arabic in it, such as a doctor's note, and keeps its brackets.
  function fixArabic(wrap, onlyAr) {
    const walk = document.createTreeWalker(wrap, NodeFilter.SHOW_TEXT), nodes = [];
    while (walk.nextNode()) if (walk.currentNode.nodeValue.trim() && (!onlyAr || /[\u0600-\u06ff]/.test(walk.currentNode.nodeValue))) nodes.push(walk.currentNode);
    nodes.forEach(nd => {
      const frag = document.createDocumentFragment();
      nd.nodeValue.split(/(\s+|[()،,.:·\-–]+)/).forEach(part => {
        if (!part) return;
        if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(part));
        else {
          const db = nd.parentElement && nd.parentElement.closest("[dir]"), ltrBox = onlyAr || (db && db.getAttribute("dir") === "ltr");
          const sp = document.createElement("span");
          sp.textContent = ltrBox ? part : part.replace(/[()]/g, c => c === "(" ? ")" : "(");
          frag.appendChild(sp);
        }
      });
      nd.replaceWith(frag);
    });
  }
  const fileName = o => `Mada-Care-Medical-Report-${o.id}.pdf`;
  const download = (o, lang, toast) => save(html(o, lang), fileName(o), lang, toast);
  async function save(page, file, lang, toast) {
    const t = R[lang], wrap = document.createElement("div");
    wrap.style.cssText = "position:fixed;left:-10000px;top:0;z-index:-1;width:794px";
    wrap.innerHTML = page;
    document.body.appendChild(wrap);
    if (toast) toast(t.making);
    fixArabic(wrap, lang !== "ar");
    // The page is drawn from the top: when the page is scrolled down the PDF comes out blank.
    const sy = window.scrollY; window.scrollTo(0, 0);
    try {
      await loadH2p();
      await withTimeout(window.html2pdf().set({ margin: [6, 6], filename: file, pagebreak: { mode: ["css", "legacy"], avoid: ".pdf-avoid" }, image: { type: "jpeg", quality: 0.96 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: "mm", format: "a4", orientation: "portrait" } }).from(wrap.firstElementChild).save(), 25000);
      if (toast) toast(tx(t.done, { f: file }));
      return true;
    } catch (e) {
      // No PDF library (offline): open the same page for the browser's "Save as PDF".
      const w = window.open("", "_blank");
      if (w) { w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${file}</title></head><body style="margin:0">${wrap.innerHTML}<script>onload=()=>print()<\/script></body></html>`); w.document.close(); }
      if (toast) toast(t.fail);
      return false;
    } finally { wrap.remove(); window.scrollTo(0, sy); }
  }
  // ---------- Referral form ----------
  // One page per referral item (medical.js type "referral"): the patient file, the visit's chief complaint and vital signs,
  // and the referral the doctor wrote (it.order from doctor-orders.js). o is the visit order; a referral without one shows what the request holds.
  function referral(o, r, it, lang) {
    o = o || { id: r.orderId || "", mrn: r.mrn, patient: r.patient, mobile: r.mobile, booking: { doctorId: r.doctorId } };
    const d = data(o), t = R[lang], rtl = lang === "ar", al = rtl ? "right" : "left", ar2 = rtl ? "left" : "right", ro = it.order || {};
    const H = typeof DrHistory !== "undefined" ? DrHistory.L[lang] : {}, lb = (dict, k, fb) => dict[k] || fb || k;
    const loc = rtl ? "ar-SA-u-nu-latn-ca-gregory" : "en-GB";
    const fmtD = s => { if (!s) return ""; const dt = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + "T00:00") : new Date(s); return isNaN(dt) ? "" : dt.toLocaleDateString(loc, { day: "numeric", month: "long", year: "numeric" }); };
    // Clock time as digits in a left-to-right box, with the Arabic AM/PM word outside it.
    const fmtT = s => { const dt = new Date(s); if (isNaN(dt)) return ""; const h = dt.getHours(), hm = `${h % 12 || 12}:${String(dt.getMinutes()).padStart(2, "0")}`;
      return rtl ? `${ltr(hm)} ${h < 12 ? "ص" : "م"}` : ltr(`${hm} ${h < 12 ? "AM" : "PM"}`); };
    // Numbers and codes in their own left-to-right box (no direction marks): Safari otherwise draws them over each other in the PDF.
    const ltr = v => `<span dir="ltr" style="display:inline-block">${esc(String(v).replace(/[⁦-⁩‎‏]/g, "")).replace(/ /g, "&nbsp;")}</span>`;
    const txt = v => `<span dir="auto" style="unicode-bidi:plaintext">${esc(v)}</span>`;
    const when = s => s ? `${esc(fmtD(s))} · ${fmtT(s)}` : "";
    const dash = `<span style="color:${MU};font-weight:400">—</span>`;
    const kv = (k, v, w) => `<div style="flex:0 0 ${w || "33.33%"};box-sizing:border-box;padding:5px 0;padding-${ar2}:12px"><div style="color:${MU};font-size:10.5px">${k}</div><div style="font-weight:600;color:${INK};font-size:12.5px;margin-top:2px;white-space:pre-line">${v || dash}</div></div>`;
    const ic = p => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
    const card = (n, icon, title, body) => `<div class="pdf-avoid" style="border:1px solid ${LINE};border-radius:14px;margin-top:10px;background:#fff;overflow:hidden;break-inside:avoid;page-break-inside:avoid">
      <div style="display:flex;align-items:center;gap:10px;padding:8px 16px;background:${SOFT};border-bottom:1px solid ${LINE}"><span style="width:28px;height:28px;border-radius:8px;background:${G};display:inline-flex;align-items:center;justify-content:center">${ic(icon)}</span>
        <span style="font-size:14.5px;font-weight:700;color:${GD}">${ltr(n)}&nbsp; ${title}</span></div><div style="padding:6px 16px 10px">${body}</div></div>`;
    const flag = s => s ? `<span style="display:inline-block;padding:1px 8px;border-radius:8px;font-size:10px;font-weight:700;${s === "ok" ? "background:#e7f6ec;color:#15803d" : "background:#fef3e2;color:#b45309"}">${s === "ok" ? t.ok : s === "low" ? t.low : t.high}</span>` : "";
    const vState = (v, val) => { if (!has(val)) return ""; if (v.k === "bp") { const m = String(val).match(/^(\d+)\/(\d+)$/); if (!m) return ""; return +m[1] >= 140 || +m[2] >= 90 ? "high" : +m[1] < 90 || +m[2] < 60 ? "low" : "ok"; } return +val < v.lo ? "low" : +val > v.hi ? "high" : "ok"; };

    // 1. Patient information, from the patient file.
    const pt = d.p, visitNo = o.id || r.orderId || r.bookingId || "";
    const ptBody = `<div style="display:flex;flex-wrap:wrap">${kv(t.name, txt(pt.name[lang] || pt.name.en || ""))}${kv(t.fileNo, pt.fileNo && ltr(pt.fileNo))}${kv(t.idNo, pt.idNumber && ltr(pt.idNumber))}
      ${kv(t.dob, pt.dob && esc(fmtD(pt.dob)) + (has(pt.age) ? ` <span style="color:${MU};font-weight:400">· ${esc(tx(t.years, { n: pt.age }))}</span>` : ""))}${kv(t.gender, pt.gender ? t["g_" + pt.gender] : "")}${kv(t.mobile, pt.mobile && ltr(pt.mobile))}${kv(t.visitNo, visitNo && ltr(visitNo))}</div>`;

    // 2. Clinical summary: the chief complaint as the doctor wrote it, the vital signs with the time they were measured.
    const cc = ((d.hist.complaint && !d.hist.complaint.draft && d.hist.complaint.items) || []).filter(c => has(c.text));
    const ccBody = cc.length ? cc.map(c => `<div style="font-size:12.5px;line-height:1.75;color:${INK}">${cc.length > 1 ? "• " : ""}${c.type ? `<b>${esc(lb(H, "t_" + c.type, c.type))}:</b> ` : ""}${txt(c.text)}${
      [c.durMode === "set" && c.durN ? `${t.duration}: ${ltr(c.durN)} ${esc(lb(H, "u_" + c.durU, c.durU))}` : "", c.severity ? `${t.severity}: ${esc(lb(H, "sv_" + c.severity, c.severity))}` : "", has(c.pain) ? `${t.pain}: ${ltr(c.pain + "/10")}` : ""].filter(Boolean).map(x => ` <span style="color:${MU};font-size:11.5px">· ${x}</span>`).join("")}</div>`).join("") : `<div style="font-size:12px;color:${MU}">${t.ccNone}</div>`;
    const vs = d.st.vitals || {}, vl = VITALS.filter(v => has(vs[v.k]));
    const vBody = vl.length ? `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px">${vl.map(v => `<div style="flex:0 0 calc((100% - 16px) / 3);box-sizing:border-box;border:1px solid ${LINE};border-radius:10px;padding:6px 12px;background:#fbfdfc">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:6px"><span style="color:${MU};font-size:10.5px">${esc(v[lang].replace(/[()]/g, ""))}</span>${flag(vState(v, vs[v.k]))}</div>
        <div style="margin-top:3px;color:${INK}"><b style="font-size:16px">${ltr(vs[v.k])}</b> <span style="color:${MU};font-size:11px">${ltr(v.unit)}</span></div></div>`).join("")}</div>
      ${vs.at ? `<div style="font-size:11px;color:${MU};margin-top:6px">${t.measured.replace("{d}", when(vs.at))}${vs.by ? ` · ${txt(nm(vs.by)[lang] || nm(vs.by).en)}` : ""}</div>` : ""}` : `<div style="font-size:12px;color:${MU}">${t.vitNone}</div>`;
    const dx = (d.st.assess || {}).primary;
    const sub = (k, v) => `<div style="margin-top:6px"><div style="font-size:11.5px;font-weight:700;color:${G};margin-bottom:3px">${k}</div>${v}</div>`;
    const clinBody = sub(t.cc, ccBody) + sub(t.s2, vBody) + (dx ? sub(t.workDx, `<div style="font-size:12.5px;color:${INK}">${dx.code ? `${ltr(dx.code)} · ` : ""}${txt(dx[lang] || dx.en || dx.ar)}</div>`) : "");

    // 3. Referral details, short.
    const ri = typeof DrOrders !== "undefined" && DrOrders.refInfo ? DrOrders.refInfo(ro) : { spec: null, provider: null }, urgent = ro.priority === "urgent";
    const pill = urgent ? `<span style="display:inline-block;padding:1px 10px;border-radius:10px;background:#fdecec;color:#dc2626;font-size:11px;font-weight:700">${t.rf_urgent}</span>` : `<span style="display:inline-block;padding:1px 10px;border-radius:10px;background:#e6f3ef;color:${G};font-size:11px;font-weight:700">${t.rf_routine}</span>`;
    const refBody = `<div style="display:flex;flex-wrap:wrap">${kv(t.rf_spec, ri.spec ? esc(nm(ri.spec)[lang]) : "")}${kv(t.rf_pri, pill)}${kv(t.rf_dest, esc(t[ro.dest === "ext" ? "rf_ext" : "rf_mada"]))}
      ${ri.provider ? kv(t.rf_prov, esc(nm(ri.provider)[lang])) : ""}${kv(t.rf_reason, ro.reason && txt(ro.reason), "100%")}${ro.rec ? kv(t.rf_rec, txt(ro.rec), "100%") : ""}${ro.notes ? kv(t.rf_notes, txt(ro.notes), "100%") : ""}</div>`;

    const doc = d.doc || (MadaOrders.DOCTORS || []).find(x => x.id === r.doctorId) || null, stamp = doc && typeof MadaStamps !== "undefined" ? MadaStamps.get(doc.id) : null;
    const docName = doc ? doc.name[lang] : nm(r.byDoctor)[lang] || nm(r.byDoctor).en || "", now = new Date().toISOString(), no = `${r.id}-${it.id}`;
    const P = { pt: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>', cl: '<path d="M3 12h4l2-5 4 10 2-5h6"/>', rf: '<path d="M4 12h13M13 7l5 5-5 5"/><path d="M20 4v16"/>' };
    // Outer box left to right with the language direction inside: the PDF renderer cuts off the edge of a right-to-left page.
    // 748px is the A4 width inside the 6 mm margins, so nothing is scaled or cut.
    return `<div dir="ltr" style="width:748px;margin:0 auto;background:#fff"><div dir="${rtl ? "rtl" : "ltr"}" lang="${lang}" style="width:748px;background:#fff;color:${INK};font-family:${rtl ? "Tajawal, Inter" : "Inter, Tajawal"}, Arial, sans-serif;text-align:${al};box-sizing:border-box;position:relative">
      <div style="background:linear-gradient(120deg, ${GD}, ${G});color:#fff;padding:16px 26px;display:flex;align-items:center;gap:16px;border-radius:0 0 22px 22px">
        <span style="width:62px;height:62px;border-radius:50%;background:#fff;display:inline-flex;align-items:center;justify-content:center;flex:none;box-shadow:0 0 0 3px rgba(200,164,90,.6)"><img src="${LOGO}" style="height:42px;width:auto" alt=""></span>
        <div style="flex:1"><div style="font-size:21px;font-weight:700">Mada Care <span style="font-weight:500">| مدى كير</span></div><div style="font-size:11.5px;opacity:.85">${rtl ? "رعاية كالعائلة" : "Caring Like Family"}</div></div>
        <div style="text-align:${ar2}"><div style="font-size:20px;font-weight:700">${t.refTitle}</div><div style="font-size:11px;opacity:.9;margin-top:3px">${t.refNo}: ${ltr(no)}</div><div style="font-size:11px;opacity:.9">${t.refDate}: ${esc(fmtD(r.createdAt || now))}</div></div>
      </div>
      <div style="height:3px;background:${GOLD};margin:0 44px;border-radius:2px"></div>
      <div style="padding:2px 22px 8px">
        ${card("1", P.pt, t.patientT, ptBody)}
        ${card("2", P.cl, t.clinT, clinBody)}
        ${card("3", P.rf, t.refT, refBody)}
        <div class="pdf-avoid" style="break-inside:avoid;page-break-inside:avoid;display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin-top:16px">
          <div style="flex:1"><div style="color:${MU};font-size:10.5px">${t.rf_by}</div><div style="font-weight:700;font-size:14px;margin-top:2px">${esc(docName) || dash}</div>${doc ? `<div style="color:${MU};font-size:11px">${esc(doc.spec[lang])}</div>` : ""}
            <div style="margin-top:24px;width:220px;border-top:1px solid #9aa7ab;padding-top:5px;color:${MU};font-size:10.5px">${t.refSign}</div></div>
          <div style="width:170px;height:92px;border:1px dashed ${LINE};border-radius:12px;display:flex;align-items:center;justify-content:center">${stamp ? `<img src="${esc(stamp.data)}" alt="${t.stampT}" style="max-height:92px;max-width:170px;object-fit:contain">` : `<span style="color:#b9c3c6;font-size:11px">${t.stampT}</span>`}</div>
        </div>
        <div style="margin-top:16px;padding-top:8px;border-top:1px solid ${LINE};display:flex;justify-content:space-between;gap:16px;color:${MU};font-size:10.5px"><span>${esc(t.refNote.replace("{d}", fmtD(now)))}</span><span style="white-space:nowrap">${t.page}</span></div>
      </div></div></div>`;
  }
  const referralFile = (r, it) => `Mada-Care-Referral-${r.id}-${it.id}.pdf`;
  const downloadReferral = (o, r, it, lang, toast) => save(referral(o, r, it, lang), referralFile(r, it), lang, toast);
  // A visit has a report once it is completed.
  const ready = o => !!(o && o.doctorVisit && o.doctorVisit.status === "done");
  // A finished visit's report is shown and downloaded once the doctor approved it.
  const approved = o => ready(o) && ((o.doctorVisit.report || {}).status === "approved");
  return { html, download, referral, downloadReferral, referralFile, ready, approved, fileName, clean, stepHas, STEP_KEYS, STEP_SECS, L: R };
})();
