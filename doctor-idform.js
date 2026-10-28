// Patient Identity Confirmation form (doctor visit step before Patient Consent). A Mada Care branded form the doctor fills with the patient,
// and the patient (or the person signing for them) confirms with a signature under the declaration.
// Saved in order.doctorVisit.steps.idform: { name, nationality, idType: "national"|"iqama", idNumber, dob, idExpiry, birthPlace, employer,
//   marital: "single"|"married"|"divorced"|"widowed", mobile, signerName, signature (PNG data URL), at, by }.
// The form is the first step of every visit (doctor, nurse, physio); the other steps open once it is saved. A form signed in an
// earlier visit of the same patient is copied in (prior(), with reusedFrom = that order) and shows as done.
// Values start from the arrival step, the patient file and the booking; saving also fills empty fields in the patient file.
// The saved form downloads as a branded A4 PDF (download button on the saved form), drawn with html2pdf like the Medical Report.
// TODO: legal review of the declaration wording; keep the signed form on the server.
const DrIdForm = (() => {
  const NATS = ["SA", "EG", "YE", "SD", "JO", "SY", "PK", "IN", "BD", "PH", "OT"];
  const MARITAL = ["single", "married", "divorced", "widowed"];
  const DECL = ["I, the undersigned, declare and confirm that the information written above is correct.", "أقر وأصادق وأنا الموقع أدناه بصحة المعلومات المدونة أعلاه."];
  const I = {
    id: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="11" r="2"/><path d="M5.5 16c.6-1.4 1.7-2 3-2s2.4.6 3 2M14 10h4M14 14h3"/>',
    sign: '<path d="M4 20h16"/><path d="M5 16c3-6 5-9 6.5-9S12 12 9 16s4-5 6-5 0 5 2 5 2-2 3-3"/>', trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>', back: '<path d="M19 12H5M11 6l-6 6 6 6"/>', arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    check: '<path d="m5 12 5 5 9-10"/>', dl: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>', edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>'
  };
  const L = {
    en: {
      title: "Patient Identity Confirmation", sub: "Confirm the patient's details on the form, then the patient signs the declaration.", stepOf: "Step {n} of {m}",
      formT: "Patient Identity Confirmation Form", brand: "Mada Care", tag: "Home Healthcare", orderNo: "Order No.", date: "Date",
      name: "Patient Name", namePh: "Full name as on the ID", nat: "Nationality", natPh: "Select nationality", idType: "ID Type", id_national: "National ID", id_iqama: "Iqama",
      idNo: "ID / Iqama Number", idNoPh: "10 digits", dob: "Date of Birth", exp: "Expiry Date", birthPlace: "Place of Birth", birthPh: "City, country",
      employer: "Employer", employerPh: "e.g. Ministry of Education, retired, not working", marital: "Marital Status", maritalPh: "Select status",
      ms_single: "Single", ms_married: "Married", ms_divorced: "Divorced", ms_widowed: "Widowed", mobile: "Mobile Number", mobilePh: "05XXXXXXXX",
      nat_SA: "Saudi Arabia", nat_EG: "Egypt", nat_YE: "Yemen", nat_SD: "Sudan", nat_JO: "Jordan", nat_SY: "Syria", nat_PK: "Pakistan", nat_IN: "India", nat_BD: "Bangladesh", nat_PH: "Philippines", nat_OT: "Other",
      declT: "Declaration", signer: "Name of the person signing", signerPh: "Full name", sig: "Signature", tap: "Sign inside the box", clear: "Clear",
      e_req: "Required.", e_id: "Enter 10 digits.", e_idNat: "A National ID starts with 1.", e_idIq: "An Iqama number starts with 2.", e_dob: "Date of birth can't be in the future.",
      e_mob: "Enter a mobile like 05XXXXXXXX.", e_sig: "The signature is required.", expired: "This ID expired on {d}. Ask the patient for a valid ID if possible.",
      prev: "Previous", cont: "Save & Continue", saved: "Identity form saved.", fixErr: "Complete the required fields and the signature.", storeErr: "Couldn't save. Try again.",
      signedBy: "Signed by {n} · {t}", priorT: "Confirmed in an earlier visit ({o}) by {b} · {t}. Update it if anything has changed.", edit: "Edit Form", sigAlt: "Signature of {n}", download: "Download PDF", making: "Preparing the PDF…", dlDone: "Downloaded {f}", dlFail: "Couldn't make the PDF here. The form opened for printing; choose Save as PDF.",
      doctor: "Doctor", signedAt: "Signed on", fromFile: "Filled from the patient file and arrival check. Correct anything that is different on the ID."
    },
    ar: {
      title: "تأكيد هوية المريض", sub: "تأكد من بيانات المريض في النموذج، وبعدها يوقّع المريض على الإقرار.", stepOf: "الخطوة {n} من {m}",
      formT: "نموذج تأكيد هوية المريض", brand: "مدى كير", tag: "الرعاية الصحية المنزلية", orderNo: "رقم الطلب", date: "التاريخ",
      name: "اسم المريض", namePh: "الاسم الكامل كما في الهوية", nat: "الجنسية", natPh: "اختر الجنسية", idType: "نوع الهوية", id_national: "هوية وطنية", id_iqama: "إقامة",
      idNo: "رقم الهوية / الإقامة", idNoPh: "10 أرقام", dob: "تاريخ الميلاد", exp: "تاريخ الانتهاء", birthPlace: "مكان الميلاد", birthPh: "المدينة، الدولة",
      employer: "جهة العمل", employerPh: "مثال: وزارة التعليم، متقاعد، لا يعمل", marital: "الحالة الاجتماعية", maritalPh: "اختر الحالة",
      ms_single: "أعزب", ms_married: "متزوج", ms_divorced: "مطلق", ms_widowed: "أرمل", mobile: "رقم الجوال", mobilePh: "05XXXXXXXX",
      nat_SA: "السعودية", nat_EG: "مصر", nat_YE: "اليمن", nat_SD: "السودان", nat_JO: "الأردن", nat_SY: "سوريا", nat_PK: "باكستان", nat_IN: "الهند", nat_BD: "بنغلاديش", nat_PH: "الفلبين", nat_OT: "أخرى",
      declT: "الإقرار", signer: "اسم الموقّع", signerPh: "الاسم الكامل", sig: "التوقيع", tap: "وقّع داخل المربع", clear: "مسح",
      e_req: "مطلوب.", e_id: "أدخل 10 أرقام.", e_idNat: "رقم الهوية الوطنية يبدأ بـ 1.", e_idIq: "رقم الإقامة يبدأ بـ 2.", e_dob: "تاريخ الميلاد ما يصير في المستقبل.",
      e_mob: "أدخل جوال مثل 05XXXXXXXX.", e_sig: "التوقيع مطلوب.", expired: "الهوية منتهية بتاريخ {d}. اطلب من المريض هوية سارية إذا أمكن.",
      prev: "السابق", cont: "حفظ ومتابعة", saved: "انحفظ نموذج الهوية.", fixErr: "عبّ الحقول المطلوبة والتوقيع.", storeErr: "ما قدرنا نحفظ. حاول مرة ثانية.",
      signedBy: "وقّع {n} · {t}", priorT: "تم التأكيد في زيارة سابقة ({o}) بواسطة {b} · {t}. حدّثه إذا تغيّر شي.", edit: "تعديل النموذج", sigAlt: "توقيع {n}", download: "تحميل PDF", making: "جاري تجهيز الملف…", dlDone: "تم تحميل {f}", dlFail: "ما قدرنا نجهز الملف هنا. فتحنا النموذج للطباعة، اختر حفظ كـ PDF.",
      doctor: "الطبيب", signedAt: "تاريخ التوقيع", fromFile: "تعبّت من ملف المريض وتأكيد الوصول. صحّح أي شي يختلف عن الهوية."
    }
  };
  const FIELDS = ["name", "nationality", "idType", "idNumber", "dob", "idExpiry", "birthPlace", "employer", "marital", "mobile"];
  let ctx = null, lang = "en", st = null, forId = null, tried = false, editing = false;
  const t = () => L[lang];
  const tx = (k, v) => t()[k].replace(/\{(\w+)\}/g, (_, n) => v[n]);
  const S = (p, w) => ctx.svg(p, w), E = s => ctx.esc(s);
  const reset = () => { st = null; forId = null; tried = false; editing = false; };
  const savedOf = o => ((o.doctorVisit || {}).steps || {}).idform;
  const nameOf = v => v && typeof v === "object" ? v[lang] || v.en : v || "";
  const today = () => { const d = new Date(), p = n => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
  const fmtD = v => { if (!v) return "—"; const d = new Date(v + "T12:00:00"); return isNaN(d) ? v : d.toLocaleDateString(ctx.loc(), { day: "numeric", month: "long", year: "numeric" }); };

  function load(o) {
    if (st && forId === o.id) return;
    forId = o.id;
    const sv = savedOf(o);
    if (sv) { st = { ...sv, strokes: [], sigData: sv.signature }; return; }
    const p = ctx.prefill(o);
    st = { name: p.name || "", nationality: p.nationality || "", idType: p.idType || (String(p.idNumber || "").startsWith("2") ? "iqama" : "national"), idNumber: p.idNumber || "",
      dob: p.dob || "", idExpiry: p.idExpiry || "", birthPlace: p.birthPlace || "", employer: p.employer || "", marital: p.marital || "", mobile: p.mobile || "",
      signerName: p.name || "", strokes: [], sigData: null };
  }
  const hasSig = () => !!st.sigData || st.strokes.reduce((n, s) => n + s.length, 0) > 8;
  function errs() {
    const e = {};
    ["name", "nationality", "idType", "idNumber", "dob", "idExpiry", "birthPlace", "employer", "marital", "mobile", "signerName"].forEach(k => { if (!String(st[k] || "").trim()) e[k] = t().e_req; });
    if (!e.idNumber && !/^\d{10}$/.test(st.idNumber)) e.idNumber = t().e_id;
    else if (!e.idNumber && st.idType === "national" && st.idNumber[0] !== "1") e.idNumber = t().e_idNat;
    else if (!e.idNumber && st.idType === "iqama" && st.idNumber[0] !== "2") e.idNumber = t().e_idIq;
    if (!e.dob && st.dob > today()) e.dob = t().e_dob;
    if (!e.mobile && !/^05\d{8}$/.test(st.mobile)) e.mobile = t().e_mob;
    if (!hasSig()) e.sig = t().e_sig;
    return e;
  }
  const bi = x => { const en = `<span class="cs-en" dir="ltr" lang="en">${E(x[0])}</span>`, ar = `<span class="cs-ar" dir="rtl" lang="ar">${E(x[1])}</span>`; return lang === "ar" ? ar + en : en + ar; };
  const head = c => `<div class="cs-top"><span class="cs-n">${c.stepOf.n}</span><div><h1>${t().title}</h1><p>${t().sub}</p></div><span class="ex-stp">${tx("stepOf", c.stepOf)}</span></div>`;
  // Branded header of the paper form.
  const brand = (o, at) => `<div class="idf-brand"><img src="assets/mada-logo.png" alt="" width="301" height="320"><div class="idf-bn"><b>${t().brand}</b><span>${t().tag}</span></div>
    <div class="idf-bt"><h2>${t().formT}</h2><span>${t().orderNo}: <b dir="ltr">${E(o.id)}</b> · ${t().date}: <b>${E(fmtD(at || today()))}</b></span></div></div>`;

  function readView(o, sv, c) {
    const done = ((o.doctorVisit || {}).status === "done");
    const when = new Date(sv.at).toLocaleString(c.loc(), { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    const row = (k, v) => `<div><dt>${t()[k]}</dt><dd>${v ? E(v) : "—"}</dd></div>`;
    return `<div class="idf-paper">${brand(o, sv.at.slice(0, 10))}
      <dl class="idf-dl">${row("name", sv.name)}${row("nat", t()["nat_" + sv.nationality] || sv.nationality)}${row("idType", t()["id_" + sv.idType])}
        <div><dt>${t().idNo}</dt><dd dir="ltr" class="idf-num">${E(sv.idNumber)}</dd></div>${row("dob", fmtD(sv.dob))}${row("exp", fmtD(sv.idExpiry))}
        ${row("birthPlace", sv.birthPlace)}${row("employer", sv.employer)}${row("marital", t()["ms_" + sv.marital])}<div><dt>${t().mobile}</dt><dd dir="ltr" class="idf-num">${E(sv.mobile)}</dd></div></dl>
      <div class="idf-decl"><b>${t().declT}</b><p class="cs-bi">${bi(DECL)}</p></div>
      <figure class="cs-sigimg"><img src="${E(sv.signature)}" alt="${E(tx("sigAlt", { n: sv.signerName }))}"><figcaption>${E(sv.signerName)}</figcaption></figure>
      <p class="idf-by">${S(I.check, 2.4)}${E(tx("signedBy", { n: sv.signerName, t: when }))}</p>
      ${sv.reusedFrom ? `<p class="idf-by idf-prior">${S(I.id, 2)}${E(tx("priorT", { o: sv.reusedFrom, b: nameOf(sv.by) || "—", t: when }))}</p>` : ""}
      <div class="idf-acts"><button type="button" class="hx-btn dark idf-edit" id="idDl">${S(I.dl)}${t().download}</button>
        ${done ? "" : `<button type="button" class="hx-btn out idf-edit" id="idEdit">${S(I.edit)}${t().edit}</button>`}</div></div>`;
  }

  function view(o, c) {
    ctx = c; lang = c.lang; load(o);
    const sv = savedOf(o), showForm = editing || !sv;
    const foot = `<div class="ex-foot">${c.prevKey ? `<button type="button" class="hx-btn out pl-prevb" id="idPrev"><span class="flip">${S(I.back)}</span><span><b>${t().prev}</b><small>${E(c.prevName || "")}</small></span></button>` : ""}<span class="hx-sp"></span>
      <button type="button" class="hx-btn dark" id="idCont">${t().cont}${S(I.arrow)}</button></div>`;
    if (!showForm) return `<div class="cs idf">${head(c)}${readView(o, sv, c)}${foot}</div>`;
    const e = tried ? errs() : {};
    const er = k => e[k] ? `<span class="idf-err">${E(e[k])}</span>` : "";
    const f = (k, label, input, wide) => `<div class="idf-f ${wide ? "wide" : ""} ${e[k] ? "bad" : ""}"><label for="id_${k}">${label} <span class="req">*</span></label>${input}${er(k)}</div>`;
    const inp = (k, ph, extra) => `<input class="hx-in" id="id_${k}" data-k="${k}" value="${E(st[k])}" placeholder="${E(ph || "")}" ${extra || ""}>`;
    const sel = (k, list, pre, ph) => `<select class="hx-in" id="id_${k}" data-k="${k}"><option value="">${E(ph)}</option>${list.map(v => `<option value="${v}" ${st[k] === v ? "selected" : ""}>${E(t()[pre + v])}</option>`).join("")}</select>`;
    const exp = st.idExpiry && st.idExpiry < today();
    return `<div class="cs idf">${head(c)}
      <div class="idf-paper">${brand(o)}
        <p class="idf-note">${E(t().fromFile)}</p>
        <div class="idf-grid">
          ${f("name", t().name, inp("name", t().namePh, 'maxlength="80" dir="auto"'), true)}
          ${f("nationality", t().nat, sel("nationality", NATS, "nat_", t().natPh))}
          ${f("idType", t().idType, `<div class="idf-seg">${["national", "iqama"].map(v => `<button type="button" data-idtype="${v}" aria-pressed="${st.idType === v}">${t()["id_" + v]}</button>`).join("")}</div>`)}
          ${f("idNumber", t().idNo, inp("idNumber", t().idNoPh, 'inputmode="numeric" maxlength="10" dir="ltr" autocomplete="off"'))}
          ${f("dob", t().dob, inp("dob", "", `type="date" max="${today()}"`))}
          ${f("idExpiry", t().exp, inp("idExpiry", "", 'type="date"'))}
          ${f("birthPlace", t().birthPlace, inp("birthPlace", t().birthPh, 'maxlength="60" dir="auto"'))}
          ${f("employer", t().employer, inp("employer", t().employerPh, 'maxlength="80" dir="auto"'))}
          ${f("marital", t().marital, sel("marital", MARITAL, "ms_", t().maritalPh))}
          ${f("mobile", t().mobile, inp("mobile", t().mobilePh, 'inputmode="tel" maxlength="10" dir="ltr"'))}
        </div>
        ${exp ? `<p class="idf-warn">${S(I.alert)}<span>${E(tx("expired", { d: fmtD(st.idExpiry) }))}</span></p>` : ""}
        <div class="idf-decl"><b>${t().declT}</b><p class="cs-bi">${bi(DECL)}</p></div>
        <div class="idf-grid">${f("signerName", t().signer, inp("signerName", t().signerPh, 'maxlength="80" dir="auto"'), true)}</div>
        <div class="idf-f wide ${e.sig ? "bad" : ""}"><label>${t().sig} <span class="req">*</span></label>
          <div class="cs-pad ${e.sig ? "bad" : ""}">${st.sigData && !st.strokes.length ? `<img class="idf-sigold" src="${E(st.sigData)}" alt="">` : `<canvas id="idPad" aria-label="${E(t().sig)}"></canvas>`}
            <span class="cs-ph" ${hasSig() ? "hidden" : ""}>${S(I.sign, 1.6)}${t().tap}</span>
            <div class="cs-pf"><button type="button" class="cs-clr" id="idClr">${S(I.trash)}${t().clear}</button><small>${S(I.pen)}${t().tap}</small></div></div>${er("sig")}</div>
      </div>${foot}</div>`;
  }

  function bind(root, o, c) {
    ctx = c;
    const $ = s => root.querySelector(s), re = () => ctx.rerender();
    root.querySelectorAll("[data-k]").forEach(el => {
      el.addEventListener("input", () => {
        let v = el.value; if (el.dataset.k === "idNumber" || el.dataset.k === "mobile") { v = v.replace(/\D/g, ""); el.value = v; }
        st[el.dataset.k] = v;
        if (tried) { const box = el.closest(".idf-f"), bad = !!errs()[el.dataset.k]; box.classList.toggle("bad", bad); if (!bad) { const m = box.querySelector(".idf-err"); if (m) m.remove(); } }
      });
      el.addEventListener("change", () => { if (el.dataset.k === "idExpiry" || el.tagName === "SELECT") re(); });
    });
    root.querySelectorAll("[data-idtype]").forEach(b => b.addEventListener("click", () => { st.idType = b.dataset.idtype; re(); }));
    const canvas = $("#idPad");
    if (canvas) {
      const g = canvas.getContext("2d");
      const draw = () => {
        if (!st || !canvas.isConnected) return;
        const r = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
        g.setTransform(dpr, 0, 0, dpr, 0, 0); g.lineWidth = 2.4; g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = "#10232b";
        st.strokes.forEach(s => { g.beginPath(); s.forEach((p, i) => { const x = p[0] * r.width, y = p[1] * r.height; i ? g.lineTo(x, y) : g.moveTo(x, y); }); if (s.length === 1) g.lineTo(s[0][0] * r.width + .1, s[0][1] * r.height); g.stroke(); });
      };
      draw();
      let cur = null;
      const pt = e => { const r = canvas.getBoundingClientRect(); return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))]; };
      canvas.addEventListener("pointerdown", e => { e.preventDefault(); canvas.setPointerCapture(e.pointerId); cur = [pt(e)]; st.strokes.push(cur); const ph = $(".cs-ph"); if (ph) ph.hidden = true; });
      canvas.addEventListener("pointermove", e => { if (!cur) return; cur.push(pt(e)); draw(); });
      const end = () => { if (!cur) return; cur = null; draw(); if (hasSig()) $(".cs-pad").classList.remove("bad"); };
      canvas.addEventListener("pointerup", end); canvas.addEventListener("pointercancel", end); canvas.addEventListener("pointerleave", end);
      window.addEventListener("resize", draw, { once: true });
    }
    if ($("#idClr")) $("#idClr").addEventListener("click", () => { st.strokes = []; st.sigData = null; re(); });
    if ($("#idDl")) $("#idDl").addEventListener("click", async e => { const b = e.currentTarget; b.disabled = true; try { await download(MadaOrders.get(o.id)); } finally { b.disabled = false; } });
    if ($("#idEdit")) $("#idEdit").addEventListener("click", () => { editing = true; st = null; forId = null; load(MadaOrders.get(o.id)); re(); });
    if ($("#idPrev")) $("#idPrev").addEventListener("click", () => ctx.go(ctx.prevKey));
    $("#idCont").addEventListener("click", () => {
      const sv = savedOf(MadaOrders.get(o.id));
      if (sv && !editing) { reset(); return ctx.go(ctx.nextKey); }
      tried = true;
      const e = errs();
      if (Object.keys(e).length) { re(); ctx.toast(t().fixErr); const b = document.querySelector(".idf .bad"); if (b) b.scrollIntoView({ block: "center" }); return; }
      let signature = st.sigData;
      if (st.strokes.length) {
        // Flatten the signature to a small PNG on white.
        const out = document.createElement("canvas"), W = 600, H = 200; out.width = W; out.height = H;
        const g = out.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, W, H); g.lineWidth = 3; g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = "#10232b";
        st.strokes.forEach(s => { g.beginPath(); s.forEach((p, i) => i ? g.lineTo(p[0] * W, p[1] * H) : g.moveTo(p[0] * W, p[1] * H)); g.stroke(); });
        signature = out.toDataURL("image/png");
      }
      const d = {}; FIELDS.forEach(k => d[k] = String(st[k] || "").trim()); d.signerName = st.signerName.trim(); d.signature = signature;
      try { ctx.save(d); } catch (x) { return ctx.toast(x.message || t().storeErr); }
      reset(); ctx.toast(t().saved); ctx.go(ctx.nextKey);
    });
  }
  // ---------- PDF ----------
  // A4 page with inline styles only (the PDF renderer does not see the page's CSS), in the language the doctor is using.
  function pdfHTML(o, sv) {
    const ar = lang === "ar", c = "#15304a", m = "#5d6d78", g = "#0b6b5c";
    const when = new Date(sv.at).toLocaleString(ctx.loc(), { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
    const cell = (k, v, ltr) => `<td style="width:50%;padding:11px 14px;border:1px solid #d5dde0;vertical-align:top"><div style="font-size:11.5px;color:${m};margin-bottom:4px">${t()[k]}</div>
      <div style="font-size:14px;font-weight:700;color:${c}" ${ltr ? 'dir="ltr"' : 'dir="auto"'}>${v ? E(v) : "—"}</div></td>`;
    const rows = [[cell("name", sv.name), cell("nat", t()["nat_" + sv.nationality] || sv.nationality)],
      [cell("idType", t()["id_" + sv.idType]), cell("idNo", sv.idNumber, 1)], [cell("dob", fmtD(sv.dob)), cell("exp", fmtD(sv.idExpiry))],
      [cell("birthPlace", sv.birthPlace), cell("employer", sv.employer)], [cell("marital", t()["ms_" + sv.marital]), cell("mobile", sv.mobile, 1)]];
    return `<div dir="${ar ? "rtl" : "ltr"}" lang="${lang}" style="width:794px;box-sizing:border-box;padding:44px 48px;background:#fff;color:${c};font-family:'IBM Plex Sans Arabic','Segoe UI',Tahoma,Arial,sans-serif;text-align:${ar ? "right" : "left"}">
      <div style="display:flex;align-items:center;gap:14px;padding-bottom:16px;border-bottom:3px solid ${g}">
        <img src="assets/mada-logo.png" alt="" style="height:60px;width:auto">
        <div><div style="font-size:20px;font-weight:700">${t().brand}</div><div style="font-size:12.5px;color:${g}">${t().tag}</div></div>
        <div style="margin-${ar ? "right" : "left"}:auto;text-align:${ar ? "left" : "right"}"><div style="font-size:19px;font-weight:700">${t().formT}</div>
          <div style="font-size:12.5px;color:${m};margin-top:5px">${t().orderNo}: <b dir="ltr" style="color:${c}">${E(o.id)}</b> · ${t().date}: <b style="color:${c}">${E(fmtD(sv.at.slice(0, 10)))}</b></div></div></div>
      <table style="width:100%;border-collapse:collapse;margin-top:24px">${rows.map(r => `<tr>${r.join("")}</tr>`).join("")}</table>
      <div style="margin-top:24px;padding:16px 18px;border-radius:10px;background:#eef2f7;border:1px solid #e1e7ef">
        <div style="font-size:14px;font-weight:700;margin-bottom:8px">${t().declT}</div>
        <div dir="rtl" lang="ar" style="font-size:14.5px;line-height:1.9;text-align:right">${E(DECL[1])}</div>
        <div dir="ltr" lang="en" style="font-size:13px;line-height:1.7;color:${m};text-align:left;margin-top:4px">${E(DECL[0])}</div></div>
      <table style="width:100%;border-collapse:collapse;margin-top:24px"><tr>
        <td style="width:50%;padding:0 ${ar ? "0 0 12px" : "12px 0 0"};vertical-align:top"><div style="font-size:11.5px;color:${m}">${t().signer}</div><div style="font-size:14px;font-weight:700;margin:4px 0 14px" dir="auto">${E(sv.signerName)}</div>
          <div style="font-size:11.5px;color:${m}">${t().signedAt}</div><div style="font-size:13.5px;font-weight:600;margin-top:4px">${E(when)}</div>
          ${sv.by ? `<div style="font-size:11.5px;color:${m};margin-top:14px">${t().doctor}</div><div style="font-size:13.5px;font-weight:600;margin-top:4px" dir="auto">${E(nameOf(sv.by))}</div>` : ""}</td>
        <td style="width:50%;vertical-align:top"><div style="font-size:11.5px;color:${m};margin-bottom:6px">${t().sig}</div>
          <div style="border:1px solid #d5dde0;border-radius:10px;height:150px;display:flex;align-items:center;justify-content:center"><img src="${E(sv.signature)}" alt="" style="max-height:140px;max-width:100%"></div></td></tr></table>
      <div style="margin-top:40px;padding-top:12px;border-top:1px solid #e3e8ea;font-size:11px;color:#8a979c;text-align:center">${t().brand} · ${t().tag}</div></div>`;
  }
  const H2P = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
  const loadH2p = () => window.html2pdf ? Promise.resolve() : new Promise((ok, bad) => { const sc = document.createElement("script"); sc.src = H2P; sc.onload = ok; sc.onerror = bad; document.head.appendChild(sc); });
  const withTimeout = (pr, ms) => Promise.race([pr, new Promise((_, bad) => setTimeout(() => bad(new Error("timeout")), ms))]);
  // The PDF renderer drops the spaces between Arabic words: each word gets its own box (same as the Medical Report).
  // Runs in both languages, since Arabic names and places show on the English form too.
  function fixArabic(wrap) {
    const walk = document.createTreeWalker(wrap, NodeFilter.SHOW_TEXT), nodes = [];
    while (walk.nextNode()) if (/[\u0600-\u06FF]/.test(walk.currentNode.nodeValue)) nodes.push(walk.currentNode);
    nodes.forEach(nd => {
      const frag = document.createDocumentFragment();
      nd.nodeValue.split(/(\s+|[()،,.:·\-–]+)/).forEach(part => {
        if (!part) return;
        if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(part));
        else { const ltrBox = nd.parentElement && nd.parentElement.closest('[dir="ltr"]'), sp = document.createElement("span");
          sp.textContent = ltrBox ? part : part.replace(/[()]/g, ch => ch === "(" ? ")" : "("); frag.appendChild(sp); }
      });
      nd.replaceWith(frag);
    });
  }
  const fileName = o => `Mada-Care-Identity-Form-${o.id}.pdf`;
  async function download(o) {
    const sv = savedOf(o); if (!sv) return false;
    const file = fileName(o), wrap = document.createElement("div");
    wrap.style.cssText = "position:fixed;left:-10000px;top:0;z-index:-1;width:794px";
    wrap.innerHTML = pdfHTML(o, sv);
    document.body.appendChild(wrap);
    ctx.toast(t().making);
    fixArabic(wrap);
    const sy = window.scrollY; window.scrollTo(0, 0);
    try {
      await loadH2p();
      await withTimeout(window.html2pdf().set({ margin: [6, 6], filename: file, image: { type: "jpeg", quality: 0.96 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: "mm", format: "a4", orientation: "portrait" } }).from(wrap.firstElementChild).save(), 25000);
      ctx.toast(tx("dlDone", { f: file }));
      return true;
    } catch (e) {
      // No PDF library (offline): open the same page for the browser's "Save as PDF".
      const w = window.open("", "_blank");
      if (w) { w.document.write(`<!doctype html><html><head><meta charset="utf-8"><base href="${location.href}"><title>${file}</title></head><body style="margin:0">${wrap.innerHTML}<script>onload=()=>print()<\/script></body></html>`); w.document.close(); }
      ctx.toast(t().dlFail);
      return false;
    } finally { wrap.remove(); window.scrollTo(0, sy); }
  }

  // The latest identity form already signed for this patient (same medical file) in any visit: doctor, nurse or physio
  // (order.doctorVisit / nurseVisit / physioVisit). The visit pages copy it into a new visit, keeping who confirmed it and when.
  function prior(o) {
    if (!o || !o.mrn) return null;
    let best = null;
    MadaOrders.all().forEach(x => {
      if (x.mrn !== o.mrn) return;
      ["doctorVisit", "nurseVisit", "physioVisit"].forEach(k => {
        const f = x[k] && x[k].steps && x[k].steps.idform;
        if (f && f.at && !f.reusedFrom && (!best || f.at > best.f.at)) best = { f, id: x.id };
      });
    });
    return best ? { ...best.f, reusedFrom: best.id } : null;
  }
  return { view, bind, reset, download, fileName, L, nameOf, prior };
})();
