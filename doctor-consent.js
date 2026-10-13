// Patient Consent (last doctor visit step, after Family Education). The patient, a family member or a caregiver signs on the screen,
// then the visit is completed. Saved in order.doctorVisit.steps.consent: { signer: "patient"|"family"|"caregiver", name, relation,
//   agree, served, signature (PNG data URL), at, by }; completing also sets doctorVisit.status "done" and the order to "completed".
// The consent and service statements are shown in both languages, as on the signed paper form. TODO: legal review of the wording.
const DrConsent = (() => {
  const I = {
    sign: '<path d="M4 20h16"/><path d="M5 16c3-6 5-9 6.5-9S12 12 9 16s4-5 6-5 0 5 2 5 2-2 3-3"/>',
    patient: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    family: '<rect x="4" y="8" width="16" height="12" rx="2.5"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/><path d="M12 17s-3-1.8-3-3.6A1.6 1.6 0 0 1 12 13a1.6 1.6 0 0 1 3 .4c0 1.8-3 3.6-3 3.6z"/>',
    caregiver: '<circle cx="12" cy="7" r="3.5"/><path d="M5 21v-1.5A5.5 5.5 0 0 1 10.5 14h3a5.5 5.5 0 0 1 5.5 5.5V21"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>', trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>', check: '<path d="m5 12 5 5 9-10"/>', list: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h1M4 12h1M4 18h1"/>',
    back: '<path d="M19 12H5M11 6l-6 6 6 6"/>', done: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>', wallet: '<path d="M4 7a2 2 0 0 1 2-2h11v4"/><path d="M4 7v11a2 2 0 0 0 2 2h14V9H6a2 2 0 0 1-2-2z"/><circle cx="16.5" cy="14.5" r="1.2"/>',
    home: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>'
  };
  const RELS = ["husband", "wife", "son", "daughter", "father", "mother", "brother", "sister", "other"];
  const AGREE = ["I confirm that the physician/nurse has clearly explained the medical condition, treatment plan, and recommendations. All my questions have been answered, and I agree to the proposed medical care.",
    "أقر أنا أو المرافق للمريض بأن الفريق الطبي قد شرح الحالة الطبية وخطة العلاج والتوصيات بشكل واضح، وتمت الإجابة على جميع استفساراتي، وأوافق على تنفيذ الرعاية الطبية المقترحة."];
  const SERVED = ["I confirm that the requested service has been provided to the patient during this visit.", "أقر بأن الخدمة المطلوبة قد تم تقديمها للمريض في هذه الزيارة."];
  const L = {
    en: {
      title: "Patient Consent", sub: "Obtain patient or family signature for medical approval.", stepOf: "Step {n} of {m}",
      who: "Who is signing?", s_patient: "Patient", s_family: "Family Member", s_caregiver: "Caregiver", name: "Name", namePh: "Full name of the person signing",
      rel: "Relationship to patient", relPh: "Select relationship", r_husband: "Husband", r_wife: "Wife", r_son: "Son", r_daughter: "Daughter", r_father: "Father", r_mother: "Mother",
      r_brother: "Brother", r_sister: "Sister", r_other: "Other relative", sig: "Signature", tap: "Sign inside the box", clear: "Clear", servedT: "Service Provided Confirmation",
      sumT: "Signature Summary", sumBy: "Signed by", sumName: "Name", sumRel: "Relationship", sumOrder: "Order No.", sumDate: "Date & time", signed: "Signed", notSigned: "Not signed yet",
      payOpen: "Payment is still open: {n}. You can complete the visit; the payment stays open.", complete: "Complete Visit", prev: "Previous",
      fixErr: "Complete the required fields and the signature.", needSig: "The signature is required.", doneT: "Visit completed", doneS: "Completed {t} by {n}. The visit is now with the quality team.",
      toVisits: "Back to My Visits", completed: "Visit completed.", storeErr: "Couldn't save. Try again.", sigAlt: "Signature of {n}", resign: "Clear and sign again", missT: "Finish these steps before completing the visit:", missToast: "Some visit steps are not saved yet."
    },
    ar: {
      title: "موافقة المريض", sub: "أخذ توقيع المريض أو أسرته للموافقة الطبية.", stepOf: "الخطوة {n} من {m}",
      who: "مين يوقّع؟", s_patient: "المريض", s_family: "أحد أفراد العائلة", s_caregiver: "مقدم الرعاية", name: "اسم الموقّع", namePh: "الاسم الكامل للموقّع",
      rel: "صلة القرابة بالمريض", relPh: "اختر صلة القرابة", r_husband: "الزوج", r_wife: "الزوجة", r_son: "الابن", r_daughter: "الابنة", r_father: "الأب", r_mother: "الأم",
      r_brother: "الأخ", r_sister: "الأخت", r_other: "قريب آخر", sig: "التوقيع", tap: "وقّع داخل المربع", clear: "مسح", servedT: "إقرار بتقديم الخدمة",
      sumT: "ملخص التوقيع", sumBy: "الموقّع", sumName: "الاسم", sumRel: "صلة القرابة", sumOrder: "رقم الطلب", sumDate: "التاريخ والوقت", signed: "تم التوقيع", notSigned: "ما تم التوقيع",
      payOpen: "الدفع لسا مفتوح: {n}. تقدر تنهي الزيارة ويبقى الدفع مفتوح.", complete: "إنهاء الزيارة", prev: "السابق",
      fixErr: "عبّ الحقول المطلوبة والتوقيع.", needSig: "التوقيع مطلوب.", doneT: "انتهت الزيارة", doneS: "انتهت {t} بواسطة {n}. الزيارة الحين عند فريق الجودة.",
      toVisits: "رجوع لزياراتي", completed: "انتهت الزيارة.", storeErr: "ما قدرنا نحفظ. حاول مرة ثانية.", sigAlt: "توقيع {n}", resign: "امسح ووقّع من جديد", missT: "كمّل هذه الخطوات قبل إنهاء الزيارة:", missToast: "فيه خطوات في الزيارة ما انحفظت للحين."
    }
  };
  let ctx = null, lang = "en", st = null, forId = null, tried = false;
  const t = () => L[lang];
  const tx = (k, v) => t()[k].replace(/\{(\w+)\}/g, (_, n) => v[n]);
  const S = (p, w) => ctx.svg(p, w), E = s => ctx.esc(s);
  const reset = () => { st = null; forId = null; tried = false; };
  const savedOf = o => ((o.doctorVisit || {}).steps || {}).consent;
  const nameOf = v => v && typeof v === "object" ? v[lang] || v.en : v || "";
  function load(o) {
    if (st && forId === o.id) return;
    st = { signer: "", name: "", relation: "", agree: false, served: false, strokes: [] }; forId = o.id;
  }
  const hasSig = () => st.strokes.reduce((n, s) => n + s.length, 0) > 8;
  const errs = () => ({ signer: !st.signer, name: !st.name.trim(), relation: st.signer === "family" && !st.relation, agree: !st.agree, sig: !hasSig(), served: !st.served });

  function summary(o, sv) {
    const when = new Date(sv ? sv.at : Date.now()).toLocaleString(ctx.loc(), { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    const v = sv || st, row = (k, val) => `<div><dt>${k}</dt><dd>${val || "—"}</dd></div>`;
    return `<aside class="cs-sum"><div class="cs-sh"><span>${S(I.list)}</span><b>${t().sumT}</b></div><dl>
      ${row(t().sumBy, v.signer ? t()["s_" + v.signer] : "")}${row(t().sumName, E(v.name || ""))}${row(t().sumRel, v.signer === "family" && v.relation ? t()["r_" + v.relation] : "")}
      ${row(t().sumOrder, `<span dir="ltr">${E(o.id)}</span>`)}${row(t().sumDate, E(when))}
      ${row(t().sig, sv || hasSig() ? `<span class="cs-ok">${S(I.check, 2.6)}${t().signed}</span>` : `<span class="cs-no">${t().notSigned}</span>`)}</dl></aside>`;
  }
  // Both languages, the reader's language first.
  const bi = x => { const en = `<span class="cs-en" dir="ltr" lang="en">${E(x[0])}</span>`, ar = `<span class="cs-ar" dir="rtl" lang="ar">${E(x[1])}</span>`; return lang === "ar" ? ar + en : en + ar; };
  const head = c => `<div class="cs-top"><span class="cs-n">${c.stepOf.n}</span><div><h1>${t().title}</h1><p>${t().sub}</p></div><span class="ex-stp">${tx("stepOf", c.stepOf)}</span></div>`;

  function view(o, c) {
    ctx = c; lang = c.lang; load(o);
    const sv = savedOf(o), dv = o.doctorVisit || {};
    if (sv && dv.status === "done") {
      const when = new Date(dv.completedAt || sv.at).toLocaleString(c.loc(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
      return `<div class="cs">${head(c)}
        <div class="cs-done"><span>${S(I.done, 2)}</span><div><b>${t().doneT}</b><p>${tx("doneS", { t: E(when), n: E(nameOf(sv.by)) })}</p></div><a class="hx-btn dark" href="doctor-visits.html">${S(I.home)}${t().toVisits}</a></div>
        <div class="cs-grid"><div class="cs-main">
          <div class="cs-st"><b>${t().servedT}</b>${[AGREE, SERVED].map(x => `<p>${S(I.check, 2.6)}<span class="cs-bi">${bi(x)}</span></p>`).join("")}</div>
          <figure class="cs-sigimg"><img src="${E(sv.signature)}" alt="${E(tx("sigAlt", { n: sv.name }))}"><figcaption>${E(sv.name)}</figcaption></figure>
        </div>${summary(o, sv)}</div></div>`;
    }
    const e = tried ? errs() : {}, bad = k => e[k] ? "bad" : "";
    const ps = c.payState ? c.payState(o) : null, miss = c.missing ? c.missing(o) : [];
    const field = (label, body, k) => `<div class="pl-f cs-f ${bad(k)}"><label>${label} <span class="req">*</span></label>${body}</div>`;
    const ck = (k, txt) => `<label class="cs-ck ${k === "served" ? "served" : ""} ${bad(k)}"><input type="checkbox" id="cs_${k}" ${st[k] ? "checked" : ""}><span>${k === "served" ? `<b>${t().servedT}</b>` : ""}${bi(txt)}</span></label>`;
    return `<div class="cs">${head(c)}
      <div class="cs-grid"><div class="cs-main">
        ${field(t().who, `<div class="cs-who">${["patient", "family", "caregiver"].map(k => `<button type="button" class="cs-wb ${st.signer === k ? "on" : ""}" data-signer="${k}" aria-pressed="${st.signer === k}">${S(I[k])}<span>${t()["s_" + k]}</span></button>`).join("")}</div>`, "signer")}
        ${field(t().name, `<div class="cs-in">${S(I.user)}<input class="hx-in ${bad("name")}" id="csName" value="${E(st.name)}" placeholder="${E(t().namePh)}" maxlength="80" dir="auto"></div>`, "name")}
        ${st.signer === "family" ? field(t().rel, `<select class="hx-in pl-sel ${bad("relation")}" id="csRel"><option value="">${t().relPh}</option>${RELS.map(r => `<option value="${r}" ${st.relation === r ? "selected" : ""}>${t()["r_" + r]}</option>`).join("")}</select>`, "relation") : ""}
        ${ck("agree", AGREE)}
        ${field(t().sig, `<div class="cs-pad ${bad("sig")}"><canvas id="csPad" aria-label="${E(t().sig)}"></canvas><span class="cs-ph" ${hasSig() ? "hidden" : ""}>${S(I.sign, 1.6)}${t().tap}</span>
          <div class="cs-pf"><button type="button" class="cs-clr" id="csClr">${S(I.trash)}${t().clear}</button><small>${S(I.pen)}${t().tap}</small></div></div>`, "sig")}
        ${ck("served", SERVED)}
      </div>${summary(o)}</div>
      ${miss.length ? `<div class="cs-miss">${S(I.list)}<div><b>${t().missT}</b><span>${miss.map(m => `<button type="button" data-gostep="${m.k}">${E(m.name)}</button>`).join("")}</span></div></div>` : ""}
      ${ps && ps.due > 0 ? `<p class="cs-pay">${S(I.wallet)}<span>${tx("payOpen", { n: E(ps.text) })}</span></p>` : ""}
      <div class="ex-foot"><button type="button" class="hx-btn out pl-prevb" id="csPrev"><span class="flip">${S(I.back)}</span><span><b>${t().prev}</b><small>${E(c.prevName || "")}</small></span></button><span class="hx-sp"></span>
        <button type="button" class="hx-btn dark" id="csGo">${S(I.done, 2)}${t().complete}</button></div>
    </div>`;
  }

  function bind(root, o, c) {
    ctx = c;
    const $ = s => root.querySelector(s), re = () => ctx.rerender();
    const canvas = $("#csPad");
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
      const end = () => { if (!cur) return; cur = null; draw(); if (hasSig()) { $(".cs-pad").classList.remove("bad"); const sm = root.querySelector(".cs-sum dl > div:last-child dd"); if (sm) sm.innerHTML = `<span class="cs-ok">${S(I.check, 2.6)}${t().signed}</span>`; } };
      canvas.addEventListener("pointerup", end); canvas.addEventListener("pointercancel", end); canvas.addEventListener("pointerleave", end);
      window.addEventListener("resize", draw, { once: true });
      $("#csClr").addEventListener("click", () => { st.strokes = []; re(); });
    }
    root.querySelectorAll("[data-signer]").forEach(b => b.addEventListener("click", () => {
      const k = b.dataset.signer, pn = ctx.patient(MadaOrders.get(o.id)).name;
      if (k === "patient" && (!st.name.trim() || st.signer !== "patient")) st.name = pn || "";
      else if (st.signer === "patient" && k !== "patient" && st.name === pn) st.name = "";
      st.signer = k; if (k !== "family") st.relation = ""; re();
    }));
    if ($("#csName")) $("#csName").addEventListener("input", e => { st.name = e.target.value; if (e.target.value.trim()) e.target.classList.remove("bad"); });
    if ($("#csName")) $("#csName").addEventListener("change", re);
    if ($("#csRel")) $("#csRel").addEventListener("change", e => { st.relation = e.target.value; re(); });
    ["agree", "served"].forEach(k => { if ($("#cs_" + k)) $("#cs_" + k).addEventListener("change", e => { st[k] = e.target.checked; re(); }); });
    if ($("#csPrev")) $("#csPrev").addEventListener("click", () => ctx.go(ctx.prevKey));
    root.querySelectorAll("[data-gostep]").forEach(b => b.addEventListener("click", () => ctx.go(b.dataset.gostep)));
    if ($("#csGo")) $("#csGo").addEventListener("click", () => {
      if (ctx.missing && ctx.missing(MadaOrders.get(o.id)).length) { ctx.toast(t().missToast); const m = root.querySelector(".cs-miss"); if (m) m.scrollIntoView({ block: "center" }); return; }
      tried = true;
      const er = errs();
      if (Object.values(er).some(Boolean)) { re(); ctx.toast(er.sig && !Object.entries(er).some(([k, v]) => v && k !== "sig") ? t().needSig : t().fixErr); const b = document.querySelector(".cs .bad"); if (b) b.scrollIntoView({ block: "center" }); return; }
      // Flatten the signature to a small PNG on white, cropped to the drawing.
      const out = document.createElement("canvas"), W = 600, H = 200; out.width = W; out.height = H;
      const g = out.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, W, H); g.lineWidth = 3; g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = "#10232b";
      st.strokes.forEach(s => { g.beginPath(); s.forEach((p, i) => i ? g.lineTo(p[0] * W, p[1] * H) : g.moveTo(p[0] * W, p[1] * H)); g.stroke(); });
      const d = { signer: st.signer, name: st.name.trim(), relation: st.signer === "family" ? st.relation : "", agree: true, served: true, signature: out.toDataURL("image/png") };
      try { ctx.complete(d); } catch (e) { return ctx.toast(e.message || t().storeErr); }
      reset(); ctx.toast(t().completed); re(); window.scrollTo(0, 0);
    });
  }
  return { view, bind, reset, L };
})();
