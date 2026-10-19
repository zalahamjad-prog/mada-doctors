// Nurse Note (doctor visit step after Orders & Services). The nurse on the visit writes her notes and observations.
// Saved in order.doctorVisit.steps.nurse: { note, nurse, none, at, by }. While typing, the text is kept in doctorVisit.nurseDraft.
// To continue: a saved note, or "No nurse note for this visit".
// When the doctor ordered lab tests (or Home Sample Collection), the nurse also confirms the sample: doctorVisit.sample =
//   { status: "collected" | "not", at, note, reason, by }. On completing the visit the lab follow-up item starts at "Sample collected" (doctor-visit.html sendOrders).
// Nursing services and IV therapy ordered in the visit are confirmed one by one: doctorVisit.procs =
//   { items: [{ uid, code, svc, done: true | false, reason }], at, by }. A procedure done at the visit goes to the follow-up team already done.
const DrNurse = (() => {
  const MAX = 1000;
  const I = {
    note: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/><path d="M9 12h6M9 16h4"/>',
    nurse: '<path d="M7 7V4.5L12 3l5 1.5V7"/><path d="M12 4.2v2M11 5.2h2"/><path d="M7 7.5a5 5 0 0 0 10 0"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    full: '<path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/>', shrink: '<path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>', save: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3M8 21v-6h8v6"/>',
    check: '<path d="m5 12 5 5 9-10"/>', pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>', back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', tube: '<path d="M9 3h6M10 3v13a2 2 0 0 0 4 0V3"/><path d="M10 10h4"/>', doc: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/>'
  };
  const L = {
    en: {
      title: "Nurse Note", sub: "Add nursing notes and observations.", stepOf: "Step {n} of {m}", label: "Nurse Note", ph: "Enter nurse note here ...",
      full: "Open in Full Note", fullT: "Nurse Note", fullS: "Write the full note. It is the same note as on the page.", done: "Done",
      by: "Written by", byPh: "Nurse name", cancel: "Cancel", save: "Save Note", saved: "Nurse note saved.", savedAt: "Saved {t} · {n}", edit: "Edit Note",
      reverted: "Changes discarded.", empty: "Write the note first.", needBy: "Write the nurse's name.", none: "No nurse note for this visit",
      prev: "Previous", draft: "Save as Draft", draftSaved: "Draft saved.", cont: "Save & Continue", needNote: "Save a nurse note, or tick \"No nurse note for this visit\".",
      unsaved: "You have unsaved changes in the note.", storeErr: "Couldn't save. Try again.",
      smT: "Sample Collection", opt: "(Optional)", smS: "The doctor ordered tests that need a sample. Confirm it was collected.", smTests: "Ordered", smYes: "Sample collected", smNo: "Not collected",
      smNote: "Sample note", smNotePh: "e.g. 2 tubes, collected from the left arm", smReason: "Why was it not collected?", smReasonPh: "e.g. Patient refused, difficult vein", smOk: "Confirm",
      prT: "Nursing & IV Procedures", prS: "The doctor ordered these services. Confirm each one was done at the visit, or write why not.", prDone: "Done", prNot: "Not done",
      prReason: "Why was it not done?", prReasonPh: "e.g. Patient refused, no prescription", prOk: "Confirm procedures", prSaved: "Procedures confirmation saved.", prEdit: "Change",
      prSum: "{a} of {n} done · {t} · {n2}", needPr: "Confirm every nursing and IV procedure first.", needPrPick: "Mark every procedure as done or not done.", needPrReason: "Write why each procedure was not done.",
      prDoneTag: "Done at the visit", prNotTag: "Not done",
      smDone: "Sample collected · {t} · {n}", smNot: "Not collected · {t} · {n}", smEdit: "Change", smSaved: "Sample confirmation saved.", needSm: "Confirm the sample collection first.",
      needSmPick: "Choose whether the sample was collected.", needReason: "Write why the sample was not collected.",
      smList: "Tests to collect", smTubes: "Tubes", smRes: "Result in {h} h", smNoH: "No result time set", smDue: "Result expected {t}",
      smFast: "Fasting {h} h", smMorning: "Morning sample", sp_blood: "Blood", sp_urine: "Urine", sp_stool: "Stool", smCount: "{n} tests"
    },
    ar: {
      title: "ملاحظة الممرضة", sub: "أضف ملاحظات التمريض والمشاهدات.", stepOf: "الخطوة {n} من {m}", label: "ملاحظة الممرضة", ph: "اكتب ملاحظة الممرضة هنا ...",
      full: "فتح بملء الشاشة", fullT: "ملاحظة الممرضة", fullS: "اكتب الملاحظة كاملة. هي نفس الملاحظة اللي في الصفحة.", done: "تم",
      by: "كتبتها", byPh: "اسم الممرضة", cancel: "إلغاء", save: "حفظ الملاحظة", saved: "انحفظت ملاحظة الممرضة.", savedAt: "انحفظت {t} · {n}", edit: "تعديل الملاحظة",
      reverted: "تم التراجع عن التعديلات.", empty: "اكتب الملاحظة أول.", needBy: "اكتب اسم الممرضة.", none: "ما فيه ملاحظة تمريض لهذه الزيارة",
      prev: "السابق", draft: "حفظ كمسودة", draftSaved: "انحفظت المسودة.", cont: "حفظ ومتابعة", needNote: "احفظ ملاحظة الممرضة، أو اختر \"ما فيه ملاحظة تمريض لهذه الزيارة\".",
      unsaved: "عندك تعديلات ما انحفظت في الملاحظة.", storeErr: "ما قدرنا نحفظ. حاول مرة ثانية.",
      smT: "سحب العينة", opt: "(اختياري)", smS: "الطبيب طلب فحوصات تحتاج عينة. أكّدي إنه تم سحبها.", smTests: "المطلوب", smYes: "تم سحب العينة", smNo: "ما تم السحب",
      smNote: "ملاحظة على العينة", smNotePh: "مثال: أنبوبين، من الذراع اليسار", smReason: "ليش ما تم السحب؟", smReasonPh: "مثال: المريض رفض، صعوبة في الوريد", smOk: "تأكيد",
      prT: "الإجراءات التمريضية والمحاليل", prS: "الطبيب طلب هذي الخدمات. أكّد إن كل وحدة انعملت في الزيارة، أو اكتب السبب.", prDone: "تم", prNot: "ما تم",
      prReason: "ليش ما انعمل؟", prReasonPh: "مثال: المريض رفض، ما فيه وصفة", prOk: "تأكيد الإجراءات", prSaved: "انحفظ تأكيد الإجراءات.", prEdit: "تغيير",
      prSum: "{a} من {n} تم · {t} · {n2}", needPr: "أكّد كل الإجراءات التمريضية والمحاليل أول.", needPrPick: "حدد لكل إجراء: تم أو ما تم.", needPrReason: "اكتب سبب كل إجراء ما انعمل.",
      prDoneTag: "انعمل في الزيارة", prNotTag: "ما انعمل",
      smDone: "تم سحب العينة · {t} · {n}", smNot: "ما تم السحب · {t} · {n}", smEdit: "تغيير", smSaved: "انحفظ تأكيد سحب العينة.", needSm: "أكّدي سحب العينة أول.",
      needSmPick: "اختاري هل تم سحب العينة أو لا.", needReason: "اكتبي ليش ما تم سحب العينة.",
      smList: "التحاليل المطلوب سحبها", smTubes: "الأنابيب", smRes: "النتيجة خلال {h} ساعة", smNoH: "ما فيه وقت محدد للنتيجة", smDue: "النتيجة المتوقعة {t}",
      smFast: "صيام {h} ساعة", smMorning: "عينة صباحية", sp_blood: "دم", sp_urine: "بول", sp_stool: "براز", smCount: "{n} تحاليل"
    }
  };
  let ctx = null, lang = "en", st = null, forId = null, full = false, editing = false, tried = false, timer = null, sm = null, pr = null;
  const t = () => L[lang];
  const tx = (k, v) => t()[k].replace(/\{(\w+)\}/g, (_, n) => v[n]);
  const S = (p, w) => ctx.svg(p, w), E = s => ctx.esc(s);
  const reset = () => { pr = null; sm = null; st = null; forId = null; full = false; editing = false; tried = false; clearTimeout(timer); };
  const savedOf = o => ((o.doctorVisit || {}).steps || {}).nurse;
  const nameOf = v => v && typeof v === "object" ? v[lang] || v.en : v || "";
  function load(o) {
    if (st && forId === o.id) return;
    const dv = o.doctorVisit || {}, sv = savedOf(o), dr = dv.nurseDraft;
    st = { note: (dr || sv || {}).note || "", nurse: (dr || sv || {}).nurse || (o.appointment && o.appointment.nurse) || "", none: !!(sv && sv.none) };
    forId = o.id; editing = !!dr || !sv || !sv.note;
  }
  // Orders that need a sample: lab tests and packages, or the Home Sample Collection service.
  const sampleOrders = o => { const dv = o.doctorVisit || {}, src = (dv.steps && dv.steps.orders) || dv.ordersDraft || {};
    return (src.items || []).filter(x => x.svc === "lab" || x.code === "NS-051"); };
  // The tests to collect, one line each (tube, name, sample, fasting, result time), like the nurse's Samples page.
  // Doctor Portal codes map to the lab's tests (MadaMedical.CATALOG, labs.js); a code with no lab test shows its name only.
  function testsHtml(need, sv, when) {
    const Lb = typeof MadaLabs !== "undefined" ? MadaLabs : null, M = typeof MadaMedical !== "undefined" ? MadaMedical : null;
    const codes = [...new Set(need.flatMap(x => x.svc === "lab" ? DrOrders.labTests(x.code) : []))];
    const got = sv && sv.status === "collected" && sv.at, tubes = {};
    const rows = codes.map(c => {
      const lc = M && M.CATALOG[c], x = Lb && lc ? Lb.byCode[lc] : null, tube = x && Lb.tubeOf ? Lb.tubeOf(x.tube) : null;
      const name = x ? x.name[lang] || x.name.en : (DrOrders.item(c) || {})[lang] || c;
      if (tube) tubes[tube.id || tube.color] = tube;
      const meta = [x && x.sample ? t()["sp_" + x.sample] || x.sample : "", tube ? (tube.name[lang] || tube.name.en) : "",
        x && x.fasting === "fast" ? tx("smFast", { h: x.fastHours || "" }) : x && x.fasting === "morning" ? t().smMorning : ""].filter(Boolean);
      const h = x && x.hours ? +x.hours : null;
      const due = h ? (got ? tx("smDue", { t: when(new Date(new Date(sv.at).getTime() + h * 3600000)) }) : tx("smRes", { h })) : t().smNoH;
      return `<li><i class="nu-tube" style="background:${tube ? tube.color : "#c9d3d6"}"></i><div><b>${E(name)}</b>${lc ? `<span class="nu-code">${E(lc)}</span>` : ""}
        ${meta.length ? `<small>${E(meta.join(" · "))}</small>` : ""}</div><span class="nu-due ${h ? "" : "na"}">${S('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', 2)}${E(due)}</span></li>`;
    });
    // Home Sample Collection with no lab tests ordered: its name only.
    need.filter(x => x.svc !== "lab").forEach(x => rows.push(`<li><i class="nu-tube" style="background:#c9d3d6"></i><div><b>${E((DrOrders.titleOf(x) || {})[lang] || x.code)}</b></div></li>`));
    const tb = Object.values(tubes);
    return `<div class="nu-smh"><span>${t().smList}</span><em>${E(tx("smCount", { n: rows.length }))}</em></div><ul class="nu-tests">${rows.join("")}</ul>
      ${tb.length ? `<div class="nu-tubes"><span>${t().smTubes}:</span>${tb.map(x => `<span class="nu-tb"><i class="nu-tube" style="background:${x.color}"></i>${E(x.name[lang] || x.name.en)}</span>`).join("")}</div>` : ""}`;
  }
  function sampleCard(o, c) {
    const need = sampleOrders(o); if (!need.length) return "";
    const sv = (o.doctorVisit || {}).sample, names = need.map(x => (DrOrders.titleOf(x) || {})[lang] || x.code).join(lang === "ar" ? "، " : ", ");
    const when = d => new Date(d).toLocaleString(c.loc(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    const head = (done) => `<div class="nu-ch"><span class="nu-n0 sm ${done ? "done" : ""}">${S(done ? I.check : I.tube, done ? 2.6 : 2)}</span><div><b>${t().smT}</b><small>${done ? E(tx(sv.status === "collected" ? "smDone" : "smNot", { t: when(sv.at), n: nameOf(sv.by) })) : t().smS}</small></div>
      ${done ? `<button type="button" class="hx-btn out sm" id="smEdit">${S(I.pen)}${t().smEdit}</button>` : ""}</div>`;
    const tests = testsHtml(need, sv, when);
    if (sv && !sm) return `<section class="nu-card nu-sm ${sv.status === "not" ? "no" : "ok"}">${head(true)}<div class="nu-cb">${tests}${sv.note || sv.reason ? `<p class="nu-txt" dir="auto">${E(sv.note || sv.reason)}</p>` : ""}</div></section>`;
    if (!sm) sm = { status: sv ? sv.status : "", note: sv ? sv.note || "" : "", reason: sv ? sv.reason || "" : "", tried: false };
    const bad = cond => sm.tried && cond ? "bad" : "";
    return `<section class="nu-card nu-sm open ${bad(!sm.status)}">${head(false)}<div class="nu-cb">${tests}
      <div class="or-pills">${[["collected", "smYes", I.check], ["not", "smNo", I.x]].map(([k, l, ic]) => `<button type="button" class="or-pill ${sm.status === k ? "on" : ""} ${k === "not" ? "no" : ""}" data-sm="${k}" aria-pressed="${sm.status === k}"><span class="or-rd">${sm.status === k ? S(I.check, 3) : ""}</span>${S(ic, 2.2)}${t()[l]}</button>`).join("")}</div>
      ${sm.status === "collected" ? `<div class="pl-f"><label for="smNote">${t().smNote} <span class="hx-opt">${t().opt}</span></label><input class="hx-in" id="smNote" value="${E(sm.note)}" placeholder="${E(t().smNotePh)}" maxlength="200" dir="auto"></div>` : ""}
      ${sm.status === "not" ? `<div class="pl-f"><label for="smReason">${t().smReason} <span class="req">*</span></label><input class="hx-in ${bad(!sm.reason.trim())}" id="smReason" value="${E(sm.reason)}" placeholder="${E(t().smReasonPh)}" maxlength="200" dir="auto"></div>` : ""}
      <div class="nu-acts">${sv ? `<button type="button" class="hx-btn out" id="smCancel">${S(I.x, 2.2)}${t().cancel}</button>` : ""}<button type="button" class="hx-btn nu-save" id="smOk">${S(I.check, 2.4)}${t().smOk}</button></div></div></section>`;
  }
  // Nursing services (not Home Sample Collection, which the sample card covers) and IV therapy ordered in this visit.
  const procOrders = o => { const dv = o.doctorVisit || {}, src = (dv.steps && dv.steps.orders) || dv.ordersDraft || {};
    return (src.items || []).filter(x => (x.svc === "nurse" && x.code !== "NS-051") || x.svc === "iv"); };
  // Saved confirmation covers every procedure ordered now (a procedure added later needs confirming again).
  const procsOk = o => { const sv = (o.doctorVisit || {}).procs, need = procOrders(o); return !need.length || (!!sv && need.every(x => sv.items.some(y => y.uid === x.uid && (y.done || y.reason)))); };
  function procCard(o, c) {
    const need = procOrders(o); if (!need.length) return "";
    const sv = (o.doctorVisit || {}).procs, ok = procsOk(o), nm = x => (DrOrders.titleOf(x) || {})[lang] || x.code;
    const when = d => new Date(d).toLocaleString(c.loc(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    const tag = x => x.svc === "iv" ? "IV" : (lang === "ar" ? "تمريض" : "Nursing");
    if (ok && sv && !pr) {
      const got = need.map(x => sv.items.find(y => y.uid === x.uid)), a = got.filter(y => y.done).length;
      return `<section class="nu-card nu-sm nu-pr ${a === need.length ? "ok" : "no"}"><div class="nu-ch"><span class="nu-n0 sm done">${S(I.check, 2.6)}</span><div><b>${t().prT}</b><small>${E(tx("prSum", { a, n: need.length, t: when(sv.at), n2: nameOf(sv.by) }))}</small></div>
        <button type="button" class="hx-btn out sm" id="prEdit">${S(I.pen)}${t().prEdit}</button></div>
        <div class="nu-cb"><ul class="nu-tests">${need.map((x, i) => `<li><i class="nu-tube" style="background:${got[i].done ? "#15803d" : "#dc2626"}"></i><div><b>${E(nm(x))}</b><span class="nu-code">${E(tag(x))}</span>
          <small>${got[i].done ? t().prDoneTag : E(t().prNotTag + (got[i].reason ? " · " + got[i].reason : ""))}</small></div></li>`).join("")}</ul></div></section>`;
    }
    if (!pr) pr = { items: need.map(x => { const y = sv && sv.items.find(z => z.uid === x.uid); return { uid: x.uid, code: x.code, svc: x.svc, done: y ? y.done : null, reason: y ? y.reason || "" : "" }; }), tried: false };
    const bad = cond => pr.tried && cond ? "bad" : "";
    return `<section class="nu-card nu-sm nu-pr open ${bad(pr.items.some(y => y.done == null))}"><div class="nu-ch"><span class="nu-n0 sm">${S(I.check, 2)}</span><div><b>${t().prT}</b><small>${t().prS}</small></div></div>
      <div class="nu-cb">${need.map((x, i) => { const y = pr.items.find(z => z.uid === x.uid); return `<div class="nu-pri ${bad(y.done == null)}"><div class="nu-prh"><b>${E(nm(x))}</b><span class="nu-code">${E(tag(x))}</span></div>
        <div class="or-pills">${[[true, "prDone", I.check], [false, "prNot", I.x]].map(([k, l, ic]) => `<button type="button" class="or-pill ${y.done === k ? "on" : ""} ${k ? "" : "no"}" data-pr="${i}" data-v="${k}" aria-pressed="${y.done === k}"><span class="or-rd">${y.done === k ? S(I.check, 3) : ""}</span>${S(ic, 2.2)}${t()[l]}</button>`).join("")}</div>
        ${y.done === false ? `<div class="pl-f"><label for="prR${i}">${t().prReason} <span class="req">*</span></label><input class="hx-in ${bad(!y.reason.trim())}" id="prR${i}" data-prr="${i}" value="${E(y.reason)}" placeholder="${E(t().prReasonPh)}" maxlength="200" dir="auto"></div>` : ""}</div>`; }).join("")}
        <div class="nu-acts">${sv && ok ? `<button type="button" class="hx-btn out" id="prCancel">${S(I.x, 2.2)}${t().cancel}</button>` : ""}<button type="button" class="hx-btn nu-save" id="prOk">${S(I.check, 2.4)}${t().prOk}</button></div></div></section>`;
  }
  const dirty = o => { const sv = savedOf(o) || {}; return st.note.trim() !== (sv.note || "") || nameOf(st.nurse).trim() !== nameOf(sv.nurse || "").trim(); };

  function view(o, c) {
    ctx = c; lang = c.lang; load(o);
    const sv = savedOf(o), apptNurse = o.appointment && o.appointment.nurse;
    const when = sv && sv.at && new Date(sv.at).toLocaleString(c.loc(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    const bad = cond => tried && cond ? "bad" : "";
    const area = (id, rows) => `<div class="hx-area ${bad(!st.note.trim())}"><textarea id="${id}" maxlength="${MAX}" rows="${rows}" placeholder="${E(t().ph)}" dir="auto">${E(st.note)}</textarea><div class="hx-count"><span class="nu-n">${st.note.length}</span>/${MAX}</div></div>`;
    const byField = apptNurse ? `<div class="nu-by">${S(I.nurse)}<span>${t().by}: <b>${E(nameOf(apptNurse))}</b></span></div>`
      : `<div class="pl-f nu-byf"><label>${t().by} <span class="req">*</span></label><input class="hx-in ${bad(!nameOf(st.nurse).trim())}" id="nuBy" value="${E(nameOf(st.nurse))}" placeholder="${E(t().byPh)}" maxlength="60" dir="auto"></div>`;
    const card = editing || !sv || !sv.note
      ? `<section class="nu-card open"><div class="nu-ch"><span class="nu-n0">${c.stepOf.n}</span><div><b>${t().title}</b><small>${t().sub}</small></div></div>
          <div class="nu-cb">${byField}
            <div class="nu-lh"><label for="nuNote">${t().label} <span class="req">*</span></label><button type="button" class="nu-full" id="nuFull">${S(I.full, 2)}${t().full}</button></div>
            ${area("nuNote", 5)}
            <div class="nu-acts"><button type="button" class="hx-btn out" id="nuCancel">${S(I.x, 2.2)}${t().cancel}</button><button type="button" class="hx-btn nu-save" id="nuSave">${S(I.save, 2)}${t().save}</button></div>
          </div></section>`
      : `<section class="nu-card"><div class="nu-ch"><span class="nu-n0 done">${S(I.check, 2.6)}</span><div><b>${t().title}</b><small>${tx("savedAt", { t: E(when), n: E(nameOf(sv.nurse)) })}</small></div>
          <button type="button" class="hx-btn out sm" id="nuEdit">${S(I.pen)}${t().edit}</button></div>
          <div class="nu-cb"><p class="nu-txt" dir="auto">${E(sv.note)}</p></div></section>`;
    return `<div class="nu">
      <div class="ex-top"><span class="ex-tic">${S(I.note)}</span><div><h1>${t().title}</h1><p>${t().sub}</p></div><span class="ex-stp">${tx("stepOf", c.stepOf)}</span></div>
      ${sampleCard(o, c)}
      ${procCard(o, c)}
      ${card}
      ${sv && sv.note && !editing ? "" : `<label class="hx-ck nu-none"><input type="checkbox" id="nuNone" ${st.none ? "checked" : ""}><span>${t().none}</span></label>`}
      <div class="ex-foot"><button type="button" class="hx-btn out pl-prevb" id="nuPrev"><span class="flip">${S(I.back)}</span><span><b>${t().prev}</b><small>${E(c.prevName || "")}</small></span></button><span class="hx-sp"></span>
        <button type="button" class="hx-btn soft" id="nuDraft">${S(I.doc)}${t().draft}</button>
        <button type="button" class="hx-btn dark" id="nuCont">${t().cont}${S(I.arrow)}</button></div>
      ${full ? `<div class="or-ov nu-ov" id="nuOv"></div><div class="nu-fm" role="dialog" aria-modal="true" aria-labelledby="nuFT">
        <div class="nu-fh"><span class="ex-tic">${S(I.note)}</span><div><b id="nuFT">${t().fullT}</b><small>${t().fullS}</small></div><button type="button" class="or-x nu-x" id="nuFX" aria-label="${t().done}">${S(I.shrink, 2)}</button></div>
        <div class="nu-fb">${area("nuNoteF", 18)}</div>
        <div class="nu-ff"><button type="button" class="hx-btn dark" id="nuFDone">${S(I.check, 2.4)}${t().done}</button></div></div>` : ""}
    </div>`;
  }

  function bind(root, o, c) {
    ctx = c;
    const $ = s => root.querySelector(s), all = (s, f) => root.querySelectorAll(s).forEach(f);
    const keepDraft = () => { clearTimeout(timer); timer = setTimeout(() => { try { ctx.saveDraft({ note: st.note, nurse: st.nurse }); } catch (e) { /* storage full: the text stays on screen */ } }, 600); };
    const onType = ta => ta.addEventListener("input", () => { st.note = ta.value; root.querySelectorAll(".nu-n").forEach(n => { n.textContent = ta.value.length; }); if (st.note.trim()) { st.none = false; ta.closest(".hx-area").classList.remove("bad"); } keepDraft(); });
    ["#nuNote", "#nuNoteF"].forEach(s => { if ($(s)) onType($(s)); });
    if ($("#nuBy")) $("#nuBy").addEventListener("input", e => { st.nurse = e.target.value; if (e.target.value.trim()) e.target.classList.remove("bad"); keepDraft(); });
    if ($("#nuNone")) $("#nuNone").addEventListener("change", e => { st.none = e.target.checked; });
    const doSave = () => {
      tried = true;
      if (!st.note.trim()) { ctx.rerender(); ctx.toast(t().empty); return false; }
      if (!nameOf(st.nurse).trim()) { ctx.rerender(); ctx.toast(t().needBy); return false; }
      try { ctx.save({ note: st.note.trim(), nurse: typeof st.nurse === "object" ? st.nurse : st.nurse.trim(), none: false }); } catch (e) { ctx.toast(e.message || t().storeErr); return false; }
      clearTimeout(timer); st.none = false; editing = false; tried = false; return true;
    };
    if ($("#nuSave")) $("#nuSave").addEventListener("click", () => { if (doSave()) { ctx.toast(t().saved); ctx.rerender(); } });
    if ($("#nuCancel")) $("#nuCancel").addEventListener("click", () => {
      clearTimeout(timer); try { ctx.saveDraft(undefined); } catch (e) { /* ignore */ }
      const keepNone = st.none; st = null; load(MadaOrders.get(o.id)); st.none = keepNone; editing = !(savedOf(MadaOrders.get(o.id)) || {}).note; tried = false; ctx.toast(t().reverted); ctx.rerender();
    });
    if ($("#nuEdit")) $("#nuEdit").addEventListener("click", () => { editing = true; ctx.rerender(); const ta = document.getElementById("nuNote"); if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); } });
    if ($("#nuFull")) $("#nuFull").addEventListener("click", () => { full = true; ctx.rerender(); const ta = document.getElementById("nuNoteF"); ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); });
    if (full) {
      const close = () => { full = false; ctx.rerender(); const ta = document.getElementById("nuNote"); if (ta) ta.focus(); };
      $("#nuFX").addEventListener("click", close); $("#nuFDone").addEventListener("click", close); $("#nuOv").addEventListener("click", close);
      $(".nu-fm").addEventListener("keydown", e => { if (e.key === "Escape") close(); });
    }
    all("[data-sm]", b => b.addEventListener("click", () => { sm.status = b.dataset.sm; ctx.rerender(); }));
    if ($("#smNote")) $("#smNote").addEventListener("input", e => { sm.note = e.target.value; });
    if ($("#smReason")) $("#smReason").addEventListener("input", e => { sm.reason = e.target.value; if (e.target.value.trim()) e.target.classList.remove("bad"); });
    if ($("#smEdit")) $("#smEdit").addEventListener("click", () => { sm = null; const sv = MadaOrders.get(o.id).doctorVisit.sample; sm = { status: sv.status, note: sv.note || "", reason: sv.reason || "", tried: false }; ctx.rerender(); });
    if ($("#smCancel")) $("#smCancel").addEventListener("click", () => { sm = null; ctx.rerender(); });
    if ($("#smOk")) $("#smOk").addEventListener("click", () => {
      sm.tried = true;
      if (!sm.status) { ctx.rerender(); return ctx.toast(t().needSmPick); }
      if (sm.status === "not" && !sm.reason.trim()) { ctx.rerender(); return ctx.toast(t().needReason); }
      const by = (o.appointment && o.appointment.nurse) || (nameOf(st.nurse).trim() ? st.nurse : "") || ctx.doctor;
      try { ctx.saveSample({ status: sm.status, note: sm.status === "collected" ? sm.note.trim() : "", reason: sm.status === "not" ? sm.reason.trim() : "", at: new Date().toISOString(), by }); } catch (e) { return ctx.toast(e.message || t().storeErr); }
      sm = null; ctx.toast(t().smSaved); ctx.rerender();
    });
    all("[data-pr]", b => b.addEventListener("click", () => { pr.items[+b.dataset.pr].done = b.dataset.v === "true"; ctx.rerender(); }));
    all("[data-prr]", el => el.addEventListener("input", () => { pr.items[+el.dataset.prr].reason = el.value; if (el.value.trim()) el.classList.remove("bad"); }));
    if ($("#prEdit")) $("#prEdit").addEventListener("click", () => { pr = null; const cur = MadaOrders.get(o.id), sv = cur.doctorVisit.procs;
      pr = { items: procOrders(cur).map(x => { const y = sv.items.find(z => z.uid === x.uid) || {}; return { uid: x.uid, code: x.code, svc: x.svc, done: y.done == null ? null : y.done, reason: y.reason || "" }; }), tried: false }; ctx.rerender(); });
    if ($("#prCancel")) $("#prCancel").addEventListener("click", () => { pr = null; ctx.rerender(); });
    if ($("#prOk")) $("#prOk").addEventListener("click", () => {
      pr.tried = true;
      if (pr.items.some(y => y.done == null)) { ctx.rerender(); return ctx.toast(t().needPrPick); }
      if (pr.items.some(y => y.done === false && !y.reason.trim())) { ctx.rerender(); return ctx.toast(t().needPrReason); }
      const by = (o.appointment && o.appointment.nurse) || (nameOf(st.nurse).trim() ? st.nurse : "") || ctx.doctor;
      try { ctx.saveProcs({ items: pr.items.map(y => ({ uid: y.uid, code: y.code, svc: y.svc, done: y.done, reason: y.done ? "" : y.reason.trim() })), at: new Date().toISOString(), by }); } catch (e) { return ctx.toast(e.message || t().storeErr); }
      pr = null; ctx.toast(t().prSaved); ctx.rerender();
    });
    $("#nuPrev").addEventListener("click", () => ctx.go(ctx.prevKey));
    $("#nuDraft").addEventListener("click", () => { try { ctx.saveDraft({ note: st.note, nurse: st.nurse }); ctx.toast(t().draftSaved); } catch (e) { ctx.toast(e.message || t().storeErr); } });
    $("#nuCont").addEventListener("click", () => {
      const cur = MadaOrders.get(o.id), sv = savedOf(cur);
      if (!procsOk(cur) || pr) { if (pr) pr.tried = true; ctx.rerender(); const el = document.querySelector(".nu-pr"); if (el) el.scrollIntoView({ block: "center" }); return ctx.toast(t().needPr); }
      if (sampleOrders(cur).length && (!cur.doctorVisit.sample || sm)) { if (sm) sm.tried = true; ctx.rerender(); const el = document.querySelector(".nu-sm"); if (el) el.scrollIntoView({ block: "center" }); return ctx.toast(t().needSm); }
      if (st.note.trim() && (dirty(cur) || !sv || !sv.note)) { if (!doSave()) return; }
      else if (!st.note.trim()) {
        if (!st.none) { tried = true; ctx.rerender(); return ctx.toast(t().needNote); }
        try { ctx.save({ note: "", nurse: "", none: true }); } catch (e) { return ctx.toast(e.message || t().storeErr); }
      }
      reset(); ctx.toast(t().saved); ctx.go(ctx.nextKey);
    });
  }
  return { view, bind, reset, L, procOrders, procsOk };
})();
