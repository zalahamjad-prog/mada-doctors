// Allergy History (doctor visit step after the examination). Saved in order.doctorVisit.steps.allergy:
//   { status: "yes" | "no" | "unknown", items: [{ id, kind: "substance" | "reaction", cat, reactions: [], cause, severity, notes }], at, by }
// "Save as Draft" keeps the same shape in doctorVisit.allergyDraft. The first time it opens, it starts from the
// drug allergies (or "no known drug allergies") recorded in Case History > Medication History.
const DrAllergy = (() => {
  // SAMPLE terminology list. SNOMED codes are copied from the design and must be checked against the SNOMED CT release
  // before go-live; entries without a code show none. TODO: replace with the terminology server search.
  // [id, cat, code, en, ar, synonym en, synonym ar, common]
  const DB = [
    ["penicillin", "drug", "764146007", "Penicillin", "بنسلين", "", "", 1], ["amoxicillin", "drug", "387363000", "Amoxicillin", "أموكسيسيلين", "", "", 1],
    ["cephalosporins", "drug", "418986007", "Cephalosporins", "سيفالوسبورينات", "", "", 1], ["aspirin", "drug", "387207008", "Aspirin (Acetylsalicylic acid)", "أسبرين (حمض أسيتيل الساليسيليك)", "", "", 1],
    ["ibuprofen", "drug", "387206004", "Ibuprofen", "إيبوبروفين", "", "", 1], ["sulfa", "drug", "387947000", "Sulfa drugs", "أدوية السلفا", "", "", 1],
    ["metronidazole", "drug", "372481000", "Metronidazole", "ميترونيدازول", "", "", 1], ["contrast", "drug", "300913006", "Iodinated contrast media", "صبغة الأشعة اليودية", "", "", 1],
    ["codeine", "drug", "", "Codeine", "كودايين"], ["morphine", "drug", "", "Morphine", "مورفين"], ["diclofenac", "drug", "", "Diclofenac", "ديكلوفيناك"],
    ["ciprofloxacin", "drug", "", "Ciprofloxacin", "سيبروفلوكساسين"], ["erythromycin", "drug", "", "Erythromycin", "إريثرومايسين"], ["paracetamol", "drug", "", "Paracetamol", "باراسيتامول"],
    ["peanut", "food", "227493005", "Peanut", "فول سوداني", "Arachis hypogaea", "Arachis hypogaea", 1], ["egg", "food", "", "Egg", "بيض", "", "", 1],
    ["milk", "food", "", "Cow's milk", "حليب البقر", "", "", 1], ["shellfish", "food", "", "Shellfish", "مأكولات بحرية قشرية", "Shrimp, crab, lobster", "روبيان، سلطعون، استاكوزا", 1],
    ["fish", "food", "", "Fish", "سمك", "", "", 1], ["wheat", "food", "", "Wheat", "قمح", "Gluten", "جلوتين", 1], ["sesame", "food", "", "Sesame", "سمسم", "", "", 1],
    ["treenuts", "food", "", "Tree nuts", "مكسرات", "Almond, walnut, cashew", "لوز، جوز، كاجو", 1],
    ["pollen", "env", "23582008", "Pollen", "حبوب اللقاح", "Pollen allergen", "مسبب حساسية حبوب اللقاح", 1], ["dust", "env", "", "House dust mite", "عث الغبار", "", "", 1],
    ["dander", "env", "", "Animal dander", "وبر الحيوانات", "Cat, dog", "قطط، كلاب", 1], ["mold", "env", "", "Mold", "العفن", "", "", 1],
    ["latex", "mat", "764160008", "Latex", "لاتكس", "Latex, natural rubber", "مطاط طبيعي", 1], ["tape", "mat", "", "Adhesive tape", "لاصق طبي", "", "", 1],
    ["nickel", "mat", "", "Nickel", "نيكل", "", "", 1], ["chlorhexidine", "mat", "", "Chlorhexidine", "كلورهيكسيدين", "", "", 1],
    ["bee", "venom", "303848000", "Bee venom", "سم النحل", "Apis mellifera venom", "سم نحل العسل", 1], ["wasp", "venom", "", "Wasp venom", "سم الدبور", "", "", 1],
    ["fireant", "venom", "", "Fire ant venom", "سم النمل الناري", "", "", 1]
  ];
  const RX = [
    ["rash", "271807003", "Rash", "طفح جلدي", "Exanthema", "طفح"], ["anaphylaxis", "39579001", "Anaphylaxis", "صدمة تحسسية", "Anaphylactic reaction", "تفاعل تحسسي شديد"],
    ["hives", "", "Hives", "شرى (أرتكاريا)", "Urticaria", "أرتكاريا"], ["itching", "", "Itching", "حكة", "Pruritus", "حكة"],
    ["angioedema", "", "Swelling", "تورم", "Angioedema", "وذمة وعائية"], ["sob", "", "Shortness of breath", "ضيق تنفس", "Dyspnea", "ضيق نفس"],
    ["gi", "", "Nausea / vomiting", "غثيان / استفراغ", "", ""], ["diarrhea", "", "Diarrhea", "إسهال", "", ""]
  ];
  const CATS = ["drug", "food", "env", "mat", "venom"];
  const SAMPLE = ["latex", "peanut", "rx:rash", "rx:anaphylaxis", "pollen", "bee"];
  const I = {
    shield: '<path d="M12 3 5 6v5c0 4.5 3 8.5 7 10 4-1.5 7-5.5 7-10V6z"/><path d="M12 9v6M9 12h6"/>',
    q: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 0 1 4.6 1.3c0 1.7-2.1 2-2.1 3.4M12 17h.01"/>',
    bolt: '<path d="M13 3 5 13h6l-1 8 8-10h-6z"/>', search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    plus: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>', added: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    list: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 9h8M8 13h8M8 17h5"/>', chev: '<path d="m9 6 6 6-6 6"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', back: '<path d="M19 12H5M11 6l-6 6 6 6"/>', arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    doc: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>', check: '<path d="m5 12 5 5 9-10"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'
  };
  const L = {
    en: {
      title: "Allergy History", sub: "Document the patient's known allergies.", stepOf: "Step {n} of {m}",
      q: "Does the patient have any known allergies?", qS: "Select the appropriate option to document allergy status.",
      s_yes: "Yes", sd_yes: "Known allergies", s_no: "No", sd_no: "No known allergies (NKA)", s_unknown: "Unknown", sd_unknown: "Not confirmed",
      commonT: "Common Allergies", commonS: "Quick add frequently documented allergies.", commonS2: "Click to add, click again to remove.", more: "View more common allergies", less: "Show fewer",
      searchT: "Search Allergies", searchS: "Search in the medical terminology database.", m_both: "Substance or Reaction", m_sub: "Substance only", m_rx: "Reaction only",
      searchPh: "Search by substance or reaction (e.g. Penicillin, Latex, Rash)", clear: "Clear search", category: "Category", all: "All", noResults: "No match. Try another word.",
      c_drug: "Drug", c_food: "Food", c_env: "Environment", c_mat: "Medical Material", c_venom: "Insect Venom", c_rx: "Reaction",
      t_drug: "Drugs", t_food: "Food", t_env: "Environment", t_mat: "Medical Materials", t_venom: "Insect Venom",
      substance: "substance", reaction: "reaction", add: "Add {n}", remove: "Remove {n}",
      recT: "Recorded Allergies", recS: "Add the reaction and severity for each allergy.", recNone: "Nothing added yet. Pick from the common list or search.",
      reactions: "Reaction", cause: "Suspected cause", causePh: "e.g. new medicine started last week", severity: "Severity", sv_mild: "Mild", sv_moderate: "Moderate", sv_severe: "Severe", notesPh: "Add notes...",
      noInfo: "No known allergies will be recorded for this patient.", unkInfo: "Allergy status will be recorded as not confirmed. Update it when you know more.",
      fromMeds: "Started from the drug allergies in Medication History.",
      prev: "Previous", draft: "Save as Draft", saveCont: "Save & Continue", draftSaved: "Allergy history saved as draft.", saved: "Allergy history saved.",
      needStatus: "Choose whether the patient has known allergies.", needItem: "Add at least one allergy, or choose No or Unknown.", savedInfo: "Allergy history saved at {t}. You can still update it."
    },
    ar: {
      title: "تاريخ الحساسية", sub: "سجّل الحساسية المعروفة عند المريض.", stepOf: "الخطوة {n} من {m}",
      q: "هل عند المريض حساسية معروفة؟", qS: "اختر الخيار المناسب لتسجيل حالة الحساسية.",
      s_yes: "نعم", sd_yes: "عنده حساسية معروفة", s_no: "لا", sd_no: "لا توجد حساسية معروفة (NKA)", s_unknown: "غير معروف", sd_unknown: "ما تأكد",
      commonT: "الحساسية الشائعة", commonS: "إضافة سريعة لأكثر أنواع الحساسية تسجيلاً.", commonS2: "اضغط للإضافة، واضغط مرة ثانية للحذف.", more: "عرض المزيد", less: "عرض أقل",
      searchT: "البحث في الحساسية", searchS: "ابحث في قاعدة المصطلحات الطبية.", m_both: "مادة أو تفاعل", m_sub: "مادة فقط", m_rx: "تفاعل فقط",
      searchPh: "ابحث بالمادة أو التفاعل (مثال: بنسلين، لاتكس، طفح)", clear: "مسح البحث", category: "التصنيف", all: "الكل", noResults: "ما فيه نتيجة. جرّب كلمة ثانية.",
      c_drug: "دواء", c_food: "طعام", c_env: "بيئة", c_mat: "مستلزمات طبية", c_venom: "سم حشرات", c_rx: "تفاعل",
      t_drug: "أدوية", t_food: "طعام", t_env: "بيئة", t_mat: "مستلزمات طبية", t_venom: "سم حشرات",
      substance: "مادة", reaction: "تفاعل", add: "إضافة {n}", remove: "حذف {n}",
      recT: "الحساسية المسجلة", recS: "أضف التفاعل والشدة لكل حساسية.", recNone: "ما أضيف شي للحين. اختر من القائمة الشائعة أو ابحث.",
      reactions: "التفاعل", cause: "السبب المشتبه", causePh: "مثال: دواء جديد بدأه الأسبوع الماضي", severity: "الشدة", sv_mild: "خفيفة", sv_moderate: "متوسطة", sv_severe: "شديدة", notesPh: "أضف ملاحظات...",
      noInfo: "بيتسجل إن المريض ما عنده حساسية معروفة.", unkInfo: "بتتسجل حالة الحساسية غير مؤكدة. حدّثها إذا عرفت أكثر.",
      fromMeds: "بدأنا من حساسية الأدوية المسجلة في التاريخ الدوائي.",
      prev: "السابق", draft: "حفظ كمسودة", saveCont: "حفظ ومتابعة", draftSaved: "تم حفظ تاريخ الحساسية كمسودة.", saved: "تم حفظ تاريخ الحساسية.",
      needStatus: "اختر هل عند المريض حساسية معروفة.", needItem: "أضف حساسية وحدة على الأقل، أو اختر لا أو غير معروف.", savedInfo: "تم حفظ تاريخ الحساسية {t}. تقدر تعدله."
    }
  };

  let draft = null, forId = null, lang = "en", ctx = null, tab = "drug", more = false, mode = "both", cat = "all", q = "", fromMeds = false;
  const t = () => L[lang];
  const tx = (k, v) => t()[k].replace(/\{(\w+)\}/g, (_, n) => v[n]);
  const S = (p, w) => ctx.svg(p, w), E = s => ctx.esc(s);
  const sub = r => ({ id: r[0], kind: "substance", cat: r[1], code: r[2], en: r[3], ar: r[4], syn: { en: r[5] || "", ar: r[6] || "" }, common: !!r[7] });
  const rx = r => ({ id: "rx:" + r[0], kind: "reaction", cat: "rx", code: r[1], en: r[2], ar: r[3], syn: { en: r[4], ar: r[5] } });
  const ALL = DB.map(sub).concat(RX.map(rx));
  const byId = id => ALL.find(x => x.id === id);
  const nameOf = it => (byId(it.id) || it)[lang] || it.en || it.id;
  const reset = () => { draft = null; forId = null; q = ""; more = false; };

  function load(o) {
    if (draft && forId === o.id) return;
    const dv = o.doctorVisit || {}, src = dv.allergyDraft || (dv.steps && dv.steps.allergy);
    fromMeds = false;
    if (src) draft = JSON.parse(JSON.stringify(src));
    else {
      // Start from Medication History: its drug allergies (matched to the list by name) or "no known drug allergies".
      const meds = (dv.history || {}).meds;
      draft = { status: "", items: [] };
      if (meds && meds.allergies && meds.allergies.length) {
        draft.status = "yes"; fromMeds = true;
        draft.items = meds.allergies.map((a, n) => {
          const hit = ALL.find(x => x.kind === "substance" && [x.en, x.ar].some(v => v.toLowerCase() === String(a.drug || "").trim().toLowerCase()));
          return hit ? { id: hit.id, kind: "substance", cat: hit.cat, reactions: [], severity: a.severity || "", notes: a.reaction || "" }
            : { id: "custom:" + n, en: a.drug, ar: a.drug, kind: "substance", cat: "drug", reactions: [], severity: a.severity || "", notes: a.reaction || "" };
        }).filter(i => String(nameOf(i) || "").trim());
      } else if (meds && meds.nkda) draft.status = "no";
    }
    forId = o.id;
  }
  const has = id => draft.items.some(i => i.id === id);
  function toggle(id) {
    if (has(id)) draft.items = draft.items.filter(i => i.id !== id);
    else { const x = byId(id); draft.items.push({ id, kind: x.kind, cat: x.cat, reactions: [], cause: "", severity: "", notes: "" }); }
  }
  const tag = c => `<span class="al-tag c-${c}">${t()["c_" + c]}</span>`;
  const code = c => c ? `<span class="al-code">SNOMED: ${c}</span>` : `<span class="al-code none"></span>`;
  const addBtn = x => `<button type="button" class="al-add ${has(x.id) ? "on" : ""}" data-tg="${x.id}" aria-pressed="${has(x.id)}" aria-label="${E(tx(has(x.id) ? "remove" : "add", { n: x[lang] }))}">${S(has(x.id) ? I.added : I.plus)}</button>`;

  function statusCard() {
    const opt = v => `<label class="al-opt ${draft.status === v ? "on" : ""}"><input type="radio" name="alst" value="${v}" data-st ${draft.status === v ? "checked" : ""}><span class="dot"></span><span><b>${t()["s_" + v]}</b><small>${t()["sd_" + v]}</small></span></label>`;
    return `<div class="al-q"><span class="al-qic">${S(I.q)}</span><div class="al-qt"><b>${t().q}</b><small>${t().qS}</small></div><div class="al-opts">${["yes", "no", "unknown"].map(opt).join("")}</div></div>`;
  }
  function commonPanel() {
    const list = ALL.filter(x => x.cat === tab && x.kind === "substance"), shown = more ? list : list.filter(x => x.common).slice(0, 8);
    return `<div class="al-panel"><div class="al-ph"><span class="al-pic teal">${S(I.bolt)}</span><div><h3>${t().commonT}</h3><p>${t().commonS}</p><small>${t().commonS2}</small></div></div>
      <div class="al-tabs" role="tablist">${CATS.map(c => `<button type="button" role="tab" class="al-tab ${tab === c ? "on" : ""}" data-tab="${c}" aria-selected="${tab === c}">${t()["t_" + c]}</button>`).join("")}</div>
      <div class="al-list">${shown.map(x => `<div class="al-row ${has(x.id) ? "sel" : ""}">${addBtn(x)}<span class="al-nm"><b>${E(x[lang])}</b></span>${code(x.code)}${tag(x.cat)}</div>`).join("")}</div>
      ${list.length > 8 || list.some(x => !x.common) ? `<button type="button" class="al-more" id="alMore">${S(I.list)}<span>${more ? t().less : t().more}</span>${S(I.chev)}</button>` : ""}</div>`;
  }
  function results() {
    const term = q.trim().toLowerCase();
    let list = ALL.filter(x => (mode === "both" || (mode === "sub") === (x.kind === "substance")) && (cat === "all" || x.cat === cat));
    if (term) list = list.filter(x => [x.en, x.ar, x.syn.en, x.syn.ar].some(v => v && v.toLowerCase().includes(term)));
    else list = SAMPLE.map(byId).filter(x => list.includes(x)).concat(list.filter(x => !SAMPLE.includes(x.id))).slice(0, 6);
    if (!list.length) return `<p class="hx-empty">${t().noResults}</p>`;
    return list.slice(0, 8).map(x => `<div class="al-row two ${has(x.id) ? "sel" : ""}"><span class="al-nm"><b>${E(x[lang])} <span>(${x.kind === "reaction" ? t().reaction : t().substance})</span></b>${x.syn[lang] ? `<small>${E(x.syn[lang])}</small>` : ""}</span>${code(x.code)}${tag(x.cat)}${addBtn(x)}</div>`).join("");
  }
  function searchPanel() {
    return `<div class="al-panel"><div class="al-ph"><span class="al-pic violet">${S(I.search)}</span><div><h3>${t().searchT}</h3><p>${t().searchS}</p></div></div>
      <div class="al-modes">${["both", "sub", "rx"].map(m => `<button type="button" class="al-mode ${mode === m ? "on" : ""}" data-mode="${m}" aria-pressed="${mode === m}">${t()["m_" + m]}</button>`).join("")}</div>
      <div class="al-search">${S(I.search)}<input id="alQ" type="search" value="${E(q)}" placeholder="${E(t().searchPh)}" autocomplete="off">${q ? `<button type="button" id="alClear" aria-label="${E(t().clear)}">${S(I.x, 2.4)}</button>` : ""}</div>
      ${mode === "rx" ? "" : `<div class="al-cl">${t().category}</div><div class="al-cats">${["all"].concat(CATS).map(c => `<button type="button" class="al-cat ${cat === c ? "on" : ""}" data-cat="${c}" aria-pressed="${cat === c}">${c === "all" ? t().all : t()["c_" + c]}</button>`).join("")}</div>`}
      <div class="al-list" id="alRes">${results()}</div></div>`;
  }
  function recorded() {
    const row = (it, n) => {
      const x = byId(it.id) || it;
      const rxs = it.kind === "substance"
        ? `<div class="al-rf"><span>${t().reactions}</span><div class="al-chips">${RX.map(r => `<button type="button" class="al-chip ${it.reactions.includes(r[0]) ? "on" : ""}" data-rx="${n}" data-v="${r[0]}" aria-pressed="${it.reactions.includes(r[0])}">${E(lang === "ar" ? r[3] : r[2])}</button>`).join("")}</div></div>`
        : `<div class="al-rf"><span>${t().cause}</span><input class="ex-note" data-cause="${n}" value="${E(it.cause || "")}" placeholder="${E(t().causePh)}" maxlength="200"></div>`;
      return `<div class="al-rec"><div class="al-rh"><b>${E(nameOf(it))}</b>${tag(it.cat)}${code(x.code)}<button type="button" class="ex-del" data-rm="${n}" aria-label="${E(tx("remove", { n: nameOf(it) }))}">${S(I.trash)}</button></div>
        ${rxs}
        <div class="al-rf"><span>${t().severity}</span><div class="al-chips">${["mild", "moderate", "severe"].map(v => `<button type="button" class="hx-chip sev sev-${v} ${it.severity === v ? "on" : ""}" data-sev="${n}" data-v="${v}" aria-pressed="${it.severity === v}">${t()["sv_" + v]}</button>`).join("")}</div></div>
        <input class="ex-note" data-note="${n}" value="${E(it.notes || "")}" placeholder="${E(t().notesPh)}" maxlength="300"></div>`;
    };
    return `<section class="al-recs"><div class="al-rth"><b>${t().recT} <span class="al-count">${draft.items.length}</span></b><small>${t().recS}</small></div>
      ${fromMeds ? `<div class="info">${S(I.info, 2)}<span>${t().fromMeds}</span></div>` : ""}
      ${draft.items.length ? draft.items.map(row).join("") : `<p class="hx-empty">${t().recNone}</p>`}</section>`;
  }

  function view(o, c) {
    ctx = c; lang = c.lang; load(o);
    const saved = o.doctorVisit && o.doctorVisit.steps && o.doctorVisit.steps.allergy;
    const when = saved && new Date(saved.at).toLocaleString(c.loc(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    const body = draft.status === "yes" ? `<div class="al-two">${commonPanel()}${searchPanel()}</div>${recorded()}`
      : draft.status ? `<div class="info ${draft.status === "no" ? "ok" : ""}">${S(draft.status === "no" ? I.check : I.info, 2.2)}<span>${draft.status === "no" ? t().noInfo : t().unkInfo}</span></div>` : "";
    return `<div class="al">
      <div class="ex-top"><span class="ex-tic">${S(I.shield)}</span><div><h1>${t().title}</h1><p>${t().sub}</p></div><span class="ex-stp">${tx("stepOf", c.stepOf)}</span></div>
      ${saved ? `<div class="info ok">${S(I.check, 2.4)}<span>${tx("savedInfo", { t: E(when) })}</span></div>` : ""}
      ${statusCard()}${body}
      <div class="ex-foot"><button type="button" class="hx-btn out" id="alPrev"><span class="flip">${S(I.back)}</span>${t().prev}</button><span class="hx-sp"></span>
        <button type="button" class="hx-btn soft" id="alDraft">${S(I.doc)}${t().draft}</button>
        <button type="button" class="hx-btn dark" id="alSave">${t().saveCont}${S(I.arrow)}</button></div>
    </div>`;
  }

  function bind(root, o, c) {
    ctx = c;
    const redraw = () => ctx.rerender();
    const $ = s => root.querySelector(s), all = (s, f) => root.querySelectorAll(s).forEach(f);
    all("[data-st]", el => el.addEventListener("change", () => { draft.status = el.value; redraw(); }));
    const bindLists = () => all("[data-tg]", b => b.onclick = () => { toggle(b.dataset.tg); redraw(); });
    bindLists();
    all("[data-tab]", b => b.addEventListener("click", () => { tab = b.dataset.tab; more = false; redraw(); }));
    if ($("#alMore")) $("#alMore").addEventListener("click", () => { more = !more; redraw(); });
    all("[data-mode]", b => b.addEventListener("click", () => { mode = b.dataset.mode; redraw(); }));
    all("[data-cat]", b => b.addEventListener("click", () => { cat = b.dataset.cat; redraw(); }));
    if ($("#alQ")) $("#alQ").addEventListener("input", e => {
      const had = !!q; q = e.target.value;
      if (had !== !!q) { redraw(); const i = document.getElementById("alQ"); i.focus(); i.setSelectionRange(q.length, q.length); return; }
      $("#alRes").innerHTML = results(); bindLists();
    });
    if ($("#alClear")) $("#alClear").addEventListener("click", () => { q = ""; redraw(); document.getElementById("alQ").focus(); });
    all("[data-rm]", b => b.addEventListener("click", () => { draft.items.splice(+b.dataset.rm, 1); redraw(); }));
    all("[data-rx]", b => b.addEventListener("click", () => {
      const it = draft.items[+b.dataset.rx], v = b.dataset.v;
      it.reactions = it.reactions.includes(v) ? it.reactions.filter(x => x !== v) : it.reactions.concat(v); redraw();
    }));
    all("[data-sev]", b => b.addEventListener("click", () => { const it = draft.items[+b.dataset.sev]; it.severity = it.severity === b.dataset.v ? "" : b.dataset.v; redraw(); }));
    all("[data-cause]", el => el.addEventListener("input", () => { draft.items[+el.dataset.cause].cause = el.value; }));
    all("[data-note]", el => el.addEventListener("input", () => { draft.items[+el.dataset.note].notes = el.value; }));
    $("#alPrev").addEventListener("click", () => ctx.go(ctx.prevKey));
    $("#alDraft").addEventListener("click", () => { ctx.saveDraft(clean()); ctx.toast(t().draftSaved); });
    $("#alSave").addEventListener("click", () => {
      if (!draft.status) return ctx.toast(t().needStatus);
      if (draft.status === "yes" && !draft.items.length) return ctx.toast(t().needItem);
      ctx.save(clean()); reset(); ctx.toast(t().saved); ctx.go(ctx.nextKey);
    });
  }
  const clean = () => ({ status: draft.status, items: draft.status === "yes" ? JSON.parse(JSON.stringify(draft.items)) : [] });

  // Display name of a recorded item, used by the treatment plan's allergy check.
  const nameIn = (it, lg) => (byId(it.id) || it)[lg] || it.en || it.id;
  return { view, bind, reset, L, nameIn };
})();
