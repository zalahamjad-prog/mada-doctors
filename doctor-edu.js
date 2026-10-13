// Family Education (doctor visit step after Nurse Note). What the patient or family was taught before the team leaves.
// Saved in order.doctorVisit.steps.edu: { date, method: "face"|"online"|"phone", difficulty: "no"|"yes", barriers: [ids], diffNote,
//   who: [ids], whoOther, topics: [ids], custom: [text], otherTopic, notes, none, at, by }. "Save as Draft" keeps the same shape in doctorVisit.eduDraft.
// To continue: a saved education record, or "No education given at this visit".
const DrEdu = (() => {
  const MAX = 1000;
  const I = {
    edu: '<path d="M3 8.5 12 4l9 4.5-9 4.5z"/><path d="M7 10.5V15c0 1.5 2.2 3 5 3s5-1.5 5-3v-4.5"/><path d="M21 8.5V14"/>',
    face: '<circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><path d="M2.5 19a5.5 5.5 0 0 1 11 0M10.5 19a5.5 5.5 0 0 1 11 0"/>',
    online: '<rect x="2.5" y="6" width="13" height="12" rx="2"/><path d="m15.5 10 6-3.5v11l-6-3.5"/>',
    phone: '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
    cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>', plus: '<path d="M12 5v14M5 12h14"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
    check: '<path d="m5 12 5 5 9-10"/>', save: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3M8 21v-6h8v6"/>', pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    back: '<path d="M19 12H5M11 6l-6 6 6 6"/>', arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', doc: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/>'
  };
  // Topics shown as a checklist, and common instructions added with one tap. TODO: confirm the list with the nursing team.
  const TOPICS = [["wound", "Wound care and dressing", "العناية بالجرح والغيار"], ["meds", "Medication use and side effects", "استخدام الأدوية وأعراضها الجانبية"],
    ["diet", "Diet and lifestyle advice", "نصائح الغذاء ونمط الحياة"], ["warn", "Warning signs and when to seek medical help", "علامات الخطر ومتى يطلب المساعدة الطبية"], ["fu", "Follow-up plan", "خطة المتابعة"]];
  const COMMON = [["homecare", "Wound care at home", "العناية بالجرح في البيت"], ["dressing", "How to change dressing", "طريقة تغيير الغيار"], ["infection", "Signs of infection", "علامات الالتهاب"],
    ["medinst", "Medication instructions", "تعليمات الأدوية"], ["hydration", "Diet and hydration", "الغذاء وشرب السوائل"], ["activity", "Activity restrictions", "قيود النشاط والحركة"],
    ["fuappt", "Follow-up appointment", "موعد المتابعة"], ["contact", "When to contact the doctor", "متى يتواصل مع الطبيب"]];
  const WHO = ["patient", "family", "caregiver"];
  const BARRIERS = ["language", "hearing", "vision", "cognitive", "emotional"];
  const L = {
    en: {
      title: "Family Education", sub: "Provide education to the patient or family about the condition, treatment, and home care instructions.", stepOf: "Step {n} of {m}",
      date: "Education Date", method: "How was the education provided?", m_face: "Face to Face", m_online: "Online", m_phone: "Phone Call",
      diff: "Did the patient face any difficulty understanding the education?", no: "No", yes: "Yes", barriers: "What made it difficult?",
      b_language: "Language", b_hearing: "Hearing", b_vision: "Vision", b_cognitive: "Memory or understanding", b_emotional: "Stress or anxiety",
      diffNote: "How was it handled?", diffPh: "Example: explained again with pictures, translated by a family member ...",
      who: "Who was educated?", w_patient: "Patient", w_family: "Family Member", w_caregiver: "Caregiver", other: "Other", specify: "Specify ...",
      topics: "Education Topics / Instructions", searchPh: "Search and add instructions ...", addCustom: "Add \"{q}\"", common: "Common Instructions", added: "Added",
      notes: "Additional Education Notes", notesPh: "Any additional notes about the education provided ...", optional: "(Optional)",
      cancel: "Cancel", saveEdu: "Save Education", saved: "Family education saved.", savedAt: "Saved {t}", edit: "Edit Education", reverted: "Changes discarded.",
      fixErr: "Fill in the required fields.", none: "No education given at this visit", prev: "Previous", draft: "Save as Draft", draftSaved: "Draft saved.",
      cont: "Save & Continue", needEdu: "Save the education, or tick \"No education given at this visit\".", storeErr: "Couldn't save. Try again.", remove: "Remove",
      sDate: "Date", sMethod: "Method", sDiff: "Understanding", sWho: "Educated", sTopics: "Topics", sNotes: "Notes", noDiff: "No difficulty", hadDiff: "Had difficulty"
    },
    ar: {
      title: "تثقيف الأسرة", sub: "ثقّف المريض أو أسرته عن الحالة والعلاج وتعليمات الرعاية في البيت.", stepOf: "الخطوة {n} من {m}",
      date: "تاريخ التثقيف", method: "كيف تم التثقيف؟", m_face: "وجهاً لوجه", m_online: "عن بُعد (فيديو)", m_phone: "مكالمة",
      diff: "هل واجه المريض صعوبة في فهم التثقيف؟", no: "لا", yes: "نعم", barriers: "وش اللي صعّب الفهم؟",
      b_language: "اللغة", b_hearing: "السمع", b_vision: "النظر", b_cognitive: "الذاكرة أو الإدراك", b_emotional: "توتر أو قلق",
      diffNote: "كيف تم التعامل معها؟", diffPh: "مثال: شرحنا مرة ثانية بالصور، ترجم أحد أفراد الأسرة ...",
      who: "مين تم تثقيفه؟", w_patient: "المريض", w_family: "أحد أفراد الأسرة", w_caregiver: "مقدم الرعاية", other: "أخرى", specify: "حدّد ...",
      topics: "مواضيع وتعليمات التثقيف", searchPh: "ابحث وأضف تعليمات ...", addCustom: "إضافة \"{q}\"", common: "تعليمات شائعة", added: "مضافة",
      notes: "ملاحظات إضافية عن التثقيف", notesPh: "أي ملاحظات إضافية عن التثقيف اللي تم ...", optional: "(اختياري)",
      cancel: "إلغاء", saveEdu: "حفظ التثقيف", saved: "انحفظ تثقيف الأسرة.", savedAt: "انحفظ {t}", edit: "تعديل التثقيف", reverted: "تم التراجع عن التعديلات.",
      fixErr: "عبّ الحقول المطلوبة.", none: "ما تم تثقيف في هذه الزيارة", prev: "السابق", draft: "حفظ كمسودة", draftSaved: "انحفظت المسودة.",
      cont: "حفظ ومتابعة", needEdu: "احفظ التثقيف، أو اختر \"ما تم تثقيف في هذه الزيارة\".", storeErr: "ما قدرنا نحفظ. حاول مرة ثانية.", remove: "حذف",
      sDate: "التاريخ", sMethod: "الطريقة", sDiff: "الفهم", sWho: "تم تثقيف", sTopics: "المواضيع", sNotes: "ملاحظات", noDiff: "بدون صعوبة", hadDiff: "فيه صعوبة"
    }
  };
  let ctx = null, lang = "en", st = null, forId = null, editing = false, tried = false, q = "";
  const t = () => L[lang];
  const tx = (k, v) => t()[k].replace(/\{(\w+)\}/g, (_, n) => v[n]);
  const S = (p, w) => ctx.svg(p, w), E = s => ctx.esc(s);
  const ix = () => lang === "ar" ? 2 : 1;
  const pad2 = n => String(n).padStart(2, "0");
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
  const fmtD = v => { const [y, m, d] = String(v || "").split("-"); return d ? `${d}/${m}/${y}` : "—"; };
  const blank = () => ({ date: today(), method: "", difficulty: "", barriers: [], diffNote: "", who: [], whoOther: "", topics: [], custom: [], otherTopic: "", notes: "", none: false });
  const reset = () => { st = null; forId = null; editing = false; tried = false; q = ""; };
  const savedOf = o => ((o.doctorVisit || {}).steps || {}).edu;
  const ALL = () => TOPICS.concat(COMMON);
  const topicName = id => (r => r ? r[ix()] : id)(ALL().find(r => r[0] === id));
  function load(o) {
    if (st && forId === o.id) return;
    const dv = o.doctorVisit || {}, sv = savedOf(o), src = dv.eduDraft || (sv && !sv.none ? sv : null);
    st = { ...blank(), ...JSON.parse(JSON.stringify(src || {})), none: !!(sv && sv.none) };
    if (st.whoOn === undefined) st.whoOn = !!st.whoOther; if (st.topicOn === undefined) st.topicOn = !!st.otherTopic;
    forId = o.id; editing = !!dv.eduDraft || !sv || !!sv.none;
  }
  const errs = () => ({
    date: !st.date, method: !st.method, difficulty: !st.difficulty,
    who: !st.who.length && !(st.whoOn && st.whoOther.trim()), whoOther: st.whoOn && !st.whoOther.trim(),
    topics: !st.topics.length && !st.custom.length && !(st.topicOn && st.otherTopic.trim()), otherTopic: st.topicOn && !st.otherTopic.trim()
  });
  const valid = () => !Object.values(errs()).some(Boolean);
  const clean = () => ({ date: st.date, method: st.method, difficulty: st.difficulty, barriers: st.difficulty === "yes" ? st.barriers : [], diffNote: st.difficulty === "yes" ? st.diffNote.trim() : "",
    who: st.who, whoOther: st.whoOn ? st.whoOther.trim() : "", topics: st.topics, custom: st.custom, otherTopic: st.topicOn ? st.otherTopic.trim() : "", notes: st.notes.trim(), none: false });

  function suggest() {
    const s = q.trim().toLowerCase(); if (!s) return "";
    const hits = ALL().filter(r => !st.topics.includes(r[0]) && (r[1].toLowerCase().includes(s) || r[2].includes(q.trim()))).slice(0, 6);
    const exact = ALL().some(r => r[1].toLowerCase() === s || r[2] === q.trim()) || st.custom.some(c => c.toLowerCase() === s);
    return `<div class="ed-sg" role="listbox">${hits.map(r => `<button type="button" class="ed-si" data-add="${r[0]}">${S(I.plus, 2.2)}<span>${E(r[ix()])}</span></button>`).join("")}
      ${exact ? "" : `<button type="button" class="ed-si custom" data-custom="1">${S(I.plus, 2.2)}<span>${tx("addCustom", { q: E(q.trim()) })}</span></button>`}</div>`;
  }
  function formView(c) {
    const e = tried ? errs() : {}, bad = k => e[k] ? "bad" : "";
    const pill = (k, v, label, icon) => `<button type="button" class="or-pill ed-pill ${st[k] === v ? "on" : ""}" data-pk="${k}" data-v="${v}" aria-pressed="${st[k] === v}"><span class="or-rd">${st[k] === v ? S(I.check, 3) : ""}</span>${icon ? S(icon, 2) : ""}${label}</button>`;
    const ck = (attr, v, on, label) => `<label class="hx-ck ed-ck"><input type="checkbox" ${attr}="${v}" ${on ? "checked" : ""}><span>${label}</span></label>`;
    const field = (label, body, k, opt) => `<div class="pl-f ed-f ${bad(k)}"><label>${label} ${opt ? `<span class="hx-opt">${t().optional}</span>` : '<span class="req">*</span>'}</label>${body}</div>`;
    const extra = ALL().filter(r => st.topics.includes(r[0]) && !TOPICS.some(x => x[0] === r[0]));
    return `<section class="pl-sec ed-form"><div class="pl-sb">
      <div class="ed-row1">
        ${field(t().date, `<div class="ed-date"><input class="hx-in ${bad("date")}" type="date" id="edDate" value="${E(st.date)}" max="${today()}"></div>`, "date")}
        ${field(t().method, `<div class="ed-pills3 ${bad("method")}">${pill("method", "face", t().m_face, I.face)}${pill("method", "online", t().m_online, I.online)}${pill("method", "phone", t().m_phone, I.phone)}</div>`, "method")}
      </div>
      ${field(t().diff, `<div class="ed-pills2 ${bad("difficulty")}">${pill("difficulty", "no", t().no)}${pill("difficulty", "yes", t().yes)}</div>
        ${st.difficulty === "yes" ? `<div class="ed-diff"><small>${t().barriers} <span class="hx-opt">${t().optional}</span></small><div class="ed-chips">${BARRIERS.map(b => `<button type="button" class="ed-chip ${st.barriers.includes(b) ? "on" : ""}" data-bar="${b}" aria-pressed="${st.barriers.includes(b)}">${st.barriers.includes(b) ? S(I.check, 2.6) : ""}${t()["b_" + b]}</button>`).join("")}</div>
          <input class="hx-in" id="edDiffNote" value="${E(st.diffNote)}" placeholder="${E(t().diffPh)}" maxlength="200" dir="auto" aria-label="${E(t().diffNote)}"></div>` : ""}`, "difficulty")}
      ${field(t().who, `<div class="ed-who ${bad("who")}">${WHO.map(w => ck("data-who", w, st.who.includes(w), t()["w_" + w])).join("")}
        <span class="ed-oth">${ck("data-whoon", "1", st.whoOn, t().other)}<input class="hx-in ${bad("whoOther")}" id="edWhoOther" value="${E(st.whoOther)}" placeholder="${E(t().specify)}" maxlength="60" dir="auto" ${st.whoOn ? "" : "disabled"}></span></div>`, "who")}
      ${field(t().topics, `<div class="ed-tg">
        <div class="ed-tl ${bad("topics")}">
          <div class="dx-sb ed-sb">${S(I.search)}<input id="edQ" type="search" value="${E(q)}" placeholder="${E(t().searchPh)}" autocomplete="off" maxlength="80" dir="auto"><div id="edSg">${suggest()}</div></div>
          <div class="ed-list">${TOPICS.map(r => ck("data-tp", r[0], st.topics.includes(r[0]), E(r[ix()]))).join("")}
            ${extra.map(r => `<span class="ed-added">${S(I.check, 2.6)}<span>${E(r[ix()])}</span><button type="button" class="ed-rm" data-rmtp="${r[0]}" aria-label="${t().remove}">${S(I.x, 2.2)}</button></span>`).join("")}
            ${st.custom.map((c2, i) => `<span class="ed-added">${S(I.check, 2.6)}<span dir="auto">${E(c2)}</span><button type="button" class="ed-rm" data-rmc="${i}" aria-label="${t().remove}">${S(I.x, 2.2)}</button></span>`).join("")}
            <span class="ed-oth">${ck("data-topicon", "1", st.topicOn, t().other)}<input class="hx-in ${bad("otherTopic")}" id="edTopicOther" value="${E(st.otherTopic)}" placeholder="${E(t().specify)}" maxlength="120" dir="auto" ${st.topicOn ? "" : "disabled"}></span>
          </div>
        </div>
        <aside class="ed-common"><b>${t().common}</b><ul>${COMMON.map(r => { const on = st.topics.includes(r[0]); return `<li><button type="button" class="ed-ci ${on ? "on" : ""}" data-add="${r[0]}" ${on ? 'aria-disabled="true"' : ""}>${S(on ? I.check : I.plus, 2.4)}<span>${E(r[ix()])}</span>${on ? `<em>${t().added}</em>` : ""}</button></li>`; }).join("")}</ul></aside>
      </div>`, "topics")}
      ${field(t().notes, `<div class="hx-area"><textarea id="edNotes" maxlength="${MAX}" rows="3" placeholder="${E(t().notesPh)}" dir="auto">${E(st.notes)}</textarea><div class="hx-count"><span id="edNN">${st.notes.length}</span>/${MAX}</div></div>`, "notes", true)}
      <div class="ed-acts"><button type="button" class="hx-btn out" id="edCancel">${S(I.x, 2.2)}${t().cancel}</button><button type="button" class="hx-btn nu-save" id="edSave">${S(I.save, 2)}${t().saveEdu}</button></div>
    </div></section>`;
  }
  function savedView(sv, c) {
    const when = new Date(sv.at).toLocaleString(c.loc(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    const topics = sv.topics.map(topicName).concat(sv.custom || [], sv.otherTopic ? [sv.otherTopic] : []);
    const row = (k, v) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
    return `<section class="nu-card ed-saved"><div class="nu-ch"><span class="nu-n0 done">${S(I.check, 2.6)}</span><div><b>${t().title}</b><small>${tx("savedAt", { t: E(when) })}</small></div>
        <button type="button" class="hx-btn out sm" id="edEdit">${S(I.pen)}${t().edit}</button></div>
      <dl class="ed-sum">${row(t().sDate, `<span dir="ltr">${fmtD(sv.date)}</span>`)}${row(t().sMethod, t()["m_" + sv.method])}
        ${row(t().sDiff, sv.difficulty === "yes" ? `<span class="ed-flag">${t().hadDiff}</span>${sv.barriers.length ? ` · ${sv.barriers.map(b => t()["b_" + b]).join(lang === "ar" ? "، " : ", ")}` : ""}${sv.diffNote ? `<small dir="auto">${E(sv.diffNote)}</small>` : ""}` : t().noDiff)}
        ${row(t().sWho, E(sv.who.map(w => t()["w_" + w]).concat(sv.whoOther ? [sv.whoOther] : []).join(lang === "ar" ? "، " : ", ")))}
        ${row(t().sTopics, `<ul class="ed-tul">${topics.map(x => `<li dir="auto">${S(I.check, 2.6)}${E(x)}</li>`).join("")}</ul>`)}
        ${sv.notes ? row(t().sNotes, `<p dir="auto">${E(sv.notes)}</p>`) : ""}</dl></section>`;
  }

  function view(o, c) {
    ctx = c; lang = c.lang; load(o);
    const sv = savedOf(o), showForm = editing || !sv || sv.none;
    return `<div class="ed">
      <div class="ex-top"><span class="ex-tic">${S(I.edu)}</span><div><h1>${t().title}</h1><p>${t().sub}</p></div><span class="ex-stp">${tx("stepOf", c.stepOf)}</span></div>
      ${showForm ? formView(c) : savedView(sv, c)}
      ${showForm ? `<label class="hx-ck nu-none"><input type="checkbox" id="edNone" ${st.none ? "checked" : ""}><span>${t().none}</span></label>` : ""}
      <div class="ex-foot"><button type="button" class="hx-btn out pl-prevb" id="edPrev"><span class="flip">${S(I.back)}</span><span><b>${t().prev}</b><small>${E(c.prevName || "")}</small></span></button><span class="hx-sp"></span>
        <button type="button" class="hx-btn soft" id="edDraft">${S(I.doc)}${t().draft}</button>
        <button type="button" class="hx-btn dark" id="edCont">${t().cont}${S(I.arrow)}</button></div>
    </div>`;
  }

  function bind(root, o, c) {
    ctx = c;
    const $ = s => root.querySelector(s), all = (s, f) => root.querySelectorAll(s).forEach(f);
    const re = () => ctx.rerender();
    const keep = () => { try { ctx.saveDraft(JSON.parse(JSON.stringify(st))); } catch (e) { /* storage full: stays on screen */ } };
    const tog = (arr, v) => { const i = arr.indexOf(v); if (i < 0) arr.push(v); else arr.splice(i, 1); };
    const addTopic = id => { if (!st.topics.includes(id)) st.topics.push(id); st.none = false; q = ""; keep(); re(); };
    const addCustom = () => { const v = q.trim(); if (!v) return; if (!st.custom.some(c2 => c2.toLowerCase() === v.toLowerCase())) st.custom.push(v); st.none = false; q = ""; keep(); re(); const i = document.getElementById("edQ"); if (i) i.focus(); };
    const bindSg = () => {
      root.querySelectorAll("#edSg [data-add]").forEach(b => b.addEventListener("click", () => addTopic(b.dataset.add)));
      root.querySelectorAll("#edSg [data-custom]").forEach(b => b.addEventListener("click", addCustom));
    };
    if ($("#edQ")) {
      $("#edQ").addEventListener("input", e => { q = e.target.value; $("#edSg").innerHTML = suggest(); bindSg(); });
      $("#edQ").addEventListener("keydown", e => {
        if (e.key === "Escape") { q = ""; e.target.value = ""; $("#edSg").innerHTML = ""; }
        if (e.key === "Enter") { e.preventDefault(); const first = root.querySelector("#edSg [data-add]"); if (first) addTopic(first.dataset.add); else addCustom(); }
      });
      bindSg();
    }
    all(".ed-common [data-add]", b => b.addEventListener("click", () => { if (!st.topics.includes(b.dataset.add)) addTopic(b.dataset.add); }));
    all("[data-pk]", b => b.addEventListener("click", () => { st[b.dataset.pk] = b.dataset.v; st.none = false; keep(); re(); }));
    all("[data-bar]", b => b.addEventListener("click", () => { tog(st.barriers, b.dataset.bar); keep(); re(); }));
    all("[data-who]", b => b.addEventListener("change", () => { tog(st.who, b.dataset.who); st.none = false; keep(); re(); }));
    all("[data-tp]", b => b.addEventListener("change", () => { tog(st.topics, b.dataset.tp); st.none = false; keep(); re(); }));
    all("[data-rmtp]", b => b.addEventListener("click", () => { tog(st.topics, b.dataset.rmtp); keep(); re(); }));
    all("[data-rmc]", b => b.addEventListener("click", () => { st.custom.splice(+b.dataset.rmc, 1); keep(); re(); }));
    if ($("[data-whoon]")) $("[data-whoon]").addEventListener("change", e => { st.whoOn = e.target.checked; keep(); re(); if (st.whoOn) document.getElementById("edWhoOther").focus(); });
    if ($("[data-topicon]")) $("[data-topicon]").addEventListener("change", e => { st.topicOn = e.target.checked; keep(); re(); if (st.topicOn) document.getElementById("edTopicOther").focus(); });
    const txt = (id, k, cnt) => { if ($(id)) $(id).addEventListener("input", e => { st[k] = e.target.value; if (cnt) $(cnt).textContent = e.target.value.length; if (e.target.value.trim()) e.target.classList.remove("bad"); keep(); }); };
    txt("#edWhoOther", "whoOther"); txt("#edTopicOther", "otherTopic"); txt("#edDiffNote", "diffNote"); txt("#edNotes", "notes", "#edNN");
    if ($("#edDate")) $("#edDate").addEventListener("change", e => { st.date = e.target.value; keep(); });
    if ($("#edNone")) $("#edNone").addEventListener("change", e => { st.none = e.target.checked; });
    const doSave = () => {
      tried = true;
      if (!valid()) { re(); ctx.toast(t().fixErr); const b = root.querySelector(".ed-f.bad"); if (b) b.scrollIntoView({ block: "center" }); return false; }
      try { ctx.save(clean()); } catch (e) { ctx.toast(e.message || t().storeErr); return false; }
      editing = false; tried = false; q = ""; return true;
    };
    if ($("#edSave")) $("#edSave").addEventListener("click", () => { if (doSave()) { ctx.toast(t().saved); re(); } });
    if ($("#edCancel")) $("#edCancel").addEventListener("click", () => {
      try { ctx.saveDraft(undefined); } catch (e) { /* ignore */ }
      st = null; tried = false; q = ""; load(MadaOrders.get(o.id)); ctx.toast(t().reverted); re();
    });
    if ($("#edEdit")) $("#edEdit").addEventListener("click", () => { editing = true; re(); });
    $("#edPrev").addEventListener("click", () => ctx.go(ctx.prevKey));
    $("#edDraft").addEventListener("click", () => { try { ctx.saveDraft(JSON.parse(JSON.stringify(st))); ctx.toast(t().draftSaved); } catch (e) { ctx.toast(e.message || t().storeErr); } });
    $("#edCont").addEventListener("click", () => {
      const sv = savedOf(MadaOrders.get(o.id)), showForm = editing || !sv || sv.none;
      if (showForm) {
        if (st.none) { try { ctx.save({ none: true }); } catch (e) { return ctx.toast(e.message || t().storeErr); } }
        else if (!doSave()) return;
      }
      reset(); ctx.toast(t().saved); ctx.go(ctx.nextKey);
    });
  }
  return { view, bind, reset, L };
})();
