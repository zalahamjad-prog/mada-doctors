// Physical / Clinical Examination (step 4 of the doctor visit). Saved in order.doctorVisit.steps.exam:
//   { general: { [system]: { status, findings: [], notes } },
//     regions: [{ region, insp: { f: [], notes }, palp: { f: [], notes }, ausc: { f: [], notes }, extra, photos: [dataURL] }], at, by }
// "Save as Draft" keeps the same shape in doctorVisit.examDraft. Every general system needs a status before Save & Continue.
// Demo: photos are resized JPEG data URLs kept in the browser; the real system should upload them to file storage.
const DrExam = (() => {
  const I = {
    steth: '<path d="M6 3v6a4 4 0 0 0 8 0V3"/><path d="M10 13v2a5 5 0 0 0 10 0v-2"/><circle cx="20" cy="11" r="2"/>',
    person: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    target: '<circle cx="12" cy="12" r="7"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/>',
    appear: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    cv: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
    resp: '<path d="M12 4v8"/><path d="M12 12c-1-2-3-4-5-4-2 0-3 3-3 7 0 3 2 4 4 4s4-2 4-5"/><path d="M12 12c1-2 3-4 5-4 2 0 3 3 3 7 0 3-2 4-4 4s-4-2-4-5"/>',
    abd: '<path d="M9 3v4c0 2 2 3 4 3s5 1 5 5-3 6-7 6-6-2-6-4"/>',
    neuro: '<path d="M12 4c-3-2-8 0-8 5 0 3 1 4 1 6s2 5 5 5h2zM12 4c3-2 8 0 8 5 0 3-1 4-1 6s-2 5-5 5h-2z"/><path d="M12 4v16"/>',
    skin: '<path d="M3 15h18M3 19h18"/><path d="M6 15c0-2 1-3 3-3s3 1 3 3"/><circle cx="16" cy="9" r="1.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', up: '<path d="m6 15 6-6 6 6"/>',
    cam: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>', up: '<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>', flip: '<path d="M4 9a8 8 0 0 1 14-3l2 2M20 15a8 8 0 0 1-14 3l-2-2M20 4v4h-4M4 20v-4h4"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
    back: '<path d="M19 12H5M11 6l-6 6 6 6"/>', arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', doc: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
    check: '<path d="m5 12 5 5 9-10"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'
  };
  // [key, icon, statuses, findings]
  const SYS = [
    ["appear", "appear", ["normal", "ill", "pain", "nx"], ["alert", "oriented", "distress", "other"]],
    ["cv", "cv", ["normal", "abn", "nx"], ["tachy", "brady", "murmur", "other"]],
    ["resp", "resp", ["normal", "abn", "nx"], ["clear", "wheeze", "crackles", "dimAir"]],
    ["abd", "abd", ["normal", "abn", "nx"], ["soft", "tender", "distension", "mass", "other"]],
    ["neuro", "neuro", ["normal", "abn", "nx"], ["alertN", "gcs", "focal", "other"]],
    ["skin", "skin", ["normal", "abn", "nx"], ["rash", "wound", "swelling", "bruising", "other"]]
  ];
  const REGIONS = ["chest", "abdomen", "back", "headNeck", "rUpper", "lUpper", "rLower", "lLower", "pelvis", "skinArea", "other"];
  const GROUPS = [["insp", ["sym", "deformity", "scars", "redness", "swelling", "other"]], ["palp", ["tender", "mass", "crepitus", "warm", "other"]], ["ausc", ["normal", "wheeze", "crackles", "dimBreath", "other"]]];
  const MAX_PHOTOS = 6;

  const L = {
    en: {
      title: "Physical Examination", sub: "Document clinical findings from general and local examination.", stepOf: "Step {n} of {m}",
      genT: "General Examination", genS: "Overall condition and system-based examination. Select findings and add notes as relevant.", allNormal: "Mark all as Normal",
      locT: "Local Examination", locS: "Focused examination of the affected area. You can add more than one body region.", addRegion: "Add Another Region",
      region: "Region {n}", pickRegion: "Select body region", removeRegion: "Remove region", noRegions: "No local examination added.",
      sys_appear: "General Appearance", sys_cv: "Cardiovascular", sys_resp: "Respiratory", sys_abd: "Abdominal", sys_neuro: "Neurological", sys_skin: "Skin",
      inf_appear: "How the patient looks overall.", inf_cv: "Heart rate, rhythm and sounds.", inf_resp: "Breathing and chest sounds.", inf_abd: "Abdomen on palpation.", inf_neuro: "Consciousness and neurological signs.", inf_skin: "Skin findings.",
      st_normal: "Normal", st_ill: "Ill-looking", st_pain: "In Pain", st_nx: "Not Examined", st_abn: "Abnormal",
      f_alert: "Alert", f_oriented: "Oriented", f_distress: "In distress", f_other: "Other", f_tachy: "Tachycardia", f_brady: "Bradycardia", f_murmur: "Murmur",
      f_clear: "Clear", f_wheeze: "Wheezing", f_crackles: "Crackles", f_dimAir: "Diminished air entry", f_soft: "Soft", f_tender: "Tenderness", f_distension: "Distension", f_mass: "Mass",
      f_alertN: "Alert", f_gcs: "GCS ↓", f_focal: "Focal deficit", f_rash: "Rash", f_wound: "Wound", f_swelling: "Swelling", f_bruising: "Bruising",
      f_sym: "Symmetrical", f_deformity: "Deformity", f_scars: "Scars", f_redness: "Redness", f_crepitus: "Crepitus", f_warm: "Temperature ↑", f_normal: "Normal", f_dimBreath: "Diminished breath sounds",
      notesPh: "Add notes...", g_insp: "Inspection", g_palp: "Palpation", g_ausc: "Auscultation", extra: "Additional Findings", extraPh: "Add additional findings...",
      photo: "Capture Photo", optional: "(Optional)", upload: "Upload photos", uploadS: "JPG or PNG, up to 5 MB each. You can pick several.", camOpen: "Open camera", camOpenS: "Take several photos in a row", camTitle: "Camera · Region {n}", snap: "Take photo", camDone: "Done", camSwitch: "Switch camera", camCount: "{n} of {m} photos", camErr: "The camera isn't available. Allow camera access in the browser, or upload photos instead.", camFull: "This region has the maximum of {n} photos.", photoErr: "Use a JPG or PNG up to 5 MB.", photoMax: "Up to {n} photos per region.", removePhoto: "Remove photo",
      r_chest: "Chest", r_abdomen: "Abdomen", r_back: "Back", r_headNeck: "Head & Neck", r_rUpper: "Right upper limb", r_lUpper: "Left upper limb", r_rLower: "Right lower limb", r_lLower: "Left lower limb",
      r_pelvis: "Pelvis", r_skinArea: "Skin / Wound", r_other: "Other",
      prev: "Previous", draft: "Save as Draft", saveCont: "Save & Continue", draftSaved: "Examination saved as draft.", saved: "Examination saved.",
      needStatus: "Choose a result for every system in the general examination.", needRegion: "Choose the body region for each local examination.", savedInfo: "Examination saved at {t}.", sysErr: "Choose a result."
    },
    ar: {
      title: "الفحص السريري", sub: "سجّل نتائج الفحص العام والموضعي.", stepOf: "الخطوة {n} من {m}",
      genT: "الفحص العام", genS: "الحالة العامة وفحص الأجهزة. اختر النتائج وأضف ملاحظات إذا لزم.", allNormal: "الكل طبيعي",
      locT: "الفحص الموضعي", locS: "فحص مركز على المنطقة المصابة. تقدر تضيف أكثر من منطقة.", addRegion: "إضافة منطقة ثانية",
      region: "المنطقة {n}", pickRegion: "اختر منطقة الجسم", removeRegion: "حذف المنطقة", noRegions: "ما أضيف فحص موضعي.",
      sys_appear: "المظهر العام", sys_cv: "القلب والأوعية", sys_resp: "الجهاز التنفسي", sys_abd: "البطن", sys_neuro: "الأعصاب", sys_skin: "الجلد",
      inf_appear: "شكل المريض بشكل عام.", inf_cv: "النبض والإيقاع وأصوات القلب.", inf_resp: "التنفس وأصوات الصدر.", inf_abd: "البطن عند الجس.", inf_neuro: "الوعي والعلامات العصبية.", inf_skin: "ملاحظات الجلد.",
      st_normal: "طبيعي", st_ill: "يبدو مريض", st_pain: "متألم", st_nx: "لم يُفحص", st_abn: "غير طبيعي",
      f_alert: "واعي", f_oriented: "مدرك", f_distress: "في ضيق", f_other: "أخرى", f_tachy: "تسارع نبض", f_brady: "بطء نبض", f_murmur: "لغط",
      f_clear: "صافي", f_wheeze: "صفير", f_crackles: "خراخر", f_dimAir: "ضعف دخول الهواء", f_soft: "لين", f_tender: "ألم عند الضغط", f_distension: "انتفاخ", f_mass: "كتلة",
      f_alertN: "واعي", f_gcs: "انخفاض GCS", f_focal: "عجز عصبي موضعي", f_rash: "طفح", f_wound: "جرح", f_swelling: "تورم", f_bruising: "كدمات",
      f_sym: "متماثل", f_deformity: "تشوه", f_scars: "ندبات", f_redness: "احمرار", f_crepitus: "طقطقة", f_warm: "حرارة ↑", f_normal: "طبيعي", f_dimBreath: "ضعف أصوات التنفس",
      notesPh: "أضف ملاحظات...", g_insp: "المعاينة", g_palp: "الجس", g_ausc: "التسمع", extra: "نتائج إضافية", extraPh: "أضف نتائج إضافية...",
      photo: "التقاط صورة", optional: "(اختياري)", upload: "رفع صور", uploadS: "JPG أو PNG، حد أقصى 5 ميجا لكل صورة. تقدر تختار أكثر من صورة.", camOpen: "فتح الكاميرا", camOpenS: "صوّر أكثر من صورة ورا بعض", camTitle: "الكاميرا · المنطقة {n}", snap: "التقاط صورة", camDone: "تم", camSwitch: "تبديل الكاميرا", camCount: "{n} من {m} صور", camErr: "الكاميرا غير متاحة. اسمح للمتصفح باستخدام الكاميرا، أو ارفع الصور بدلها.", camFull: "وصلت هذه المنطقة للحد الأقصى {n} صور.", photoErr: "استخدم صورة JPG أو PNG لا تتعدى 5 ميجا.", photoMax: "حد أقصى {n} صور لكل منطقة.", removePhoto: "حذف الصورة",
      r_chest: "الصدر", r_abdomen: "البطن", r_back: "الظهر", r_headNeck: "الرأس والرقبة", r_rUpper: "الطرف العلوي اليمين", r_lUpper: "الطرف العلوي اليسار", r_rLower: "الطرف السفلي اليمين", r_lLower: "الطرف السفلي اليسار",
      r_pelvis: "الحوض", r_skinArea: "الجلد / جرح", r_other: "أخرى",
      prev: "السابق", draft: "حفظ كمسودة", saveCont: "حفظ ومتابعة", draftSaved: "تم حفظ الفحص كمسودة.", saved: "تم حفظ الفحص.",
      needStatus: "اختر نتيجة لكل جهاز في الفحص العام.", needRegion: "اختر منطقة الجسم لكل فحص موضعي.", savedInfo: "تم حفظ الفحص {t}.", sysErr: "اختر نتيجة."
    }
  };

  let draft = null, forId = null, tried = false, lang = "en", ctx = null, closed = {};
  const t = () => L[lang];
  const tx = (k, v) => t()[k].replace(/\{(\w+)\}/g, (_, n) => v[n]);
  const S = (p, w) => ctx.svg(p, w), E = s => ctx.esc(s);
  const newRegion = () => ({ region: "", insp: { f: [], notes: "" }, palp: { f: [], notes: "" }, ausc: { f: [], notes: "" }, extra: "", photos: [] });
  const blank = () => ({ general: Object.fromEntries(SYS.map(([k]) => [k, { status: "", findings: [], notes: "" }])), regions: [newRegion()] });
  const clone = v => JSON.parse(JSON.stringify(v));
  const reset = () => { draft = null; forId = null; tried = false; closed = {}; };
  function load(o) {
    if (draft && forId === o.id) return;
    const dv = o.doctorVisit || {}, src = dv.examDraft || (dv.steps && dv.steps.exam);
    draft = src ? { ...blank(), ...clone(src) } : blank();
    SYS.forEach(([k]) => { draft.general[k] = { status: "", findings: [], notes: "", ...(draft.general[k] || {}) }; });
    forId = o.id;
  }
  const allNormal = () => SYS.every(([k]) => draft.general[k].status === "normal");

  function sysCard([k, ic, sts, fs]) {
    const g = draft.general[k], bad = tried && !g.status;
    return `<div class="ex-sys ${bad ? "bad" : ""}" id="sys-${k}">
      <div class="ex-sh"><span class="ex-ic">${S(I[ic])}</span><div class="ex-sb"><b>${t()["sys_" + k]} <span class="hx-i" title="${E(t()["inf_" + k])}" tabindex="0">i</span></b>
        <div class="ex-st">${sts.map(s => `<button type="button" class="ex-pill ${g.status === s ? "on " + s : ""}" data-st="${k}" data-v="${s}" aria-pressed="${g.status === s}">${t()["st_" + s]}</button>`).join("")}</div></div></div>
      <div class="ex-fs">${fs.map(f => `<label class="ex-ck"><input type="checkbox" data-gf="${k}" value="${f}" ${g.findings.includes(f) ? "checked" : ""}><span>${t()["f_" + f]}</span></label>`).join("")}</div>
      ${bad ? `<div class="hx-err">${t().sysErr}</div>` : ""}
      <input class="ex-note" data-gn="${k}" value="${E(g.notes)}" placeholder="${E(t().notesPh)}" maxlength="300">
    </div>`;
  }
  function regionCard(r, i) {
    const shut = closed[i], bad = tried && !r.region && regionUsed(r);
    const grp = ([g, fs]) => `<div class="ex-grp"><b>${t()["g_" + g]}</b><div class="ex-fs sm">${fs.map(f =>
      `<label class="ex-ck"><input type="checkbox" data-rf="${i}" data-g="${g}" value="${f}" ${r[g].f.includes(f) ? "checked" : ""}><span>${t()["f_" + f]}</span></label>`).join("")}</div>
      <input class="ex-note" data-rn="${i}" data-g="${g}" value="${E(r[g].notes)}" placeholder="${E(t().notesPh)}" maxlength="300"></div>`;
    return `<div class="ex-reg ${shut ? "shut" : ""}">
      <div class="ex-rh"><button type="button" class="ex-tog" data-tog="${i}" aria-expanded="${!shut}">${S(I.up, 2)}<b>${tx("region", { n: i + 1 })}</b></button>
        <select class="ex-sel ${bad ? "bad" : ""}" data-rr="${i}" aria-label="${E(t().pickRegion)}"><option value="">${t().pickRegion}</option>${REGIONS.map(x => `<option value="${x}" ${r.region === x ? "selected" : ""}>${t()["r_" + x]}</option>`).join("")}</select>
        <button type="button" class="ex-del" data-del="${i}" aria-label="${E(t().removeRegion)}">${S(I.trash)}</button></div>
      ${shut ? "" : `<div class="ex-rb">
        <div class="ex-g2">${GROUPS.map(grp).join("")}
          <div class="ex-grp"><b>${t().extra}</b><textarea class="ex-ta" data-rx="${i}" rows="3" maxlength="500" placeholder="${E(t().extraPh)}">${E(r.extra)}</textarea></div></div>
        <div class="ex-ph"><b>${t().photo} <span class="hx-opt">${t().optional}</span></b>
          <div class="ex-phr">${r.photos.length < MAX_PHOTOS ? `<button type="button" class="ex-up cam" data-cam="${i}">${S(I.cam)}<span><b>${t().camOpen}</b><small>${t().camOpenS}</small></span></button>
              <label class="ex-up">${S(I.up)}<span><b>${t().upload}</b><small>${t().uploadS}</small></span><input type="file" accept="image/jpeg,image/png" multiple data-up="${i}" hidden></label>` : ""}
            ${r.photos.map((p, n) => `<span class="ex-th"><img src="${p}" alt=""><button type="button" data-rmph="${i}" data-n="${n}" aria-label="${E(t().removePhoto)}">${S(I.x, 2.6)}</button></span>`).join("")}</div></div>
      </div>`}
    </div>`;
  }
  function regionUsed(r) { return !!(r.extra.trim() || r.photos.length || GROUPS.some(([g]) => r[g].f.length || r[g].notes.trim())); }

  function view(o, c) {
    ctx = c; lang = c.lang; load(o);
    const saved = o.doctorVisit && o.doctorVisit.steps && o.doctorVisit.steps.exam;
    const when = saved && new Date(saved.at).toLocaleString(c.loc(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    return `<div class="ex">
      <div class="ex-top"><span class="ex-tic">${S(I.steth)}</span><div><h1>${t().title}</h1><p>${t().sub}</p></div><span class="ex-stp">${tx("stepOf", c.stepOf)}</span></div>
      ${saved ? `<div class="info ok">${S(I.check, 2.4)}<span>${tx("savedInfo", { t: E(when) })}</span></div>` : ""}
      <section class="ex-sec">
        <div class="ex-head"><span class="ex-hic">${S(I.person)}</span><span class="ex-num">01</span><div><h2>${t().genT}</h2><p>${t().genS}</p></div>
          <label class="ex-ck big"><input type="checkbox" id="exAllNormal" ${allNormal() ? "checked" : ""}><span>${t().allNormal}</span></label></div>
        <div class="ex-grid">${SYS.map(sysCard).join("")}</div>
      </section>
      <section class="ex-sec">
        <div class="ex-head"><span class="ex-hic">${S(I.target)}</span><span class="ex-num">02</span><div><h2>${t().locT}</h2><p>${t().locS}</p></div>
          <button type="button" class="ex-add" id="exAddRegion">${S(I.plus)}${t().addRegion}</button></div>
        ${draft.regions.length ? draft.regions.map(regionCard).join("") : `<p class="hx-empty">${t().noRegions}</p>`}
      </section>
      <div class="ex-foot"><button type="button" class="hx-btn out" id="exPrev"><span class="flip">${S(I.back)}</span>${t().prev}</button><span class="hx-sp"></span>
        <button type="button" class="hx-btn soft" id="exDraft">${S(I.doc)}${t().draft}</button>
        <button type="button" class="hx-btn dark" id="exSave">${t().saveCont}${S(I.arrow)}</button></div>
    </div>`;
  }

  // Shrinks a photo to at most 800px and re-encodes it as JPEG so it fits in browser storage.
  function shrink(file) {
    return new Promise((res, rej) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, 800 / Math.max(img.width, img.height)), c = document.createElement("canvas");
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        res(c.toDataURL("image/jpeg", 0.7));
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(); };
      img.src = url;
    });
  }
  // Live camera for one region: each "Take photo" adds a shot to the region until Done or the limit.
  // Phones without camera access in the browser fall back to the system camera (input capture).
  function camera(i, redraw) {
    const r = draft.regions[i];
    if (r.photos.length >= MAX_PHOTOS) return ctx.toast(tx("camFull", { n: MAX_PHOTOS }));
    const fallback = () => {
      const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; inp.setAttribute("capture", "environment");
      inp.addEventListener("change", async () => { const f = inp.files[0]; if (!f) return; try { r.photos.push(await shrink(f)); redraw(); } catch (e) { ctx.toast(t().photoErr); } });
      inp.click();
    };
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return fallback();
    let stream = null, facing = "environment";
    const m = document.createElement("div"); m.className = "ex-cam";
    m.innerHTML = `<div class="ex-cam-box" role="dialog" aria-modal="true">
      <div class="ex-cam-hd"><b>${E(tx("camTitle", { n: i + 1 }))}</b><span class="ex-cam-n"></span><button type="button" class="ex-cam-x" aria-label="${E(t().camDone)}">${S(I.x, 2.4)}</button></div>
      <div class="ex-cam-v"><video playsinline autoplay muted></video><div class="ex-cam-flash"></div></div>
      <div class="ex-cam-strip"></div>
      <div class="ex-cam-ft"><button type="button" class="hx-btn out ex-cam-sw">${S(I.flip)}${t().camSwitch}</button>
        <button type="button" class="ex-cam-snap" aria-label="${E(t().snap)}"><span></span></button>
        <button type="button" class="hx-btn dark ex-cam-ok">${t().camDone}</button></div></div>`;
    document.body.appendChild(m);
    const v = m.querySelector("video"), snap = m.querySelector(".ex-cam-snap");
    const paint = () => {
      m.querySelector(".ex-cam-n").textContent = tx("camCount", { n: r.photos.length, m: MAX_PHOTOS });
      m.querySelector(".ex-cam-strip").innerHTML = r.photos.map(p => `<img src="${p}" alt="">`).join("");
      snap.disabled = r.photos.length >= MAX_PHOTOS;
    };
    const stop = () => { if (stream) stream.getTracks().forEach(tr => tr.stop()); stream = null; };
    const start = () => { stop(); return navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1280 } }, audio: false })
      .then(s => { stream = s; v.srcObject = s; })
      .catch(() => { close(); ctx.toast(t().camErr); fallback(); }); };
    const close = () => { stop(); m.remove(); document.removeEventListener("keydown", esc); redraw(); };
    const esc = e => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", esc);
    snap.addEventListener("click", () => {
      if (!v.videoWidth || r.photos.length >= MAX_PHOTOS) return;
      const k = Math.min(1, 800 / Math.max(v.videoWidth, v.videoHeight)), c = document.createElement("canvas");
      c.width = Math.round(v.videoWidth * k); c.height = Math.round(v.videoHeight * k);
      c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
      r.photos.push(c.toDataURL("image/jpeg", 0.7));
      const fl = m.querySelector(".ex-cam-flash"); fl.classList.remove("on"); void fl.offsetWidth; fl.classList.add("on");
      paint();
      if (r.photos.length >= MAX_PHOTOS) ctx.toast(tx("camFull", { n: MAX_PHOTOS }));
    });
    m.querySelector(".ex-cam-sw").addEventListener("click", () => { facing = facing === "environment" ? "user" : "environment"; start(); });
    m.querySelector(".ex-cam-ok").addEventListener("click", close);
    m.querySelector(".ex-cam-x").addEventListener("click", close);
    m.addEventListener("click", e => { if (e.target === m) close(); });
    paint(); start();
  }

  function clean() {
    const d = clone(draft);
    d.regions = d.regions.filter(r => r.region || regionUsed(r));
    return d;
  }

  function bind(root, o, c) {
    ctx = c;
    const redraw = () => ctx.rerender(false);
    root.querySelectorAll("[data-st]").forEach(b => b.addEventListener("click", () => {
      const g = draft.general[b.dataset.st]; g.status = g.status === b.dataset.v ? "" : b.dataset.v; redraw();
    }));
    root.querySelectorAll("[data-gf]").forEach(el => el.addEventListener("change", () => {
      const g = draft.general[el.dataset.gf]; g.findings = el.checked ? g.findings.concat(el.value) : g.findings.filter(x => x !== el.value);
    }));
    root.querySelectorAll("[data-gn]").forEach(el => el.addEventListener("input", () => { draft.general[el.dataset.gn].notes = el.value; }));
    root.querySelector("#exAllNormal").addEventListener("change", e => {
      SYS.forEach(([k]) => { const g = draft.general[k]; if (e.target.checked) g.status = "normal"; else if (g.status === "normal") g.status = ""; });
      redraw();
    });
    root.querySelector("#exAddRegion").addEventListener("click", () => {
      draft.regions.push(newRegion()); redraw();
      const all = root.querySelectorAll(".ex-reg"); if (all.length) all[all.length - 1].scrollIntoView({ block: "center", behavior: "smooth" });
    });
    root.querySelectorAll("[data-tog]").forEach(b => b.addEventListener("click", () => { closed[b.dataset.tog] = !closed[b.dataset.tog]; redraw(); }));
    root.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", () => { draft.regions.splice(+b.dataset.del, 1); closed = {}; redraw(); }));
    root.querySelectorAll("[data-rr]").forEach(el => el.addEventListener("change", () => { draft.regions[+el.dataset.rr].region = el.value; el.classList.remove("bad"); }));
    root.querySelectorAll("[data-rf]").forEach(el => el.addEventListener("change", () => {
      const g = draft.regions[+el.dataset.rf][el.dataset.g]; g.f = el.checked ? g.f.concat(el.value) : g.f.filter(x => x !== el.value);
    }));
    root.querySelectorAll("[data-rn]").forEach(el => el.addEventListener("input", () => { draft.regions[+el.dataset.rn][el.dataset.g].notes = el.value; }));
    root.querySelectorAll("[data-rx]").forEach(el => el.addEventListener("input", () => { draft.regions[+el.dataset.rx].extra = el.value; }));
    root.querySelectorAll("[data-up]").forEach(el => el.addEventListener("change", async () => {
      const files = [...el.files], r = draft.regions[+el.dataset.up]; el.value = "";
      let bad = false, over = false;
      for (const f of files) {
        if (!/^image\/(jpeg|png)$/.test(f.type) || f.size > 5 * 1024 * 1024) { bad = true; continue; }
        if (r.photos.length >= MAX_PHOTOS) { over = true; break; }
        try { r.photos.push(await shrink(f)); } catch (e) { bad = true; }
      }
      redraw();
      if (over) ctx.toast(tx("photoMax", { n: MAX_PHOTOS })); else if (bad) ctx.toast(t().photoErr);
    }));
    root.querySelectorAll("[data-cam]").forEach(b => b.addEventListener("click", () => camera(+b.dataset.cam, redraw)));
    root.querySelectorAll("[data-rmph]").forEach(b => b.addEventListener("click", () => { draft.regions[+b.dataset.rmph].photos.splice(+b.dataset.n, 1); redraw(); }));
    root.querySelector("#exPrev").addEventListener("click", () => ctx.go(ctx.prevKey));
    root.querySelector("#exDraft").addEventListener("click", () => {
      try { ctx.saveDraft(clean()); ctx.toast(t().draftSaved); } catch (e) { ctx.toast(e.message); }
    });
    root.querySelector("#exSave").addEventListener("click", () => {
      tried = true;
      const missing = SYS.find(([k]) => !draft.general[k].status), noRegion = draft.regions.some(r => !r.region && regionUsed(r));
      if (missing || noRegion) {
        redraw(); ctx.toast(missing ? t().needStatus : t().needRegion);
        const el = root.querySelector(".ex-sys.bad, .ex-sel.bad"); if (el) el.scrollIntoView({ block: "center" });
        return;
      }
      try { ctx.save(clean()); } catch (e) { return ctx.toast(e.message); }
      reset(); ctx.toast(t().saved); ctx.go(ctx.nextKey);
    });
  }

  return { view, bind, reset, L };
})();
