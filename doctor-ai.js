// Mada Care writing assistant: an "Improve text" button under the text fields of the doctor, nurse and physiotherapy pages.
// It sends the field's text to the mada-ai Supabase function (notes/supabase-functions/mada-ai), shows the corrected text
// and the points to check, and the practitioner chooses to use it or keep their own text. Nothing is saved until the page's
// own Save. Shown only when MADA_CLOUD.ai is true, real logins are on and the account has a clinical role.
(function () {
  const CLINICAL = ["doctor", "nurse", "physio", "gm", "admin", "quality"];
  const L = {
    en: { btn: "Improve text", busy: "Improving…", title: "Suggested text", use: "Use this text", keep: "Keep mine", check: "Worth checking",
      same: "No corrections needed.", review: "Review the text before saving. The assistant only fixes the writing; it does not add or check medical content.",
      empty: "Write something first.", err: "The assistant is not available right now.", offline: "No connection. Try again.",
      mic: "Dictate", stop: "Stop", listening: "Listening… speak now", micDenied: "Allow the microphone for this site in the browser settings.", micErr: "Dictation stopped. Try again.", switchTo: "Switch dictation language" },
    ar: { btn: "حسّن النص", busy: "جارٍ التحسين…", title: "النص المقترح", use: "استخدام هذا النص", keep: "إبقاء نصّي", check: "نقاط للمراجعة",
      same: "النص لا يحتاج تصحيحًا.", review: "يُرجى مراجعة النص قبل الحفظ. المساعد يصحّح الكتابة فقط ولا يضيف أو يراجع المحتوى الطبي.",
      empty: "اكتب النص أولًا.", err: "المساعد غير متاح الآن.", offline: "لا يوجد اتصال. حاول مرة أخرى.",
      mic: "إملاء صوتي", stop: "إيقاف", listening: "جارٍ الاستماع… تكلّم الآن", micDenied: "اسمح للمتصفح باستخدام المايك من إعدادات الموقع.", micErr: "توقف الإملاء. حاول مرة أخرى.", switchTo: "تغيير لغة الإملاء" }
  };
  const lang = () => (document.documentElement.lang === "en" ? "en" : "ar");
  const t = () => L[lang()];
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function enabled() {
    if (typeof MADA_CLOUD === "undefined" || !MADA_CLOUD.ai || typeof MadaStore === "undefined" || !MadaStore.auth || !MadaStore.auth.on) return false;
    const s = MadaStore.auth.session(); const role = s && s.user && s.user.app_metadata && s.user.app_metadata.role;
    return CLINICAL.includes(role);
  }
  if (!enabled()) { window.MadaAI = { on: false }; return; }

  const css = document.createElement("style");
  css.textContent = `.ai-row{display:flex;justify-content:flex-end;margin-top:6px}
.ai-btn{display:inline-flex;align-items:center;gap:6px;border:1px solid #cfe3e6;background:#f2f9fa;color:#0f6f7a;border-radius:999px;padding:5px 12px;font:inherit;font-size:13px;font-weight:600;cursor:pointer}
.ai-btn:hover{background:#e3f2f4}.ai-btn[disabled]{opacity:.6;cursor:wait}
.ai-btn svg{width:15px;height:15px}
.ai-box{margin-top:8px;border:1px solid #cfe3e6;border-radius:12px;background:#fbfefe;padding:12px 14px;font-size:14px}
.ai-box h5{margin:0 0 6px;font-size:13px;color:#0f6f7a}
.ai-txt{white-space:pre-wrap;line-height:1.6;color:#1d2b30;background:#fff;border:1px solid #e4eef0;border-radius:8px;padding:8px 10px}
.ai-box ul{margin:8px 0 0;padding-inline-start:18px;color:#7a4b00;font-size:13px}
.ai-hint{margin:8px 0 0;color:#5f7378;font-size:12px}
.ai-acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.ai-acts button{border-radius:999px;padding:6px 14px;font:inherit;font-size:13px;font-weight:600;cursor:pointer;border:1px solid #0f6f7a}
.ai-use{background:#0f6f7a;color:#fff}.ai-keep{background:#fff;color:#0f6f7a}
.ai-msg{margin-top:6px;font-size:12px;color:#8a3b2e;text-align:end}
.ai-row{gap:8px;flex-wrap:wrap;align-items:center}
.ai-mic.on{background:#fdecea;border-color:#f3b8b1;color:#b3261e}
.ai-mic.on svg{animation:aiPulse 1s ease-in-out infinite}
@keyframes aiPulse{50%{opacity:.35}}
.ai-ml{border:1px solid #cfe3e6;background:#fff;color:#0f6f7a;border-radius:999px;padding:5px 9px;font:inherit;font-size:12px;font-weight:700;cursor:pointer}
.ai-live{flex-basis:100%;text-align:end;font-size:12px;color:#5f7378;min-height:1em}`;
  document.head.appendChild(css);
  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2-2.2-.8 2.2-.8z"/></svg>';

  const MIC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';

  // Voice dictation through the browser's own speech recognition (Chrome, Edge, Safari). The words go into the field;
  // the practitioner checks them (and can press Improve text) before the page's Save. The language (Arabic or English) is
  // remembered on this device only.
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null, recTa = null;
  const micLang = () => { try { return localStorage.getItem("ai-mic-lang") || lang(); } catch (e) { return lang(); } };
  function stopMic() { if (rec) { try { rec.stop(); } catch (e) {} } }
  function dictate(ta, row) {
    if (rec) { const same = recTa === ta; stopMic(); if (same) return; }
    if (ta.readOnly || ta.disabled) return;
    row.querySelectorAll(".ai-msg").forEach(m => m.remove());
    const btn = row.querySelector(".ai-mic"), live = row.querySelector(".ai-live");
    const msg = s => { const m = document.createElement("div"); m.className = "ai-msg"; m.textContent = s; row.appendChild(m); };
    const r = new SR(); rec = r; recTa = ta;
    r.lang = micLang() === "en" ? "en-US" : "ar-SA"; r.continuous = true; r.interimResults = true;
    r.onresult = e => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const said = e.results[i][0].transcript.trim(); if (!said) continue;
        if (e.results[i].isFinal) { const cur = ta.value.replace(/\s+$/, ""); setValue(ta, (cur ? cur + " " : "") + said); }
        else interim += said + " ";
      }
      live.textContent = interim.trim() || t().listening;
    };
    r.onerror = e => { if (e.error === "not-allowed" || e.error === "service-not-allowed") msg(t().micDenied); else if (e.error !== "no-speech" && e.error !== "aborted") msg(t().micErr); };
    r.onend = () => { if (rec === r) { rec = null; recTa = null; } btn.classList.remove("on"); btn.lastChild.textContent = t().mic; live.textContent = ""; live.hidden = true; };
    btn.classList.add("on"); btn.lastChild.textContent = t().stop; live.hidden = false; live.textContent = t().listening;
    try { r.start(); } catch (e) { r.onend(); msg(t().micErr); }
  }

  // The label of the field, sent so the assistant knows what kind of note it is (never the patient's name).
  function labelOf(ta) {
    const id = ta.id && document.querySelector('label[for="' + CSS.escape(ta.id) + '"]');
    const wrap = ta.closest(".fq, .fld, label, .field, div");
    const l = id || (wrap && wrap.querySelector(".fl, label, .lbl, span"));
    return l ? l.textContent.trim().slice(0, 80) : "";
  }
  function setValue(ta, v) {
    ta.value = v.slice(0, ta.maxLength > 0 ? ta.maxLength : v.length);
    ta.dispatchEvent(new Event("input", { bubbles: true })); ta.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async function improve(ta, row) {
    const old = row.nextElementSibling; if (old && old.classList.contains("ai-box")) old.remove();
    row.querySelectorAll(".ai-msg").forEach(m => m.remove());
    if (ta.readOnly || ta.disabled) return;
    stopMic();
    const text = ta.value.trim(), btn = row.querySelector(".ai-fix");
    const msg = s => { const m = document.createElement("div"); m.className = "ai-msg"; m.textContent = s; row.appendChild(m); };
    if (!text) return msg(t().empty);
    btn.disabled = true; btn.lastChild.textContent = t().busy;
    const r = await MadaStore.auth.call("mada-ai", { text, lang: lang(), field: labelOf(ta) });
    btn.disabled = false; btn.lastChild.textContent = t().btn;
    if (!r.ok || !r.json || !r.json.ok) return msg(r.offline ? t().offline : t().err);
    const j = r.json, box = document.createElement("div"); box.className = "ai-box"; box.dir = "auto";
    box.innerHTML = `<h5>${t().title}</h5><div class="ai-txt" dir="auto">${esc(j.text)}</div>`
      + (j.notes && j.notes.length ? `<h5 style="margin-top:10px">${t().check}</h5><ul>${j.notes.map(n => `<li>${esc(n)}</li>`).join("")}</ul>` : "")
      + `<p class="ai-hint">${j.changed ? t().review : t().same}</p>`
      + `<div class="ai-acts">${j.changed ? `<button type="button" class="ai-use">${t().use}</button>` : ""}<button type="button" class="ai-keep">${t().keep}</button></div>`;
    row.after(box);
    const use = box.querySelector(".ai-use");
    if (use) use.onclick = () => { setValue(ta, j.text); box.remove(); ta.focus(); };
    box.querySelector(".ai-keep").onclick = () => box.remove();
  }

  function attach(root) {
    (root.querySelectorAll ? root.querySelectorAll("textarea") : []).forEach(ta => {
      if (ta.dataset.ai || ta.readOnly || ta.disabled || ta.closest(".pay-box, [data-noai]") || ta.id === "payMsg") return;
      ta.dataset.ai = "1";
      const row = document.createElement("div"); row.className = "ai-row";
      row.innerHTML = (SR ? `<button type="button" class="ai-ml" title="${t().switchTo}">${micLang() === "en" ? "EN" : "ع"}</button><button type="button" class="ai-btn ai-mic">${MIC}<span>${t().mic}</span></button>` : "")
        + `<button type="button" class="ai-btn ai-fix">${ICON}<span>${t().btn}</span></button>` + (SR ? `<div class="ai-live" hidden></div>` : "");
      row.querySelector(".ai-fix").onclick = () => improve(ta, row);
      if (SR) {
        row.querySelector(".ai-mic").onclick = () => dictate(ta, row);
        row.querySelector(".ai-ml").onclick = e => { const v = micLang() === "en" ? "ar" : "en"; try { localStorage.setItem("ai-mic-lang", v); } catch (x) {}
          document.querySelectorAll(".ai-ml").forEach(b => b.textContent = v === "en" ? "EN" : "ع"); if (rec) stopMic(); };
      }
      ta.after(row);
    });
  }
  const start = () => { attach(document.body); new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => n.nodeType === 1 && attach(n.tagName === "TEXTAREA" ? n.parentNode : n)))).observe(document.body, { childList: true, subtree: true }); };
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
  window.MadaAI = { on: true };
})();
