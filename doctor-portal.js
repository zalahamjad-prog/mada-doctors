// Mada Care Doctor Portal and Nursing Portal: shared sidebar menu, user box and support line (the menu follows me.kind).
// Each portal page has <nav id="menu">, <div id="support">, the user box (#avatar, #userName, #userSpec) and calls
// DrPortal.render(me, lang, activeKey) from its own setLang().
const DrPortal = (() => {
  // Only built sections have an href; the rest show "Soon".
  const MENU = [
    { k: "visits", href: "doctor-visits.html", icon: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="m9 15 2 2 4-4"/>' },
    { k: "schedule", href: "doctor-schedule.html", icon: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>' },
    { k: "patients", href: "doctor-patients.html", icon: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20v-1a6.5 6.5 0 0 1 13 0v1"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14a6.5 6.5 0 0 1 3 5.5v.5"/>' },
    { k: "alerts", href: "doctor-alerts.html", icon: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>' },
    { k: "orders", href: "doctor-orders-list.html", icon: '<path d="M9 4h6v3H9z"/><path d="M15 5.5h3v15H6v-15h3"/><path d="M9 11h6M9 15h4"/>' },
    { k: "consults", icon: '<path d="M6 3v6a4 4 0 0 0 8 0V3"/><path d="M10 13v2a5 5 0 0 0 10 0v-2"/><circle cx="20" cy="11" r="2"/>' },
    { k: "reports", href: "doctor-reports.html", icon: '<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>' },
  ];
  // Account group at the end of the menu.
  const ACCOUNT = [
    { k: "account", href: "doctor-account.html", icon: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a7 7 0 0 1 14 0v1"/>' },
    { k: "logout", href: "doctor-login.html", out: true, icon: '<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M10 16l-4-4 4-4M6 12h10"/>' }
  ];
  // Nursing Portal menu (nurse-*.html).
  const NURSE_MENU = [
    { k: "visits", href: "nurse-visits.html", icon: MENU[0].icon },
    { k: "schedule", href: "nurse-schedule.html", icon: MENU[1].icon },
    { k: "patients", href: "nurse-patients.html", icon: MENU[2].icon },
    { k: "samples", href: "nurse-samples.html", icon: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/>' },
  ];
  const NURSE_ACCOUNT = [{ k: "account", href: "nurse-account.html", icon: ACCOUNT[0].icon }, { ...ACCOUNT[1], href: "nurse-login.html" }];
  const isNurse = me => !!me && me.kind === "nurse";
  // TODO: the real Mada support number.
  const SUPPORT = "920000000";
  const L = {
    en: { home: "Home", visits: "My Visits", schedule: "My Schedule", patients: "Patients", orders: "Orders", alerts: "Critical Results", consults: "Consultations", reports: "Reports", samples: "Samples", soon: "Soon", account: "Profile", logout: "Log out", accountT: "Account", support: "Support",
      nT: "Notifications", nNone: "No new notifications.", nBook: "New booking", nRes_lab: "Lab results ready", nRes_radiology: "Radiology results ready", nDue: "Lab result due: enter it", nReady: "Results entered, not sent yet", nCrit: "Critical result", nHigh: "High result", today: "Today", tomorrow: "Tomorrow" },
    ar: { home: "الرئيسية", visits: "زياراتي", schedule: "جدولي", patients: "المرضى", orders: "الأوردرات", alerts: "النتائج الحرجة", consults: "الاستشارات", reports: "التقارير", samples: "العينات", soon: "قريباً", account: "الملف الشخصي", logout: "تسجيل الخروج", accountT: "الحساب", support: "الدعم",
      nT: "الإشعارات", nNone: "ما فيه إشعارات جديدة.", nBook: "حجز جديد", nRes_lab: "نتائج التحاليل جاهزة", nRes_radiology: "نتيجة الأشعة جاهزة", nDue: "حان وقت نتيجة التحليل: أدخلها", nReady: "النتائج مدخلة وما انرسلت", nCrit: "نتيجة حرجة", nHigh: "نتيجة مرتفعة", today: "اليوم", tomorrow: "بكرة" }
  };
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const svg = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">${p}</svg>`;

  function render(me, lang, active) {
    const t = L[lang];
    menuCss();
    // Critical Results shows how many alerts are still open (alerts.js).
    // Samples shows the results that are due or not sent yet (lab-samples.js).
    const openN = m => m.k === "alerts" && me && typeof MadaAlerts !== "undefined" ? MadaAlerts.open(me.doctorId || me.staffId).length
      : m.k === "samples" && me && typeof MadaSamples !== "undefined" ? MadaSamples.todo(me.nurseId).length : 0;
    const link = m => m.href
      ? `<a href="${m.href}" ${m.k === active ? 'aria-current="page"' : ""}${m.out ? ' class="dp-out" data-dp-logout' : ""}>${svg(m.icon)}${t[m.k]}${openN(m) ? `<span class="dp-cnt">${openN(m)}</span>` : ""}</a>`
      : `<a href="#" class="soon" aria-disabled="true" data-soon>${svg(m.icon)}${t[m.k]}<span class="soon-tag">${t.soon}</span></a>`;
    const menu = isNurse(me) ? NURSE_MENU : MENU, acct = isNurse(me) ? NURSE_ACCOUNT : ACCOUNT;
    document.getElementById("menu").innerHTML = menu.filter(m => m.href).map(link).join("")
      + `<span class="dp-sep" aria-hidden="true"></span>` + menu.filter(m => !m.href).map(link).join("")
      + `<span class="dp-lbl">${t.accountT}</span>` + acct.map(link).join("");
    const sup = document.getElementById("support");
    if (sup) sup.innerHTML = `${svg('<path d="M4 13v-1a8 8 0 0 1 16 0v1"/><rect x="3" y="13" width="4" height="6" rx="1.5"/><rect x="17" y="13" width="4" height="6" rx="1.5"/>')}
      <span><b>${t.support}</b><a href="tel:${SUPPORT}" dir="ltr">${SUPPORT}</a></span>`;
    if (!me) return;
    document.getElementById("userName").textContent = me.name[lang];
    document.getElementById("userSpec").textContent = me.specialty ? me.specialty[lang] : me.role[lang];
    document.getElementById("avatar").innerHTML = me.photo ? `<img src="${esc(me.photo)}" alt="">` : esc(me.initials[lang]);
    bell(me, lang);
    if (isNurse(me) && typeof MadaSamples !== "undefined") MadaSamples.watch(me, lang, () => bell(bellMe, bellLang));
  }

  // Bell: two kinds of notifications, newest first.
  //  - New booking: a visit booked with this doctor that the doctor has not seen yet (opening the bell marks them seen).
  //    It only counts once the customer has paid (the order has a booking number), dated from the later of payment and assignment.
  //  - Results ready: lab or radiology results entered for this doctor's orders, waiting for approval
  //    (medical.js, reviewed on doctor-orders-list.html). They stay until the doctor approves them.
  //  - Critical / high result: a lab result with a high or critical value (alerts.js) the doctor has not opened yet.
  // Read straight from storage so every portal page can show it.
  // TODO: replace with push notifications from the bookings and orders APIs.
  const RES_STEP = { lab: 3, radiology: 2 };
  const read = (k, d) => { try { return MadaStore.getJSON(k, d) || d; } catch (e) { return d; } };
  const seenKey = id => "mada-dr-seen-" + id;
  // A nurse's bookings are the ones with booking.nurseId; her visit progress is order.nurseVisit.
  let bookNurse = false;
  function bookings(id) {
    return read("mada-orders", []).filter(o => o.bookingId && o.booking && o.appointment && o.status !== "cancelled" && (bookNurse
      ? o.booking.nurseId === id && !(o.nurseVisit && o.nurseVisit.status === "done")
      : o.booking.doctorId === id && !(o.doctorVisit && o.doctorVisit.status === "done")));
  }
  function notes(me) {
    const id = me.doctorId || me.nurseId || me.staffId, out = [];
    bookNurse = isNurse(me);
    let seen = read(seenKey(id), null);
    if (!seen) {
      // SAMPLE DATA ONLY: on the first visit the two latest demo bookings show as new.
      const bk = bookings(id).sort((a, b) => String(b.booking.at || b.bookedAt).localeCompare(String(a.booking.at || a.bookedAt)));
      seen = MadaStore.SAMPLES ? bk.slice(2).map(o => o.id) : [];
      if (bk.length) try { MadaStore.setJSON(seenKey(id), seen); } catch (e) {}
    }
    if (typeof MadaAlerts !== "undefined" && !bookNurse) MadaAlerts.open(id).forEach(a => out.push({ kind: "crit", a, at: a.at, unread: !a.rec.seenAt }));
    bookings(id).forEach(o => out.push({ kind: "book", o, at: [o.booking.at, o.bookedAt, o.createdAt].filter(Boolean).sort().pop(), unread: !seen.includes(o.id) }));
    if (!bookNurse) read("mada-medical", []).filter(r => r.doctorId === id && r.status === "open").forEach(r => r.items.forEach(it => {
      if (RES_STEP[it.type] === it.step && (it.type !== "lab" || it.v2)) out.push({ kind: "res", r, it, at: (it.log[it.log.length - 1] || {}).at || r.createdAt, unread: true });
    }));
    // Nurse: lab results that are due, or entered and not sent (lab-samples.js). They stay until she sends them.
    if (bookNurse && typeof MadaSamples !== "undefined") MadaSamples.todo(id).forEach(c => out.push({ kind: "smp", c, at: c.status === "due" ? c.nextDue : c.collectedAt, unread: true }));
    // Unopened critical and high results first, then the rest by time.
    return out.sort((a, b) => (b.kind === "crit") - (a.kind === "crit") || String(b.at).localeCompare(String(a.at)));
  }
  function markSeen(me) {
    const id = me.doctorId || me.nurseId || me.staffId; bookNurse = isNurse(me);
    try { MadaStore.setJSON(seenKey(id), [...new Set([...read(seenKey(id), []), ...bookings(id).map(o => o.id)])]); } catch (e) {}
  }
  let bellLang = "en", bellMe = null;
  function bell(me, lang) {
    const b = document.getElementById("bell"); if (!b) return;
    bellLang = lang; bellMe = me;
    if (!document.getElementById("dp-bell-css")) {
      const st = document.createElement("style"); st.id = "dp-bell-css";
      st.textContent = `#bell{position:relative}.dp-bd{position:absolute;top:2px;inset-inline-end:2px;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:#dc2626;color:#fff;font-size:11px;font-weight:700;display:grid;place-items:center;line-height:1;font-family:Inter,Tajawal,sans-serif}
.dp-pn{position:fixed;z-index:80;width:min(360px,calc(100vw - 24px));background:#fff;border:1px solid #e3e8ea;border-radius:14px;box-shadow:0 14px 40px rgba(16,35,43,.18);overflow:hidden}
.dp-pn h3{font-size:14.5px;font-weight:700;color:#15304a;padding:14px 16px 10px;border-bottom:1px solid #eef2f3}
.dp-pn .ls{max-height:min(420px,70vh);overflow-y:auto}
.dp-pn a{display:flex;gap:12px;align-items:flex-start;padding:12px 16px;text-decoration:none;color:#2c3d43;font-size:13.5px;line-height:1.45;border-bottom:1px solid #f2f5f6}
.dp-pn a:hover{background:#fbfefd}.dp-pn a.un{background:#f6fbf9}
.dp-pn .ic{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;flex:none}.dp-pn .ic svg{width:17px;height:17px}
.dp-pn .ic.book{background:#e6f3ef;color:#0b6b5c}.dp-pn .ic.res{background:#fdecec;color:#b42318}
.dp-pn a b{display:block;font-size:13.5px;color:#15304a}.dp-pn a small{display:block;color:#8a979c;font-size:12px;margin-top:2px}
.dp-pn a .dot{width:8px;height:8px;border-radius:50%;background:#dc2626;margin-top:6px;margin-inline-start:auto;flex:none}
.dp-pn .none{padding:26px 16px;text-align:center;color:#8a979c;font-size:13.5px}`;
      document.head.appendChild(st);
      document.addEventListener("click", e => {
        const pn = document.getElementById("dp-pn");
        if (e.target.closest("#bell")) {
          e.stopImmediatePropagation();
          if (pn) return pn.remove();
          openPanel(document.getElementById("bell"), notes(bellMe));
          markSeen(bellMe); bell(bellMe, bellLang);
        } else if (pn && !e.target.closest("#dp-pn")) pn.remove();
      }, true);
      window.addEventListener("storage", e => { if (!e.key || ["mada-medical", "mada-orders", "mada-critical-alerts"].includes(e.key)) bell(bellMe, bellLang); });
    }
    const n = notes(me).filter(x => x.unread).length;
    let bd = b.querySelector(".dp-bd");
    b.setAttribute("aria-label", n ? `${L[lang].nT}: ${n}` : L[lang].nT);
    if (!n) { if (bd) bd.remove(); return; }
    if (!bd) { bd = document.createElement("span"); bd.className = "dp-bd"; b.appendChild(bd); }
    bd.textContent = n > 9 ? "9+" : n;
  }
  const IC_BOOK = '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>', IC_RES = '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/>';
  function when(o) {
    const t = L[bellLang], a = o.appointment, d = new Date(a.date + "T00:00"), td = new Date(); td.setHours(0, 0, 0, 0);
    const diff = Math.round((d - td) / 864e5), loc = bellLang === "ar" ? "ar-SA-u-nu-latn-ca-gregory" : "en-GB";
    const day = diff === 0 ? t.today : diff === 1 ? t.tomorrow : d.toLocaleDateString(loc, { weekday: "short", day: "numeric", month: "short" });
    const m = a.minute || 0, tm = new Date(2000, 0, 1, Math.floor(m / 60), m % 60).toLocaleTimeString(bellLang === "ar" ? "ar-SA-u-nu-latn" : "en-US", { hour: "numeric", minute: "2-digit" });
    return `${day} · ${tm}`;
  }
  function openPanel(b, items) {
    const t = L[bellLang], nm = v => v && typeof v === "object" ? v[bellLang] || v.en : v || "";
    const pn = document.createElement("div"); pn.id = "dp-pn"; pn.className = "dp-pn"; pn.setAttribute("role", "dialog"); pn.setAttribute("aria-label", t.nT);
    const row = x => x.kind === "crit"
      ? `<a href="doctor-alerts.html?id=${encodeURIComponent(x.a.key)}" class="un"><span class="ic res">${svg('<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>')}</span><span><b>${x.a.critical ? t.nCrit : t.nHigh}</b>${esc(nm(x.a.r.patient))} · <span dir="ltr">${esc(x.a.r.mrn || "")}</span><small>${esc(x.a.rows.map(y => y.a.code + " " + y.v).join(" · "))}</small></span><i class="dot"></i></a>`
      : x.kind === "smp"
      ? `<a href="nurse-samples.html?k=${encodeURIComponent(x.c.key)}" class="un"><span class="ic ${x.c.status === "due" ? "res" : "book"}">${svg(IC_RES)}</span><span><b>${x.c.status === "due" ? t.nDue : t.nReady}</b>${esc(nm(x.c.o.patient))}<small>${esc((x.c.status === "due" ? x.c.tests.filter(y => y.due) : x.c.tests).map(y => nm(y.name)).join(bellLang === "ar" ? "، " : ", "))}</small></span><i class="dot"></i></a>`
      : x.kind === "book"
      ? `<a href="${bookNurse ? "nurse-visits.html" : "doctor-visits.html"}" class="${x.unread ? "un" : ""}"><span class="ic book">${svg(IC_BOOK)}</span><span><b>${t.nBook}</b>${esc(nm(x.o.patient))}<small>${esc(when(x.o))}</small></span>${x.unread ? '<i class="dot"></i>' : ""}</a>`
      : `<a href="doctor-orders-list.html?id=${encodeURIComponent(x.r.id)}" class="un"><span class="ic res">${svg(IC_RES)}</span><span><b>${t["nRes_" + x.it.type]}</b>${esc(nm(x.r.patient))}<small>${esc(nm(x.it.title))}</small></span><i class="dot"></i></a>`;
    const shown = items.filter(x => x.unread).slice(0, 8);
    pn.innerHTML = `<h3>${t.nT}</h3>${shown.length ? `<div class="ls">${shown.map(row).join("")}</div>` : `<p class="none">${t.nNone}</p>`}`;
    document.body.appendChild(pn);
    const rc = b.getBoundingClientRect(), rtl = document.documentElement.dir === "rtl";
    pn.style.top = rc.bottom + 8 + "px";
    const w = pn.offsetWidth, x = rtl ? rc.left : rc.right - w;
    pn.style.left = Math.max(12, Math.min(x, innerWidth - w - 12)) + "px";
  }
  function menuCss() {
    if (document.getElementById("dp-menu-css")) return;
    const st = document.createElement("style"); st.id = "dp-menu-css";
    st.textContent = `.menu .dp-sep{display:block;height:1px;background:#e9eef0;margin:8px 14px}
.menu .dp-lbl{display:block;margin:14px 14px 4px;padding-top:14px;border-top:1px solid #e9eef0;font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:#8a979c}
.menu .dp-cnt{margin-inline-start:auto;min-width:20px;height:20px;padding:0 6px;border-radius:10px;background:#dc2626;color:#fff;font-size:11px;font-weight:700;display:grid;place-items:center;line-height:1}
.menu a.dp-out{color:#b42318}[dir="rtl"] .menu a.dp-out svg{transform:scaleX(-1)}.menu a.dp-out:hover{background:#fdf1f0}
@media (max-width:900px){.menu .dp-sep,.menu .dp-lbl{flex:none;width:1px;height:24px;margin:7px 4px;padding:0;border:0;background:#e3e8ea;font-size:0;align-self:center}}`;
    document.head.appendChild(st);
    document.addEventListener("click", e => {
      if (!e.target.closest("[data-dp-logout]")) return;
      e.preventDefault(); if (typeof MadaAuth !== "undefined") MadaAuth.logout(); else location.href = e.target.closest("[data-dp-logout]").getAttribute("href");
    });
  }
  // Saudi mobile shown as 050 123 4567.
  const phone = m => /^05\d{8}$/.test(m || "") ? m.replace(/^(\d{3})(\d{3})(\d{4})$/, "$1 $2 $3") : m;
  return { render, esc, phone };
})();
