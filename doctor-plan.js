// Treatment Plan (doctor visit step after Diagnosis), two pages: "Goals & Plan" then "Medications". Saved in order.doctorVisit.steps.plan:
//   { goals: [{ id, text }], details (limited HTML from the editor), followUp, meds: [{ id, name, generic: { en, ar }, cls: { en, ar }, atc, form, strength, route, doseN, doseU, freq, durN, durU, instr,
//              qty, timing: [], prn, prnFor, allergy }], none, at, by }
// "Save as Draft" keeps the same shape in doctorVisit.planDraft. To continue: the plan details, at least one goal, and at least one medicine or "No medications".
// A medicine that matches a recorded allergy (Allergy History or Medication History) shows a warning; it does not block.
const DrPlan = (() => {
  // SAMPLE formulary. TODO: replace with the SFDA drug list / formulary search; check strengths and ATC codes before go-live.
  // { id, brand, en, ar, cls, atc, allergy: allergy ids it belongs to, forms: [[form, strengths, route]] }
  const C = {
    analgesic: ["Analgesic / Antipyretic", "مسكن وخافض حرارة"], nsaid: ["NSAID", "مضاد التهاب غير ستيرويدي"], pen: ["Antibiotic (Penicillin)", "مضاد حيوي (بنسلين)"],
    macro: ["Antibiotic (Macrolide)", "مضاد حيوي (ماكروليد)"], ceph: ["Antibiotic (Cephalosporin)", "مضاد حيوي (سيفالوسبورين)"], quin: ["Antibiotic (Quinolone)", "مضاد حيوي (كينولون)"],
    nitro: ["Antibiotic (Nitroimidazole)", "مضاد حيوي (نيتروإيميدازول)"], ppi: ["Proton pump inhibitor", "مثبط مضخة البروتون"], antihist: ["Antihistamine", "مضاد هيستامين"],
    broncho: ["Bronchodilator", "موسع شعب هوائية"], diab: ["Antidiabetic", "خافض سكر"], ccb: ["Antihypertensive (Calcium channel blocker)", "خافض ضغط (حاصر قنوات الكالسيوم)"],
    antiem: ["Antiemetic", "مضاد غثيان"], spasm: ["Antispasmodic", "مضاد تقلصات"], steroid: ["Corticosteroid", "كورتيزون"], ors: ["Oral rehydration", "محلول تعويض السوائل"],
    topab: ["Topical antibiotic", "مضاد حيوي موضعي"]
  };
  const DRUGS = [
    { id: "paracetamol", brand: "Panadol, Adol", en: "Paracetamol", ar: "باراسيتامول", cls: "analgesic", atc: "N02BE01", forms: [["tablet", ["500 mg", "1 g"], "oral"], ["syrup", ["120 mg/5 mL", "250 mg/5 mL"], "oral"], ["supp", ["125 mg", "250 mg"], "rectal"]] },
    { id: "ibuprofen", brand: "Brufen", en: "Ibuprofen", ar: "إيبوبروفين", cls: "nsaid", atc: "M01AE01", allergy: ["ibuprofen", "aspirin"], forms: [["tablet", ["200 mg", "400 mg", "600 mg"], "oral"], ["syrup", ["100 mg/5 mL"], "oral"]] },
    { id: "diclofenac", brand: "Voltaren", en: "Diclofenac", ar: "ديكلوفيناك", cls: "nsaid", atc: "M01AB05", allergy: ["diclofenac", "aspirin", "ibuprofen"], forms: [["tablet", ["50 mg", "75 mg"], "oral"], ["gel", ["1%"], "topical"]] },
    { id: "amoxicillin", brand: "Amoxil", en: "Amoxicillin", ar: "أموكسيسيلين", cls: "pen", atc: "J01CA04", allergy: ["penicillin", "amoxicillin"], forms: [["capsule", ["250 mg", "500 mg"], "oral"], ["susp", ["125 mg/5 mL", "250 mg/5 mL"], "oral"]] },
    { id: "coamox", brand: "Augmentin", en: "Amoxicillin + Clavulanic acid", ar: "أموكسيسيلين مع حمض الكلافولانيك", cls: "pen", atc: "J01CR02", allergy: ["penicillin", "amoxicillin"], forms: [["tablet", ["625 mg", "1 g"], "oral"], ["susp", ["228 mg/5 mL", "457 mg/5 mL"], "oral"]] },
    { id: "azithromycin", brand: "Zithromax", en: "Azithromycin", ar: "أزيثرومايسين", cls: "macro", atc: "J01FA10", forms: [["tablet", ["250 mg", "500 mg"], "oral"], ["susp", ["200 mg/5 mL"], "oral"]] },
    { id: "cefuroxime", brand: "Zinnat", en: "Cefuroxime", ar: "سيفوروكسيم", cls: "ceph", atc: "J01DC02", allergy: ["cephalosporins"], forms: [["tablet", ["250 mg", "500 mg"], "oral"]] },
    { id: "ciprofloxacin", brand: "Ciprobay", en: "Ciprofloxacin", ar: "سيبروفلوكساسين", cls: "quin", atc: "J01MA02", allergy: ["ciprofloxacin"], forms: [["tablet", ["250 mg", "500 mg"], "oral"]] },
    { id: "metronidazole", brand: "Flagyl", en: "Metronidazole", ar: "ميترونيدازول", cls: "nitro", atc: "P01AB01", allergy: ["metronidazole"], forms: [["tablet", ["250 mg", "500 mg"], "oral"]] },
    { id: "omeprazole", brand: "Losec", en: "Omeprazole", ar: "أوميبرازول", cls: "ppi", atc: "A02BC01", forms: [["capsule", ["20 mg", "40 mg"], "oral"]] },
    { id: "cetirizine", brand: "Zyrtec", en: "Cetirizine", ar: "سيتريزين", cls: "antihist", atc: "R06AE07", forms: [["tablet", ["10 mg"], "oral"], ["syrup", ["5 mg/5 mL"], "oral"]] },
    { id: "loratadine", brand: "Claritine", en: "Loratadine", ar: "لوراتادين", cls: "antihist", atc: "R06AX13", forms: [["tablet", ["10 mg"], "oral"]] },
    { id: "salbutamol", brand: "Ventolin", en: "Salbutamol", ar: "سالبيوتامول", cls: "broncho", atc: "R03AC02", forms: [["inhaler", ["100 mcg/dose"], "inhal"], ["neb", ["5 mg/mL"], "inhal"]] },
    { id: "metformin", brand: "Glucophage", en: "Metformin", ar: "ميتفورمين", cls: "diab", atc: "A10BA02", forms: [["tablet", ["500 mg", "850 mg", "1000 mg"], "oral"]] },
    { id: "amlodipine", brand: "Norvasc", en: "Amlodipine", ar: "أملوديبين", cls: "ccb", atc: "C08CA01", forms: [["tablet", ["5 mg", "10 mg"], "oral"]] },
    { id: "ondansetron", brand: "Zofran", en: "Ondansetron", ar: "أوندانسيترون", cls: "antiem", atc: "A04AA01", forms: [["tablet", ["4 mg", "8 mg"], "oral"]] },
    { id: "domperidone", brand: "Motilium", en: "Domperidone", ar: "دومبيريدون", cls: "antiem", atc: "A03FA03", forms: [["tablet", ["10 mg"], "oral"]] },
    { id: "hyoscine", brand: "Buscopan", en: "Hyoscine butylbromide", ar: "هيوسين بيوتيل بروميد", cls: "spasm", atc: "A03BB01", forms: [["tablet", ["10 mg"], "oral"]] },
    { id: "prednisolone", brand: "", en: "Prednisolone", ar: "بريدنيزولون", cls: "steroid", atc: "H02AB06", forms: [["tablet", ["5 mg"], "oral"]] },
    { id: "ors", brand: "", en: "Oral rehydration salts", ar: "أملاح الإرواء الفموي", cls: "ors", atc: "A07CA", forms: [["sachet", ["1 sachet"], "oral"]] },
    { id: "fusidic", brand: "Fucidin", en: "Fusidic acid", ar: "حمض الفوسيديك", cls: "topab", atc: "D06AX01", forms: [["cream", ["2%"], "topical"]] }
  ];
  const QUICK = ["paracetamol", "ibuprofen", "amoxicillin", "azithromycin", "omeprazole", "cetirizine", "salbutamol"];
  const UNIT = { tablet: "tab", capsule: "cap", syrup: "ml", susp: "ml", supp: "supp", gel: "app", cream: "app", inhaler: "puff", neb: "ml", sachet: "sachet" };
  const ROUTES = ["oral", "inhal", "topical", "rectal", "iv", "im", "sc", "subl", "eye", "ear", "nasal"];
  const FREQS = ["od", "bid", "tid", "q6h", "q4h", "hs", "prn", "stat"];
  const TIMING = ["beforeFood", "afterFood", "withFood", "morning", "bedtime"];
  // Common treatment goals: the first five are the quick buttons. [id, en, ar]
  const GOALS = [
    ["relief", "Relieve symptoms (e.g., pain, fever, cough)", "تخفيف الأعراض (مثل الألم، الحرارة، الكحة)"], ["cause", "Treat the underlying cause", "علاج السبب الأساسي"],
    ["prevent", "Prevent complications", "الوقاية من المضاعفات"], ["function", "Improve function", "تحسين الوظيفة والحركة"], ["recovery", "Support recovery", "دعم التعافي"],
    ["pain", "Control pain", "السيطرة على الألم"], ["bp", "Control blood pressure", "ضبط ضغط الدم"], ["sugar", "Control blood sugar", "ضبط سكر الدم"],
    ["hydration", "Maintain hydration", "الحفاظ على السوائل في الجسم"], ["breathing", "Improve breathing", "تحسين التنفس"], ["wound", "Promote wound healing", "تسريع التئام الجرح"],
    ["spread", "Prevent infection spread", "منع انتشار العدوى"], ["sleep", "Improve sleep", "تحسين النوم"], ["mobility", "Maintain mobility and prevent falls", "الحفاظ على الحركة والوقاية من السقوط"],
    ["educate", "Educate patient and family", "توعية المريض والأسرة"]
  ];
  const QGOALS = ["relief", "cause", "prevent", "function", "recovery"];
  const QSHORT = { relief: ["Symptom relief", "تخفيف الأعراض"], cause: ["Treat underlying cause", "علاج السبب"], prevent: ["Prevent complications", "الوقاية من المضاعفات"], function: ["Improve function", "تحسين الوظيفة"], recovery: ["Support recovery", "دعم التعافي"] };
  const I = {
    rx: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 12h6M9 16h4"/>', search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
    pill: '<rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-45 12 12)"/><path d="m9.5 9.5 5 5"/>', swap: '<path d="M4 8h14l-3-3M20 16H6l3 3"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
    plus: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>', pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>', trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    warn: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>', down: '<path d="m6 9 6 6 6-6"/>', back: '<path d="M19 12H5M11 6l-6 6 6 6"/>', arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    grip: '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
    clip: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3"/>', link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    ul: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>', ol: '<path d="M10 6h10M10 12h10M10 18h10M4 5l1.5-1V9M3.5 13.5a1.5 1.5 0 0 1 3 0c0 1-3 2-3 3.5h3"/>',
    doc: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>', check: '<path d="m5 12 5 5 9-10"/>'
  };
  const L = {
    en: {
      title: "Treatment Plan", sub: "Prescribe medications for this visit.", subGoals: "Define the treatment goals and plan for this visit.", tabGoals: "Goals & Plan", tabMeds: "Medications",
      g1: "Treatment Goals", g1s: "Add one or more treatment goals for this patient.", goalPh: "Select a common goal or type your own...", addGoal: "Add \"{q}\" as a goal", selGoals: "Selected Goals", nAdded: "{n} added",
      noGoals: "No goals added yet.", goalDup: "This goal is already added.", dragGoal: "Drag to reorder", removeGoal: "Remove goal",
      g2: "Treatment Plan Details", g2s: "Provide an overall treatment plan and key instructions. You can include general management, patient advice, and next steps.", optTag: "Optional",
      detailsPh: "Write the treatment plan here...", bold: "Bold", italic: "Italic", bullets: "Bulleted list", numbers: "Numbered list", linkB: "Link", linkAsk: "Link address (https://...)", linkBad: "Enter a link that starts with https://", maxChars: "Maximum {n} characters.",
      g3: "Follow-up Plan", g3s: "Add follow-up instructions (e.g., review results, assess response).", fuPh: "Write follow-up instructions here...",
      nextMeds: "Next: Medications", needGoal: "Add at least one treatment goal.", needDetails: "Write the treatment plan details.", stepOf: "Step {n} of {m}",
      s1: "Search Medication", s1s: "Search by brand name, generic name or classification.", searchPh: "Search medication (e.g. Paracetamol, Amoxicillin, Augmentin...)", quick: "Quick Suggestions",
      noMatch: "No match in the list.", otherGoal: "Other", otherGoalPh: "Write another treatment goal ...", addOther: "Add goal", otherGoalReq: "Write the goal first.", otherMed: "Other (write the name)", cancel: "Cancel", freeText: "Add \"{q}\" manually", clear: "Clear search",
      s2: "Medication Details", s2s: "Review and adjust the details.", pickFirst: "Search or pick a quick suggestion to start.",
      generic: "Generic", cls: "Class", change: "Change", form: "Form", strength: "Strength", route: "Route", dose: "Dose", freq: "Frequency", duration: "Duration",
      instr: "Instructions to Patient", instrPh: "e.g. Take after food. Complete the full course.", optional: "(Optional)",
      adv: "Advanced Options", advS: "Quantity to dispense, specific timing, PRN, special instructions", qty: "Quantity to dispense", qtyPh: "e.g. 15", timing: "Timing",
      prnL: "As needed (PRN)", prnCk: "Give only when needed", prnFor: "Use for", prnForPh: "e.g. pain or fever above 38°C",
      addPlan: "Add to Treatment Plan", update: "Update Medication", cancelEdit: "Cancel edit", added: "{n} added.", updated: "{n} updated.", fillReq: "Fill in the required fields.", nameReq: "Enter the medicine name.",
      allergyWarn: "Allergy alert: the patient has a recorded allergy to {a}. Check before prescribing.",
      s3: "Prescribed Medications for This Visit", s3s: "Review, edit or remove medications.", none: "No medications prescribed for this visit", empty: "No medications added yet.",
      th_med: "Medication", th_dose: "Dose", th_route: "Route", th_freq: "Frequency", th_dur: "Duration", th_instr: "Instructions", edit: "Edit", remove: "Remove",
      f_tablet: "Tablet", f_capsule: "Capsule", f_syrup: "Syrup", f_susp: "Suspension", f_supp: "Suppository", f_gel: "Gel", f_cream: "Cream", f_inhaler: "Inhaler", f_neb: "Nebuliser solution", f_sachet: "Sachet", f_other: "Other",
      u_tab: "Tablet(s)", u_cap: "Capsule(s)", u_ml: "mL", u_supp: "Suppository", u_app: "Application", u_puff: "Puff(s)", u_sachet: "Sachet(s)",
      us_tab: "tablet", us_cap: "cap", us_ml: "mL", us_supp: "supp", us_app: "application", us_puff: "puff", us_sachet: "sachet",
      r_oral: "Oral", r_inhal: "Inhalation", r_topical: "Topical", r_rectal: "Rectal", r_iv: "IV", r_im: "IM", r_sc: "Subcutaneous", r_subl: "Sublingual", r_eye: "Eye", r_ear: "Ear", r_nasal: "Nasal",
      q_od: "Once daily (OD)", q_bid: "Twice daily (BID)", q_tid: "Every 8 hours (TID)", q_q6h: "Every 6 hours (QID)", q_q4h: "Every 4 hours", q_hs: "At bedtime", q_prn: "As needed (PRN)", q_stat: "Once only (STAT)",
      qs_od: "Once daily", qs_bid: "Twice daily", qs_tid: "TID", qs_q6h: "Every 6 hours", qs_q4h: "Every 4 hours", qs_hs: "At bedtime", qs_prn: "As needed", qs_stat: "Once",
      d_days: "Days", d_weeks: "Weeks", d_months: "Months", ds_days: "days", ds_weeks: "weeks", ds_months: "months", ongoing: "Ongoing",
      t_beforeFood: "Before food", t_afterFood: "After food", t_withFood: "With food", t_morning: "Morning", t_bedtime: "Bedtime",
      prev: "Previous", draft: "Save as Draft", saveCont: "Save & Continue", draftSaved: "Treatment plan saved as draft.", saved: "Treatment plan saved.",
      needMed: "Add at least one medication, or tick \"No medications\".", pendingMed: "Add or clear the medication you are editing first.", savedInfo: "Treatment plan saved at {t}. You can still update it."
    },
    ar: {
      title: "الخطة العلاجية", sub: "اكتب الأدوية لهذه الزيارة.", subGoals: "حدد أهداف العلاج والخطة لهذه الزيارة.", tabGoals: "الأهداف والخطة", tabMeds: "الأدوية",
      g1: "أهداف العلاج", g1s: "أضف هدف أو أكثر لعلاج المريض.", goalPh: "اختر هدف شائع أو اكتب هدفك...", addGoal: "إضافة \"{q}\" كهدف", selGoals: "الأهداف المختارة", nAdded: "{n} مضافة",
      noGoals: "ما أضيف هدف للحين.", goalDup: "الهدف مضاف من قبل.", dragGoal: "اسحب لتغيير الترتيب", removeGoal: "حذف الهدف",
      g2: "تفاصيل الخطة العلاجية", g2s: "اكتب الخطة العلاجية العامة والتعليمات المهمة، مثل التدبير العام ونصائح المريض والخطوات الجاية.", optTag: "اختياري",
      detailsPh: "اكتب الخطة العلاجية هنا...", bold: "عريض", italic: "مائل", bullets: "قائمة نقطية", numbers: "قائمة مرقمة", linkB: "رابط", linkAsk: "عنوان الرابط (https://...)", linkBad: "اكتب رابط يبدأ بـ https://", maxChars: "الحد الأقصى {n} حرف.",
      g3: "خطة المتابعة", g3s: "أضف تعليمات المتابعة (مثل مراجعة النتائج، تقييم الاستجابة).", fuPh: "اكتب تعليمات المتابعة هنا...",
      nextMeds: "التالي: الأدوية", needGoal: "أضف هدف علاجي واحد على الأقل.", needDetails: "اكتب تفاصيل الخطة العلاجية.", stepOf: "الخطوة {n} من {m}",
      s1: "البحث عن دواء", s1s: "ابحث بالاسم التجاري أو العلمي أو التصنيف.", searchPh: "ابحث عن دواء (مثال: باراسيتامول، أموكسيسيلين، أوجمنتين...)", quick: "اقتراحات سريعة",
      noMatch: "ما فيه دواء مطابق في القائمة.", otherGoal: "أخرى", otherGoalPh: "اكتب هدف علاجي آخر ...", addOther: "إضافة الهدف", otherGoalReq: "اكتب الهدف أول.", otherMed: "أخرى (اكتب اسم الدواء)", cancel: "إلغاء", freeText: "إضافة \"{q}\" يدوياً", clear: "مسح البحث",
      s2: "تفاصيل الدواء", s2s: "راجع التفاصيل وعدّلها.", pickFirst: "ابحث أو اختر من الاقتراحات عشان تبدأ.",
      generic: "الاسم العلمي", cls: "التصنيف", change: "تغيير", form: "الشكل", strength: "التركيز", route: "طريقة الإعطاء", dose: "الجرعة", freq: "التكرار", duration: "المدة",
      instr: "تعليمات للمريض", instrPh: "مثال: بعد الأكل. كمّل الكورس كامل.", optional: "(اختياري)",
      adv: "خيارات متقدمة", advS: "الكمية المصروفة، التوقيت، عند الحاجة، تعليمات خاصة", qty: "الكمية المصروفة", qtyPh: "مثال: 15", timing: "التوقيت",
      prnL: "عند الحاجة (PRN)", prnCk: "يعطى عند الحاجة فقط", prnFor: "يستخدم لـ", prnForPh: "مثال: ألم أو حرارة فوق 38",
      addPlan: "إضافة للخطة العلاجية", update: "تحديث الدواء", cancelEdit: "إلغاء التعديل", added: "تمت إضافة {n}.", updated: "تم تحديث {n}.", fillReq: "عبّ الحقول المطلوبة.", nameReq: "اكتب اسم الدواء.",
      allergyWarn: "تنبيه حساسية: المريض عنده حساسية مسجلة من {a}. تأكد قبل الوصف.",
      s3: "الأدوية الموصوفة لهذه الزيارة", s3s: "راجع الأدوية أو عدّلها أو احذفها.", none: "ما فيه أدوية لهذه الزيارة", empty: "ما أضيف دواء للحين.",
      th_med: "الدواء", th_dose: "الجرعة", th_route: "الطريقة", th_freq: "التكرار", th_dur: "المدة", th_instr: "التعليمات", edit: "تعديل", remove: "حذف",
      f_tablet: "حبوب", f_capsule: "كبسولات", f_syrup: "شراب", f_susp: "معلق", f_supp: "تحاميل", f_gel: "جل", f_cream: "كريم", f_inhaler: "بخاخ", f_neb: "محلول تبخير", f_sachet: "أكياس", f_other: "أخرى",
      u_tab: "حبة", u_cap: "كبسولة", u_ml: "مل", u_supp: "تحميلة", u_app: "دهان", u_puff: "بخة", u_sachet: "كيس",
      us_tab: "حبة", us_cap: "كبسولة", us_ml: "مل", us_supp: "تحميلة", us_app: "دهان", us_puff: "بخة", us_sachet: "كيس",
      r_oral: "بالفم", r_inhal: "استنشاق", r_topical: "موضعي", r_rectal: "شرجي", r_iv: "وريدي", r_im: "عضلي", r_sc: "تحت الجلد", r_subl: "تحت اللسان", r_eye: "للعين", r_ear: "للأذن", r_nasal: "للأنف",
      q_od: "مرة يومياً (OD)", q_bid: "مرتين يومياً (BID)", q_tid: "كل 8 ساعات (TID)", q_q6h: "كل 6 ساعات (QID)", q_q4h: "كل 4 ساعات", q_hs: "قبل النوم", q_prn: "عند الحاجة (PRN)", q_stat: "مرة وحدة (STAT)",
      qs_od: "مرة يومياً", qs_bid: "مرتين يومياً", qs_tid: "3 مرات", qs_q6h: "كل 6 ساعات", qs_q4h: "كل 4 ساعات", qs_hs: "قبل النوم", qs_prn: "عند الحاجة", qs_stat: "مرة وحدة",
      d_days: "أيام", d_weeks: "أسابيع", d_months: "شهور", ds_days: "أيام", ds_weeks: "أسابيع", ds_months: "شهور", ongoing: "مستمر",
      t_beforeFood: "قبل الأكل", t_afterFood: "بعد الأكل", t_withFood: "مع الأكل", t_morning: "الصباح", t_bedtime: "قبل النوم",
      prev: "السابق", draft: "حفظ كمسودة", saveCont: "حفظ ومتابعة", draftSaved: "تم حفظ الخطة العلاجية كمسودة.", saved: "تم حفظ الخطة العلاجية.",
      needMed: "أضف دواء واحد على الأقل، أو اختر \"ما فيه أدوية\".", pendingMed: "أضف الدواء اللي تعدله أو امسحه أول.", savedInfo: "تم حفظ الخطة العلاجية {t}. تقدر تعدلها."
    }
  };

  let draft = null, forId = null, lang = "en", ctx = null, q = "", page = "goals", gq = "", gOpen = false, gOther = false, gOt = "", cur = null, editIx = -1, adv = false, tried = false, dTried = false, allergies = [];
  const t = () => L[lang];
  const tx = (k, v) => t()[k].replace(/\{(\w+)\}/g, (_, n) => v[n]);
  const S = (p, w) => ctx.svg(p, w), E = s => ctx.esc(s);
  const reset = () => { draft = null; forId = null; q = ""; page = "goals"; gq = ""; gOpen = false; gOther = false; gOt = ""; cur = null; editIx = -1; adv = false; tried = false; dTried = false; };
  const drug = id => DRUGS.find(d => d.id === id);
  const lbl = (pre, v) => v ? t()[pre + v] || v : "";

  // Recorded allergies for the safety check: ids from Allergy History, plus free names from both allergy lists.
  function readAllergies(o) {
    const dv = o.doctorVisit || {}, st = dv.steps || {}, out = [];
    const al = dv.allergyDraft || st.allergy;
    if (al && al.status === "yes") al.items.forEach(i => out.push({ id: i.id, name: (typeof DrAllergy !== "undefined" && DrAllergy.nameIn ? DrAllergy.nameIn(i, lang) : i.en) || i.id }));
    const meds = (dv.history || {}).meds;
    if (meds && meds.allergies) meds.allergies.forEach(a => a.drug && out.push({ id: "", name: a.drug }));
    return out;
  }
  function allergyHit(m) {
    const d = drug(m.drugId), names = [m.name, d && d.en, d && d.ar].filter(Boolean).map(s => s.toLowerCase());
    const hit = allergies.find(a => (d && d.allergy && d.allergy.includes(a.id)) || (a.name && names.some(n => n.includes(String(a.name).toLowerCase()) || String(a.name).toLowerCase().includes(n))));
    return hit ? hit.name : "";
  }
  function load(o) {
    if (draft && forId === o.id) return;
    const dv = o.doctorVisit || {}, src = dv.planDraft || (dv.steps && dv.steps.plan);
    const blank = { goals: [], details: "", followUp: "", meds: [], none: false };
    draft = JSON.parse(JSON.stringify({ ...blank, ...(src || {}) }));
    forId = o.id;
  }
  function fromDrug(d) {
    const [form, strengths, route] = d.forms[0];
    return { drugId: d.id, name: d.en, generic: { en: d.en, ar: d.ar }, cls: { en: C[d.cls][0], ar: C[d.cls][1] }, atc: d.atc, form, strength: strengths[0], route,
      doseN: "1", doseU: UNIT[form], freq: "", durN: "", durU: "days", instr: "", qty: "", timing: [], prn: false, prnFor: "" };
  }
  const blankManual = name => ({ drugId: "", name, generic: { en: name, ar: name }, cls: null, atc: "", form: "tablet", strength: "", route: "oral", doseN: "1", doseU: "tab", freq: "", durN: "", durU: "days", instr: "", qty: "", timing: [], prn: false, prnFor: "" });
  const medName = m => { const d = drug(m.drugId); return `${d ? d[lang] : m.name}${m.strength ? " " + m.strength : ""}`; };
  const doseText = m => `${m.doseN} ${t()["us_" + m.doseU] || m.doseU}`;
  const durText = m => m.durU === "ongoing" ? t().ongoing : m.durN ? `${m.durN} ${t()["ds_" + m.durU]}` : "—";

  function results() {
    const s = q.trim().toLowerCase();
    if (!s) return "";
    const list = DRUGS.filter(d => [d.en, d.ar, d.brand, C[d.cls][0], C[d.cls][1]].some(v => v && v.toLowerCase().includes(s))).slice(0, 8);
    return `<div class="dx-drop" role="listbox" id="medDrop">${list.map(d => `<button type="button" class="dx-opt" data-drug="${d.id}"><span class="pl-pic">${S(I.pill)}</span>
        <span class="dx-t"><b>${E(d[lang])}${d.brand ? ` <span class="pl-brand">(${E(d.brand)})</span>` : ""}</b><small>${E(C[d.cls][lang === "ar" ? 1 : 0])} | ATC: ${d.atc}</small></span></button>`).join("")
      || `<p class="dx-none">${t().noMatch}</p>`}
      <button type="button" class="dx-opt free" id="medManual"><span class="dx-code">${S(I.plus, 2)}</span><span class="dx-t"><b>${E(tx("freeText", { q: q.trim() }))}</b></span></button></div>`;
  }
  const sel = (key, opts, val, pre, req) => `<select class="hx-in pl-sel ${req && tried && !val ? "bad" : ""}" data-f="${key}">${req && !val ? `<option value="">—</option>` : ""}${opts.map(v => `<option value="${E(v)}" ${v === val ? "selected" : ""}>${E(pre ? lbl(pre, v) : v)}</option>`).join("")}</select>`;
  function details() {
    if (!cur) return `<p class="hx-empty pl-pick">${t().pickFirst}</p>`;
    const d = drug(cur.drugId), forms = d ? d.forms.map(f => f[0]) : Object.keys(UNIT), fm = d && d.forms.find(f => f[0] === cur.form), strengths = fm ? fm[1] : null;
    const warn = allergyHit(cur);
    const field = (label, body, req) => `<div class="pl-f"><label>${label}${req ? ' <span class="req">*</span>' : ""}</label>${body}</div>`;
    return `<div class="pl-card">
      <span class="pl-cic">${S(I.pill)}</span>
      <div class="pl-ct">${d ? `<b>${E(medName(cur))} ${E(lbl("f_", cur.form))}</b><small>${t().generic}: ${E(cur.generic[lang])} <i>|</i> ${t().cls}: ${E(cur.cls[lang])} <i>|</i> ATC: <span dir="ltr">${cur.atc}</span></small>`
        : `<input class="hx-in ${tried && !cur.name.trim() ? "bad" : ""}" data-f="name" value="${E(cur.name)}" placeholder="${E(t().nameReq)}">`}</div>
      <button type="button" class="pl-chg" id="medChange">${S(I.swap)}${t().change}</button></div>
      ${warn ? `<div class="pl-warn">${S(I.warn, 2)}<span>${E(tx("allergyWarn", { a: warn }))}</span></div>` : ""}
      <div class="pl-grid">
        ${field(t().form, sel("form", forms, cur.form, "f_", true), true)}
        ${field(t().strength, strengths ? sel("strength", strengths, cur.strength, "", true) : `<input class="hx-in ${tried && !cur.strength.trim() ? "bad" : ""}" data-f="strength" value="${E(cur.strength)}" placeholder="500 mg" dir="ltr">`, true)}
        ${field(t().route, sel("route", ROUTES, cur.route, "r_", true), true)}
        ${field(t().dose, `<div class="pl-pair"><input class="hx-in ${tried && !cur.doseN ? "bad" : ""}" data-f="doseN" value="${E(cur.doseN)}" inputmode="decimal" maxlength="5" dir="ltr">${sel("doseU", Object.values(UNIT).filter((v, i, a) => a.indexOf(v) === i), cur.doseU, "u_")}</div>`, true)}
        ${field(t().freq, sel("freq", FREQS, cur.freq, "q_", true), true)}
        ${field(t().duration, `<div class="pl-pair">${cur.durU === "ongoing" ? `<span class="hx-in pl-dis">—</span>` : `<input class="hx-in ${tried && !cur.durN ? "bad" : ""}" data-f="durN" value="${E(cur.durN)}" inputmode="numeric" maxlength="3" dir="ltr">`}${sel("durU", ["days", "weeks", "months", "ongoing"], cur.durU, "")
          .replace(/>(days|weeks|months|ongoing)</g, (_, v) => `>${v === "ongoing" ? t().ongoing : t()["d_" + v]}<`)}</div>`, true)}
      </div>
      <div class="pl-f"><label>${t().instr} <span class="hx-opt">${t().optional}</span></label>
        <div class="hx-area"><textarea data-f="instr" rows="3" maxlength="500" placeholder="${E(t().instrPh)}">${E(cur.instr)}</textarea><div class="hx-count"><span id="instrN">${cur.instr.length}</span>/500</div></div></div>
      <div class="pl-adv ${adv ? "open" : ""}">
        <div class="pl-advh"><button type="button" class="pl-advt" id="advToggle" aria-expanded="${adv}">${S(I.gear)}<span><b>${t().adv} <span class="hx-opt">${t().optional}</span></b><small>${t().advS}</small></span>${S(I.down)}</button>
          <span class="pl-acts">${editIx >= 0 ? `<button type="button" class="hx-btn out sm" id="medCancel">${t().cancelEdit}</button>` : ""}<button type="button" class="pl-addbtn" id="medAdd">${S(I.plus)}${editIx >= 0 ? t().update : t().addPlan}</button></span></div>
        ${adv ? `<div class="pl-advb">
          <div class="pl-grid two">${field(t().qty, `<input class="hx-in" data-f="qty" value="${E(cur.qty)}" placeholder="${E(t().qtyPh)}" inputmode="numeric" maxlength="4" dir="ltr">`)}
            ${field(t().prnL, `<label class="hx-ck"><input type="checkbox" data-f="prn" ${cur.prn ? "checked" : ""}><span>${t().prnCk}</span></label>${cur.prn ? `<input class="hx-in pl-prn" data-f="prnFor" value="${E(cur.prnFor)}" placeholder="${E(t().prnForPh)}" maxlength="120">` : ""}`)}</div>
          ${field(t().timing, `<div class="hx-chips">${TIMING.map(v => `<button type="button" class="hx-chip ${cur.timing.includes(v) ? "on" : ""}" data-tm="${v}" aria-pressed="${cur.timing.includes(v)}">${t()["t_" + v]}</button>`).join("")}</div>`)}</div>` : ""}
      </div>`;
  }
  function table() {
    if (!draft.meds.length) return `<p class="hx-empty">${t().empty}</p>`;
    return `<div class="pl-tw"><table class="pl-tbl"><thead><tr><th>#</th><th>${t().th_med}</th><th>${t().th_dose}</th><th>${t().th_route}</th><th>${t().th_freq}</th><th>${t().th_dur}</th><th>${t().th_instr}</th><th></th></tr></thead>
      <tbody>${draft.meds.map((m, i) => `<tr class="${i === editIx ? "editing" : ""}"><td data-l="#">${i + 1}</td>
        <td data-l="${t().th_med}"><b>${E(medName(m))}</b><small>${E(lbl("f_", m.form))}</small>${m.allergy ? `<span class="pl-alg">${S(I.warn, 2)}${E(m.allergy)}</span>` : ""}</td>
        <td data-l="${t().th_dose}">${E(doseText(m))}</td><td data-l="${t().th_route}">${E(lbl("r_", m.route))}</td>
        <td data-l="${t().th_freq}">${E(lbl("qs_", m.freq))}${m.prn && m.freq !== "prn" ? ` · ${t().qs_prn}` : ""}</td><td data-l="${t().th_dur}">${E(durText(m))}</td>
        <td data-l="${t().th_instr}">${E([m.timing.map(v => t()["t_" + v]).join("، "), m.instr].filter(Boolean).join(" · ") || "—")}</td>
        <td class="pl-ra"><button type="button" class="pl-ib" data-edit="${i}" aria-label="${t().edit}">${S(I.pen)}</button><button type="button" class="pl-ib del" data-del="${i}" aria-label="${t().remove}">${S(I.trash)}</button></td></tr>`).join("")}</tbody></table></div>`;
  }

  // Header with the two pages of this step.
  const head = (c, on, sub) => `<div class="ex-top"><span class="ex-tic">${S(on === "goals" ? I.clip : I.rx)}</span><div><h1>${t().title}</h1><p>${sub}</p></div><span class="ex-stp">${tx("stepOf", c.stepOf)}</span></div>
    <div class="pl-tabs" role="tablist">${[["goals", t().tabGoals], ["meds", t().tabMeds]].map(([k, v], i) => `<button type="button" role="tab" class="pl-tab ${on === k ? "on" : ""}" data-page="${k}" aria-selected="${on === k}"><span>${i + 1}</span>${v}</button>`).join("")}</div>`;

  // Rich text from the plan editor: only bold, italic, lists, line breaks and https links are kept.
  const KEEP = { B: "b", STRONG: "b", I: "i", EM: "i", UL: "ul", OL: "ol", LI: "li", BR: "br", DIV: "div", P: "div", A: "a" };
  function sanitize(html) {
    const src = document.createElement("template"); src.innerHTML = html;
    const walk = (from, to) => from.childNodes.forEach(n => {
      if (n.nodeType === 3) return to.appendChild(document.createTextNode(n.textContent));
      if (n.nodeType !== 1) return;
      const tag = KEEP[n.tagName];
      if (!tag) return walk(n, to);
      const el = document.createElement(tag);
      if (tag === "a") { const h = n.getAttribute("href") || ""; if (!/^https?:\/\//i.test(h)) return walk(n, to); el.href = h; el.target = "_blank"; el.rel = "noopener"; }
      to.appendChild(el); walk(n, el);
    });
    const out = document.createElement("div"); walk(src.content, out); return out.innerHTML;
  }
  const textOf = h => { const d = document.createElement("div"); d.innerHTML = h || ""; return d.textContent; };
  const MAXD = 1000;
  const goalText = g => { const c = GOALS.find(x => x[0] === g.id); return c ? c[lang === "ar" ? 2 : 1] : g.text; };
  const hasGoal = g => draft.goals.some(x => (g.id && x.id === g.id) || goalText(x).trim().toLowerCase() === goalText(g).trim().toLowerCase());
  function goalDrop() {
    const s = gq.trim().toLowerCase();
    const list = GOALS.filter(g => !hasGoal({ id: g[0] }) && (!s || g[1].toLowerCase().includes(s) || g[2].includes(s)));
    return `<div class="dx-drop" role="listbox" id="goalDrop">${list.map(g => `<button type="button" class="dx-opt" data-goal="${g[0]}"><span class="dx-code">${S(I.plus, 2)}</span><span class="dx-t"><b>${E(g[lang === "ar" ? 2 : 1])}</b></span></button>`).join("")}
      ${s ? `<button type="button" class="dx-opt free" id="goalFree"><span class="dx-code">${S(I.plus, 2)}</span><span class="dx-t"><b>${E(tx("addGoal", { q: gq.trim() }))}</b></span></button>` : list.length ? "" : `<p class="dx-none">${t().noMatch}</p>`}</div>`;
  }
  function goalsView(o, c) {
    const sec = (n, title, sub, body, opt) => `<section class="pl-sec"><span class="pl-n">${n}</span><div class="pl-sb"><div class="pl-sh"><div><h2>${title}${opt ? ` <span class="pl-tag">${t().optTag}</span>` : ""}</h2><p>${sub}</p></div></div>${body}</div></section>`;
    const n = draft.goals.length, dl = textOf(draft.details).length;
    const tb = (cmd, icon, label) => `<button type="button" class="pl-tb" data-cmd="${cmd}" aria-label="${label}" title="${label}">${icon}</button>`;
    // Treatment Plan Details comes first and is required; the goals follow.
    const DETAILS = `<div class="pl-ed ${dTried && !dl ? "bad" : ""}"><div class="pl-tbar">${tb("bold", "<b>B</b>", t().bold)}${tb("italic", "<i>I</i>", t().italic)}<span class="pl-tsep"></span>${tb("insertUnorderedList", S(I.ul), t().bullets)}${tb("insertOrderedList", S(I.ol), t().numbers)}<span class="pl-tsep"></span>${tb("createLink", S(I.link), t().linkB)}</div>
          <div class="pl-rt" id="plDetails" contenteditable="true" dir="auto" role="textbox" aria-multiline="true" aria-label="${E(t().g2)}" data-ph="${E(t().detailsPh)}">${draft.details}</div>
          <div class="hx-count pl-edc"><span id="detN">${dl}</span>/${MAXD}</div></div>`;
    return `<div class="pl">
      ${head(c, "goals", t().subGoals)}
      ${sec(1, t().g2, t().g2s, DETAILS)}
      ${sec(2, t().g1, t().g1s, `<div class="dx-sb pl-gsb ${gOpen ? "open" : ""}">${S(I.search)}<input id="goalQ" type="search" value="${E(gq)}" placeholder="${E(t().goalPh)}" autocomplete="off" maxlength="200" aria-expanded="${gOpen}">
          <button type="button" class="dx-clr" id="goalTog" aria-label="${E(t().goalPh)}">${S(I.down, 2.2)}</button>${gOpen ? goalDrop() : ""}</div>
        <div class="pl-qg">${QGOALS.map(id => { const on = hasGoal({ id }); return `<button type="button" class="pl-qgb ${on ? "on" : ""}" data-qgoal="${id}" ${on ? "disabled" : ""}>${S(on ? I.check : I.plus, 2)}<span>${QSHORT[id][lang === "ar" ? 1 : 0]}</span></button>`; }).join("")}<button type="button" class="pl-qgb other ${gOther ? "on" : ""}" id="goalOtherB" aria-expanded="${gOther}">${S(I.pen || I.plus, 2)}<span>${t().otherGoal}</span></button></div>
        ${gOther ? `<div class="pl-gother"><input class="hx-in" id="goalOther" value="${E(gOt)}" placeholder="${E(t().otherGoalPh)}" maxlength="200" dir="auto"><button type="button" class="hx-btn out sm" id="goalOtherX">${t().cancel}</button><button type="button" class="pl-addbtn" id="goalOtherAdd">${S(I.plus, 2.2)}${t().addOther}</button></div>` : ""}
        <div class="pl-gh"><b>${t().selGoals}</b><span>${n ? tx("nAdded", { n }) : ""}</span></div>
        ${n ? `<ol class="pl-goals">${draft.goals.map((g, i) => `<li class="pl-goal" draggable="true" data-gi="${i}"><button type="button" class="pl-grip" data-grip="${i}" aria-label="${t().dragGoal}" title="${t().dragGoal}">${S(I.grip, 2.4)}</button>
          <span dir="auto">${E(goalText(g))}</span><button type="button" class="pl-ib del" data-gdel="${i}" aria-label="${t().removeGoal}">${S(I.trash)}</button></li>`).join("")}</ol>` : `<p class="hx-empty pl-pick">${t().noGoals}</p>`}`)}
      ${sec(3, t().g3, t().g3s, `<div class="pl-fu">${S(I.doc)}<input class="hx-in" id="plFu" dir="auto" value="${E(draft.followUp)}" placeholder="${E(t().fuPh)}" maxlength="500"></div>`, true)}
      <div class="ex-foot"><button type="button" class="hx-btn out pl-prevb" id="plPrev"><span class="flip">${S(I.back)}</span><span><b>${t().prev}</b><small>${E(c.prevName || "")}</small></span></button><span class="hx-sp"></span>
        <button type="button" class="hx-btn soft" id="plDraft">${S(I.doc)}${t().draft}</button>
        <button type="button" class="hx-btn dark" id="plNext">${t().nextMeds}${S(I.arrow)}</button></div>
    </div>`;
  }
  function bindGoals(root) {
    const $ = s => root.querySelector(s), $$ = s => root.querySelectorAll(s), all = (s, f) => root.querySelectorAll(s).forEach(f);
    const focusQ = () => { const i = document.getElementById("goalQ"); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } };
    const add = g => { if (hasGoal(g)) return ctx.toast(t().goalDup); draft.goals.push(g); gq = ""; const keep = gOpen; ctx.rerender(); if (keep) focusQ(); };
    const bindDrop = () => {
      all("#goalDrop [data-goal]", b => b.onmousedown = e => { e.preventDefault(); add({ id: b.dataset.goal, text: "" }); });
      const f = $("#goalFree"); if (f) f.onmousedown = e => { e.preventDefault(); add({ id: "", text: gq.trim() }); };
    };
    const q = $("#goalQ");
    const sb = $(".pl-gsb");
    const openDrop = () => { if (gOpen) return; gOpen = true; sb.classList.add("open"); q.setAttribute("aria-expanded", true); sb.insertAdjacentHTML("beforeend", goalDrop()); bindDrop(); };
    const shut = () => { gOpen = false; sb.classList.remove("open"); q.setAttribute("aria-expanded", false); const d = $("#goalDrop"); if (d) d.remove(); };
    q.addEventListener("focus", openDrop);
    q.addEventListener("blur", shut);
    q.addEventListener("input", e => { gq = e.target.value; const d = $("#goalDrop"); if (d) { d.outerHTML = goalDrop(); bindDrop(); } });
    q.addEventListener("keydown", e => {
      if (e.key === "Escape") { gq = ""; q.value = ""; shut(); }
      if (e.key === "Enter") { e.preventDefault(); if (!gq.trim()) return; const m = $$("#goalDrop [data-goal]"); add(m.length === 1 ? { id: m[0].dataset.goal, text: "" } : { id: "", text: gq.trim() }); }
    });
    $("#goalTog").addEventListener("mousedown", e => { e.preventDefault(); if (gOpen) { shut(); q.blur(); } else q.focus(); });
    bindDrop();
    all("[data-qgoal]", b => b.addEventListener("click", () => add({ id: b.dataset.qgoal, text: "" })));
    // "Other": write a goal that is not in the list.
    $("#goalOtherB").addEventListener("click", () => { gOther = !gOther; ctx.rerender(); const i = document.getElementById("goalOther"); if (i) i.focus(); });
    if ($("#goalOther")) {
      const go = () => { const v = gOt.trim(); if (!v) return ctx.toast(t().otherGoalReq); gOther = false; gOt = ""; add({ id: "", text: v }); };
      $("#goalOther").addEventListener("input", e => { gOt = e.target.value; });
      $("#goalOther").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); go(); } if (e.key === "Escape") { gOther = false; gOt = ""; ctx.rerender(); } });
      $("#goalOtherAdd").addEventListener("click", go);
      $("#goalOtherX").addEventListener("click", () => { gOther = false; gOt = ""; ctx.rerender(); });
    }
    all("[data-gdel]", b => b.addEventListener("click", () => { draft.goals.splice(+b.dataset.gdel, 1); ctx.rerender(); }));
    // Reorder: drag a row, or focus its handle and use the up/down arrow keys.
    const move = (from, to) => { if (to < 0 || to >= draft.goals.length || from === to) return; const [g] = draft.goals.splice(from, 1); draft.goals.splice(to, 0, g); ctx.rerender(); };
    let dragI = -1;
    all(".pl-goal", li => {
      li.addEventListener("dragstart", e => { dragI = +li.dataset.gi; li.classList.add("drag"); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", li.dataset.gi); });
      li.addEventListener("dragend", () => li.classList.remove("drag"));
      li.addEventListener("dragover", e => { e.preventDefault(); li.classList.add("over"); });
      li.addEventListener("dragleave", () => li.classList.remove("over"));
      li.addEventListener("drop", e => { e.preventDefault(); move(dragI, +li.dataset.gi); });
    });
    all("[data-grip]", b => b.addEventListener("keydown", e => {
      const i = +b.dataset.grip, to = e.key === "ArrowUp" ? i - 1 : e.key === "ArrowDown" ? i + 1 : -9;
      if (to === -9) return; e.preventDefault(); move(i, to); const nb = root.querySelector(`[data-grip="${Math.max(0, Math.min(to, draft.goals.length - 1))}"]`); if (nb) nb.focus();
    }));
    // Plan editor
    const ed = $("#plDetails"), cnt = () => { const n = ed.textContent.length; $("#detN").textContent = n; ed.classList.toggle("empty", !n && !ed.querySelector("li")); if (n) ed.closest(".pl-ed").classList.remove("bad"); };
    cnt();
    const sync = () => { draft.details = sanitize(ed.innerHTML); cnt(); };
    ed.addEventListener("beforeinput", e => {
      if (/^insert(Text|Paragraph|LineBreak|ReplacementText)/.test(e.inputType) && ed.textContent.length >= MAXD && !(window.getSelection() + "")) { e.preventDefault(); ctx.toast(tx("maxChars", { n: MAXD })); }
    });
    ed.addEventListener("paste", e => {
      e.preventDefault();
      const room = MAXD - ed.textContent.length + (window.getSelection() + "").length, txt = (e.clipboardData.getData("text/plain") || "").slice(0, Math.max(0, room));
      if (txt) document.execCommand("insertText", false, txt);
      if (room <= 0 || txt.length < (e.clipboardData.getData("text/plain") || "").length) ctx.toast(tx("maxChars", { n: MAXD }));
    });
    ed.addEventListener("input", sync);
    all("[data-cmd]", b => b.addEventListener("mousedown", e => {
      e.preventDefault(); ed.focus();
      const cmd = b.dataset.cmd;
      if (cmd === "createLink") {
        const sel = window.getSelection(); if (!sel.rangeCount) return;
        const r = sel.getRangeAt(0).cloneRange(), url = (prompt(t().linkAsk, "https://") || "").trim();
        if (!url || url === "https://") return;
        if (!/^https?:\/\/\S+\.\S+/i.test(url)) return ctx.toast(t().linkBad);
        ed.focus(); sel.removeAllRanges(); sel.addRange(r);
        if (r.collapsed) document.execCommand("insertText", false, url);
        if (r.collapsed) { const n = sel.anchorNode, end = sel.anchorOffset; const rr = document.createRange(); rr.setStart(n, end - url.length); rr.setEnd(n, end); sel.removeAllRanges(); sel.addRange(rr); }
        document.execCommand("createLink", false, url);
      } else document.execCommand(cmd);
      sync();
    }));
    $("#plFu").addEventListener("input", e => { draft.followUp = e.target.value; });
    all("[data-page]", b => b.addEventListener("click", () => goPage(b.dataset.page)));
    $("#plPrev").addEventListener("click", () => ctx.go(ctx.prevKey));
    $("#plDraft").addEventListener("click", () => { ctx.saveDraft(clean()); ctx.toast(t().draftSaved); });
    $("#plNext").addEventListener("click", () => goPage("meds"));
  }
  // The goals page needs the plan details and at least one goal: shows what is missing (and marks the editor) when it is not done.
  function needs() {
    if (!textOf(draft.details).trim()) { dTried = true; ctx.rerender(); window.scrollTo(0, 0); return ctx.toast(t().needDetails) || true; }
    if (!draft.goals.length) { ctx.rerender(); return ctx.toast(t().needGoal) || true; }
    return false;
  }
  // Moving to Medications needs the plan details and a goal; the goals page is kept as a draft so a reload does not lose it.
  function goPage(k) {
    if (k === page) return;
    if (k === "meds") { const e = needs(); if (e) return e; ctx.saveDraft(clean()); }
    page = k; gOpen = false; ctx.rerender(); window.scrollTo(0, 0);
  }

  function view(o, c) {
    ctx = c; lang = c.lang; load(o); allergies = readAllergies(o);
    if (page === "goals") return goalsView(o, c);
    const saved = o.doctorVisit && o.doctorVisit.steps && o.doctorVisit.steps.plan;
    const when = saved && new Date(saved.at).toLocaleString(c.loc(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    const sec = (n, title, sub, body, extra) => `<section class="pl-sec"><span class="pl-n">${n}</span><div class="pl-sb"><div class="pl-sh"><div><h2>${title}</h2><p>${sub}</p></div>${extra || ""}</div>${body}</div></section>`;
    return `<div class="pl">
      ${head(c, "meds", t().sub)}
      ${saved ? `<div class="info ok">${S(I.check, 2.4)}<span>${tx("savedInfo", { t: E(when) })}</span></div>` : ""}
      ${sec(1, t().s1, t().s1s, `<div class="dx-sb ${q ? "open" : ""}">${S(I.search)}<input id="medQ" type="search" value="${E(q)}" placeholder="${E(t().searchPh)}" autocomplete="off">
          ${q ? `<button type="button" class="dx-clr" id="medClr" aria-label="${E(t().clear)}">${S(I.x, 2.2)}</button>` : ""}${results()}</div>
        <div class="pl-quick"><b>${t().quick}</b>${QUICK.map(id => `<button type="button" class="pl-qs" data-drug="${id}">${E(drug(id)[lang])}</button>`).join("")}<button type="button" class="pl-qs other" id="medOther">${S(I.plus, 2.2)}${t().otherMed}</button></div>`)}
      ${sec(2, t().s2, t().s2s, details())}
      ${sec(3, t().s3, t().s3s, `${table()}<label class="hx-ck pl-none"><input type="checkbox" id="medNone" ${draft.none ? "checked" : ""} ${draft.meds.length ? "disabled" : ""}><span>${t().none}</span></label>`)}
      <div class="ex-foot"><button type="button" class="hx-btn out" id="plPrev"><span class="flip">${S(I.back)}</span>${t().prev}</button><span class="hx-sp"></span>
        <button type="button" class="hx-btn soft" id="plDraft">${S(I.doc)}${t().draft}</button>
        <button type="button" class="hx-btn dark" id="plSave">${t().saveCont}${S(I.arrow)}</button></div>
    </div>`;
  }

  function pick(d) { cur = d ? fromDrug(d) : blankManual(q.trim()); editIx = -1; q = ""; tried = false; adv = false; ctx.rerender(); const s = document.querySelector(".pl-sec:nth-of-type(2)"); if (s) s.scrollIntoView({ block: "start", behavior: "smooth" }); }
  function valid(m) { return (m.drugId || m.name.trim()) && m.form && m.strength && m.route && m.doseN && m.freq && (m.durU === "ongoing" || m.durN); }
  function bind(root, o, c) {
    ctx = c;
    if (page === "goals") return bindGoals(root);
    const $ = s => root.querySelector(s), all = (s, f) => root.querySelectorAll(s).forEach(f);
    const focusQ = () => { const i = document.getElementById("medQ"); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } };
    const bindDrop = () => {
      all("#medDrop [data-drug]", b => b.onmousedown = e => { e.preventDefault(); pick(drug(b.dataset.drug)); });
      const m = $("#medManual"); if (m) m.onmousedown = e => { e.preventDefault(); pick(null); };
    };
    $("#medQ").addEventListener("input", e => {
      const had = !!q; q = e.target.value;
      if (had !== !!q) { ctx.rerender(); focusQ(); return; }
      const dd = $("#medDrop"); if (dd) { dd.outerHTML = results(); bindDrop(); }
    });
    $("#medQ").addEventListener("keydown", e => {
      if (e.key === "Escape") { q = ""; ctx.rerender(); }
      if (e.key === "Enter") { e.preventDefault(); const f = $("#medDrop [data-drug]"); if (f) pick(drug(f.dataset.drug)); }
    });
    bindDrop();
    if ($("#medClr")) $("#medClr").addEventListener("mousedown", e => { e.preventDefault(); q = ""; ctx.rerender(); focusQ(); });
    all(".pl-qs[data-drug]", b => b.addEventListener("click", () => pick(drug(b.dataset.drug))));
    $("#medOther").addEventListener("click", () => { pick(null); const n = document.querySelector('[data-f="name"]'); if (n) n.focus(); });
    if (cur) {
      all("[data-f]", el => {
        const k = el.dataset.f, ev = el.tagName === "SELECT" || el.type === "checkbox" ? "change" : "input";
        el.addEventListener(ev, () => {
          let v = el.type === "checkbox" ? el.checked : el.value;
          if (["doseN", "durN", "qty"].includes(k)) { v = v.replace(k === "doseN" ? /[^\d.]/g : /\D/g, ""); el.value = v; }
          cur[k] = v;
          if (k === "form") { const fm = (drug(cur.drugId) || { forms: [] }).forms.find(f => f[0] === v); if (fm) { cur.strength = fm[1][0]; cur.route = fm[2]; } cur.doseU = UNIT[v] || cur.doseU; }
          if (k === "freq" && v === "prn") cur.prn = true;
          if (k === "instr") $("#instrN").textContent = v.length;
          if (ev === "change") ctx.rerender();
        });
      });
      all("[data-tm]", b => b.addEventListener("click", () => { const v = b.dataset.tm; cur.timing = cur.timing.includes(v) ? cur.timing.filter(x => x !== v) : cur.timing.concat(v); ctx.rerender(); }));
      $("#advToggle").addEventListener("click", () => { adv = !adv; ctx.rerender(); });
      $("#medChange").addEventListener("click", () => { cur = null; editIx = -1; ctx.rerender(); focusQ(); });
      if ($("#medCancel")) $("#medCancel").addEventListener("click", () => { cur = null; editIx = -1; ctx.rerender(); });
      $("#medAdd").addEventListener("click", () => {
        tried = true;
        if (!valid(cur)) { ctx.rerender(); return ctx.toast(cur.drugId || cur.name.trim() ? t().fillReq : t().nameReq); }
        const m = { ...JSON.parse(JSON.stringify(cur)), allergy: allergyHit(cur) };
        if (!m.drugId) m.generic = { en: m.name, ar: m.name };
        if (editIx >= 0) { draft.meds[editIx] = m; ctx.toast(tx("updated", { n: medName(m) })); } else { draft.meds.push(m); ctx.toast(tx("added", { n: medName(m) })); }
        draft.none = false; cur = null; editIx = -1; tried = false; adv = false; ctx.rerender();
      });
    }
    all("[data-edit]", b => b.addEventListener("click", () => {
      editIx = +b.dataset.edit; cur = JSON.parse(JSON.stringify(draft.meds[editIx])); tried = false; adv = !!(cur.qty || cur.prn || cur.timing.length); ctx.rerender();
      const s = document.querySelector(".pl-sec:nth-of-type(2)"); if (s) s.scrollIntoView({ block: "start", behavior: "smooth" });
    }));
    all("[data-del]", b => b.addEventListener("click", () => { const i = +b.dataset.del; draft.meds.splice(i, 1); if (editIx === i) { cur = null; editIx = -1; } else if (editIx > i) editIx--; ctx.rerender(); }));
    $("#medNone").addEventListener("change", e => { draft.none = e.target.checked; });
    all("[data-page]", b => b.addEventListener("click", () => { if (cur) return ctx.toast(t().pendingMed); goPage(b.dataset.page); }));
    $("#plPrev").addEventListener("click", () => { page = "goals"; ctx.rerender(); window.scrollTo(0, 0); });
    $("#plDraft").addEventListener("click", () => { ctx.saveDraft(clean()); ctx.toast(t().draftSaved); });
    $("#plSave").addEventListener("click", () => {
      if (cur) return ctx.toast(t().pendingMed);
      if (!textOf(draft.details).trim() || !draft.goals.length) { page = "goals"; needs(); return; }
      if (!draft.meds.length && !draft.none) return ctx.toast(t().needMed);
      ctx.save(clean()); reset(); ctx.toast(t().saved); ctx.go(ctx.nextKey);
    });
  }
  const clean = () => JSON.parse(JSON.stringify({ goals: draft.goals, details: clip(draft.details), followUp: draft.followUp.trim(), meds: draft.meds, none: !draft.meds.length && draft.none }));
  const clip = h => textOf(h).trim() ? h : "";

  return { view, bind, reset, L, GOALS };
})();
