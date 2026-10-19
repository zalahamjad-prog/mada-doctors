// Diagnosis (doctor visit step after Allergy History). Saved in order.doctorVisit.steps.assess:
//   { primaries: [{ code, en, ar }], primary (= primaries[0], kept for older readers), additional: [{ code, en, ar }], notes, at, by }
//   (code is "" for a free-text diagnosis). The doctor can add more than one primary diagnosis.
// "Save as Draft" keeps the same shape in doctorVisit.assessDraft. At least one primary diagnosis is required to continue.
const DrDiagnosis = (() => {
  // SAMPLE ICD-10-AM list of common home-care diagnoses. TODO: replace with the licensed ICD-10-AM code search
  // and check every title against the current edition before go-live.
  // [code, chapter, en, ar, common]
  const ICD = [
    ["J06.9", "resp", "Acute upper respiratory infection, unspecified", "التهاب حاد في الجهاز التنفسي العلوي، غير محدد", 1],
    ["J06.8", "resp", "Other acute upper respiratory infections", "التهابات حادة أخرى في الجهاز التنفسي العلوي"],
    ["J06.0", "resp", "Acute laryngopharyngitis", "التهاب حاد في الحنجرة والبلعوم"],
    ["J04.1", "resp", "Acute tracheitis", "التهاب حاد في القصبة الهوائية"],
    ["J02.9", "resp", "Acute pharyngitis, unspecified", "التهاب البلعوم الحاد، غير محدد", 1],
    ["J03.9", "resp", "Acute tonsillitis, unspecified", "التهاب اللوزتين الحاد، غير محدد"],
    ["J01.9", "resp", "Acute sinusitis, unspecified", "التهاب الجيوب الأنفية الحاد، غير محدد"],
    ["J20.9", "resp", "Acute bronchitis, unspecified", "التهاب الشعب الهوائية الحاد، غير محدد", 1],
    ["J18.9", "resp", "Pneumonia, unspecified", "التهاب رئوي، غير محدد"],
    ["J45.9", "resp", "Asthma, unspecified", "ربو، غير محدد"],
    ["J44.1", "resp", "Chronic obstructive pulmonary disease with acute exacerbation, unspecified", "انسداد رئوي مزمن مع تفاقم حاد"],
    ["J11.1", "resp", "Influenza with other respiratory manifestations, virus not identified", "إنفلونزا مع أعراض تنفسية، الفيروس غير محدد"],
    ["U07.1", "special", "COVID-19, virus identified", "كوفيد-19، تم تحديد الفيروس"],
    ["I10", "circ", "Essential (primary) hypertension", "ارتفاع ضغط الدم الأساسي", 1],
    ["I50.9", "circ", "Heart failure, unspecified", "فشل القلب، غير محدد"],
    ["I48.9", "circ", "Atrial fibrillation and atrial flutter, unspecified", "رجفان أو رفرفة أذينية، غير محدد"],
    ["I25.9", "circ", "Chronic ischaemic heart disease, unspecified", "مرض القلب الإقفاري المزمن، غير محدد"],
    ["E11.9", "endo", "Type 2 diabetes mellitus, without complications", "سكري النوع الثاني بدون مضاعفات", 1],
    ["E10.9", "endo", "Type 1 diabetes mellitus, without complications", "سكري النوع الأول بدون مضاعفات"],
    ["E03.9", "endo", "Hypothyroidism, unspecified", "قصور الغدة الدرقية، غير محدد"],
    ["E78.5", "endo", "Hyperlipidaemia, unspecified", "ارتفاع الدهون في الدم، غير محدد"],
    ["E86", "endo", "Volume depletion", "جفاف (نقص السوائل)"],
    ["K21.9", "dig", "Gastro-oesophageal reflux disease without oesophagitis", "ارتجاع المريء بدون التهاب"],
    ["K29.7", "dig", "Gastritis, unspecified", "التهاب المعدة، غير محدد", 1],
    ["K59.0", "dig", "Constipation", "إمساك"],
    ["A09.9", "inf", "Gastroenteritis and colitis of unspecified origin", "التهاب المعدة والأمعاء، سبب غير محدد", 1],
    ["B34.9", "inf", "Viral infection, unspecified", "عدوى فيروسية، غير محددة"],
    ["N39.0", "gu", "Urinary tract infection, site not specified", "التهاب المسالك البولية، الموضع غير محدد", 1],
    ["N30.0", "gu", "Acute cystitis", "التهاب المثانة الحاد"],
    ["N18.9", "gu", "Chronic kidney disease, unspecified", "مرض الكلى المزمن، غير محدد"],
    ["M54.5", "msk", "Low back pain", "ألم أسفل الظهر", 1],
    ["M17.9", "msk", "Gonarthrosis, unspecified", "خشونة الركبة، غير محدد"],
    ["M10.9", "msk", "Gout, unspecified", "النقرس، غير محدد"],
    ["L03.9", "skin", "Cellulitis, unspecified", "التهاب النسيج الخلوي، غير محدد"],
    ["L30.9", "skin", "Dermatitis, unspecified", "التهاب الجلد، غير محدد"],
    ["L50.9", "skin", "Urticaria, unspecified", "شرى (أرتكاريا)، غير محدد"],
    ["G43.9", "nerv", "Migraine, unspecified", "صداع نصفي، غير محدد"],
    ["G40.9", "nerv", "Epilepsy, unspecified", "صرع، غير محدد"],
    ["F41.9", "ment", "Anxiety disorder, unspecified", "اضطراب القلق، غير محدد"],
    ["F32.9", "ment", "Depressive episode, unspecified", "نوبة اكتئاب، غير محددة"],
    ["D64.9", "blood", "Anaemia, unspecified", "فقر الدم، غير محدد"],
    ["H10.9", "eye", "Conjunctivitis, unspecified", "التهاب الملتحمة، غير محدد"],
    ["H66.9", "ear", "Otitis media, unspecified", "التهاب الأذن الوسطى، غير محدد"],
    ["R50.9", "sym", "Fever, unspecified", "حمى، غير محددة", 1],
    ["R05", "sym", "Cough", "كحة"],
    ["R51", "sym", "Headache", "صداع"],
    ["R10.4", "sym", "Other and unspecified abdominal pain", "ألم بطن آخر أو غير محدد"],
    ["R11", "sym", "Nausea and vomiting", "غثيان واستفراغ"],
    ["R42", "sym", "Dizziness and giddiness", "دوخة ودوار"],
    ["R53", "sym", "Malaise and fatigue", "توعك وإرهاق"]
  ].map(([code, ch, en, ar, common]) => ({ code, ch, en, ar, common: !!common }));
  const I = {
    steth: '<path d="M6 3v6a4 4 0 0 0 8 0V3"/><path d="M10 13v2a5 5 0 0 0 10 0v-2"/><circle cx="20" cy="11" r="2"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>', plus: '<path d="M12 5v14M5 12h14"/>',
    back: '<path d="M19 12H5M11 6l-6 6 6 6"/>', arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', doc: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
    check: '<path d="m5 12 5 5 9-10"/>', pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>'
  };
  const L = {
    en: {
      title: "Diagnosis", sub: "Enter the clinical diagnosis using ICD-10-AM coding.", stepOf: "Step {n} of {m}",
      primary: "Primary Diagnosis", primaryS: "Select the main diagnosis for this visit. You can add more than one.", primaryMore: "Add another primary diagnosis (ICD-10-AM or text)...", primaryPh: "Search by ICD-10-AM code or diagnosis (e.g. J06.9, pharyngitis)",
      additional: "Additional Diagnoses", additionalS: "Add other relevant diagnoses if applicable.", additionalPh: "Search and add additional diagnosis (ICD-10-AM or text)...",
      notes: "Clinical Notes", notesS: "Document the clinical reasoning and supporting findings for the diagnosis.", notesPh: "Enter clinical notes here...", optional: "(Optional)",
      common: "Common", freeText: "Add \"{q}\" as free text", noCode: "No code", change: "Change", removeB: "Remove", remove: "Remove {n}", clear: "Clear search", noMatch: "No matching ICD-10-AM code.",
      ch_resp: "Respiratory system", ch_circ: "Circulatory system", ch_endo: "Endocrine & metabolic", ch_dig: "Digestive system", ch_inf: "Infectious diseases", ch_gu: "Genitourinary system",
      ch_msk: "Musculoskeletal system", ch_skin: "Skin", ch_nerv: "Nervous system", ch_ment: "Mental & behavioural", ch_blood: "Blood", ch_eye: "Eye", ch_ear: "Ear", ch_sym: "Symptoms & signs", ch_special: "Special purposes", ch_free: "Free text",
      already: "Already added.", isPrimary: "This is a primary diagnosis.",
      prev: "Previous", draft: "Save as Draft", saveCont: "Save & Continue", draftSaved: "Diagnosis saved as draft.", saved: "Diagnosis saved.",
      needPrimary: "Choose the primary diagnosis.", savedInfo: "Diagnosis saved at {t}."
    },
    ar: {
      title: "التشخيص", sub: "أدخل التشخيص السريري بترميز ICD-10-AM.", stepOf: "الخطوة {n} من {m}",
      primary: "التشخيص الرئيسي", primaryS: "اختر التشخيص الأساسي لهذه الزيارة. تقدر تضيف أكثر من واحد.", primaryMore: "أضف تشخيص رئيسي ثاني (ICD-10-AM أو نص)...", primaryPh: "ابحث بالرمز أو اسم التشخيص (مثال: J06.9، التهاب البلعوم)",
      additional: "تشخيصات إضافية", additionalS: "أضف التشخيصات الثانية إذا فيه.", additionalPh: "ابحث وأضف تشخيص إضافي (ICD-10-AM أو نص)...",
      notes: "ملاحظات سريرية", notesS: "اكتب سبب التشخيص والنتائج اللي تدعمه.", notesPh: "اكتب الملاحظات السريرية هنا...", optional: "(اختياري)",
      common: "شائع", freeText: "إضافة \"{q}\" كنص", noCode: "بدون رمز", change: "تغيير", removeB: "حذف", remove: "حذف {n}", clear: "مسح البحث", noMatch: "ما فيه رمز ICD-10-AM مطابق.",
      ch_resp: "الجهاز التنفسي", ch_circ: "الدورة الدموية", ch_endo: "الغدد والاستقلاب", ch_dig: "الجهاز الهضمي", ch_inf: "الأمراض المعدية", ch_gu: "الجهاز البولي والتناسلي",
      ch_msk: "العضلات والعظام", ch_skin: "الجلد", ch_nerv: "الجهاز العصبي", ch_ment: "النفسية والسلوك", ch_blood: "الدم", ch_eye: "العين", ch_ear: "الأذن", ch_sym: "أعراض وعلامات", ch_special: "رموز خاصة", ch_free: "نص حر",
      already: "مضاف من قبل.", isPrimary: "هذا تشخيص رئيسي.",
      prev: "السابق", draft: "حفظ كمسودة", saveCont: "حفظ ومتابعة", draftSaved: "تم حفظ التشخيص كمسودة.", saved: "تم حفظ التشخيص.",
      needPrimary: "اختر التشخيص الرئيسي.", savedInfo: "تم حفظ التشخيص {t}."
    }
  };

  let draft = null, forId = null, lang = "en", ctx = null, qP = "", qA = "", openBox = null, tried = false;
  const t = () => L[lang];
  const tx = (k, v) => t()[k].replace(/\{(\w+)\}/g, (_, n) => v[n]);
  const S = (p, w) => ctx.svg(p, w), E = s => ctx.esc(s);
  const reset = () => { draft = null; forId = null; qP = ""; qA = ""; openBox = null; tried = false; };
  const nm = d => d[lang] || d.en;
  const same = (a, b) => a && b && (a.code ? a.code === b.code : !b.code && a.en.toLowerCase() === b.en.toLowerCase());
  function load(o) {
    if (draft && forId === o.id) return;
    const dv = o.doctorVisit || {}, src = dv.assessDraft || (dv.steps && dv.steps.assess);
    draft = src ? JSON.parse(JSON.stringify({ additional: [], notes: "", ...src })) : { additional: [], notes: "" };
    draft.primaries = draft.primaries || (draft.primary ? [draft.primary] : []); delete draft.primary;
    forId = o.id;
  }
  function search(q) {
    const s = q.trim().toLowerCase();
    if (!s) return ICD.filter(x => x.common);
    const hits = ICD.filter(x => x.code.toLowerCase().startsWith(s) || x.en.toLowerCase().includes(s) || x.ar.includes(q.trim()));
    return hits.sort((a, b) => b.common - a.common).slice(0, 8);
  }
  function dropdown(which) {
    const q = which === "p" ? qP : qA, list = search(q);
    const rows = list.map((x, n) => `<button type="button" class="dx-opt" role="option" data-pick="${which}" data-code="${x.code}">
      <span class="dx-code" dir="ltr">${x.code}</span><span class="dx-t"><b>${E(nm(x))}</b><small>ICD-10-AM | ${t()["ch_" + x.ch]}</small></span>${x.common ? `<span class="dx-com">${t().common}</span>` : ""}</button>`).join("");
    const free = q.trim().length > 2 ? `<button type="button" class="dx-opt free" data-free="${which}"><span class="dx-code">${S(I.plus, 2.2)}</span><span class="dx-t"><b>${E(tx("freeText", { q: q.trim() }))}</b><small>${t().noCode}</small></span></button>` : "";
    return `<div class="dx-drop" role="listbox" id="drop-${which}">${rows || `<p class="dx-none">${t().noMatch}</p>`}${free}</div>`;
  }
  const searchBox = (which, ph) => {
    const q = which === "p" ? qP : qA;
    return `<div class="dx-sb ${openBox === which ? "open" : ""} ${which === "p" && tried && !draft.primaries.length ? "bad" : ""}">${S(I.search)}
      <input id="dxQ-${which}" type="search" value="${E(q)}" placeholder="${E(ph)}" autocomplete="off" role="combobox" aria-expanded="${openBox === which}" aria-controls="drop-${which}">
      ${q ? `<button type="button" class="dx-clr" data-clr="${which}" aria-label="${E(t().clear)}">${S(I.x, 2.2)}</button>` : ""}
      ${openBox === which ? dropdown(which) : ""}</div>`;
  };
  const chip = (d, n) => `<span class="dx-chip"><b dir="ltr">${d.code ? E(d.code) : t().noCode}</b><span>${E(nm(d))}</span><button type="button" data-rm="${n}" aria-label="${E(tx("remove", { n: nm(d) }))}">${S(I.x, 2.4)}</button></span>`;

  function view(o, c) {
    ctx = c; lang = c.lang; load(o);
    const saved = o.doctorVisit && o.doctorVisit.steps && o.doctorVisit.steps.assess;
    const when = saved && new Date(saved.at).toLocaleString(c.loc(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    const ps = draft.primaries;
    return `<div class="dx">
      <div class="ex-top"><span class="ex-tic">${S(I.steth)}</span><div><h1>${t().title}</h1><p>${t().sub}</p></div><span class="ex-stp">${tx("stepOf", c.stepOf)}</span></div>
      ${saved ? `<div class="info ok">${S(I.check, 2.4)}<span>${tx("savedInfo", { t: E(when) })}</span></div>` : ""}
      <div class="dx-f"><label for="dxQ-p">${t().primary} <span class="req">*</span></label><small>${t().primaryS}</small>
        ${ps.map((p, n) => `<div class="dx-picked"><span class="dx-code" dir="ltr">${p.code ? E(p.code) : t().noCode}</span><span class="dx-t"><b>${E(nm(p))}</b><small>ICD-10-AM | ${t()["ch_" + (p.ch || "free")]}</small></span>
          <button type="button" class="dx-chg" data-rmp="${n}" aria-label="${E(tx("remove", { n: nm(p) }))}">${S(I.x, 2.2)}${t().removeB}</button></div>`).join("")}
        <div class="${ps.length ? "dx-more" : ""}">${searchBox("p", ps.length ? t().primaryMore : t().primaryPh)}</div>
        ${tried && !ps.length ? `<div class="hx-err">${t().needPrimary}</div>` : ""}</div>
      <div class="dx-f"><label for="dxQ-a">${t().additional} <span class="hx-opt">${t().optional}</span></label><small>${t().additionalS}</small>
        ${searchBox("a", t().additionalPh)}
        ${draft.additional.length ? `<div class="dx-chips">${draft.additional.map(chip).join("")}</div>` : ""}</div>
      <div class="dx-f"><label for="dxNotes">${t().notes} <span class="hx-opt">${t().optional}</span></label><small>${t().notesS}</small>
        <div class="hx-area"><textarea id="dxNotes" rows="4" maxlength="1000" placeholder="${E(t().notesPh)}">${E(draft.notes)}</textarea><div class="hx-count"><span id="dxCount">${draft.notes.length}</span> / 1000</div></div></div>
      <div class="ex-foot"><button type="button" class="hx-btn out" id="dxPrev"><span class="flip">${S(I.back)}</span>${t().prev}</button><span class="hx-sp"></span>
        <button type="button" class="hx-btn soft" id="dxDraft">${S(I.doc)}${t().draft}</button>
        <button type="button" class="hx-btn dark" id="dxSave">${t().saveCont}${S(I.arrow)}</button></div>
    </div>`;
  }

  function choose(which, d) {
    if (which === "p") {
      if (draft.primaries.some(x => same(x, d))) { qP = ""; openBox = null; ctx.rerender(); return ctx.toast(t().already); }
      draft.primaries.push(d); draft.additional = draft.additional.filter(x => !same(x, d)); qP = "";
    } else {
      const dup = draft.primaries.some(x => same(x, d)) ? "isPrimary" : draft.additional.some(x => same(x, d)) ? "already" : null;
      if (dup) { qA = ""; openBox = null; ctx.rerender(); return ctx.toast(t()[dup]); }
      draft.additional.push(d); qA = "";
    }
    openBox = null; ctx.rerender();
    if (which === "a") { const i = document.getElementById("dxQ-a"); if (i) i.focus(); }
  }
  function bind(root, o, c) {
    ctx = c;
    const $ = s => root.querySelector(s), all = (s, f) => root.querySelectorAll(s).forEach(f);
    const keepFocus = which => { const i = document.getElementById("dxQ-" + which); if (i) { i.focus(); const n = i.value.length; i.setSelectionRange(n, n); } };
    const bindDrop = () => {
      all("[data-pick]", b => b.onmousedown = e => { e.preventDefault(); const x = ICD.find(y => y.code === b.dataset.code); choose(b.dataset.pick, { code: x.code, ch: x.ch, en: x.en, ar: x.ar }); });
      all("[data-free]", b => b.onmousedown = e => { e.preventDefault(); const w = b.dataset.free, v = (w === "p" ? qP : qA).trim(); choose(w, { code: "", ch: "free", en: v, ar: v }); });
    };
    ["p", "a"].forEach(w => {
      const i = $("#dxQ-" + w); if (!i) return;
      i.addEventListener("focus", () => { if (openBox !== w) { openBox = w; ctx.rerender(); keepFocus(w); } });
      i.addEventListener("input", () => {
        const had = !!(w === "p" ? qP : qA);
        if (w === "p") qP = i.value; else qA = i.value;
        if (had !== !!i.value) { ctx.rerender(); keepFocus(w); return; }
        const d = root.querySelector("#drop-" + w); if (d) { d.outerHTML = dropdown(w); bindDrop(); }
      });
      i.addEventListener("blur", () => setTimeout(() => { if (openBox === w && document.activeElement !== document.getElementById("dxQ-" + w)) { openBox = null; ctx.rerender(); } }, 120));
      i.addEventListener("keydown", e => {
        if (e.key === "Escape") { openBox = null; ctx.rerender(); }
        if (e.key === "Enter") { e.preventDefault(); const first = root.querySelector(`#drop-${w} .dx-opt`); if (first) first.dispatchEvent(new MouseEvent("mousedown")); }
      });
    });
    bindDrop();
    all("[data-clr]", b => b.addEventListener("mousedown", e => { e.preventDefault(); if (b.dataset.clr === "p") qP = ""; else qA = ""; ctx.rerender(); keepFocus(b.dataset.clr); }));
    all("[data-rmp]", b => b.addEventListener("click", () => { draft.primaries.splice(+b.dataset.rmp, 1); ctx.rerender(); }));
    all("[data-rm]", b => b.addEventListener("click", () => { draft.additional.splice(+b.dataset.rm, 1); ctx.rerender(); }));
    $("#dxNotes").addEventListener("input", e => { draft.notes = e.target.value; $("#dxCount").textContent = draft.notes.length; });
    $("#dxPrev").addEventListener("click", () => ctx.go(ctx.prevKey));
    $("#dxDraft").addEventListener("click", () => { ctx.saveDraft(clean()); ctx.toast(t().draftSaved); });
    $("#dxSave").addEventListener("click", () => {
      tried = true;
      if (!draft.primaries.length) { openBox = null; ctx.rerender(); return ctx.toast(t().needPrimary); }
      ctx.save(clean()); reset(); ctx.toast(t().saved); ctx.go(ctx.nextKey);
    });
  }
  const clean = () => JSON.parse(JSON.stringify({ primaries: draft.primaries, primary: draft.primaries[0] || null, additional: draft.additional, notes: draft.notes.trim() }));
  // Every primary diagnosis of a saved step, older visits included (one primary).
  const primaries = as => as ? (as.primaries && as.primaries.length ? as.primaries : as.primary ? [as.primary] : []) : [];

  return { view, bind, reset, L, primaries };
})();
