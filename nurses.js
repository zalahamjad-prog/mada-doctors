// Mada Care demo nurse schedules.
// SAMPLE DATA ONLY: invented nurses, shifts and bookings so appointment slots can be tried.
// Appointments are based on NURSE availability only (the nurse is the core of every visit).
// Replace with a call to the real scheduling API.
const MadaNurses = (() => {
  const VISIT_MINUTES = 60;   // a visit blocks the nurse for one hour
  const STEP_MINUTES = 30;    // a new slot starts every 30 minutes
  const DAY_START = 8 * 60;   // first slot 08:00
  const DAY_END = 21 * 60;    // last visit must end by 21:00

  // Shifts by weekday (0 = Sunday … 6 = Saturday), as [startHour, endHour].
  const NURSES = !MadaStore.SAMPLES ? [] : [
    { id: "N01", name: { en: "Nurse Huda Al-Otaibi", ar: "الممرضة هدى العتيبي" },
      shifts: { 0: [8, 16], 1: [8, 16], 2: [8, 16], 3: [8, 16], 4: [8, 16] } },
    { id: "N02", name: { en: "Nurse Reem Al-Shehri", ar: "الممرضة ريم الشهري" },
      shifts: { 0: [14, 21], 1: [14, 21], 2: [14, 21], 3: [14, 21], 4: [14, 21] } },
    { id: "N03", name: { en: "Nurse Maha Al-Dosari", ar: "الممرضة مها الدوسري" },
      shifts: { 5: [10, 18], 6: [10, 18], 1: [16, 21], 3: [16, 21] } }
  ];

  // Nurses added on the Staff page (role nurse, active), with the work schedule set on their profile (staff-profile.html).
  // A nurse with no schedule has no bookable slots until one is set.
  const WD = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"], hrs = v => { const [h, m] = String(v).split(":").map(Number); return h + (m || 0) / 60; };
  MadaStore.getJSON("mada-staff", []).filter(s => s.role === "nurse" && s.status === "active").forEach(s => {
    const days = (s.schedule && s.schedule.days) || {}, shifts = {};
    WD.forEach((k, i) => { const d = days[k]; if (d && d.from && d.to) { const a = hrs(d.from); let b = hrs(d.to); if (b <= a) b += 24; shifts[i] = [a, b]; } });
    NURSES.push({ id: s.id, staff: true, name: s.name, shifts });
  });

  const pad = n => String(n).padStart(2, "0");
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };

  // Deterministic sample bookings so the same date always looks the same.
  function isBooked(nurseId, date, minute) {
    // Real data: the nurse is busy when a paid booking or an internal booking (booking-schedule.html) overlaps this hour.
    if (!MadaStore.SAMPLES) {
      const hit = (m, mins) => minute < m + (mins || VISIT_MINUTES) && m < minute + VISIT_MINUTES;
      return MadaStore.getJSON("mada-orders", []).some(o => o.bookingId && o.status !== "cancelled" && o.booking && o.booking.nurseId === nurseId
          && o.appointment && o.appointment.date === date && hit(o.appointment.minute))
        || MadaStore.getJSON("mada-internal-bookings", []).some(b => b.status !== "cancelled" && b.nurseId === nurseId && b.date === date && hit(b.minute, b.mins));
    }
    let h = 7;
    for (const c of nurseId + date + minute) h = (h * 31 + c.charCodeAt(0)) % 1000003;
    return h % 100 < 42;
  }

  function onShift(nurse, weekday, minute) {
    const s = nurse.shifts[weekday];
    return !!s && minute >= s[0] * 60 && minute + VISIT_MINUTES <= s[1] * 60;
  }

  // Slots for one date: status is "available", "full" (nurses on shift but all booked)
  // or "unavailable" (no nurse on shift). Past times are left out.
  function slotsFor(date, now = new Date()) {
    const d = parse(date), weekday = d.getDay(), isToday = date === ymd(now);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const out = [];
    for (let m = DAY_START; m + VISIT_MINUTES <= DAY_END; m += STEP_MINUTES) {
      if (isToday && m <= nowMin) continue;
      const working = NURSES.filter(n => onShift(n, weekday, m));
      const free = working.filter(n => !isBooked(n.id, date, m));
      out.push({
        minute: m,
        status: !working.length ? "unavailable" : free.length ? "available" : "full",
        nurses: free
      });
    }
    return out;
  }

  function hasAvailability(date, now = new Date()) {
    return slotsFor(date, now).some(s => s.status === "available");
  }

  function earliest(now = new Date(), maxDays = 60) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    for (let i = 0; i < maxDays; i++, d.setDate(d.getDate() + 1)) {
      const date = ymd(d);
      const slot = slotsFor(date, now).find(s => s.status === "available");
      if (slot) return { date, minute: slot.minute, nurses: slot.nurses };
    }
    return null;
  }

  return { NURSES, slotsFor, hasAvailability, earliest, ymd, parse, VISIT_MINUTES };
})();
