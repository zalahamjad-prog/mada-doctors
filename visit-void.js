// Saved visit steps are never edited in place (doctor-visit.html, nurse-visit.html). To change a saved step the doctor or nurse
// cancels it with a reason; the cancelled version is kept, crossed out, under the step, and the form opens with the old entries to correct.
// Kept on the visit (order.doctorVisit or order.nurseVisit):
//   voided: [{ k (step key), reason: "typo" | "newInfo" | "wrong" | "other", note, by, at, oldAt (the cancelled step's saved time), data: { step, history?, sample? } }]
// A step is being re-entered while its last cancelled version has oldAt equal to the step's saved time (nothing saved since);
// saving the step again gives it a new time, which closes the re-entry. Drafts can still be changed freely.
// The patient file and the reports show that a visit was edited (count).
const MadaVoid = (() => {
  const L = {
    en: { void: "Cancel and re-enter", lockT: "Saved {t} · {n}", lockS: "A saved entry can't be edited. To change it, cancel it with a reason and enter it again.", next: "Next step",
      askT: "Cancel this entry?", askS: "The current entry is kept as a cancelled version, with your name, the time and the reason. The form then opens with the old entries so you can correct them.",
      reason: "Reason for cancelling", pick: "Choose the reason", r_typo: "Typing mistake", r_newInfo: "New information from the patient", r_wrong: "Entered in the wrong place", r_other: "Other",
      note: "Details", noteReq: "(required)", noteOpt: "(optional)", notePh: "Write what was wrong", keep: "Keep it", go: "Cancel and re-enter", needReason: "Choose the reason.", needNote: "Write the reason.",
      done: "Entry cancelled. Correct it and save again.", reentry: "Re-entering: the earlier entry was cancelled. Save the step again to finish.",
      histT: "Cancelled versions ({n})", by: "Cancelled by {n} · {t}", savedWas: "Saved {t} · {n}", edited: "Edited", editedN: "Edited {n}×", empty: "No details." },
    ar: { void: "إلغاء وإعادة إدخال", lockT: "انحفظت {t} · {n}", lockS: "ما تقدر تعدّل خانة محفوظة. لو تبي تغيّرها، ألغها واكتب السبب وأدخلها من جديد.", next: "الخطوة الجاية",
      askT: "تبي تلغي هذا الإدخال؟", askS: "الإدخال الحالي ينحفظ كنسخة ملغاة باسمك والوقت والسبب. بعدها يفتح النموذج بالبيانات القديمة عشان تصلّح الغلط.",
      reason: "سبب الإلغاء", pick: "اختر السبب", r_typo: "خطأ في الكتابة", r_newInfo: "معلومة جديدة من المريض", r_wrong: "انكتبت في المكان الغلط", r_other: "أخرى",
      note: "التفاصيل", noteReq: "(إجباري)", noteOpt: "(اختياري)", notePh: "اكتب وش كان الغلط", keep: "تراجع", go: "إلغاء وإعادة إدخال", needReason: "اختر السبب.", needNote: "اكتب السبب.",
      done: "انلغى الإدخال. صلّحه واحفظ من جديد.", reentry: "إعادة إدخال: الإدخال السابق انلغى. احفظ الخطوة من جديد عشان تخلص.",
      histT: "نسخ ملغاة ({n})", by: "ألغاها {n} · {t}", savedWas: "انحفظت {t} · {n}", edited: "معدّلة", editedN: "معدّلة {n} مرات", empty: "ما فيه تفاصيل." }
  };
  const REASONS = ["typo", "newInfo", "wrong", "other"];
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const nm = (v, lg) => v && typeof v === "object" ? v[lg] || v.en || "" : v || "";
  const when = (iso, lg) => iso ? new Date(iso).toLocaleString(lg === "ar" ? "ar-SA-u-nu-latn-ca-gregory" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
  const list = dv => (dv && dv.voided) || [];
  const of = (dv, k) => list(dv).filter(v => v.k === k);
  const stepOf = (dv, k) => ((dv && dv.steps) || {})[k];
  // The step was cancelled and not saved again yet.
  const pending = (dv, k) => { const s = stepOf(dv, k), l = of(dv, k).slice(-1)[0]; return !!(l && s && l.oldAt === s.at); };
  // Saved for good (not a draft, not being re-entered): the step is locked.
  const locked = (dv, k) => { const s = stepOf(dv, k); return !!(s && s.at && !s.draft) && !pending(dv, k); };
  // Steps edited after saving, for the patient file and reports.
  const count = dv => list(dv).length;
  const countOf = o => count(o && o.doctorVisit) + count(o && o.nurseVisit);
  const tag = (o, lg) => { const n = countOf(o); return n ? `<span class="vd-tag" title="${esc(L[lg].editedN.replace("{n}", n))}">${esc(n > 1 ? L[lg].editedN.replace("{n}", n) : L[lg].edited)}</span>` : ""; };
  // A new cancelled version of step k: returns the visit's new voided list.
  function entry(dv, k, reason, note, by) {
    const s = stepOf(dv, k) || {}, data = { step: s };
    if (k === "history" && dv.history) data.history = dv.history;
    if (k === "nurse" && dv.sample) data.sample = dv.sample;
    return [...list(dv), { k, reason, note: note || null, by, at: new Date().toISOString(), oldAt: s.at || null, data }];
  }

  // The bar on a locked step, above the read-only entries.
  function lockBar(dv, k, lg, hasNext) {
    const s = stepOf(dv, k) || {}, t = L[lg];
    return `<div class="vd-bar"><div class="vd-bt"><b>${esc(t.lockT.replace("{t}", when(s.at, lg)).replace("{n}", nm(s.by, lg)))}</b><small>${t.lockS}</small></div>
      <div class="vd-ba">${hasNext ? `<button type="button" class="vd-btn ghost" data-vd-next>${t.next}</button>` : ""}<button type="button" class="vd-btn" data-vd-void="${esc(k)}">${t.void}</button></div></div>`;
  }
  const reentryBar = lg => `<div class="vd-re">${L[lg].reentry}</div>`;
  // Cancelled versions of a step, newest first, crossed out.
  const SKIP = new Set(["at", "by", "savedAt", "draft", "id", "verified", "photo", "photos", "att", "sig", "signature", "file", "data"]);
  function flat(v, out, label) {
    if (out.length >= 14 || v == null || v === "" || v === false) return out;
    if (Array.isArray(v)) { v.forEach(x => flat(x, out, label)); return out; }
    if (typeof v === "object") {
      if ("en" in v && typeof v.en === "string" && Object.keys(v).length <= 3) { out.push([label, v]); return out; }
      Object.entries(v).forEach(([k, x]) => { if (!SKIP.has(k) && !/^data:/.test(String(x))) flat(x, out, k); }); return out;
    }
    if (typeof v === "string" && v.length > 300) v = v.slice(0, 300) + "…";
    out.push([label, v]); return out;
  }
  function history(dv, k, lg) {
    const l = of(dv, k).slice().reverse(), t = L[lg]; if (!l.length) return "";
    return `<details class="vd-hist"><summary>${esc(t.histT.replace("{n}", l.length))}</summary>${l.map(v => {
      const rows = flat({ ...(v.data && v.data.step), history: v.data && v.data.history, sample: v.data && v.data.sample }, [], "");
      const s = (v.data && v.data.step) || {};
      return `<div class="vd-v"><div class="vd-vh"><b>${esc(t["r_" + v.reason] || v.reason)}</b>${v.note ? `<span dir="auto">“${esc(v.note)}”</span>` : ""}
          <small>${esc(t.by.replace("{n}", nm(v.by, lg)).replace("{t}", when(v.at, lg)))}${s.at ? " · " + esc(t.savedWas.replace("{t}", when(s.at, lg)).replace("{n}", nm(s.by, lg))) : ""}</small></div>
        <ul class="vd-old">${rows.length ? rows.map(([a, b]) => `<li><s dir="auto">${esc(nm(b, lg))}</s></li>`).join("") : `<li>${t.empty}</li>`}</ul></div>`; }).join("")}</details>`;
  }

  // The reason window. done(reason, note) runs when confirmed.
  function ask(lg, title, done) {
    const t = L[lg], ov = document.createElement("div");
    ov.className = "vd-ov"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.dir = lg === "ar" ? "rtl" : "ltr";
    ov.innerHTML = `<div class="vd-dlg"><h3>${t.askT}</h3>${title ? `<p class="vd-st">${esc(title)}</p>` : ""}<p>${t.askS}</p>
      <label for="vdR">${t.reason} <span class="vd-req">*</span></label><select id="vdR"><option value="">${t.pick}</option>${REASONS.map(r => `<option value="${r}">${t["r_" + r]}</option>`).join("")}</select>
      <label for="vdN">${t.note} <span class="vd-opt" id="vdNo">${t.noteOpt}</span></label><textarea id="vdN" maxlength="300" dir="auto" placeholder="${esc(t.notePh)}"></textarea>
      <div class="vd-err" id="vdE" hidden></div><div class="vd-acts"><button type="button" class="vd-btn ghost" data-x>${t.keep}</button><button type="button" class="vd-btn" data-ok>${t.go}</button></div></div>`;
    document.body.appendChild(ov);
    const $ = s => ov.querySelector(s), close = () => ov.remove(), err = m => { $("#vdE").textContent = m; $("#vdE").hidden = false; };
    $("#vdN").addEventListener("input", () => { $("#vdE").hidden = true; });
    $("#vdR").addEventListener("change", () => { $("#vdNo").textContent = $("#vdR").value === "other" ? t.noteReq : t.noteOpt; $("#vdE").hidden = true; });
    ov.addEventListener("click", e => {
      if (e.target === ov || e.target.closest("[data-x]")) return close();
      if (!e.target.closest("[data-ok]")) return;
      const r = $("#vdR").value, n = $("#vdN").value.trim();
      if (!r) return err(t.needReason);
      if (r === "other" && !n) return err(t.needNote);
      close(); done(r, n);
    });
    ov.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
    $("#vdR").focus();
  }
  const CSS = `.vd-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;border:1px solid #cfe3dc;background:#f3faf7;border-radius:14px;padding:12px 16px;margin:0 0 14px}
    .vd-bt b{display:block;font-size:14px;color:#0b4d42}.vd-bt small{display:block;font-size:12.5px;color:#5b6b70;margin-top:3px;line-height:1.5}.vd-ba{display:flex;gap:8px;flex-wrap:wrap}
    .vd-btn{height:40px;border:0;border-radius:10px;background:#0b6b5c;color:#fff;font:inherit;font-size:13.5px;font-weight:700;padding:0 16px;cursor:pointer}.vd-btn.ghost{background:#fff;color:#15304a;border:1px solid #d9e1e3}
    .vd-lock{opacity:.72;pointer-events:none;user-select:text}.vd-re{border:1px solid #f3dcb0;background:#fffaf0;color:#92400e;border-radius:12px;padding:10px 14px;font-size:13px;font-weight:600;margin:0 0 14px}
    .vd-hist{margin-top:16px;border:1px dashed #e3b5b5;border-radius:12px;padding:10px 14px;background:#fffafa}.vd-hist summary{cursor:pointer;font-weight:700;font-size:13.5px;color:#b91c1c}
    .vd-v{border-top:1px solid #f1dede;margin-top:10px;padding-top:10px}.vd-vh{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:baseline;font-size:13px}.vd-vh small{flex-basis:100%;color:#6b7a80;font-size:12px}
    .vd-old{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:3px;font-size:12.5px;color:#8a979c}.vd-old em{font-style:normal;color:#9aa7ab}
    .vd-tag{display:inline-flex;align-items:center;height:20px;padding:0 8px;border-radius:10px;background:#fdf2e3;color:#b45309;font-size:11px;font-weight:700;white-space:nowrap;margin-inline-start:6px;vertical-align:middle}
    .vd-ov{position:fixed;inset:0;background:rgba(15,30,40,.45);display:flex;align-items:center;justify-content:center;padding:16px;z-index:1000}
    .vd-dlg{background:#fff;border-radius:16px;max-width:460px;width:100%;padding:20px;box-shadow:0 20px 50px rgba(0,0,0,.2)}.vd-dlg h3{font-size:17px;margin:0 0 6px;color:#15304a}
    .vd-dlg p{font-size:13px;color:#5b6b70;line-height:1.6;margin:0 0 12px}.vd-dlg .vd-st{font-weight:700;color:#0b6b5c;margin-bottom:4px}.vd-dlg label{display:block;font-size:12.5px;font-weight:600;color:#44545a;margin:10px 0 5px}
    .vd-dlg select,.vd-dlg textarea{width:100%;box-sizing:border-box;border:1px solid #d9e1e3;border-radius:10px;font:inherit;font-size:14px;padding:0 12px;background:#fff}.vd-dlg select{height:42px}.vd-dlg textarea{min-height:70px;padding:10px 12px;resize:vertical}
    .vd-req{color:#dc2626}.vd-opt{color:#8a979c;font-weight:500}.vd-err{color:#b91c1c;font-size:12.5px;font-weight:600;margin-top:8px}.vd-acts{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}`;
  if (typeof document !== "undefined" && !document.getElementById("vd-css")) { const st = document.createElement("style"); st.id = "vd-css"; st.textContent = CSS; document.head.appendChild(st); }
  return { L, REASONS, list, of, pending, locked, count, countOf, tag, entry, lockBar, reentryBar, history, ask };
})();
