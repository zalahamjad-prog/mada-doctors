// Nurse Note (doctor visit step after Orders & Services). The nurse on the visit writes her notes and observations.
// Saved in order.doctorVisit.steps.nurse: { note, nurse, none, at, by }. While typing, the text is kept in doctorVisit.nurseDraft.
// To continue: a saved note, or "No nurse note for this visit".
const DrNurse = (() => {
  const MAX = 1000;
  const I = {
    note: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/><path d="M9 12h6M9 16h4"/>',
    nurse: '<path d="M7 7V4.5L12 3l5 1.5V7"/><path d="M12 4.2v2M11 5.2h2"/><path d="M7 7.5a5 5 0 0 0 10 0"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    full: '<path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/>', shrink: '<path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>', save: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3M8 21v-6h8v6"/>',
    check: '<path d="m5 12 5 5 9-10"/>', pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>', back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', doc: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/>'
  };
  const L = {
    en: {
      title: "Nurse Note", sub: "Add nursing notes and observations.", stepOf: "Step {n} of {m}", label: "Nurse Note", ph: "Enter nurse note here ...",
      full: "Open in Full Note", fullT: "Nurse Note", fullS: "Write the full note. It is the same note as on the page.", done: "Done",
      by: "Written by", byPh: "Nurse name", cancel: "Cancel", save: "Save Note", saved: "Nurse note saved.", savedAt: "Saved {t} · {n}", edit: "Edit Note",
      reverted: "Changes discarded.", empty: "Write the note first.", needBy: "Write the nurse's name.", none: "No nurse note for this visit",
      prev: "Previous", draft: "Save as Draft", draftSaved: "Draft saved.", cont: "Save & Continue", needNote: "Save a nurse note, or tick \"No nurse note for this visit\".",
      unsaved: "You have unsaved changes in the note.", storeErr: "Couldn't save. Try again."
    },
    ar: {
      title: "ملاحظة الممرضة", sub: "أضف ملاحظات التمريض والمشاهدات.", stepOf: "الخطوة {n} من {m}", label: "ملاحظة الممرضة", ph: "اكتب ملاحظة الممرضة هنا ...",
      full: "فتح بملء الشاشة", fullT: "ملاحظة الممرضة", fullS: "اكتب الملاحظة كاملة. هي نفس الملاحظة اللي في الصفحة.", done: "تم",
      by: "كتبتها", byPh: "اسم الممرضة", cancel: "إلغاء", save: "حفظ الملاحظة", saved: "انحفظت ملاحظة الممرضة.", savedAt: "انحفظت {t} · {n}", edit: "تعديل الملاحظة",
      reverted: "تم التراجع عن التعديلات.", empty: "اكتب الملاحظة أول.", needBy: "اكتب اسم الممرضة.", none: "ما فيه ملاحظة تمريض لهذه الزيارة",
      prev: "السابق", draft: "حفظ كمسودة", draftSaved: "انحفظت المسودة.", cont: "حفظ ومتابعة", needNote: "احفظ ملاحظة الممرضة، أو اختر \"ما فيه ملاحظة تمريض لهذه الزيارة\".",
      unsaved: "عندك تعديلات ما انحفظت في الملاحظة.", storeErr: "ما قدرنا نحفظ. حاول مرة ثانية."
    }
  };
  let ctx = null, lang = "en", st = null, forId = null, full = false, editing = false, tried = false, timer = null;
  const t = () => L[lang];
  const tx = (k, v) => t()[k].replace(/\{(\w+)\}/g, (_, n) => v[n]);
  const S = (p, w) => ctx.svg(p, w), E = s => ctx.esc(s);
  const reset = () => { st = null; forId = null; full = false; editing = false; tried = false; clearTimeout(timer); };
  const savedOf = o => ((o.doctorVisit || {}).steps || {}).nurse;
  const nameOf = v => v && typeof v === "object" ? v[lang] || v.en : v || "";
  function load(o) {
    if (st && forId === o.id) return;
    const dv = o.doctorVisit || {}, sv = savedOf(o), dr = dv.nurseDraft;
    st = { note: (dr || sv || {}).note || "", nurse: (dr || sv || {}).nurse || (o.appointment && o.appointment.nurse) || "", none: !!(sv && sv.none) };
    forId = o.id; editing = !!dr || !sv || !sv.note;
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
    const $ = s => root.querySelector(s);
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
    $("#nuPrev").addEventListener("click", () => ctx.go(ctx.prevKey));
    $("#nuDraft").addEventListener("click", () => { try { ctx.saveDraft({ note: st.note, nurse: st.nurse }); ctx.toast(t().draftSaved); } catch (e) { ctx.toast(e.message || t().storeErr); } });
    $("#nuCont").addEventListener("click", () => {
      const cur = MadaOrders.get(o.id), sv = savedOf(cur);
      if (st.note.trim() && (dirty(cur) || !sv || !sv.note)) { if (!doSave()) return; }
      else if (!st.note.trim()) {
        if (!st.none) { tried = true; ctx.rerender(); return ctx.toast(t().needNote); }
        try { ctx.save({ note: "", nurse: "", none: true }); } catch (e) { return ctx.toast(e.message || t().storeErr); }
      }
      reset(); ctx.toast(t().saved); ctx.go(ctx.nextKey);
    });
  }
  return { view, bind, reset, L };
})();
