// Orders & Services (doctor visit step after Treatment Plan). One visit cart collects the orders from every service:
// referrals, nursing services, radiology, laboratory and IV therapy. Saved in order.doctorVisit.steps.orders:
//   { items: [catalogue order { uid, svc, code, price, note } | referral { uid, svc: "ref", spec, priority, reason, rec, dest, provider, notes }], none, at, by }
// Each catalogue order keeps its price; the cart shows the total. Payment is collected at the visit (cash or card terminal)
// and kept in order.doctorVisit.payment = { entries: [{ id, amount, method: "cash" | "card", received, ref, at, by }] }.
// An unpaid balance stays "open" and never blocks the visit; the visit page shows it until it is settled.
// Every change is kept in doctorVisit.ordersDraft straight away, so leaving a service page loses nothing.
const DrOrders = (() => {
  // SAMPLE catalogues and prices (SAR). TODO: replace with the Mada Care service catalogue and price list before go-live.
  // cats: [id, icon, en, ar]; items: [code, cat, en, ar, about en, about ar, price]
  const I = {
    leave: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M12 11v6M9 14h6"/>', cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    cart: '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2.5 3.5h3l2.4 11.2a1.5 1.5 0 0 0 1.5 1.2h8.5a1.5 1.5 0 0 0 1.5-1.1L21 7.5H6.4"/>',
    ref: '<circle cx="9" cy="7" r="3.5"/><path d="M3 20v-1.5A5.5 5.5 0 0 1 8.5 13h1.5"/><path d="M13 18c0-2.5 2-4.5 4.5-4.5H21M18.5 11l2.5 2.5-2.5 2.5"/>',
    nurse: '<path d="M7 7V4.5L12 3l5 1.5V7"/><path d="M12 4.2v2M11 5.2h2"/><path d="M7 7.5a5 5 0 0 0 10 0"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1z"/>',
    rad: '<circle cx="12" cy="12" r="9"/><rect x="8" y="7.5" width="8" height="7" rx="1.5"/><path d="M9.5 18c.5-1.5 1.5-2.2 2.5-2.2s2 .7 2.5 2.2"/>',
    lab: '<path d="M9 3h6M10 3v6L4.8 18.5A1.7 1.7 0 0 0 6.3 21h11.4a1.7 1.7 0 0 0 1.5-2.5L14 9V3"/><path d="M7.5 14h9"/>',
    iv: '<rect x="7" y="2.5" width="10" height="12" rx="2.5"/><path d="M10 6h4M10 9h4M12 14.5V18M12 18a2 2 0 1 0 0 4"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>', plus: '<path d="M12 5v14M5 12h14"/>', check: '<path d="m5 12 5 5 9-10"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>', note: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', back: '<path d="M19 12H5M11 6l-6 6 6 6"/>', doc: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>', chev: '<path d="m9 6 6 6-6 6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>', clip: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3"/>',
    syringe: '<path d="m18 2 4 4M15 5l4 4M8 12l4 4M17 7 7 17l-3 1 1-3L15 5M3 21l2-2"/>', bandage: '<rect x="2.5" y="8" width="19" height="8" rx="4" transform="rotate(-45 12 12)"/><path d="M10 10h.01M14 14h.01M12 12h.01"/>',
    drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>', pulse: '<path d="M3 12h4l2-5 4 10 2-5h6"/>', tube: '<path d="M8 3v5a4 4 0 0 0 8 0V3"/><path d="M12 12v9"/>',
    person: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>', bone: '<path d="M7 4a2.5 2.5 0 0 0-2 4l11 11a2.5 2.5 0 1 0 4-2 2.5 2.5 0 1 0-2-4L7 4a2.5 2.5 0 1 0-2 4"/>',
    wave: '<path d="M2 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0"/>', heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>', blood: '<path d="M12 3s5 5.5 5 9.5a5 5 0 0 1-10 0C7 8.5 12 3 12 3z"/><path d="M10 13a2 2 0 0 0 2 2"/>',
    flask: '<path d="M9 3h6M10 3v6L4.8 18.5A1.7 1.7 0 0 0 6.3 21h11.4a1.7 1.7 0 0 0 1.5-2.5L14 9V3"/>', germ: '<circle cx="12" cy="12" r="5"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.9 2.9M15.5 15.5l2.9 2.9M5.6 18.4l2.9-2.9M15.5 8.5l2.9-2.9"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h1M4 12h1M4 18h1"/>', xr: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M12 6v12M9 8.5c1 .8 2 1 3 1s2-.2 3-1M8.5 11.5c1.2.8 2.3 1.1 3.5 1.1s2.3-.3 3.5-1.1M9 14.5c1 .7 2 1 3 1s2-.3 3-1"/>',
    home: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>', center: '<path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M3 21h18M8 8h3M8 12h3M8 16h3"/>',
    eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/>',
    send: '<path d="M21 3 10 14"/><path d="M21 3l-7 18-4-7-7-4z"/>', wa: '<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8a4 4 0 0 1-1.8-1.8l.8-1-1-2z"/>',
    qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 17h4v4h-4"/>', dl: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    sms: '<path d="M4 5h16v11H8l-4 4z"/><path d="M8 9h8M8 12h5"/>', copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
    share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/>',
    wallet: '<path d="M4 7a2 2 0 0 1 2-2h11v4"/><path d="M4 7v11a2 2 0 0 0 2 2h14V9H6a2 2 0 0 1-2-2z"/><circle cx="16.5" cy="14.5" r="1.2"/>',
    cash: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/>', card: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19M6.5 15h4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
    box: '<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/>', pill: '<rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-45 12 12)"/><path d="m9.5 9.5 5 5"/>'
  };
  // Sick leave: who the certificate is addressed to. Up to 30 days per certificate in this prototype.
  const ENTITIES = [["gov", "Government Sector", "قطاع حكومي"], ["private", "Private Sector", "قطاع خاص"], ["edu", "Education (student)", "جهة تعليمية (طالب)"], ["military", "Military Sector", "قطاع عسكري"], ["other", "Other", "أخرى"]];
  const LVMAX = 30;
  const SVC = {
    nurse: { prefix: "NS", cats: [["inj", "syringe", "Injections & Medication", "الحقن وإعطاء الأدوية"], ["wound", "bandage", "Wound Care", "العناية بالجروح"], ["line", "drop", "IV Line Care", "العناية بالخط الوريدي"],
      ["mon", "pulse", "Monitoring & Assessment", "المراقبة والتقييم التمريضي"], ["cath", "tube", "Catheter & Tube Care", "العناية بالقساطر والأنابيب"], ["care", "person", "Personal & Other Care", "الرعاية الشخصية والأخرى"]],
      items: [
        ["NS-001", "inj", "IM Injection", "حقنة عضل", "Intramuscular injection administration.", "إعطاء حقنة في العضل.", 80],
        ["NS-002", "inj", "SC Injection", "حقنة تحت الجلد", "Subcutaneous injection administration.", "إعطاء حقنة تحت الجلد.", 80],
        ["NS-003", "inj", "IV Medication Administration", "إعطاء دواء وريدي", "Administration of prescribed IV medications.", "إعطاء الأدوية الوريدية الموصوفة.", 120],
        ["NS-004", "inj", "Long-acting Injection", "حقنة طويلة المفعول", "Administration of long-acting medications (e.g., insulin, anticoagulants).", "إعطاء أدوية طويلة المفعول (مثل الإنسولين ومميعات الدم).", 120],
        ["NS-014", "wound", "Wound Dressing (Simple)", "غيار جرح (بسيط)", "Dressing for small or clean wounds.", "غيار للجروح الصغيرة أو النظيفة.", 120],
        ["NS-015", "wound", "Wound Dressing (Complex)", "غيار جرح (معقد)", "Chronic wound care and dressing.", "عناية وغيار للجروح المزمنة.", 180],
        ["NS-016", "wound", "Suture / Staple Removal", "إزالة الغرز أو الدبابيس", "Remove stitches or staples from a healed wound.", "إزالة الغرز أو الدبابيس من جرح ملتئم.", 100],
        ["NS-017", "wound", "Burn Dressing", "غيار حروق", "Dressing and care of minor burns.", "غيار وعناية بالحروق البسيطة.", 200],
        ["NS-018", "wound", "Diabetic Foot Care", "العناية بالقدم السكرية", "Assessment and dressing of diabetic foot wounds.", "تقييم وغيار جروح القدم السكرية.", 220],
        ["NS-021", "line", "IV Cannula Insertion", "تركيب كانيولا", "Insert a peripheral IV line.", "تركيب خط وريدي طرفي.", 90],
        ["NS-022", "line", "Cannula Flush / Removal", "غسيل أو إزالة الكانيولا", "Flush or remove an existing IV line.", "غسيل أو إزالة خط وريدي موجود.", 60],
        ["NS-031", "mon", "Vital Signs Monitoring", "مراقبة العلامات الحيوية", "Scheduled checks of blood pressure, pulse, temperature and oxygen.", "قياس دوري للضغط والنبض والحرارة والأكسجين.", 70],
        ["NS-032", "mon", "Blood Glucose Check", "قياس سكر الدم", "Finger-prick glucose test.", "قياس السكر من الإصبع.", 50],
        ["NS-033", "mon", "Pulse Oximetry Monitoring", "مراقبة نسبة الأكسجين", "Oxygen saturation checks over the visit.", "قياس نسبة الأكسجين خلال الزيارة.", 50],
        ["NS-034", "mon", "Nursing Assessment Visit", "زيارة تقييم تمريضي", "Full nursing assessment and care plan.", "تقييم تمريضي كامل وخطة رعاية.", 150],
        ["NS-041", "cath", "Urinary Catheter Insertion", "تركيب قسطرة بولية", "Insert a urinary catheter.", "تركيب قسطرة بولية.", 150],
        ["NS-042", "cath", "Urinary Catheter Change", "تغيير قسطرة بولية", "Replace an existing urinary catheter.", "تغيير القسطرة البولية الحالية.", 150],
        ["NS-043", "cath", "NG Tube Insertion", "تركيب أنبوب أنفي معدي", "Insert a nasogastric feeding tube.", "تركيب أنبوب تغذية عن طريق الأنف.", 180],
        ["NS-044", "cath", "Tracheostomy Care", "العناية بفتحة القصبة الهوائية", "Cleaning and care of a tracheostomy.", "تنظيف والعناية بفتحة القصبة الهوائية.", 200],
        ["NS-051", "care", "Home Sample Collection", "سحب عينة من المنزل", "Collect blood or other samples at home.", "سحب دم أو عينات أخرى في المنزل.", 60],
        ["NS-052", "care", "Bed Bath & Hygiene", "استحمام ونظافة شخصية", "Personal hygiene for bed-bound patients.", "نظافة شخصية للمرضى طريحي الفراش.", 150],
        ["NS-053", "care", "Elderly Care Visit", "زيارة رعاية كبار السن", "Nursing visit for elderly care needs.", "زيارة تمريضية لاحتياجات كبار السن.", 200],
        ["NS-054", "care", "Post-operative Care Visit", "زيارة رعاية بعد العملية", "Wound check and recovery care after surgery.", "فحص الجرح ورعاية التعافي بعد العملية.", 220]
      ] }
  };
  // Radiology: loc is where it can be done ("home", "center" or "both"); parts are the body parts the doctor picks from.
  const P = { chest: ["Chest", "الصدر"], abdomen: ["Abdomen", "البطن"], kub: ["Kidneys, ureters, bladder (KUB)", "الكلى والحالب والمثانة"], pelvis: ["Pelvis", "الحوض"],
    hand: ["Hand", "اليد"], wrist: ["Wrist", "الرسغ"], elbow: ["Elbow", "الكوع"], shoulder: ["Shoulder", "الكتف"], hip: ["Hip", "الورك"], knee: ["Knee", "الركبة"], ankle: ["Ankle", "الكاحل"], foot: ["Foot", "القدم"],
    cspine: ["Cervical spine", "الفقرات العنقية"], tspine: ["Thoracic spine", "الفقرات الصدرية"], lspine: ["Lumbar spine", "الفقرات القطنية"], neck: ["Neck", "الرقبة"], thyroid: ["Thyroid", "الغدة الدرقية"],
    uabd: ["Upper abdomen", "أعلى البطن"], fetal: ["Pregnancy", "الحمل"], soft: ["Soft tissue (state site)", "أنسجة رخوة (حدد المكان)"], legs: ["Both legs", "الساقين"], rleg: ["Right leg", "الساق اليمنى"], lleg: ["Left leg", "الساق اليسرى"],
    heart: ["Heart", "القلب"], other: ["Other (state in instructions)", "أخرى (حددها في التعليمات)"] };
  const RCATS = [["all", "list", "All Radiology Services", "كل خدمات الأشعة"], ["xray", "xr", "X-Ray (General)", "أشعة سينية (عامة)"], ["us", "wave", "Ultrasound", "أشعة صوتية"],
    ["mobile", "home", "Mobile X-Ray (Home)", "أشعة متنقلة (المنزل)"], ["other", "rad", "Other Imaging", "تصوير آخر"]];
  // SAMPLE radiology catalogue and prices. TODO: replace with the Mada Care radiology list; confirm which exams can be done at home.
  const RAD = [
    { code: "RAD-001", cat: "xray", en: "Chest X-Ray", ar: "أشعة الصدر", sub: ["Chest (PA)", "الصدر (أمامي خلفي)"], loc: "home", parts: ["chest"], price: 180,
      about: ["Standard chest X-ray (PA view) to assess lung fields, heart size and mediastinum.", "أشعة صدر قياسية لتقييم الرئتين وحجم القلب والمنصف."] },
    { code: "RAD-002", cat: "xray", en: "Abdominal X-Ray", ar: "أشعة البطن", sub: ["KUB", "الكلى والحالب والمثانة"], loc: "home", parts: ["kub", "abdomen"], price: 180,
      about: ["Plain abdominal film for stones, bowel gas pattern or obstruction.", "صورة بطن عادية للكشف عن الحصوات أو الغازات أو الانسداد."] },
    { code: "RAD-003", cat: "mobile", en: "Portable X-Ray", ar: "أشعة متنقلة", sub: ["Any part (mobile)", "أي جزء (متنقلة)"], loc: "home", parts: ["chest", "abdomen", "pelvis", "hip", "knee", "shoulder", "other"], price: 250,
      about: ["Mobile X-ray unit at the patient's home for bed-bound or frail patients.", "جهاز أشعة متنقل في منزل المريض للمرضى طريحي الفراش أو كبار السن."] },
    { code: "RAD-004", cat: "us", en: "Ultrasound Abdomen", ar: "أشعة صوتية للبطن", sub: ["Upper abdomen", "أعلى البطن"], loc: "center", parts: ["uabd", "abdomen"], price: 350,
      about: ["Liver, gallbladder, pancreas, kidneys and spleen.", "الكبد والمرارة والبنكرياس والكلى والطحال."] },
    { code: "RAD-005", cat: "us", en: "Ultrasound Pelvis", ar: "أشعة صوتية للحوض", sub: ["Pelvic organs", "أعضاء الحوض"], loc: "center", parts: ["pelvis"], price: 350,
      about: ["Bladder, uterus and ovaries, or prostate.", "المثانة والرحم والمبايض أو البروستاتا."] },
    { code: "RAD-006", cat: "us", en: "Ultrasound Obstetric", ar: "أشعة صوتية للحمل", sub: ["Fetal assessment", "تقييم الجنين"], loc: "center", parts: ["fetal"], price: 350,
      about: ["Fetal growth, position and amniotic fluid.", "نمو الجنين ووضعه والسائل الأمنيوسي."] },
    { code: "RAD-007", cat: "us", en: "Ultrasound Soft Tissue", ar: "أشعة صوتية للأنسجة الرخوة", sub: ["e.g. lump, swelling", "مثل كتلة أو تورم"], loc: "both", parts: ["soft", "neck", "other"], price: 300,
      about: ["Lumps, collections, swelling or superficial masses.", "الكتل والتجمعات والتورم السطحي."] },
    { code: "RAD-008", cat: "xray", en: "X-Ray Extremities", ar: "أشعة الأطراف", sub: ["Hand / Foot / Knee", "اليد / القدم / الركبة"], loc: "home", parts: ["hand", "wrist", "elbow", "shoulder", "hip", "knee", "ankle", "foot"], price: 180,
      about: ["Bones and joints of the arm or leg, per limb.", "عظام ومفاصل الذراع أو الساق، لكل طرف."] },
    { code: "RAD-009", cat: "xray", en: "X-Ray Spine", ar: "أشعة العمود الفقري", sub: ["Cervical / Thoracic / Lumbar", "عنقية / صدرية / قطنية"], loc: "center", parts: ["cspine", "tspine", "lspine"], price: 250,
      about: ["Spine views for pain, injury or degeneration.", "صور للعمود الفقري للألم أو الإصابة أو الخشونة."] },
    { code: "RAD-010", cat: "us", en: "Ultrasound Thyroid", ar: "أشعة صوتية للغدة الدرقية", sub: ["Thyroid gland", "الغدة الدرقية"], loc: "center", parts: ["thyroid", "neck"], price: 300,
      about: ["Thyroid nodules, size and neck lymph nodes.", "عقيدات الغدة الدرقية وحجمها والغدد اللمفاوية في الرقبة."] },
    { code: "RAD-011", cat: "other", en: "Venous Doppler", ar: "دوبلر الأوردة", sub: ["Lower limbs", "الأطراف السفلية"], loc: "center", parts: ["legs", "rleg", "lleg"], price: 450,
      about: ["Check for deep vein thrombosis.", "للكشف عن جلطات الأوردة العميقة."] },
    { code: "RAD-012", cat: "other", en: "ECG (12-lead)", ar: "تخطيط القلب", sub: ["Resting", "أثناء الراحة"], loc: "home", parts: ["heart"], price: 150,
      about: ["Resting 12-lead electrocardiogram at home.", "تخطيط قلب أثناء الراحة في المنزل."] },
    { code: "RAD-013", cat: "other", en: "Echocardiogram", ar: "إيكو القلب", sub: ["Heart ultrasound", "أشعة صوتية للقلب"], loc: "center", parts: ["heart"], price: 600,
      about: ["Heart structure and pumping function.", "تركيب القلب وقوة الضخ."] }
  ];
  const LCATS = [["all", "All", "الكل"], ["hem", "Hematology", "أمراض الدم"], ["bio", "Biochemistry", "الكيمياء الحيوية"], ["endo", "Endocrinology", "الغدد الصماء"], ["imm", "Immunology", "المناعة"],
    ["micro", "Microbiology", "الأحياء الدقيقة"], ["us", "Urine & Stool", "البول والبراز"], ["oth", "Others", "أخرى"]];
  // SAMPLE lab catalogue and prices. TODO: replace with the Mada Care lab test list. [code, cat, en, ar, price]
  const LAB = [
    ["LAB-001", "hem", "Complete Blood Count (CBC)", "صورة دم كاملة", 50], ["LAB-002", "hem", "ESR", "سرعة الترسيب", 40], ["LAB-003", "hem", "Blood Group & Rh", "فصيلة الدم", 30], ["LAB-004", "hem", "Peripheral Blood Smear", "مسحة دم طرفية", 60],
    ["LAB-101", "bio", "Glucose (Fasting)", "سكر صائم", 30], ["LAB-102", "bio", "HbA1c", "السكر التراكمي", 80], ["LAB-103", "bio", "Lipid Profile", "الدهون", 120], ["LAB-104", "bio", "Liver Function Test (LFT)", "وظائف الكبد", 100],
    ["LAB-105", "bio", "Kidney Function Test", "وظائف الكلى", 90], ["LAB-106", "bio", "Electrolytes (Na, K, Cl)", "الأملاح", 90], ["LAB-107", "bio", "Uric Acid", "حمض اليوريك", 40], ["LAB-108", "bio", "Iron Studies", "الحديد", 120],
    ["LAB-201", "endo", "TSH", "هرمون الغدة الدرقية المنبه", 80], ["LAB-202", "endo", "Free T4", "هرمون الغدة الدرقية الحر", 80], ["LAB-203", "endo", "Vitamin D (25-OH)", "فيتامين د", 150], ["LAB-204", "endo", "Vitamin B12", "فيتامين ب12", 120],
    ["LAB-301", "imm", "CRP", "بروتين الالتهاب", 50], ["LAB-302", "imm", "ANA", "الأجسام المضادة للنواة", 150], ["LAB-303", "imm", "RF", "عامل الروماتويد", 100], ["LAB-304", "imm", "H. pylori IgG", "جرثومة المعدة", 120],
    ["LAB-401", "us", "Urine Analysis (Complete)", "تحليل بول كامل", 40], ["LAB-402", "us", "Urine Culture", "مزرعة بول", 100], ["LAB-403", "us", "Stool Analysis", "تحليل براز", 50], ["LAB-404", "us", "Stool Culture", "مزرعة براز", 100],
    ["LAB-501", "micro", "Throat Swab Culture", "مزرعة مسحة حلق", 100], ["LAB-502", "micro", "Wound Swab Culture", "مزرعة مسحة جرح", 120], ["LAB-503", "micro", "Blood Culture", "مزرعة دم", 180], ["LAB-504", "micro", "Influenza A/B Rapid Test", "فحص الإنفلونزا السريع", 90],
    ["LAB-601", "oth", "Ferritin", "مخزون الحديد", 100], ["LAB-602", "oth", "PT / INR", "زمن التجلط", 60], ["LAB-603", "oth", "Pregnancy Test (β-hCG)", "اختبار الحمل في الدم", 60], ["LAB-604", "oth", "PSA", "مستضد البروستاتا", 120]
  ];
  const PKG = [
    { code: "PKG-001", en: "Basic Health Check", ar: "الفحص الصحي الأساسي", price: 250, tests: ["LAB-001", "LAB-002", "LAB-101", "LAB-102", "LAB-103", "LAB-104", "LAB-105", "LAB-106", "LAB-201", "LAB-203", "LAB-401", "LAB-403"] },
    { code: "PKG-002", en: "Diabetes Package", ar: "باقة السكري", price: 180, tests: ["LAB-101", "LAB-102", "LAB-105", "LAB-103", "LAB-401"] },
    { code: "PKG-003", en: "Cardiac Health Package", ar: "باقة صحة القلب", price: 220, tests: ["LAB-103", "LAB-101", "LAB-301", "LAB-106", "LAB-105"] },
    { code: "PKG-004", en: "Kidney Function Package", ar: "باقة وظائف الكلى", price: 180, tests: ["LAB-105", "LAB-106", "LAB-107", "LAB-401"] },
    { code: "PKG-005", en: "Liver Function Package", ar: "باقة وظائف الكبد", price: 180, tests: ["LAB-104", "LAB-001", "LAB-602"] },
    { code: "PKG-006", en: "Thyroid Package", ar: "باقة الغدة الدرقية", price: 150, tests: ["LAB-201", "LAB-202"] },
    { code: "PKG-007", en: "Anemia Package", ar: "باقة فقر الدم", price: 160, tests: ["LAB-001", "LAB-004", "LAB-601", "LAB-108", "LAB-204"] },
    { code: "PKG-008", en: "Vitamin & Mineral Package", ar: "باقة الفيتامينات والمعادن", price: 200, tests: ["LAB-203", "LAB-204", "LAB-601", "LAB-106"] },
    { code: "PKG-009", en: "Preoperative Package", ar: "باقة ما قبل العمليات", price: 300, tests: ["LAB-001", "LAB-003", "LAB-602", "LAB-101", "LAB-105", "LAB-106", "LAB-401"] }
  ];
  const ICATS = [["all", "All", "الكل"], ["fluid", "IV Fluids", "المحاليل الوريدية"], ["vit", "Vitamins & Minerals", "الفيتامينات والمعادن"], ["med", "IV Medications", "الأدوية الوريدية"]];
  // SAMPLE IV catalogue and prices. TODO: replace with the Mada Care IV therapy list; doses must be confirmed by the medical director. [code, cat, en, ar, price]
  const IVS = [
    ["IV-001", "fluid", "Normal Saline 0.9% (500 mL)", "محلول ملحي 0.9% (500 مل)", 150], ["IV-002", "fluid", "Normal Saline 0.9% (1 L)", "محلول ملحي 0.9% (1 لتر)", 200],
    ["IV-003", "fluid", "Ringer's Lactate (1 L)", "رينجر لاكتات (1 لتر)", 200], ["IV-004", "fluid", "Dextrose 5% (500 mL)", "جلوكوز 5% (500 مل)", 180], ["IV-005", "fluid", "Dextrose 5% / Saline 0.45% (1 L)", "جلوكوز 5% مع ملحي 0.45% (1 لتر)", 220],
    ["IV-101", "vit", "Vitamin C (1 g)", "فيتامين سي (1 جم)", 120], ["IV-102", "vit", "Vitamin B Complex", "فيتامين ب المركب", 100], ["IV-103", "vit", "Vitamin B12 (1 mg)", "فيتامين ب12 (1 ملجم)", 90],
    ["IV-104", "vit", "Magnesium Sulfate (1 g)", "كبريتات المغنيسيوم (1 جم)", 90], ["IV-105", "vit", "Zinc (5 mg)", "الزنك (5 ملجم)", 90],
    ["IV-201", "med", "Ondansetron 4 mg (antiemetic)", "أوندانسيترون 4 ملجم (مضاد غثيان)", 80], ["IV-202", "med", "Paracetamol 1 g IV", "باراسيتامول 1 جم وريدي", 80], ["IV-203", "med", "Pantoprazole 40 mg IV", "بانتوبرازول 40 ملجم وريدي", 90],
    ["IV-204", "med", "IV Antibiotic Administration", "إعطاء مضاد حيوي وريدي", 150], ["IV-205", "med", "IV Iron (Iron sucrose 200 mg)", "حديد وريدي (200 ملجم)", 450]
  ];
  const IVPKG = [
    { code: "IVP-001", en: "Basic Hydration", ar: "الترطيب الأساسي", price: 250, time: "30–45", tests: ["IV-002"] },
    { code: "IVP-002", en: "Hydration Plus", ar: "الترطيب المعزز", price: 380, time: "45–60", tests: ["IV-002", "IV-102", "IV-101"] },
    { code: "IVP-003", en: "Immunity Boost", ar: "تعزيز المناعة", price: 420, time: "45–60", tests: ["IV-001", "IV-101", "IV-105", "IV-102"] },
    { code: "IVP-004", en: "Energy Recovery", ar: "استعادة النشاط", price: 400, time: "45–60", tests: ["IV-003", "IV-102", "IV-103", "IV-104"] },
    { code: "IVP-005", en: "Gastroenteritis Rehydration", ar: "تعويض سوائل النزلة المعوية", price: 320, time: "60", tests: ["IV-003", "IV-201", "IV-203"] },
    { code: "IVP-006", en: "Fever & Dehydration", ar: "الحرارة والجفاف", price: 300, time: "45–60", tests: ["IV-002", "IV-202"] },
    { code: "IVP-007", en: "Migraine Relief", ar: "تخفيف الصداع النصفي", price: 340, time: "45", tests: ["IV-001", "IV-202", "IV-201", "IV-104"] },
    { code: "IVP-008", en: "Iron Replacement", ar: "تعويض الحديد", price: 550, time: "30–60", tests: ["IV-001", "IV-205"] }
  ];
  // The lab and IV pages share one layout: single items as cards, packages as a table with a "view contents" dialog.
  const KIT = { lab: { items: LAB, pkgs: PKG, cats: LCATS, icon: "flask" }, iv: { items: IVS, pkgs: IVPKG, cats: ICATS, icon: "drop" } };
  const ALLPKG = PKG.concat(IVPKG);
  const ORDER = ["ref", "nurse", "rad", "lab", "iv", "leave"];
  const SPECS = [["physio", "Physiotherapy", "العلاج الطبيعي"], ["gp", "General Practitioner", "طب عام"], ["im", "Internal Medicine", "الباطنية"], ["cardio", "Cardiology", "القلب"],
    ["endo", "Endocrinology", "الغدد الصماء"], ["ortho", "Orthopaedics", "العظام"], ["derm", "Dermatology", "الجلدية"], ["ent", "ENT", "الأنف والأذن والحنجرة"], ["eye", "Ophthalmology", "العيون"],
    ["neuro", "Neurology", "الأعصاب"], ["psych", "Psychiatry", "الطب النفسي"], ["paed", "Paediatrics", "الأطفال"], ["obgyn", "Obstetrics & Gynaecology", "النساء والولادة"],
    ["diet", "Nutrition / Dietitian", "التغذية العلاجية"], ["woundsp", "Wound Care Specialist", "أخصائي الجروح"], ["speech", "Speech Therapy", "علاج النطق"], ["ot", "Occupational Therapy", "العلاج الوظيفي"],
    ["er", "Emergency Department", "الطوارئ"]];
  // SAMPLE Mada Care teams for "Preferred Provider". TODO: load from the provider directory.
  const PROVIDERS = [["doctors", "Mada Care doctors", "أطباء مدى كير"], ["physio", "Mada Care physiotherapy team", "فريق العلاج الطبيعي - مدى كير"], ["nursing", "Mada Care nursing team", "فريق التمريض - مدى كير"], ["diet", "Mada Care dietitian", "أخصائي التغذية - مدى كير"]];

  const L = {
    en: {
      title: "Orders & Services", sub: "Add and manage medical orders for this visit.", stepOf: "Step {n} of {m}",
      s_ref: "Referrals", s_nurse: "Nursing Services", s_rad: "Radiology", s_lab: "Laboratory", s_iv: "IV Therapy", s_leave: "Sick Leave",
      d_leave: "Issue a sick leave certificate for this patient.", p_leave: "Issue a sick leave certificate for this patient.",
      lvNeed: "Does the patient need a sick leave?", yes: "Yes", no: "No", lvName: "Patient Name", lvId: "ID Number", lvDob: "Date of Birth", lvEntity: "Issuing Entity", lvEntityPh: "Select issuing entity",
      lvDoc: "Attending Doctor", lvEmp: "Employer / Workplace", lvEmpPh: "Company, school or government body name", lvDays: "Number of Days", days: "Days", day1: "1 day", daysN: "{n} days", lvStart: "Start Date", lvEnd: "End Date", lvFrom: "From", lvTo: "To", lvSum: "Sick Leave Summary",
      lvCreate: "Create Sick Leave", lvUpdate: "Update Sick Leave", lvNoSave: "Save: No Sick Leave", lvRemove: "Remove Sick Leave", lvReq: "Fill in the required fields.", lvDaysErr: "Enter 1 to {m} days.",
      lvAdded: "Sick leave added to the visit orders.", lvUpd: "Sick leave updated.", lvRemoved: "Sick leave removed.", lvNoneOk: "Saved: no sick leave for this visit.", lvIssued: "Sick leave is in the visit orders. Changes here update it.",
      lvNoInfo: "Fill in the patient details in Arrival Confirmation.", lvNo: "No sick leave will be issued for this visit.",
      d_ref: "Refer to another specialty or healthcare provider.", d_nurse: "Request nursing procedures and home care services.", d_rad: "Request available imaging examinations.",
      d_lab: "Order individual tests or lab packages.", d_iv: "Intravenous fluids and related treatment orders.",
      p_ref: "Create one or more referrals for this visit.", p_nurse: "Select nursing procedures and home care services for this visit.", p_rad: "Select imaging examinations for this visit.",
      p_lab: "Select lab tests or packages for this visit.", p_iv: "Select IV fluids and treatments for this visit.",
      cart: "Visit Orders", cartN: "Visit Orders ({n})", openCart: "Open visit orders", emptyT: "No orders added yet", emptyS: "Select a service above to add medical orders for this visit. You can add one or more orders across different services.",
      total: "Total ({n} orders)", total1: "Total (1 order)", backHub: "Back to Orders & Services", clearCart: "Clear All Orders", clearAsk: "Remove all {n} orders from this visit?", cleared: "All orders removed.",
      noPrice: "Prices are not shown here. The patient sees the cost of these orders.", none: "No orders needed for this visit",
      searchPh: "Search {s}...", allCats: "All", noMatch: "Nothing matches your search.", add: "Add", added: "Added", addNote: "Add note", editNote: "Edit note", optional: "(Optional)",
      notesT: "Doctor Notes", notesS: "Add specific instructions or notes for the team.", notePh: "e.g. site, special instructions, frequency, or any relevant notes...", cancel: "Cancel", addCart: "Add to Orders", saveNote: "Save Note",
      addedT: "{n} added to the visit orders.", removedT: "{n} removed.", remove: "Remove", edit: "Edit", close: "Close",
      // referrals
      newRef: "Add New Referral", editRef: "Edit Referral", spec: "Specialty", specPh: "Select specialty", priority: "Priority", routine: "Routine", urgent: "Urgent",
      reason: "Reason for Referral", reasonPh: "Briefly explain why the patient needs referral...", rec: "Clinical Recommendation", recPh: "What should the receiving clinician assess or do?",
      dest: "Referral Destination", mada: "MADA CARE service", ext: "External healthcare provider", provider: "Preferred Provider", providerPh: "Select provider", extPh: "Hospital or clinic name",
      notes: "Additional Notes", notesPh: "Any additional information...", addRef: "Add Referral", updRef: "Update Referral", refReq: "Fill in the required fields.", refAdded: "Referral to {n} added.", refUpd: "Referral updated.",
      refList: "Added Referrals for This Visit", noRefs: "No referrals added yet.", th_spec: "Specialty", th_reason: "Reason for Referral", th_rec: "Recommendation", th_pri: "Priority", th_dest: "Destination",
      radSearch: "Search radiology services...", thService: "Service", thCode: "Code", thLoc: "Location", select: "Select", home: "Home", center: "Center",
      availHome: "Available at Home", availCenter: "Available at Center", desc: "Service Description", body: "Body Part", bodyPh: "Select body part", ind: "Clinical Indication",
      indPh: "e.g. cough, shortness of breath, fever...", instr: "Special Instructions", instrPh: "e.g. portable, patient position, specific view...", updR: "Update", radUpd: "Radiology order updated.",
      radReq: "Choose the body part and write the clinical indication.", pickRad: "Select a service from the list to see its details and add it.", radList: "Added Radiology Services for This Visit",
      noRad: "No radiology services added yet.", th_body: "Body Part", th_ind: "Clinical Indication", clearSvc: "Clear", clearSvcAsk: "Remove all {n} {s} orders?",
      tabTests: "Individual Tests", tabPkg: "Test Packages", labSearch: "Search by test name or code...", pkgSearch: "Search by package name or code...", viewTests: "View Tests", details: "Details",
      pkgName: "Package Name", testName: "Test Name", inclT: "Tests included in this package", inPkg: "In {c}", inPkgT: "{n} is already included in {c}.", pkgMerged: "Removed {n} item(s) already included in {c}.",
      labList: "Added Laboratory Tests for This Visit", noLab: "No lab tests added yet.", nTests: "{n} tests", nItems: "{n} items", mins: "{n} min", infTime: "infusion time {n} min",
      iv_tabTests: "Fluids & Additives", iv_tabPkg: "IV Packages", iv_labSearch: "Search by fluid, vitamin, medicine or code...", iv_viewTests: "View Contents", iv_inclT: "Included in this package",
      iv_testName: "Item", iv_labList: "Added IV Therapy for This Visit", iv_noLab: "No IV therapy added yet.",
      sar: "SAR", thPrice: "Price", pkgPrice: "Package price", noFee: "No fee",
      payT: "Payment", ordersTotal: "Orders total", paidT: "Paid", dueT: "Amount due", refundT: "Refund due",
      ps_open: "Payment open", ps_part: "Partly paid", ps_paid: "Paid", ps_refund: "Refund due", ps_none: "",
      openNote: "You can carry on with the visit. The payment stays open until you collect it.", collect: "Collect {n}", refundNote: "The orders total went down after payment. Refund {n} to the patient.",
      collectT: "Collect Payment", collectS: "Take the payment from the patient, then confirm.", methodT: "Payment method", pm_cash: "Cash", pm_card: "Card (mada terminal)",
      sendPt: "Send to Patient", sendT: "Send the Orders to the Patient", sendS: "The patient gets a link with a clear summary of the orders and can pay from it.",
      phoneT: "Patient mobile", msgT: "Message", msgLang: "Message language", viaWa: "WhatsApp", viaSms: "SMS", viaQr: "QR Code", copyMsg: "Copy Message", qrT: "Let the patient scan this code", qrS: "They point the phone camera at the code and their payment page opens.", qrDue: "Amount due", qrBack: "Back to message", qrSave: "Save image", qrLoad: "Preparing the code…", qrErr: "Couldn't load the QR code. Check the internet and try again.", ch_qr: "QR code", shareT: "Share", preview: "Preview Patient Page",
      copied: "Message copied. Paste it in the chat with the patient.", badPhone: "Enter a valid Saudi mobile number (05XXXXXXXX).", sentOk: "Sent. The payment updates here once the patient pays.",
      linkSent: "Link sent by {c} · {t}", linkOpened: "Opened by the patient · {t}", linkNotOpened: "Not opened yet", ch_wa: "WhatsApp", ch_sms: "SMS", ch_copy: "copied message", ch_share: "share",
      pm_link: "Payment link", via_apple: "Apple Pay", via_card: "mada / card", via_tamara: "Tamara", via_tabby: "Tabby",
      m_head: "💚 Mada Care | Payment request", m_hi: "Hello {n},", m_body: "Following the doctor's assessment, you can view your order details and complete the payment here:", m_thanks2: "Thank you for trusting Mada Care 💚", m_tag: "Caring Like Family",
      m_intro: "Here is a summary of the orders from your visit with {d} at Mada Care:", m_due: "Amount due: {n}", m_link: "See the details and pay here:", m_free: "no fee",
      m_leave: "Sick leave · {n} days", m_leave1: "Sick leave · 1 day", m_ref: "Referral to {s}", m_thanks: "Wishing you good health.",
      receivedT: "Amount received", shortT: "The amount received is less than the amount due.", changeT: "Change {n}", refNo: "Approval no.", refPh: "From the terminal receipt",
      confirmCash: "The patient paid {n} in cash and I received it.", confirmCard: "The card payment of {n} was approved on the terminal.", confirmPay: "Confirm Payment",
      payNeedOk: "Tick the confirmation to record the payment.", paidOk: "Payment of {n} recorded.", undoPay: "Undo payment", undoAsk: "Remove this payment of {n}?", undone: "Payment removed.",
      guideT: "Referral Guidelines", guide: ["Select the appropriate specialty.", "Provide a clear reason for referral.", "Include any relevant clinical recommendations.", "Choose the referral destination.", "You can add multiple referrals for this visit."],
      prev: "Previous", draft: "Save as Draft", saveCont: "Save & Continue", draftSaved: "Orders saved as draft.", saved: "Orders & services saved.", needOrder: "Add at least one order, or tick \"No orders needed\".",
      pendingRef: "Add or clear the referral you are writing first.", savedInfo: "Orders saved at {t}. You can still update them.", storeErr: "Could not save. Browser storage is full."
    },
    ar: {
      title: "الطلبات والخدمات", sub: "أضف الطلبات الطبية لهذه الزيارة وتابعها.", stepOf: "الخطوة {n} من {m}",
      s_ref: "التحويلات", s_nurse: "خدمات التمريض", s_rad: "الأشعة", s_lab: "المختبر", s_iv: "العلاج الوريدي", s_leave: "الإجازة المرضية",
      d_leave: "إصدار إجازة مرضية للمريض.", p_leave: "أصدر إجازة مرضية لهذا المريض.",
      lvNeed: "هل يحتاج المريض إجازة مرضية؟", yes: "نعم", no: "لا", lvName: "اسم المريض", lvId: "رقم الهوية", lvDob: "تاريخ الميلاد", lvEntity: "جهة الإصدار", lvEntityPh: "اختر جهة الإصدار",
      lvDoc: "الطبيب المعالج", lvEmp: "جهة العمل", lvEmpPh: "اسم الشركة أو المدرسة أو الجهة الحكومية", lvDays: "عدد الأيام", days: "أيام", day1: "يوم واحد", daysN: "{n} أيام", lvStart: "تاريخ البداية", lvEnd: "تاريخ النهاية", lvFrom: "من", lvTo: "إلى", lvSum: "ملخص الإجازة المرضية",
      lvCreate: "إنشاء الإجازة المرضية", lvUpdate: "تحديث الإجازة المرضية", lvNoSave: "حفظ: بدون إجازة", lvRemove: "حذف الإجازة", lvReq: "عبّ الحقول المطلوبة.", lvDaysErr: "اكتب من 1 إلى {m} يوم.",
      lvAdded: "انضافت الإجازة المرضية لطلبات الزيارة.", lvUpd: "تم تحديث الإجازة المرضية.", lvRemoved: "انحذفت الإجازة المرضية.", lvNoneOk: "تم الحفظ: بدون إجازة مرضية لهذه الزيارة.", lvIssued: "الإجازة موجودة في طلبات الزيارة. أي تعديل هنا يحدّثها.",
      lvNoInfo: "أكمل بيانات المريض في تأكيد الوصول.", lvNo: "ما راح تنصدر إجازة مرضية لهذه الزيارة.",
      d_ref: "تحويل لتخصص آخر أو جهة صحية ثانية.", d_nurse: "اطلب إجراءات تمريضية وخدمات رعاية منزلية.", d_rad: "اطلب فحوصات الأشعة المتاحة.",
      d_lab: "اطلب تحاليل منفردة أو باقات تحاليل.", d_iv: "المحاليل الوريدية وطلبات العلاج المرتبطة بها.",
      p_ref: "أضف تحويل أو أكثر لهذه الزيارة.", p_nurse: "اختر الإجراءات التمريضية وخدمات الرعاية المنزلية لهذه الزيارة.", p_rad: "اختر فحوصات الأشعة لهذه الزيارة.",
      p_lab: "اختر التحاليل أو الباقات لهذه الزيارة.", p_iv: "اختر المحاليل والعلاجات الوريدية لهذه الزيارة.",
      cart: "طلبات الزيارة", cartN: "طلبات الزيارة ({n})", openCart: "عرض طلبات الزيارة", emptyT: "ما أضيفت طلبات للحين", emptyS: "اختر خدمة من فوق عشان تضيف طلبات طبية لهذه الزيارة. تقدر تضيف أكثر من طلب من خدمات مختلفة.",
      total: "الإجمالي ({n} طلبات)", total1: "الإجمالي (طلب واحد)", backHub: "رجوع للطلبات والخدمات", clearCart: "مسح كل الطلبات", clearAsk: "تبي تحذف كل الطلبات ({n}) من هذه الزيارة؟", cleared: "تم حذف كل الطلبات.",
      noPrice: "الأسعار ما تظهر هنا. المريض هو اللي يشوف تكلفة الطلبات.", none: "ما تحتاج هذه الزيارة أي طلبات",
      searchPh: "ابحث في {s}...", allCats: "الكل", noMatch: "ما فيه نتائج مطابقة.", add: "إضافة", added: "مضاف", addNote: "إضافة ملاحظة", editNote: "تعديل الملاحظة", optional: "(اختياري)",
      notesT: "ملاحظات الطبيب", notesS: "أضف تعليمات أو ملاحظات للفريق.", notePh: "مثال: مكان الإعطاء، تعليمات خاصة، التكرار، أو أي ملاحظات مهمة...", cancel: "إلغاء", addCart: "إضافة للطلبات", saveNote: "حفظ الملاحظة",
      addedT: "تمت إضافة {n} لطلبات الزيارة.", removedT: "تم حذف {n}.", remove: "حذف", edit: "تعديل", close: "إغلاق",
      newRef: "إضافة تحويل جديد", editRef: "تعديل التحويل", spec: "التخصص", specPh: "اختر التخصص", priority: "الأولوية", routine: "عادي", urgent: "عاجل",
      reason: "سبب التحويل", reasonPh: "اكتب باختصار ليش يحتاج المريض تحويل...", rec: "التوصية السريرية", recPh: "وش المطلوب من الطبيب المستقبل يقيّمه أو يسويه؟",
      dest: "جهة التحويل", mada: "خدمة من مدى كير", ext: "جهة صحية خارجية", provider: "مقدم الخدمة المفضل", providerPh: "اختر مقدم الخدمة", extPh: "اسم المستشفى أو العيادة",
      notes: "ملاحظات إضافية", notesPh: "أي معلومات إضافية...", addRef: "إضافة التحويل", updRef: "تحديث التحويل", refReq: "عبّ الحقول المطلوبة.", refAdded: "تمت إضافة تحويل إلى {n}.", refUpd: "تم تحديث التحويل.",
      refList: "التحويلات المضافة لهذه الزيارة", noRefs: "ما أضيف تحويل للحين.", th_spec: "التخصص", th_reason: "سبب التحويل", th_rec: "التوصية", th_pri: "الأولوية", th_dest: "الجهة",
      radSearch: "ابحث في خدمات الأشعة...", thService: "الخدمة", thCode: "الرمز", thLoc: "المكان", select: "اختيار", home: "المنزل", center: "المركز",
      availHome: "متاحة في المنزل", availCenter: "متاحة في المركز", desc: "وصف الخدمة", body: "منطقة الفحص", bodyPh: "اختر منطقة الفحص", ind: "الدواعي السريرية",
      indPh: "مثال: كحة، ضيق تنفس، حرارة...", instr: "تعليمات خاصة", instrPh: "مثال: متنقلة، وضعية المريض، زاوية معينة...", updR: "تحديث", radUpd: "تم تحديث طلب الأشعة.",
      radReq: "اختر منطقة الفحص واكتب الدواعي السريرية.", pickRad: "اختر خدمة من القائمة عشان تشوف تفاصيلها وتضيفها.", radList: "خدمات الأشعة المضافة لهذه الزيارة",
      noRad: "ما أضيفت أشعة للحين.", th_body: "منطقة الفحص", th_ind: "الدواعي السريرية", clearSvc: "مسح", clearSvcAsk: "تبي تحذف كل طلبات {s} ({n})؟",
      tabTests: "تحاليل منفردة", tabPkg: "باقات التحاليل", labSearch: "ابحث باسم التحليل أو الرمز...", pkgSearch: "ابحث باسم الباقة أو الرمز...", viewTests: "عرض التحاليل", details: "التفاصيل",
      pkgName: "اسم الباقة", testName: "اسم التحليل", inclT: "التحاليل اللي في الباقة", inPkg: "ضمن {c}", inPkgT: "{n} موجود ضمن {c}.", pkgMerged: "انحذف {n} من القائمة لأنها موجودة ضمن {c}.",
      labList: "التحاليل المضافة لهذه الزيارة", noLab: "ما أضيفت تحاليل للحين.", nTests: "{n} تحاليل", nItems: "{n} عناصر", mins: "{n} دقيقة", infTime: "مدة التسريب {n} دقيقة",
      iv_tabTests: "المحاليل والإضافات", iv_tabPkg: "الباقات الوريدية", iv_labSearch: "ابحث بالمحلول أو الفيتامين أو الدواء أو الرمز...", iv_viewTests: "عرض المحتويات", iv_inclT: "محتويات الباقة",
      iv_testName: "العنصر", iv_labList: "العلاج الوريدي المضاف لهذه الزيارة", iv_noLab: "ما أضيف علاج وريدي للحين.",
      sar: "ر.س", thPrice: "السعر", pkgPrice: "سعر الباقة", noFee: "بدون رسوم",
      payT: "الدفع", ordersTotal: "إجمالي الطلبات", paidT: "المدفوع", dueT: "المبلغ المستحق", refundT: "مبلغ مسترجع",
      ps_open: "الدفع مفتوح", ps_part: "مدفوع جزئياً", ps_paid: "مدفوع", ps_refund: "استرجاع مستحق", ps_none: "",
      openNote: "تقدر تكمل الزيارة عادي. الدفع يبقى مفتوح لين تحصّله.", collect: "تحصيل {n}", refundNote: "إجمالي الطلبات نقص بعد الدفع. رجّع {n} للمريض.",
      collectT: "تحصيل الدفع", collectS: "استلم المبلغ من المريض وبعدين أكّد.", methodT: "طريقة الدفع", pm_cash: "كاش", pm_card: "شبكة (جهاز مدى)",
      sendPt: "إرسال للمريض", sendT: "إرسال الطلبات للمريض", sendS: "يوصل المريض رابط فيه ملخص واضح للطلبات ويقدر يدفع منه.",
      phoneT: "جوال المريض", msgT: "الرسالة", msgLang: "لغة الرسالة", viaWa: "واتساب", viaSms: "رسالة SMS", viaQr: "كود QR", copyMsg: "نسخ الرسالة", qrT: "خلّ المريض يصوّر الكود", qrS: "يوجّه كاميرا الجوال على الكود، وتفتح له صفحة الدفع حقته مباشرة.", qrDue: "المبلغ المستحق", qrBack: "رجوع للرسالة", qrSave: "حفظ الصورة", qrLoad: "جاري تجهيز الكود…", qrErr: "ما قدرنا نجهّز الكود. تأكد من الإنترنت وحاول مرة ثانية.", ch_qr: "كود QR", shareT: "مشاركة", preview: "معاينة صفحة المريض",
      copied: "تم نسخ الرسالة. الصقها في المحادثة مع المريض.", badPhone: "اكتب رقم جوال سعودي صحيح (05XXXXXXXX).", sentOk: "تم الإرسال. الدفع يتحدث هنا أول ما يدفع المريض.",
      linkSent: "أُرسل الرابط عبر {c} · {t}", linkOpened: "فتحه المريض · {t}", linkNotOpened: "ما فتحه المريض للحين", ch_wa: "واتساب", ch_sms: "رسالة SMS", ch_copy: "نسخ الرسالة", ch_share: "المشاركة",
      pm_link: "رابط الدفع", via_apple: "Apple Pay", via_card: "مدى / بطاقة", via_tamara: "تمارا", via_tabby: "تابي",
      m_head: "💚 مدى كير | طلب دفع", m_hi: "مرحبًا {n}،", m_body: "بناءً على تقييم الطبيب، يمكنك الاطلاع على تفاصيل الطلب وإتمام الدفع عبر الرابط التالي:", m_thanks2: "شكرًا لثقتك بمدى كير 💚", m_tag: "نرعاكم كأهلنا",
      m_intro: "هذا ملخص الطلبات من زيارتك مع {d} في مدى كير:", m_due: "المبلغ المطلوب: {n}", m_link: "التفاصيل والدفع من هنا:", m_free: "بدون رسوم",
      m_leave: "إجازة مرضية · {n} أيام", m_leave1: "إجازة مرضية · يوم واحد", m_leave2: "إجازة مرضية · يومين", m_leaveN: "إجازة مرضية · {n} يوم", m_ref: "تحويل إلى {s}", m_thanks: "نتمنى لك الصحة والعافية.",
      receivedT: "المبلغ المستلم", shortT: "المبلغ المستلم أقل من المستحق.", changeT: "الباقي {n}", refNo: "رقم الموافقة", refPh: "من إيصال الجهاز",
      confirmCash: "المريض دفع {n} كاش واستلمته.", confirmCard: "تمت الموافقة على دفع {n} بالشبكة في الجهاز.", confirmPay: "تأكيد الدفع",
      payNeedOk: "أشّر على التأكيد عشان ينحفظ الدفع.", paidOk: "تم تسجيل دفع {n}.", undoPay: "إلغاء الدفعة", undoAsk: "تبي تلغي دفعة {n}؟", undone: "تم إلغاء الدفعة.",
      guideT: "إرشادات التحويل", guide: ["اختر التخصص المناسب.", "اكتب سبب واضح للتحويل.", "أضف أي توصيات سريرية مهمة.", "اختر جهة التحويل.", "تقدر تضيف أكثر من تحويل لهذه الزيارة."],
      prev: "السابق", draft: "حفظ كمسودة", saveCont: "حفظ ومتابعة", draftSaved: "تم حفظ الطلبات كمسودة.", saved: "تم حفظ الطلبات والخدمات.", needOrder: "أضف طلب واحد على الأقل، أو اختر \"ما تحتاج هذه الزيارة أي طلبات\".",
      pendingRef: "أضف التحويل اللي تكتبه أو امسحه أول.", savedInfo: "تم حفظ الطلبات {t}. تقدر تعدلها.", storeErr: "ما قدرنا نحفظ، مساحة التخزين في المتصفح ممتلئة."
    }
  };

  let draft = null, forId = null, lang = "en", ctx = null, page = "hub", cat = {}, q = "", drawer = false, modal = null, rf = null, rEdit = -1, rTried = false;
  let curO = null, payM = null, shM = null, lv = null, lvTr = false;
  let rSel = null, rForm = null, rCat = "all", rTr = false, labTab = "tests", lCat = "all", pkgView = null;
  const t = () => L[lang];
  const tx = (k, v) => t()[k].replace(/\{(\w+)\}/g, (_, n) => v[n]);
  const S = (p, w) => ctx.svg(p, w), E = s => ctx.esc(s);
  const ix = lang2 => lang2 === "ar" ? 1 : 0;
  const blankRef = () => ({ spec: "", priority: "routine", reason: "", rec: "", dest: "mada", provider: "", notes: "" });
  const reset = () => { shM = null; draft = null; forId = null; page = "hub"; cat = {}; q = ""; drawer = false; modal = null; rf = blankRef(); rEdit = -1; rTried = false; rSel = null; rForm = null; rCat = "all"; rTr = false; labTab = "tests"; lCat = "all"; pkgView = null; payM = null; lv = null; lvTr = false; };
  reset();
  // Any catalogue code as { svc, code, en, ar, about: [en, ar], price }.
  function item(code) {
    for (const k in SVC) { const r = SVC[k].items.find(i => i[0] === code); if (r) return { svc: k, code, en: r[2], ar: r[3], about: [r[4], r[5]], price: r[6] }; }
    const rd = RAD.find(x => x.code === code); if (rd) return { svc: "rad", code, en: rd.en, ar: rd.ar, about: rd.sub, price: rd.price };
    const lb = LAB.find(x => x[0] === code); if (lb) return { svc: "lab", code, en: lb[2], ar: lb[3], about: [LCATS.find(c => c[0] === lb[1])[1], LCATS.find(c => c[0] === lb[1])[2]], price: lb[4] };
    const iv = IVS.find(x => x[0] === code); if (iv) return { svc: "iv", code, en: iv[2], ar: iv[3], about: [ICATS.find(c => c[0] === iv[1])[1], ICATS.find(c => c[0] === iv[1])[2]], price: iv[4] };
    const pk = ALLPKG.find(x => x.code === code);
    if (pk) { const isIv = IVPKG.includes(pk); return { svc: isIv ? "iv" : "lab", code, en: pk.en, ar: pk.ar, about: isIv ? [`IV package · ${pk.tests.length} items`, `باقة وريدية · ${pk.tests.length} عناصر`] : [`Package · ${pk.tests.length} tests`, `باقة · ${pk.tests.length} تحاليل`], price: pk.price }; }
    return null;
  }
  const nameOf = o => o.svc === "leave" ? t().s_leave : o.svc === "ref" ? specName(o.spec) : (r => r ? r[lang] : o.code)(item(o.code));
  const partName = id => P[id] ? P[id][ix(lang)] : id;
  const specName = id => { const s = SPECS.find(x => x[0] === id); return s ? s[1 + ix(lang)] : id; };
  const provName = o => o.dest === "ext" ? o.provider : (p => p ? p[1 + ix(lang)] : "")(PROVIDERS.find(x => x[0] === o.provider));
  const countOf = svc => draft.items.filter(o => o.svc === svc).length;
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  function load(o) {
    if (draft && forId === o.id) return;
    const dv = o.doctorVisit || {}, src = dv.ordersDraft || (dv.steps && dv.steps.orders);
    draft = JSON.parse(JSON.stringify({ items: [], none: false, ...(src || {}) }));
    forId = o.id;
  }
  const clean = () => JSON.parse(JSON.stringify({ items: draft.items, none: !draft.items.length && draft.none, noLeave: !!draft.noLeave && !draft.items.some(o => o.svc === "leave") }));
  // Keep every change in the draft so moving between service pages never loses an order.
  function keep() { try { ctx.saveDraft(clean()); } catch (e) { ctx.toast(e.message || t().storeErr); } }

  const head = (c, icon, title, sub) => `<div class="ex-top"><span class="ex-tic">${S(icon)}</span><div><h1>${title}</h1><p>${sub}</p></div><span class="ex-stp">${tx("stepOf", c.stepOf)}</span></div>`;
  const cartBtn = () => `<button type="button" class="or-fab" id="orCart" aria-label="${E(t().openCart)}">${S(I.cart, 2)}<span>${t().cart}</span><b>${draft.items.length}</b></button>`;

  // One order line, used by the hub list and the cart drawer.
  function line(o, n) {
    if (o.svc === "leave") return `<li class="or-li"><span class="or-ln">${n}</span><div class="or-lt"><b>${t().s_leave} · ${daysTxt(o.days)}</b>
        <small dir="ltr" class="or-lvd">${fmtD(o.start)} → ${fmtD(o.end)}</small><small>${E([entName(o.entity), o.employer].filter(Boolean).join(" · "))}</small></div>
        <span class="or-pr muted">${t().noFee}</span>
        <span class="or-la"><button type="button" class="or-ib" data-go="leave" aria-label="${t().edit}">${S(I.pen)}</button><button type="button" class="or-ib del" data-rm="${o.uid}" aria-label="${t().remove}">${S(I.trash)}</button></span></li>`;
    if (o.svc === "ref") return `<li class="or-li"><span class="or-ln">${n}</span><div class="or-lt"><b>${E(specName(o.spec))} <span class="or-pri ${o.priority}">${t()[o.priority]}</span></b>
        <small>${E(o.reason)}</small><small class="or-dst">${o.dest === "ext" ? t().ext : t().mada}${provName(o) ? ` · ${E(provName(o))}` : ""}</small></div>
        <span class="or-pr muted">${t().noFee}</span>
        <span class="or-la"><button type="button" class="or-ib" data-redit="${o.uid}" aria-label="${t().edit}">${S(I.pen)}</button><button type="button" class="or-ib del" data-rm="${o.uid}" aria-label="${t().remove}">${S(I.trash)}</button></span></li>`;
    if (o.svc === "rad") return `<li class="or-li"><span class="or-ln">${n}</span><div class="or-lt"><span class="or-code">${E(o.code)}</span><b>${E(nameOf(o))} ${locTag(o.loc)}</b>
        <small>${E([partName(o.body), o.ind].filter(Boolean).join(" · "))}</small>${o.instr ? `<small class="or-note">${S(I.note)}<span>${E(o.instr)}</span></small>` : ""}</div>
        <span class="or-pr">${money(price(o))}</span><span class="or-la"><button type="button" class="or-ib" data-radedit="${o.uid}" aria-label="${t().edit}">${S(I.pen)}</button><button type="button" class="or-ib del" data-rm="${o.uid}" aria-label="${t().remove}">${S(I.trash)}</button></span></li>`;
    const pk = ALLPKG.find(x => x.code === o.code);
    return `<li class="or-li"><span class="or-ln">${n}</span><div class="or-lt"><span class="or-code">${E(o.code)}</span><b>${E(nameOf(o))}</b>
        ${pk ? `<small>${tx(o.svc === "iv" ? "nItems" : "nTests", { n: pk.tests.length })}${pk.time ? ` · ${tx("mins", { n: pk.time })}` : ""}</small>` : ""}
        ${o.note ? `<small class="or-note">${S(I.note)}<span>${E(o.note)}</span></small>` : ""}
        <button type="button" class="or-nb" data-note="${o.uid}">${S(I.note)}${o.note ? t().editNote : t().addNote} <span class="hx-opt">${o.note ? "" : t().optional}</span></button></div>
        <span class="or-pr">${money(price(o))}</span><span class="or-la"><button type="button" class="or-ib del" data-rm="${o.uid}" aria-label="${t().remove}">${S(I.trash)}</button></span></li>`;
  }
  function groups() {
    let n = 0;
    return ORDER.filter(countOf).map(svc => `<div class="or-grp"><div class="or-gh ${svc}"><span class="or-gic">${S(I[svc])}</span><b>${t()["s_" + svc]}</b><span class="or-cnt">${countOf(svc)}</span></div>
      <ol class="or-list">${draft.items.filter(o => o.svc === svc).map(o => line(o, ++n)).join("")}</ol></div>`).join("");
  }
  const totalText = () => draft.items.length === 1 ? t().total1 : tx("total", { n: draft.items.length });
  const money = n => `${Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })} ${t().sar}`;
  const price = o => o.svc === "ref" || o.svc === "leave" ? 0 : Number(o.price || (item(o.code) || {}).price || 0);
  // Payment state for a list of orders and the visit's payment record.
  function payOf(items, pay) {
    const total = items.reduce((s2, o) => s2 + price(o), 0), entries = (pay && pay.entries) || [];
    const paid = entries.reduce((s2, e) => s2 + Number(e.amount || 0), 0), due = Math.round((total - paid) * 100) / 100;
    return { total, paid, due, entries, status: !total && !paid ? "none" : due > 0 ? (paid ? "part" : "open") : due < 0 ? "refund" : "paid" };
  }
  const payNow = () => payOf(draft.items, (curO && curO.doctorVisit || {}).payment);
  const payTag = ps => `<span class="or-ps ${ps.status}">${S(ps.status === "paid" ? I.check : I.clock, 2.2)}${t()["ps_" + ps.status]}</span>`;
  function paySection() {
    const ps = payNow(); if (ps.status === "none") return "";
    const when = d => new Date(d).toLocaleString(ctx.loc(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    return `<section class="or-pay ${ps.status}" id="orPay"><div class="or-ch"><span class="or-chi pay">${S(I.wallet)}</span><h2>${t().payT}</h2>${payTag(ps)}</div>
      <dl class="or-sum"><div><dt>${t().ordersTotal}</dt><dd>${money(ps.total)}</dd></div><div><dt>${t().paidT}</dt><dd>${money(ps.paid)}</dd></div>
        <div class="big"><dt>${ps.due < 0 ? t().refundT : t().dueT}</dt><dd>${money(Math.abs(ps.due))}</dd></div></dl>
      ${ps.entries.length ? `<ul class="or-pays">${ps.entries.map(e => `<li><span class="or-pm ${e.method}">${S(e.method === "cash" ? I.cash : I.card)}</span><span class="or-pt"><b>${money(e.amount)} · ${e.channel === "link" ? t().pm_link + (e.via ? " · " + t()["via_" + e.via] : "") : t()["pm_" + e.method]}</b>
          <small>${E(when(e.at))} · ${E((e.by && typeof e.by === "object" ? e.by[lang] : e.by) || "")}${e.ref ? ` · ${t().refNo} ${E(e.ref)}` : ""}${e.method === "cash" && e.received > e.amount ? ` · ${tx("changeT", { n: money(e.received - e.amount) })}` : ""}</small></span>
          <button type="button" class="or-ib del" data-unpay="${e.id}" aria-label="${t().undoPay}" title="${t().undoPay}">${S(I.undo)}</button></li>`).join("")}</ul>` : ""}
      ${ps.due > 0 ? `<div class="or-pa"><p>${S(I.info)}<span>${t().openNote}</span></p><span class="or-pab"><button type="button" class="hx-btn out" id="orSend">${S(I.send)}${t().sendPt}</button><button type="button" class="hx-btn dark" id="orCollect">${S(I.card)}${tx("collect", { n: money(ps.due) })}</button></span></div>${linkLine(when)}` : ""}
      ${ps.due < 0 ? `<p class="or-rf">${S(I.info)}<span>${tx("refundNote", { n: money(-ps.due) })}</span></p>` : ""}
    </section>`;
  }
  // Payment link sent to the patient (visit-pay.html): doctorVisit.payLink = { token, createdAt, sent: [{ ch, at, by }], opens, openedAt, lastOpenAt }.
  const payLink = () => (curO && curO.doctorVisit || {}).payLink || null;
  function linkLine(when) {
    const pl = payLink(), last = pl && (pl.sent || []).slice(-1)[0]; if (!last) return "";
    return `<p class="or-lk">${S(I.send)}<span>${E(tx("linkSent", { c: t()["ch_" + last.ch], t: when(last.at) }))} · <b class="${pl.openedAt ? "ok" : ""}">${E(pl.openedAt ? tx("linkOpened", { t: when(pl.lastOpenAt || pl.openedAt) }) : t().linkNotOpened)}</b></span></p>`;
  }
  // Sick leave in words, with the Arabic count forms (1, 2, 3-10, 11+).
  const leaveTxt = (M, n) => { n = Number(n); return n === 1 ? M.m_leave1 : n === 2 && M.m_leave2 ? M.m_leave2 : (n > 10 && M.m_leaveN ? M.m_leaveN : M.m_leave).replace("{n}", n); };
  const newToken = () => { const a = new Uint8Array(16); crypto.getRandomValues(a); return [...a].map(b => b.toString(16).padStart(2, "0")).join(""); };
  // Short link for messages: v?TOKEN (Arabic) or v?TOKEN.en; v.html opens visit-pay.html. GitHub Pages serves v.html at /v.
  const linkUrl = ml => new URL(`${/github\.io$/.test(location.hostname) ? "v" : "v.html"}?${payLink().token}${ml === "ar" ? "" : "." + ml}`, location.href).href;
  // Saudi mobile as 9665XXXXXXXX (for WhatsApp), or "" when it is not one.
  function waNum(v) {
    const d = String(v || "").replace(/[٠-٩]/g, c => "٠١٢٣٤٥٦٧٨٩".indexOf(c)).replace(/\D/g, "");
    const m = d.match(/^(?:00966|966|0)?(5\d{8})$/); return m ? "966" + m[1] : "";
  }
  // The message: Amjad's short template; what was ordered and the amount are on the link page.
  function shareMsg(ml) {
    const M = L[ml], nm = v => v && typeof v === "object" ? v[ml] || v.en || "" : v || "";
    const first = nm(curO.patient).trim().split(/\s+/)[0] || "";
    return [M.m_head, "", M.m_hi.replace(" {n}", first ? " " + first : ""), "", M.m_body, "", "🔗 " + linkUrl(ml), "", M.m_thanks2, M.m_tag].join("\n");
  }
  // QR view: the patient scans the code with the phone camera and the same payment link opens (language as chosen).
  function qrBody() {
    const m = shM, nm = v => v && typeof v === "object" ? v[m.ml] || v.en || "" : v || "", url = linkUrl(m.ml);
    return `<div class="or-mb or-qr">
        <div class="or-pills">${["ar", "en"].map(k => `<button type="button" class="or-pill ${m.ml === k ? "on" : ""}" data-ml="${k}" aria-pressed="${m.ml === k}"><span class="or-rd">${m.ml === k ? S(I.check, 3) : ""}</span>${k === "ar" ? "العربية" : "English"}</button>`).join("")}</div>
        <div class="or-qrc"><div class="or-qrb" id="orQr">${window.MadaQR ? MadaQR.svg(url) : `<span class="or-qrw">${t().qrLoad}</span>`}</div>${window.MadaQR ? `<img class="or-qrl" src="assets/mada-logo.png" alt="">` : ""}</div>
        <b class="or-qrt">${t().qrT}</b><small class="or-qrs">${t().qrS}</small>
        <div class="or-qri"><span>${E(nm(curO.patient))}</span><span>${t().qrDue}: <b>${money(payNow().due)}</b></span></div>
        <a class="or-prev" href="${E(url)}" target="_blank" rel="noopener">${S(I.eye)}${t().preview}</a>
      </div>
      <div class="or-mf or-shb"><button type="button" class="hx-btn out" id="orQrBack">${t().qrBack}</button><button type="button" class="hx-btn dark" id="orQrSave" ${window.MadaQR ? "" : "disabled"}>${S(I.dl)}${t().qrSave}</button></div>`;
  }
  function shareModal() {
    const m = shM, ok = !!waNum(m.phone);
    if (m.qr) return `<div class="or-ov" id="orShOv"></div><div class="or-md" role="dialog" aria-modal="true" aria-labelledby="orShT">
      <div class="or-mh"><span class="or-sic pay">${S(I.qr)}</span><div class="or-mt"><b id="orShT">${t().viaQr}</b><small>${t().sendS}</small></div><button type="button" class="or-x" id="orShX" aria-label="${t().close}">${S(I.x, 2.2)}</button></div>${qrBody()}</div>`;
    return `<div class="or-ov" id="orShOv"></div><div class="or-md" role="dialog" aria-modal="true" aria-labelledby="orShT">
      <div class="or-mh"><span class="or-sic pay">${S(I.send)}</span><div class="or-mt"><b id="orShT">${t().sendT}</b><small>${t().sendS}</small></div><button type="button" class="or-x" id="orShX" aria-label="${t().close}">${S(I.x, 2.2)}</button></div>
      <div class="or-mb">
        <div class="pl-f"><label for="orShPh">${t().phoneT}</label><input class="hx-in ${m.tried && !ok ? "bad" : ""}" id="orShPh" value="${E(m.phone)}" inputmode="tel" maxlength="14" dir="ltr" placeholder="05XXXXXXXX"></div>
        <div class="pl-f"><label>${t().msgLang}</label><div class="or-pills">${["ar", "en"].map(k => `<button type="button" class="or-pill ${m.ml === k ? "on" : ""}" data-ml="${k}" aria-pressed="${m.ml === k}"><span class="or-rd">${m.ml === k ? S(I.check, 3) : ""}</span>${k === "ar" ? "العربية" : "English"}</button>`).join("")}</div></div>
        <div class="pl-f"><label for="orShMsg">${t().msgT}</label><textarea class="hx-in or-msg" id="orShMsg" rows="11" dir="${m.ml === "ar" ? "rtl" : "ltr"}">${E(m.msg)}</textarea></div>
        <a class="or-prev" href="${E(linkUrl(m.ml))}" target="_blank" rel="noopener">${S(I.eye)}${t().preview}</a>
      </div>
      <div class="or-mf or-shb">
        <a class="hx-btn or-wa" data-ch="wa" target="_blank" rel="noopener" href="#">${S(I.wa)}${t().viaWa}</a>
        <a class="hx-btn out" data-ch="sms" href="#">${S(I.sms)}${t().viaSms}</a>
        <button type="button" class="hx-btn out" id="orQrOpen">${S(I.qr)}${t().viaQr}</button>
        <button type="button" class="hx-btn out" data-ch="copy">${S(I.copy)}${t().copyMsg}</button>
        ${navigator.share ? `<button type="button" class="hx-btn out" data-ch="share">${S(I.share)}${t().shareT}</button>` : ""}
      </div></div>`;
  }
  function payModal() {
    const ps = payNow(), m = payM, bad = c => m.tried && c ? "bad" : "";
    if (m.received == null) m.received = String(Math.max(ps.due, 0));
    const rec = Number(m.received || 0), short = m.method === "cash" && rec < ps.due;
    return `<div class="or-ov" id="orPyOv"></div><div class="or-md" role="dialog" aria-modal="true" aria-labelledby="orPyT">
      <div class="or-mh"><span class="or-sic pay">${S(I.wallet)}</span><div class="or-mt"><b id="orPyT">${t().collectT}</b><small>${t().collectS}</small></div><button type="button" class="or-x" id="orPyX" aria-label="${t().close}">${S(I.x, 2.2)}</button></div>
      <div class="or-mb">
        <div class="or-due"><span>${t().dueT}</span><b>${money(ps.due)}</b></div>
        <div class="pl-f"><label>${t().methodT} <span class="req">*</span></label><div class="or-pills">${["cash", "card"].map(k => `<button type="button" class="or-pill ${m.method === k ? "on" : ""}" data-pm="${k}" aria-pressed="${m.method === k}"><span class="or-rd">${m.method === k ? S(I.check, 3) : ""}</span>${S(k === "cash" ? I.cash : I.card, 2)}${t()["pm_" + k]}</button>`).join("")}</div></div>
        ${m.method === "cash" ? `<div class="pl-f"><label>${t().receivedT}</label><div class="or-amt"><input class="hx-in ${bad(short)}" id="orPyRec" value="${E(m.received)}" inputmode="decimal" maxlength="8" dir="ltr"><span>${t().sar}</span></div>
            <small class="or-chg ${short ? "bad" : ""}">${short ? t().shortT : rec > ps.due ? tx("changeT", { n: money(rec - ps.due) }) : "&nbsp;"}</small></div>`
          : `<div class="pl-f"><label>${t().refNo} <span class="hx-opt">${t().optional}</span></label><input class="hx-in" id="orPyRef" value="${E(m.ref)}" placeholder="${E(t().refPh)}" maxlength="20" dir="ltr"></div>`}
        <label class="hx-ck or-cf ${bad(!m.ok)}"><input type="checkbox" id="orPyOk" ${m.ok ? "checked" : ""}><span>${tx(m.method === "cash" ? "confirmCash" : "confirmCard", { n: money(ps.due) })}</span></label>
      </div>
      <div class="or-mf"><button type="button" class="hx-btn out" id="orPyCancel">${t().cancel}</button><button type="button" class="hx-btn dark" id="orPyGo">${S(I.check, 2.4)}${t().confirmPay}</button></div></div>`;
  }

  function hubView(o, c) {
    // Follow-up orders after the results (c.followUp, doctor-visit.html?fu=...): the same cart, sent to the operations team.
    // No payment at the visit (the patient pays after the service), no "no orders" tick, and the previous orders above the services.
    const fu = !!c.followUp, saved = !fu && o.doctorVisit && o.doctorVisit.steps && o.doctorVisit.steps.orders;
    const when = saved && new Date(saved.at).toLocaleString(c.loc(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    return `<div class="or">
      ${fu ? head(c, I.cart, c.fuTitle, c.fuSub) + (c.topHtml || "") : head(c, I.cart, t().title, t().sub)}
      ${saved ? `<div class="info ok">${S(I.check, 2.4)}<span>${tx("savedInfo", { t: E(when) })}</span></div>` : ""}
      <div class="or-svcs">${ORDER.map(svc => `<button type="button" class="or-svc ${svc}" data-go="${svc}"><span class="or-sic">${S(I[svc])}</span>
        <span class="or-st"><b>${t()["s_" + svc]}</b><small>${t()["d_" + svc]}</small></span><span class="or-cnt">${countOf(svc)}</span><span class="or-go">${S(I.chev, 2.2)}</span></button>`).join("")}</div>
      <section class="or-cart">
        ${draft.items.length ? `<div class="or-ch"><span class="or-chi">${S(I.cart)}</span><h2>${t().cart}</h2><span class="or-cnt dark">${draft.items.length}</span></div>
          ${groups()}
          <div class="or-tot"><span><b>${totalText()}</b><button type="button" class="or-clrl" id="orClear">${S(I.trash)}${t().clearCart}</button></span><strong>${money(payNow().total)}</strong></div>`
        : `<div class="or-empty"><span class="or-eic">${S(I.clip)}<i>${S(I.plus, 2.6)}</i></span><h2>${t().emptyT}</h2><p>${t().emptyS}</p></div>
          ${fu ? "" : `<label class="hx-ck or-none"><input type="checkbox" id="orNone" ${draft.none ? "checked" : ""}><span>${t().none}</span></label>`}`}
      </section>
      ${fu ? "" : paySection()}
      <div class="ex-foot"><button type="button" class="hx-btn out pl-prevb" id="orPrev"><span class="flip">${S(I.back)}</span><span><b>${t().prev}</b><small>${E(c.prevName || "")}</small></span></button><span class="hx-sp"></span>
        <button type="button" class="hx-btn soft" id="orDraft">${S(I.doc)}${t().draft}</button>
        <button type="button" class="hx-btn dark" id="orSave">${fu ? E(c.fuSave) : t().saveCont}${S(I.arrow)}</button></div>
    </div>`;
  }

  function catalogView(svc) {
    const C = SVC[svc], on = cat[svc] || C.cats[0][0], s = q.trim().toLowerCase();
    const list = C.items.filter(i => s ? [i[0], i[2], i[3], i[4], i[5]].some(v => v.toLowerCase().includes(s)) : i[1] === on);
    const inCart = code => draft.items.some(o => o.code === code);
    const curCat = C.cats.find(x => x[0] === on);
    return `<div class="or-cat">
      <nav class="or-cats" aria-label="${E(t()["s_" + svc])}">${C.cats.map(([id, ic, en, ar]) => `<button type="button" class="or-cb ${!s && id === on ? "on" : ""}" data-cat="${id}"><span class="or-cbi">${S(I[ic])}</span><span><b>${lang === "ar" ? ar : en}</b></span>
        <span class="or-cbn">${C.items.filter(i => i[1] === id && inCart(i[0])).length || ""}</span></button>`).join("")}</nav>
      <div class="or-main">
        <div class="dx-sb">${S(I.search)}<input id="orQ" type="search" value="${E(q)}" placeholder="${E(tx("searchPh", { s: t()["s_" + svc] }))}" autocomplete="off">${q ? `<button type="button" class="dx-clr" id="orQClr" aria-label="${t().close}">${S(I.x, 2.2)}</button>` : ""}</div>
        ${s ? "" : `<div class="or-ct"><b>${lang === "ar" ? curCat[3] : curCat[2]}</b></div>`}
        <ul class="or-items">${list.map(i => { const a = inCart(i[0]); return `<li class="or-it ${a ? "on" : ""}">
          <label class="or-ck"><input type="checkbox" data-tick="${i[0]}" ${a ? "checked" : ""} aria-label="${E(i[2 + ix(lang)])}"></label><span class="or-code">${i[0]}</span>
          <span class="or-itt"><b>${E(i[2 + ix(lang)])}</b><small>${E(i[4 + ix(lang)])}</small></span>
          <span class="or-price">${money(i[6])}</span>${a ? `<span class="or-done">${S(I.check, 2.4)}${t().added}</span>` : `<button type="button" class="or-add" data-add="${i[0]}">${S(I.plus, 2.2)}${t().add}</button>`}</li>`; }).join("") || `<li class="hx-empty pl-pick">${t().noMatch}</li>`}</ul>
      </div></div>`;
  }

  // Sick leave form with a live summary. One leave per visit, kept as a no-fee line in the cart.
  const pad2 = n => String(n).padStart(2, "0");
  const isoD = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const fmtD = v => { if (!v) return "—"; const [y, m, d] = String(v).slice(0, 10).split("-"); return d ? `${d}/${m}/${y}` : v; };
  const endOf = (start, days) => { if (!start || !(days >= 1)) return ""; const d = new Date(start + "T12:00:00"); d.setDate(d.getDate() + Number(days) - 1); return isoD(d); };
  const daysTxt = n => Number(n) === 1 ? t().day1 : tx("daysN", { n });
  const entName = id => (e => e ? e[1 + ix(lang)] : "")(ENTITIES.find(e => e[0] === id));
  const docName = () => { const d = ctx.doctor; return d && typeof d === "object" ? d[lang] || d.en : d || ""; };
  const leaveIn = () => draft.items.find(o => o.svc === "leave");
  function lvLoad() {
    if (lv) return;
    const a = leaveIn();
    lv = a ? { need: "yes", entity: a.entity, employer: a.employer || "", days: String(a.days), start: a.start } : { need: draft.noLeave ? "no" : "", entity: "", employer: "", days: "", start: isoD(new Date()) };
  }
  const lvDaysOk = () => /^\d+$/.test(lv.days) && +lv.days >= 1 && +lv.days <= LVMAX;
  function leaveView() {
    lvLoad();
    const p = ctx.patient(curO), a = leaveIn(), bad = c => lvTr && c ? "bad" : "", yes = lv.need === "yes";
    const field = (label, body, req) => `<div class="pl-f"><label>${label}${req ? ' <span class="req">*</span>' : ""}</label>${body}</div>`;
    const ro = (v, ic, dir) => `<div class="or-ro">${E(v || "—")}${ic ? S(ic) : ""}</div>`;
    const pill = (v, label) => `<button type="button" class="or-pill ${lv.need === v ? "on" : ""}" data-lvn="${v}" aria-pressed="${lv.need === v}"><span class="or-rd">${lv.need === v ? S(I.check, 3) : ""}</span>${label}</button>`;
    const end = lvDaysOk() ? endOf(lv.start, lv.days) : "";
    const row = (k, v, ltr) => `<div><dt>${k}</dt><dd ${ltr ? 'dir="ltr"' : 'dir="auto"'}>${v ? E(v) : "—"}</dd></div>`;
    return `<div class="or-lv">
      <section class="pl-sec or-form"><div class="pl-sb">
        ${a ? `<div class="info ok">${S(I.check, 2.4)}<span>${t().lvIssued}</span></div>` : ""}
        <div class="pl-f"><label>${t().lvNeed} <span class="req">*</span></label><div class="or-pills ${bad(!lv.need)}">${pill("yes", t().yes)}${pill("no", t().no)}</div></div>
        ${yes ? `<div class="or-lvsep"></div>
        ${p.name && p.id ? "" : `<p class="or-lvw">${S(I.info)}<span>${t().lvNoInfo}</span></p>`}
        <div class="pl-grid">${field(t().lvName, ro(p.name))}${field(t().lvId, `<div class="or-ro" dir="ltr">${E(p.id || "—")}</div>`)}${field(t().lvDob, `<div class="or-ro" dir="ltr">${fmtD(p.dob)}${S(I.cal)}</div>`)}</div>
        <div class="pl-grid two">
          ${field(t().lvEntity, `<select class="hx-in pl-sel ${bad(!lv.entity)}" id="lvEnt"><option value="">${t().lvEntityPh}</option>${ENTITIES.map(e => `<option value="${e[0]}" ${lv.entity === e[0] ? "selected" : ""}>${E(e[1 + ix(lang)])}</option>`).join("")}</select>`, true)}
          ${field(t().lvDoc, `<select class="hx-in pl-sel" id="lvDoc"><option selected>${E(docName())}</option></select>`, true)}
        </div>
        <div class="or-lvemp">${field(t().lvEmp, `<input class="hx-in ${bad(!lv.employer.trim())}" id="lvEmp" value="${E(lv.employer)}" placeholder="${E(t().lvEmpPh)}" maxlength="120" dir="auto">`, true)}</div>
        <div class="pl-grid or-lvg">
          ${field(t().lvDays, `<div class="or-amt"><input class="hx-in ${bad(!lvDaysOk())}" id="lvDays" value="${E(lv.days)}" inputmode="numeric" maxlength="2" dir="ltr" placeholder="1–${LVMAX}"><span>${t().days}</span></div>`, true)}
          ${field(t().lvStart, `<input class="hx-in ${bad(!lv.start)}" type="date" id="lvStart" value="${E(lv.start)}">`, true)}
          ${field(t().lvEnd, `<div class="or-ro" dir="ltr" id="lvEndV">${fmtD(end)}${S(I.cal)}</div>`)}
        </div>` : lv.need === "no" ? `<p class="or-lvw no">${S(I.info)}<span>${t().lvNo}</span></p>` : ""}
        <div class="or-fa">${a ? `<button type="button" class="hx-btn out sm del" id="lvRm">${S(I.trash)}${t().lvRemove}</button><span class="hx-sp"></span>` : ""}<button type="button" class="hx-btn out" id="lvCancel">${t().cancel}</button>
          <button type="button" class="pl-addbtn" id="lvGo">${S(lv.need === "no" ? I.check : I.leave, 2.2)}${lv.need === "no" ? t().lvNoSave : a ? t().lvUpdate : t().lvCreate}</button></div>
      </div></section>
      ${yes ? `<aside class="or-lvs"><h3>${t().lvSum}</h3><dl>${row(t().lvName, p.name)}${row(t().lvId, p.id, 1)}${row(t().lvDob, fmtD(p.dob), 1)}${row(t().lvEntity, entName(lv.entity))}${row(t().lvEmp, lv.employer.trim())}${row(t().lvDoc, docName())}
        ${row(t().lvDays, lvDaysOk() ? daysTxt(lv.days) : "")}${row(t().lvFrom, lv.start ? fmtD(lv.start) : "", 1)}${row(t().lvTo, end ? fmtD(end) : "", 1)}</dl></aside>` : ""}
    </div>`;
  }
  function refView() {
    const r = rf, bad = (v) => rTried && !String(v).trim() ? "bad" : "";
    const field = (label, body, req, opt) => `<div class="pl-f"><label>${label}${req ? ' <span class="req">*</span>' : ""}${opt ? ` <span class="hx-opt">${t().optional}</span>` : ""}</label>${body}</div>`;
    const area = (k, ph, req) => `<div class="hx-area ${req ? bad(r[k]) : ""}"><textarea data-r="${k}" rows="3" maxlength="500" placeholder="${E(ph)}" dir="auto">${E(r[k])}</textarea><div class="hx-count"><span data-n="${k}">${r[k].length}</span>/500</div></div>`;
    const pill = (k, v, label) => `<button type="button" class="or-pill ${r[k] === v ? "on" : ""}" data-rp="${k}" data-v="${v}" aria-pressed="${r[k] === v}"><span class="or-rd">${r[k] === v ? S(I.check, 3) : ""}</span>${label}</button>`;
    const refs = draft.items.filter(o => o.svc === "ref");
    return `<div class="or-ref">
      <div class="or-guide">${S(I.info)}<div><b>${t().guideT}</b><ul>${t().guide.map(g => `<li>${g}</li>`).join("")}</ul></div></div>
      <section class="pl-sec or-form ${rEdit >= 0 ? "editing" : ""}"><div class="pl-sb"><div class="pl-sh"><div><h2>${rEdit >= 0 ? t().editRef : t().newRef}</h2></div></div>
        <div class="pl-grid two">
          ${field(t().spec, `<select class="hx-in pl-sel ${bad(r.spec)}" data-r="spec"><option value="">${t().specPh}</option>${SPECS.map(s => `<option value="${s[0]}" ${r.spec === s[0] ? "selected" : ""}>${E(s[1 + ix(lang)])}</option>`).join("")}</select>`, true)}
          ${field(t().priority, `<div class="or-pills">${pill("priority", "routine", t().routine)}${pill("priority", "urgent", t().urgent)}</div>`)}
        </div>
        ${field(t().reason, area("reason", t().reasonPh, true), true)}
        ${field(t().rec, area("rec", t().recPh))}
        <div class="pl-grid two">
          ${field(t().dest, `<div class="or-pills">${pill("dest", "mada", t().mada)}${pill("dest", "ext", t().ext)}</div>`, true)}
          ${field(t().provider, r.dest === "ext" ? `<input class="hx-in" data-r="provider" value="${E(r.provider)}" placeholder="${E(t().extPh)}" maxlength="120" dir="auto">`
            : `<select class="hx-in pl-sel" data-r="provider"><option value="">${t().providerPh}</option>${PROVIDERS.map(p => `<option value="${p[0]}" ${r.provider === p[0] ? "selected" : ""}>${E(p[1 + ix(lang)])}</option>`).join("")}</select>`, false, true)}
        </div>
        ${field(t().notes, area("notes", t().notesPh), false, true)}
        <div class="or-fa">${rEdit >= 0 ? `<button type="button" class="hx-btn out sm" id="refCancel">${t().cancel}</button>` : ""}<button type="button" class="pl-addbtn" id="refAdd">${S(I.plus, 2.2)}${rEdit >= 0 ? t().updRef : t().addRef}</button></div>
      </div></section>
      <section class="pl-sec"><div class="pl-sb"><div class="pl-sh"><div><h2>${t().refList} <span class="or-cnt dark">${refs.length}</span></h2></div></div>
        ${refs.length ? `<div class="pl-tw"><table class="pl-tbl"><thead><tr><th>#</th><th>${t().th_spec}</th><th>${t().th_reason}</th><th>${t().th_rec}</th><th>${t().th_pri}</th><th>${t().th_dest}</th><th></th></tr></thead>
          <tbody>${refs.map((o, i) => `<tr class="${draft.items.indexOf(o) === rEdit ? "editing" : ""}"><td data-l="#">${i + 1}</td><td data-l="${t().th_spec}"><b>${E(specName(o.spec))}</b></td>
            <td data-l="${t().th_reason}" dir="auto">${E(o.reason)}</td><td data-l="${t().th_rec}" dir="auto">${E(o.rec || "—")}</td><td data-l="${t().th_pri}"><span class="or-pri ${o.priority}">${t()[o.priority]}</span></td>
            <td data-l="${t().th_dest}">${o.dest === "ext" ? t().ext : "MADA CARE"}${provName(o) ? `<small>${E(provName(o))}</small>` : ""}</td>
            <td class="pl-ra"><button type="button" class="pl-ib" data-redit="${o.uid}" aria-label="${t().edit}">${S(I.pen)}</button><button type="button" class="pl-ib del" data-rm="${o.uid}" aria-label="${t().remove}">${S(I.trash)}</button></td></tr>`).join("")}</tbody></table></div>`
          : `<p class="hx-empty">${t().noRefs}</p>`}
      </div></section></div>`;
  }

  function drawerView() {
    return `<div class="or-ov" id="orOv"></div><aside class="or-drw" role="dialog" aria-modal="true" aria-labelledby="orDrT">
      <div class="or-dh"><span class="or-chi">${S(I.cart)}</span><h2 id="orDrT">${t().cart}</h2><span class="or-cnt dark">${draft.items.length}</span><button type="button" class="or-x" id="orDrX" aria-label="${t().close}">${S(I.x, 2.2)}</button></div>
      <div class="or-db">${draft.items.length ? groups() : `<div class="or-empty sm"><span class="or-eic">${S(I.clip)}</span><h2>${t().emptyT}</h2></div>`}</div>
      <div class="or-df"><div class="or-dt"><b>${totalText()}</b><strong>${money(payNow().total)}</strong></div>${payNow().status !== "none" ? `<div class="or-dt sm">${payTag(payNow())}<span>${payNow().due > 0 ? `${t().dueT}: ${money(payNow().due)}` : ""}</span></div>` : ""}<button type="button" class="hx-btn dark" id="orDrHub">${t().backHub}${S(I.arrow)}</button>
        ${draft.items.length ? `<button type="button" class="hx-btn out" id="orClear">${S(I.trash)}${t().clearCart}</button>` : ""}</div></aside>`;
  }
  function modalView() {
    const m = modal, r = item(m.code) || { en: m.code, ar: m.code, about: ["", ""] };
    return `<div class="or-ov" id="orMdOv"></div><div class="or-md" role="dialog" aria-modal="true" aria-labelledby="orMdT">
      <div class="or-mh"><span class="or-sic ${m.svc}">${S(I[m.svc])}</span><div class="or-mt"><span class="or-code">${m.code}</span><b id="orMdT">${E(r[lang])}</b><small>${E(r.about[ix(lang)])}</small></div>
        <button type="button" class="or-x" id="orMdX" aria-label="${t().close}">${S(I.x, 2.2)}</button></div>
      <div class="or-mb"><b>${S(I.note)}${t().notesT} <span class="hx-opt">${t().optional}</span></b><small>${t().notesS}</small>
        <div class="hx-area"><textarea id="orMdN" rows="4" maxlength="500" placeholder="${E(t().notePh)}" dir="auto">${E(m.note)}</textarea><div class="hx-count"><span id="orMdC">${m.note.length}</span>/500</div></div></div>
      <div class="or-mf"><button type="button" class="hx-btn out" id="orMdCancel">${t().cancel}</button><button type="button" class="hx-btn dark" id="orMdOk">${m.uid ? t().saveNote : `${S(I.plus, 2.2)}${t().addCart}`}</button></div></div>`;
  }

  // ---------- Radiology ----------
  const locTag = l => l ? `<span class="or-loc ${l}">${S(l === "home" ? I.home : I.center, 2)}${l === "home" ? t().home : t().center}</span>` : "";
  const locTags = l => l === "both" ? locTag("home") + locTag("center") : locTag(l);
  const thumb = (r, big) => `<span class="or-th ${big ? "big" : ""}">${S(r.cat === "us" ? I.wave : r.cat === "other" ? I.heart : I.xr, 1.6)}</span>`;
  const radIn = code => draft.items.find(o => o.code === code);
  function radView() {
    const s = q.trim().toLowerCase();
    const list = RAD.filter(r => s ? [r.code, r.en, r.ar, r.sub[0], r.sub[1]].some(v => v.toLowerCase().includes(s)) : rCat === "all" || r.cat === rCat || (rCat === "mobile" && r.loc !== "center" && r.cat === "xray"));
    const added = draft.items.filter(o => o.svc === "rad");
    return `<div class="or-rad">
      <nav class="or-chips" aria-label="${E(t().s_rad)}">${RCATS.map(([id, ic, en, ar]) => `<button type="button" class="or-chip ${!s && rCat === id ? "on" : ""}" data-rcat="${id}">${S(I[ic])}${lang === "ar" ? ar : en}</button>`).join("")}</nav>
      <div class="or-rgrid">
        <div class="or-rl">
          <div class="dx-sb">${S(I.search)}<input id="orQ" type="search" value="${E(q)}" placeholder="${E(t().radSearch)}" autocomplete="off">${q ? `<button type="button" class="dx-clr" id="orQClr" aria-label="${t().close}">${S(I.x, 2.2)}</button>` : ""}</div>
          <div class="or-rh"><span>${t().thService}</span><span>${t().thCode}</span><span>${t().thLoc}</span><span>${t().thPrice}</span><span>${t().select}</span></div>
          <ul class="or-rows">${list.map(r => { const a = radIn(r.code); return `<li class="or-row ${rSel === r.code ? "sel" : ""} ${a ? "on" : ""}" data-rsel="${r.code}" tabindex="0" role="button" aria-pressed="${rSel === r.code}">
            ${thumb(r)}<span class="or-rn"><b>${E(r[lang])}</b><small>${E(r.sub[ix(lang)])}</small></span><span class="or-code">${r.code}</span><span class="or-locs">${locTags(r.loc)}</span><span class="or-price">${money(r.price)}</span>
            <span class="or-ck"><input type="checkbox" data-rtick="${r.code}" ${a ? "checked" : ""} aria-label="${E(r[lang])}"></span></li>`; }).join("") || `<li class="hx-empty pl-pick">${t().noMatch}</li>`}</ul>
        </div>
        ${rSel ? `<div class="or-rdov" id="orRdOv"></div>` : ""}
        <aside class="or-rdp ${rSel ? "open" : ""}" ${rSel ? `role="dialog" aria-labelledby="orRdT"` : ""}>${rSel ? radDetail() : `<div class="or-rdp-e">${S(I.xr, 1.4)}<p>${t().pickRad}</p></div>`}</aside>
      </div>
      <section class="pl-sec"><div class="pl-sb"><div class="pl-sh"><div><h2>${t().radList} <span class="or-cnt dark">${added.length}</span></h2></div>
          ${added.length ? `<button type="button" class="hx-btn out sm or-clr" data-clrsvc="rad">${S(I.trash)}${t().clearSvc}</button>` : ""}</div>
        ${added.length ? `<div class="pl-tw"><table class="pl-tbl"><thead><tr><th>#</th><th>${t().thCode}</th><th>${t().thService}</th><th>${t().th_body}</th><th>${t().th_ind}</th><th>${t().thLoc}</th><th></th></tr></thead>
          <tbody>${added.map((o, i) => `<tr class="${rSel === o.code ? "editing" : ""}"><td data-l="#">${i + 1}</td><td data-l="${t().thCode}"><span class="or-code">${o.code}</span></td><td data-l="${t().thService}"><b>${E(nameOf(o))}</b></td>
            <td data-l="${t().th_body}">${E(partName(o.body))}</td><td data-l="${t().th_ind}" dir="auto">${E(o.ind)}</td><td data-l="${t().thLoc}">${locTag(o.loc)}</td>
            <td class="pl-ra"><button type="button" class="pl-ib" data-radedit="${o.uid}" aria-label="${t().edit}">${S(I.pen)}</button><button type="button" class="pl-ib del" data-rm="${o.uid}" aria-label="${t().remove}">${S(I.trash)}</button></td></tr>`).join("")}</tbody></table></div>`
          : `<p class="hx-empty">${t().noRad}</p>`}</div></section></div>`;
  }
  function radDetail() {
    const r = RAD.find(x => x.code === rSel), f = rForm, ed = !!radIn(r.code), bad = v => rTr && !String(v).trim() ? "bad" : "";
    const avail = r.loc === "both"
      ? `<div class="or-pills">${["home", "center"].map(l => `<button type="button" class="or-pill ${f.loc === l ? "on" : ""}" data-rloc="${l}" aria-pressed="${f.loc === l}"><span class="or-rd">${f.loc === l ? S(I.check, 3) : ""}</span>${S(l === "home" ? I.home : I.center, 2)}${l === "home" ? t().availHome : t().availCenter}</button>`).join("")}</div>`
      : `<div class="or-avail">${["home", "center"].map(l => `<span class="or-av ${r.loc === l ? "on " + l : ""}">${S(l === "home" ? I.home : I.center, 2)}${l === "home" ? t().availHome : t().availCenter}</span>`).join("")}</div>`;
    return `<div class="or-rdh">${thumb(r, true)}<div><span class="or-code">${r.code}</span><b id="orRdT">${E(r[lang])}</b><small>${E(r.sub[ix(lang)])}</small><strong class="or-rdpr">${money(r.price)}</strong></div>
        <button type="button" class="or-x" id="orRdX" aria-label="${t().close}">${S(I.x, 2.2)}</button></div>
      ${avail}
      <div class="or-rds"><b>${t().desc}</b><p>${E(r.about[ix(lang)])}</p></div>
      <div class="pl-f"><label>${t().body} <span class="req">*</span></label><select class="hx-in pl-sel ${bad(f.body)}" data-rf="body">${r.parts.length > 1 ? `<option value="">${t().bodyPh}</option>` : ""}${r.parts.map(id => `<option value="${id}" ${f.body === id ? "selected" : ""}>${E(partName(id))}</option>`).join("")}</select></div>
      <div class="pl-f"><label>${t().ind} <span class="req">*</span></label><div class="hx-area ${bad(f.ind)}"><textarea data-rf="ind" rows="3" maxlength="500" placeholder="${E(t().indPh)}" dir="auto">${E(f.ind)}</textarea><div class="hx-count"><span data-rn="ind">${f.ind.length}</span>/500</div></div></div>
      <div class="pl-f"><label>${t().instr} <span class="hx-opt">${t().optional}</span></label><div class="hx-area"><textarea data-rf="instr" rows="3" maxlength="500" placeholder="${E(t().instrPh)}" dir="auto">${E(f.instr)}</textarea><div class="hx-count"><span data-rn="instr">${f.instr.length}</span>/500</div></div></div>
      <div class="or-mf"><button type="button" class="hx-btn out" id="orRdCancel">${t().cancel}</button><button type="button" class="hx-btn dark" id="orRdAdd">${S(ed ? I.check : I.cart, 2)}${ed ? t().updR : t().addCart}</button></div>`;
  }
  function radPick(code) {
    const r = RAD.find(x => x.code === code), a = radIn(code);
    rSel = code; rTr = false;
    rForm = a ? { body: a.body, ind: a.ind, instr: a.instr || "", loc: a.loc } : { body: r.parts.length === 1 ? r.parts[0] : "", ind: "", instr: "", loc: r.loc === "both" ? "home" : r.loc };
  }

  // ---------- Laboratory ----------
  const labIn = code => draft.items.some(o => o.code === code);
  const inPkg = code => ALLPKG.find(p => labIn(p.code) && p.tests.includes(code));
  const labName = code => (r => r ? r[lang] : code)(item(code));
  function labView() {
    const K = KIT[page], L2 = k => t()[page === "iv" ? "iv_" + k : k] || t()[k];
    const s = q.trim().toLowerCase(), added = draft.items.filter(o => o.svc === page);
    const tabs = `<div class="pl-tabs" role="tablist">${[["tests", L2("tabTests")], ["pkg", L2("tabPkg")]].map(([k, v]) => `<button type="button" role="tab" class="pl-tab ${labTab === k ? "on" : ""}" data-ltab="${k}" aria-selected="${labTab === k}">${S(k === "tests" ? I[K.icon] : I.box)}${v}</button>`).join("")}</div>`;
    const search = `<div class="dx-sb">${S(I.search)}<input id="orQ" type="search" value="${E(q)}" placeholder="${E(labTab === "tests" ? L2("labSearch") : t().pkgSearch)}" autocomplete="off">${q ? `<button type="button" class="dx-clr" id="orQClr" aria-label="${t().close}">${S(I.x, 2.2)}</button>` : ""}</div>`;
    let body;
    if (labTab === "tests") {
      const list = K.items.filter(r => s ? [r[0], r[2], r[3]].some(v => v.toLowerCase().includes(s)) : lCat === "all" || r[1] === lCat);
      const cats = K.cats.slice(1).filter(c => list.some(r => r[1] === c[0]));
      body = `<nav class="or-chips">${K.cats.map(([id, en, ar]) => `<button type="button" class="or-chip ${!s && lCat === id ? "on" : ""}" data-lcat="${id}">${lang === "ar" ? ar : en}</button>`).join("")}</nav>
        ${cats.map(c => `<h3 class="or-lh">${lang === "ar" ? c[2] : c[1]}</h3><div class="or-lgrid">${list.filter(r => r[1] === c[0]).map(r => { const a = labIn(r[0]), p = !a && inPkg(r[0]);
          return `<div class="or-lc ${a ? "on" : ""}"><span class="or-code">${r[0]}</span><b>${E(r[2 + ix(lang)])}</b>
            <div class="or-lf"><span class="or-price">${money(r[4])}</span>${a ? `<button type="button" class="or-done btn" data-ltog="${r[0]}">${S(I.check, 2.4)}${t().added}</button>` : p ? `<span class="or-inpkg">${tx("inPkg", { c: p.code })}</span>` : `<button type="button" class="or-add" data-ltog="${r[0]}">${S(I.plus, 2.2)}${t().add}</button>`}</div></div>`; }).join("")}</div>`).join("") || `<p class="hx-empty pl-pick">${t().noMatch}</p>`}`;
    } else {
      const list = K.pkgs.filter(p => !s || [p.code, p.en, p.ar].some(v => v.toLowerCase().includes(s)));
      body = list.length ? `<div class="pl-tw"><table class="pl-tbl or-ptbl"><thead><tr><th>${t().thCode}</th><th>${t().pkgName}</th><th>${t().thPrice}</th><th>${t().details}</th><th></th></tr></thead>
        <tbody>${list.map(p => { const a = labIn(p.code); return `<tr class="${a ? "on" : ""}"><td data-l="${t().thCode}"><span class="or-code">${p.code}</span></td><td data-l="${t().pkgName}"><b>${E(p[lang])}</b><small>${tx(page === "iv" ? "nItems" : "nTests", { n: p.tests.length })}${p.time ? ` · ${tx("mins", { n: p.time })}` : ""}</small></td>
          <td data-l="${t().thPrice}"><span class="or-price">${money(p.price)}</span></td><td data-l="${t().details}"><button type="button" class="or-view" data-pview="${p.code}">${S(I.eye)}${L2("viewTests")}</button></td>
          <td class="pl-ra">${a ? `<button type="button" class="or-done btn" data-ltog="${p.code}">${S(I.check, 2.4)}${t().added}</button>` : `<button type="button" class="or-add solid" data-ltog="${p.code}">${S(I.plus, 2.2)}${t().add}</button>`}</td></tr>`; }).join("")}</tbody></table></div>`
        : `<p class="hx-empty pl-pick">${t().noMatch}</p>`;
    }
    return `<div class="or-lab"><div class="or-lbar">${tabs}${search}</div>${body}
      <section class="pl-sec or-ladd"><div class="pl-sb"><div class="pl-sh"><div><h2>${L2("labList")} <span class="or-cnt dark">${added.length}</span></h2></div>
          ${added.length ? `<button type="button" class="hx-btn out sm or-clr" data-clrsvc="${page}">${S(I.trash)}${t().clearSvc}</button>` : ""}</div>
        ${added.length ? `<ol class="or-list">${added.map((o, i) => line(o, i + 1)).join("")}</ol>` : `<p class="hx-empty">${L2("noLab")}</p>`}</div></section></div>`;
  }
  function pkgModal() {
    const p = ALLPKG.find(x => x.code === pkgView), a = labIn(p.code), iv = IVPKG.includes(p), L2 = k => t()[iv ? "iv_" + k : k] || t()[k];
    return `<div class="or-ov" id="orPkOv"></div><div class="or-md wide" role="dialog" aria-modal="true" aria-labelledby="orPkT">
      <div class="or-mh"><span class="or-sic ${iv ? "iv" : "lab"}">${S(I.box)}</span><div class="or-mt"><span class="or-code">${p.code}</span><b id="orPkT">${E(p[lang])}</b><small>${L2("inclT")} (${p.tests.length})${p.time ? ` · ${tx("infTime", { n: p.time })}` : ""}</small></div>
        <button type="button" class="or-x" id="orPkX" aria-label="${t().close}">${S(I.x, 2.2)}</button></div>
      <div class="or-mb"><div class="pl-tw"><table class="pl-tbl or-pkt"><thead><tr><th>#</th><th>${t().thCode}</th><th>${L2("testName")}</th></tr></thead>
        <tbody>${p.tests.map((c, i) => `<tr><td>${i + 1}</td><td><span class="or-code">${c}</span></td><td>${E(labName(c))}</td></tr>`).join("")}</tbody></table></div></div>
      <div class="or-pkp"><span>${t().pkgPrice}</span><b>${money(p.price)}</b></div>
      <div class="or-mf"><button type="button" class="hx-btn out" id="orPkClose">${t().close}</button>${a ? "" : `<button type="button" class="hx-btn dark" id="orPkAdd">${S(I.plus, 2.2)}${t().addCart}</button>`}</div></div>`;
  }

  function view(o, c) {
    ctx = c; lang = c.lang; load(o); curO = o;
    if (page === "hub") return hubView(o, c) + (modal ? modalView() : "") + (payM ? payModal() : "") + (shM ? shareModal() : "");
    const body = page === "leave" ? leaveView() : page === "ref" ? refView() : page === "rad" ? radView() : page === "lab" || page === "iv" ? labView() : catalogView(page);
    return `<div class="or sub">${head(c, I[page], t()["s_" + page], t()["p_" + page])}${body}
      <div class="ex-foot"><button type="button" class="hx-btn out pl-prevb" id="orBack2"><span class="flip">${S(I.back)}</span><span><b>${t().prev}</b><small>${t().title}</small></span></button><span class="hx-sp"></span>
        <button type="button" class="hx-btn soft" id="orDraft">${S(I.doc)}${t().draft}</button>
        <button type="button" class="hx-btn dark" id="orBack">${t().backHub}${S(I.arrow)}</button></div>
      ${cartBtn()}</div>${drawer ? drawerView() : ""}${modal ? modalView() : ""}${pkgView ? pkgModal() : ""}`;
  }

  function go(p) {
    if (page === "ref" && p !== "ref" && refDirty()) return ctx.toast(t().pendingRef);
    page = p; q = ""; drawer = false; if (p !== "leave") { lv = null; lvTr = false; } modal = null; rSel = null; rForm = null; rTr = false; pkgView = null; labTab = "tests"; lCat = "all"; if (p !== "ref") { rf = blankRef(); rEdit = -1; rTried = false; }
    ctx.rerender(); window.scrollTo(0, 0);
  }
  const refDirty = () => rEdit >= 0 || ["spec", "reason", "rec", "notes"].some(k => rf[k].trim()) || (rf.provider || "").trim();
  function addCode(code, note, extra) {
    const r = item(code);
    if (!r || draft.items.some(o => o.code === code)) return;
    draft.items.push({ uid: uid(), svc: r.svc, code, price: r.price, note: (note || "").trim(), ...(extra || {}) }); draft.none = false; keep();
    ctx.toast(tx("addedT", { n: r[lang] }));
  }
  // Add or remove a lab test or package. A package replaces single tests it already covers.
  function labToggle(code) {
    const a = draft.items.find(o => o.code === code);
    if (a) return removeUid(a.uid);
    const covered = inPkg(code); if (covered) return ctx.toast(tx("inPkgT", { n: labName(code), c: covered.code }));
    const pk = ALLPKG.find(p => p.code === code);
    const dup = pk ? draft.items.filter(o => pk.tests.includes(o.code)) : [];
    if (dup.length) { draft.items = draft.items.filter(o => !dup.includes(o)); }
    addCode(code, "");
    if (dup.length) ctx.toast(tx("pkgMerged", { n: dup.length, c: code }));
  }
  function removeUid(u) {
    const i = draft.items.findIndex(o => o.uid === u); if (i < 0) return;
    const n = nameOf(draft.items[i]); draft.items.splice(i, 1);
    if (rEdit === i) { rEdit = -1; rf = blankRef(); } else if (rEdit > i) rEdit--;
    keep(); ctx.toast(tx("removedT", { n }));
  }

  function bind(root, o, c) {
    ctx = c;
    const $ = s => document.querySelector(s), all = (s, f) => document.querySelectorAll(s).forEach(f);
    // Shared by every page: order lines, notes, cart drawer, note dialog.
    all("[data-rm]", b => b.addEventListener("click", () => { removeUid(b.dataset.rm); ctx.rerender(); }));
    all("[data-go]", b => b.addEventListener("click", () => go(b.dataset.go)));
    all("[data-note]", b => b.addEventListener("click", () => { const it = draft.items.find(x => x.uid === b.dataset.note); modal = { svc: it.svc, code: it.code, note: it.note || "", uid: it.uid }; ctx.rerender(); }));
    all("[data-redit]", b => b.addEventListener("click", () => {
      const i = draft.items.findIndex(x => x.uid === b.dataset.redit);
      rEdit = i; rf = { ...blankRef(), ...JSON.parse(JSON.stringify(draft.items[i])) }; rTried = false; page = "ref"; drawer = false; ctx.rerender(); window.scrollTo(0, 0);
    }));
    all("[data-radedit]", b => b.addEventListener("click", () => {
      const it = draft.items.find(x => x.uid === b.dataset.radedit); if (!it) return;
      page = "rad"; drawer = false; q = ""; radPick(it.code); ctx.rerender(); window.scrollTo(0, 0);
    }));
    all("[data-clrsvc]", b => b.addEventListener("click", () => {
      const sv = b.dataset.clrsvc, n = countOf(sv);
      if (!confirm(tx("clearSvcAsk", { n, s: t()["s_" + sv] }))) return;
      draft.items = draft.items.filter(o => o.svc !== sv); rSel = null; rForm = null; keep(); ctx.toast(t().cleared); ctx.rerender();
    }));
    if ($("#orClear")) $("#orClear").addEventListener("click", () => {
      if (!confirm(tx("clearAsk", { n: draft.items.length }))) return;
      draft.items = []; rEdit = -1; rf = blankRef(); keep(); ctx.toast(t().cleared); ctx.rerender();
    });
    if ($("#orDraft")) $("#orDraft").addEventListener("click", () => { try { ctx.saveDraft(clean()); ctx.toast(t().draftSaved); } catch (e) { ctx.toast(e.message || t().storeErr); } });
    if (modal) {
      const ta = $("#orMdN"), close = () => { modal = null; ctx.rerender(); };
      ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
      ta.addEventListener("input", () => { modal.note = ta.value; $("#orMdC").textContent = ta.value.length; });
      $("#orMdX").addEventListener("click", close); $("#orMdCancel").addEventListener("click", close); $("#orMdOv").addEventListener("click", close);
      $("#orMdOk").addEventListener("click", () => {
        if (modal.uid) { const it = draft.items.find(x => x.uid === modal.uid); if (it) it.note = modal.note.trim(); keep(); } else addCode(modal.code, modal.note);
        close();
      });
      document.querySelector(".or-md").addEventListener("keydown", e => { if (e.key === "Escape") close(); });
    }
    if (drawer) {
      const close = () => { drawer = false; ctx.rerender(); };
      $("#orDrX").addEventListener("click", close); $("#orOv").addEventListener("click", close);
      $("#orDrHub").addEventListener("click", () => go("hub"));
      $(".or-drw").addEventListener("keydown", e => { if (e.key === "Escape" && !modal) close(); });
      if (!modal) $("#orDrX").focus();
    }

    if (payM) {
      const close = () => { payM = null; ctx.rerender(); };
      $("#orPyX").addEventListener("click", close); $("#orPyCancel").addEventListener("click", close); $("#orPyOv").addEventListener("click", close);
      document.querySelector(".or-md").addEventListener("keydown", e => { if (e.key === "Escape") close(); });
      all("[data-pm]", b => b.addEventListener("click", () => { payM.method = b.dataset.pm; payM.ok = false; ctx.rerender(); }));
      if ($("#orPyRec")) $("#orPyRec").addEventListener("change", e => { payM.received = e.target.value.replace(/[^\d.]/g, ""); ctx.rerender(); });
      if ($("#orPyRef")) $("#orPyRef").addEventListener("input", e => { payM.ref = e.target.value; });
      $("#orPyOk").addEventListener("change", e => { payM.ok = e.target.checked; });
      $("#orPyGo").addEventListener("click", () => {
        const ps = payNow(), rec = Number(payM.received || 0);
        payM.tried = true;
        if (payM.method === "cash" && rec < ps.due) { ctx.rerender(); return ctx.toast(t().shortT); }
        if (!payM.ok) { ctx.rerender(); return ctx.toast(t().payNeedOk); }
        const entry = { id: uid(), amount: ps.due, method: payM.method, received: payM.method === "cash" ? rec : ps.due, ref: payM.method === "card" ? payM.ref.trim() : "", at: new Date().toISOString() };
        try { ctx.addPayment(entry); } catch (e) { return ctx.toast(e.message || t().storeErr); }
        payM = null; ctx.toast(tx("paidOk", { n: money(entry.amount) })); ctx.rerender();
      });
    }
    if (shM) {
      const close = () => { shM = null; ctx.rerender(); };
      $("#orShX").addEventListener("click", close); $("#orShOv").addEventListener("click", close);
      document.querySelector(".or-md").addEventListener("keydown", e => { if (e.key === "Escape") close(); });
      if (shM.qr) {
        all("[data-ml]", b => b.addEventListener("click", () => { shM.ml = b.dataset.ml; shM.msg = shareMsg(shM.ml); ctx.rerender(); }));
        $("#orQrBack").addEventListener("click", () => { shM.qr = false; ctx.rerender(); });
        $("#orQrSave").addEventListener("click", () => {
          // PNG with the logo and a white border, ready to print or send.
          const img = new Image(), c = document.createElement("canvas"), W = 1000; c.width = c.height = W;
          img.onload = () => { const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, W, W); g.drawImage(img, 0, 0, W, W);
            const lg = new Image(); lg.onload = () => { const r = W * .12, lw = r * 1.3, lh = lw * lg.height / lg.width; g.fillStyle = "#fff"; g.beginPath(); g.arc(W / 2, W / 2, r, 0, 7); g.fill(); g.drawImage(lg, (W - lw) / 2, (W - lh) / 2, lw, lh); done(); };
            lg.onerror = done; lg.src = "assets/mada-logo.png"; };
          const done = () => { const a = document.createElement("a"); a.href = c.toDataURL("image/png"); a.download = `mada-pay-${curO.id || "qr"}.png`; a.click(); };
          img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(MadaQR.svg(linkUrl(shM.ml)));
        });
        return;
      }
      $("#orQrOpen").addEventListener("click", () => {
        const show = () => { shM.qr = true; const pl = payLink() || {};
          try { ctx.payLink({ sent: [...(pl.sent || []), { ch: "qr", at: new Date().toISOString(), by: ctx.doctor }] }); } catch (er) { /* the QR still shows */ }
          ctx.rerender(); };
        if (window.MadaQR) return show();
        const sc = document.createElement("script"); sc.src = "doctor-qr.js"; sc.onload = show; sc.onerror = () => ctx.toast(t().qrErr); document.head.appendChild(sc);
      });
      const hrefs = () => { const msg = encodeURIComponent(shM.msg), wa = waNum(shM.phone);
        document.querySelector('[data-ch="wa"]').href = `https://wa.me/${wa}?text=${msg}`;
        document.querySelector('[data-ch="sms"]').href = `sms:${wa ? "+" + wa : ""}?&body=${msg}`; };
      hrefs();
      $("#orShPh").addEventListener("input", e => { shM.phone = e.target.value; e.target.classList.remove("bad"); hrefs(); });
      $("#orShMsg").addEventListener("input", e => { shM.msg = e.target.value; hrefs(); });
      all("[data-ml]", b => b.addEventListener("click", () => { shM.ml = b.dataset.ml; shM.msg = shareMsg(shM.ml); ctx.rerender(); }));
      all("[data-ch]", b => b.addEventListener("click", async e => {
        const ch = b.dataset.ch;
        if ((ch === "wa" || ch === "sms") && !waNum(shM.phone)) { e.preventDefault(); shM.tried = true; $("#orShPh").classList.add("bad"); $("#orShPh").focus(); return ctx.toast(t().badPhone); }
        if (ch === "copy") { try { await navigator.clipboard.writeText(shM.msg); } catch (er) { $("#orShMsg").select(); document.execCommand("copy"); } }
        if (ch === "share") { try { await navigator.share({ text: shM.msg }); } catch (er) { return; } }
        const pl = payLink() || {};
        try { ctx.payLink({ sent: [...(pl.sent || []), { ch, at: new Date().toISOString(), by: ctx.doctor }] }); } catch (er) { return ctx.toast(er.message || t().storeErr); }
        ctx.toast(ch === "copy" ? t().copied : t().sentOk);
      }));
    }
    if (page === "hub") {
      if ($("#orSend")) $("#orSend").addEventListener("click", () => {
        if (!payLink() || !payLink().token) { try { ctx.payLink({ token: newToken(), createdAt: new Date().toISOString() }); } catch (er) { return ctx.toast(er.message || t().storeErr); } curO = ctx.order ? ctx.order() : curO; }
        const ml = lang; shM = { phone: curO.mobile || "", ml, msg: "", tried: false }; shM.msg = shareMsg(ml); ctx.rerender();
      });
      if ($("#orCollect")) $("#orCollect").addEventListener("click", () => { const ps = payNow(); payM = { method: "cash", received: String(ps.due), ref: "", ok: false, tried: false }; ctx.rerender(); });
      all("[data-unpay]", b => b.addEventListener("click", () => {
        const e = payNow().entries.find(x => x.id === b.dataset.unpay); if (!e || !confirm(tx("undoAsk", { n: money(e.amount) }))) return;
        try { ctx.removePayment(e.id); } catch (er) { return ctx.toast(er.message || t().storeErr); }
        ctx.toast(t().undone); ctx.rerender();
      }));
      if ($("#orNone")) $("#orNone").addEventListener("change", e => { draft.none = e.target.checked; });
      $("#orPrev").addEventListener("click", () => ctx.go(ctx.prevKey));
      $("#orSave").addEventListener("click", () => {
        if (!draft.items.length && (!draft.none || ctx.followUp)) return ctx.toast(ctx.followUp ? ctx.fuNeed : t().needOrder);
        try { ctx.save(clean()); } catch (e) { return ctx.toast(e.message || t().storeErr); }
        reset(); if (!ctx.followUp) ctx.toast(t().saved); ctx.go(ctx.nextKey);
      });
      return;
    }
    $("#orCart").addEventListener("click", () => { drawer = true; ctx.rerender(); });
    $("#orBack").addEventListener("click", () => go("hub"));
    $("#orBack2").addEventListener("click", () => go("hub"));

    if (page === "leave") {
      const sumUpd = () => ctx.rerender();
      all("[data-lvn]", b => b.addEventListener("click", () => { lv.need = b.dataset.lvn; ctx.rerender(); }));
      if ($("#lvEnt")) $("#lvEnt").addEventListener("change", e => { lv.entity = e.target.value; sumUpd(); });
      if ($("#lvEmp")) { $("#lvEmp").addEventListener("input", e => { lv.employer = e.target.value; if (e.target.value.trim()) e.target.classList.remove("bad"); }); $("#lvEmp").addEventListener("change", sumUpd); }
      if ($("#lvDays")) $("#lvDays").addEventListener("change", e => { lv.days = e.target.value.replace(/\D/g, ""); sumUpd(); });
      if ($("#lvStart")) $("#lvStart").addEventListener("change", e => { lv.start = e.target.value; sumUpd(); });
      $("#lvCancel").addEventListener("click", () => { lv = null; lvTr = false; go("hub"); });
      if ($("#lvRm")) $("#lvRm").addEventListener("click", () => { const a = leaveIn(); if (a) removeUid(a.uid); lv = null; lvTr = false; go("hub"); });
      $("#lvGo").addEventListener("click", () => {
        lvTr = true;
        if (lv.need === "no") {
          const a = leaveIn(); if (a) draft.items = draft.items.filter(x => x !== a);
          draft.noLeave = true; keep(); ctx.toast(t().lvNoneOk); lv = null; lvTr = false; return go("hub");
        }
        const req = !lv.need || !lv.entity || !lv.employer.trim() || !lv.start;
        if (req || !lvDaysOk()) { ctx.rerender(); return ctx.toast(req ? t().lvReq : tx("lvDaysErr", { m: LVMAX })); }
        const p = ctx.patient(curO), a = leaveIn();
        const r = { uid: a ? a.uid : uid(), svc: "leave", entity: lv.entity, employer: lv.employer.trim(), days: +lv.days, start: lv.start, end: endOf(lv.start, lv.days), doctor: ctx.doctor, name: p.name, idNumber: p.id, dob: p.dob };
        if (a) draft.items[draft.items.indexOf(a)] = r; else draft.items.push(r);
        draft.none = false; draft.noLeave = false; keep(); ctx.toast(a ? t().lvUpd : t().lvAdded); lv = null; lvTr = false; go("hub");
      });
      return;
    }
    if (page === "ref") {
      all("[data-r]", el => {
        const k = el.dataset.r, ev = el.tagName === "SELECT" ? "change" : "input";
        el.addEventListener(ev, () => { rf[k] = el.value; const n = root.querySelector(`[data-n="${k}"]`); if (n) n.textContent = el.value.length; if (ev === "change") ctx.rerender(); });
      });
      all("[data-rp]", b => b.addEventListener("click", () => { const k = b.dataset.rp; if (k === "dest" && rf.dest !== b.dataset.v) rf.provider = ""; rf[k] = b.dataset.v; ctx.rerender(); }));
      if ($("#refCancel")) $("#refCancel").addEventListener("click", () => { rEdit = -1; rf = blankRef(); rTried = false; ctx.rerender(); });
      $("#refAdd").addEventListener("click", () => {
        rTried = true;
        if (!rf.spec || !rf.reason.trim() || !rf.dest) { ctx.rerender(); return ctx.toast(t().refReq); }
        const r = { uid: rEdit >= 0 ? draft.items[rEdit].uid : uid(), svc: "ref", spec: rf.spec, priority: rf.priority, reason: rf.reason.trim(), rec: rf.rec.trim(), dest: rf.dest, provider: (rf.provider || "").trim(), notes: rf.notes.trim() };
        if (rEdit >= 0) { draft.items[rEdit] = r; ctx.toast(t().refUpd); } else { draft.items.push(r); ctx.toast(tx("refAdded", { n: specName(r.spec) })); }
        draft.none = false; rEdit = -1; rf = blankRef(); rTried = false; keep(); ctx.rerender();
      });
      return;
    }
    const focusQ = () => { const i = document.getElementById("orQ"); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } };
    const bindSearch = () => {
      $("#orQ").addEventListener("input", e => { q = e.target.value; ctx.rerender(); focusQ(); });
      $("#orQ").addEventListener("keydown", e => { if (e.key === "Escape") { q = ""; ctx.rerender(); focusQ(); } });
      if ($("#orQClr")) $("#orQClr").addEventListener("click", () => { q = ""; ctx.rerender(); focusQ(); });
    };
    if (page === "rad") {
      bindSearch();
      all("[data-rcat]", b => b.addEventListener("click", () => { rCat = b.dataset.rcat; q = ""; ctx.rerender(); }));
      all("[data-rsel]", li => {
        const pick = () => { radPick(li.dataset.rsel); ctx.rerender(); };
        li.addEventListener("click", e => { if (e.target.closest("[data-rtick]")) return; pick(); });
        li.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } });
      });
      all("[data-rtick]", b => b.addEventListener("change", () => {
        const a = radIn(b.dataset.rtick);
        if (a) { removeUid(a.uid); if (rSel === b.dataset.rtick) { rSel = null; rForm = null; } } else radPick(b.dataset.rtick);
        ctx.rerender();
      }));
      if (rSel) {
        const close = () => { rSel = null; rForm = null; rTr = false; ctx.rerender(); };
        all("[data-rf]", el => el.addEventListener(el.tagName === "SELECT" ? "change" : "input", () => {
          rForm[el.dataset.rf] = el.value; const n = root.querySelector(`[data-rn="${el.dataset.rf}"]`); if (n) n.textContent = el.value.length;
        }));
        all("[data-rloc]", b => b.addEventListener("click", () => { rForm.loc = b.dataset.rloc; ctx.rerender(); }));
        $("#orRdX").addEventListener("click", close); $("#orRdCancel").addEventListener("click", close);
        if ($("#orRdOv")) $("#orRdOv").addEventListener("click", close);
        $(".or-rdp").addEventListener("keydown", e => { if (e.key === "Escape") close(); });
        $("#orRdAdd").addEventListener("click", () => {
          rTr = true;
          if (!rForm.body || !rForm.ind.trim()) { ctx.rerender(); return ctx.toast(t().radReq); }
          const a = radIn(rSel), f = { body: rForm.body, ind: rForm.ind.trim(), instr: rForm.instr.trim(), loc: rForm.loc };
          if (a) { Object.assign(a, f); keep(); ctx.toast(t().radUpd); } else addCode(rSel, "", f);
          close();
        });
        if (window.matchMedia("(max-width: 1599px)").matches) { const x = $("#orRdX"); if (x) x.focus(); }
      }
      return;
    }
    if (page === "lab" || page === "iv") {
      bindSearch();
      all("[data-ltab]", b => b.addEventListener("click", () => { labTab = b.dataset.ltab; q = ""; ctx.rerender(); }));
      all("[data-lcat]", b => b.addEventListener("click", () => { lCat = b.dataset.lcat; q = ""; ctx.rerender(); }));
      all("[data-ltog]", b => b.addEventListener("click", () => { labToggle(b.dataset.ltog); ctx.rerender(); }));
      all("[data-pview]", b => b.addEventListener("click", () => { pkgView = b.dataset.pview; ctx.rerender(); }));
      if (pkgView) {
        const close = () => { pkgView = null; ctx.rerender(); };
        $("#orPkX").addEventListener("click", close); $("#orPkClose").addEventListener("click", close); $("#orPkOv").addEventListener("click", close);
        if ($("#orPkAdd")) $("#orPkAdd").addEventListener("click", () => { labToggle(pkgView); close(); });
        $("#orPkClose").focus();
        document.querySelector(".or-md").addEventListener("keydown", e => { if (e.key === "Escape") close(); });
      }
      return;
    }
    // Catalogue pages
    all("[data-cat]", b => b.addEventListener("click", () => { cat[page] = b.dataset.cat; q = ""; ctx.rerender(); }));
    bindSearch();
    all("[data-add]", b => b.addEventListener("click", () => { modal = { svc: page, code: b.dataset.add, note: "", uid: "" }; ctx.rerender(); }));
    all("[data-tick]", b => b.addEventListener("change", () => {
      const it = draft.items.find(x => x.code === b.dataset.tick);
      if (it) removeUid(it.uid); else modal = { svc: page, code: b.dataset.tick, note: "", uid: "" };
      ctx.rerender();
    }));
  }

  // Payment state for the visit page (badge in the step list and the open-payment bar).
  function payState(o, lg) {
    const dv = o.doctorVisit || {}, src = dv.ordersDraft || (dv.steps && dv.steps.orders) || { items: [] };
    const keep = lang; lang = lg || lang; const ps = payOf(src.items || [], dv.payment); ps.label = L[lang]["ps_" + ps.status]; ps.text = money(Math.abs(ps.due)); lang = keep;
    return ps;
  }
  // Open the hub with the payment dialog (from the visit page's payment bar).
  function openPay() { page = "hub"; drawer = false; modal = null; pkgView = null; rSel = null; payM = { method: "cash", received: null, ref: "", ok: false, tried: false }; }

  const labs = () => LAB.map(x => ({ code: x[0], cat: x[1], en: x[2], ar: x[3] }));
  // Lab tests behind an order code: a package gives its tests, a single test gives itself.
  const labTests = code => { const pk = PKG.find(x => x.code === code); return pk ? pk.tests.slice() : LAB.some(x => x[0] === code) ? [code] : []; };
  // One ordered line as text in both languages (used when the order is sent to the follow-up team).
  function titleOf(o) {
    if (o.svc === "leave") return { en: `Sick Leave · ${o.days} ${Number(o.days) === 1 ? "day" : "days"}`, ar: `إجازة مرضية · ${o.days} ${Number(o.days) === 1 ? "يوم" : "أيام"}` };
    if (o.svc === "ref") { const sp = SPECS.find(x => x[0] === o.spec); return { en: `Referral to ${sp ? sp[1] : o.spec}`, ar: `تحويل إلى ${sp ? sp[2] : o.spec}` }; }
    const r = item(o.code); return r ? { en: r.en, ar: r.ar } : { en: o.code, ar: o.code };
  }
  // The visit's orders for the patient page (visit-pay.html), grouped by service, with what each one is and its price.
  function bill(o, lg) {
    const dv = o.doctorVisit || {}, src = dv.ordersDraft || (dv.steps && dv.steps.orders) || { items: [] }, items = src.items || [], M = L[lg], x = lg === "ar" ? 1 : 0;
    const groups = ORDER.filter(svc => items.some(i => i.svc === svc)).map(svc => ({ svc, name: M["s_" + svc], items: items.filter(i => i.svc === svc).map(i => {
      if (svc === "ref") { const r = refInfo(i); return { name: M.m_ref.replace("{s}", r.spec[lg]), about: i.dest === "ext" ? M.ext + (r.provider && r.provider[lg] ? " · " + r.provider[lg] : "") : M.mada, price: 0 }; }
      if (svc === "leave") return { name: leaveTxt(M, i.days), about: "", price: 0 };
      const r = item(i.code) || {}; return { code: i.code, name: r[lg] || i.code, about: (r.about || [])[x] || "", price: price(i) };
    }) }));
    return { groups, ...payOf(items, dv.payment) };
  }
  // How many services each Doctor Portal catalogue holds (dashboard Services page).
  const counts = () => ({ lab: LAB.length, labPkg: PKG.length, rad: RAD.length, iv: IVS.length, ivPkg: IVPKG.length, nurse: SVC.nurse.items.length });
  // A referral's specialty and provider names in both languages (Medical Requests page and the referral form).
  function refInfo(o) {
    const sp = SPECS.find(x => x[0] === o.spec), pv = PROVIDERS.find(x => x[0] === o.provider);
    return { spec: sp ? { en: sp[1], ar: sp[2] } : { en: o.spec || "", ar: o.spec || "" },
      provider: o.dest === "ext" ? { en: o.provider || "", ar: o.provider || "" } : pv ? { en: pv[1], ar: pv[2] } : null };
  }
  // The catalogue of one service ("lab", "rad", "nurse", "iv") as [{ code, en, ar, price }], packages after single items.
  // Used by Orders (doctor-orders-list.html) for orders the doctor adds after reading results.
  function catalog(svc) {
    const row = x => ({ code: x[0], en: x[2], ar: x[3], price: x[svc === "nurse" ? 6 : 4] }), pk = x => ({ code: x.code, en: x.en, ar: x.ar, price: x.price, pkg: true });
    if (svc === "lab") return LAB.map(row).concat(PKG.map(pk));
    if (svc === "iv") return IVS.map(row).concat(IVPKG.map(pk));
    if (svc === "rad") return RAD.map(x => ({ code: x.code, en: x.en, ar: x.ar, price: x.price }));
    return SVC[svc] ? SVC[svc].items.map(row) : [];
  }
  return { view, bind, reset, L, SVC, bill, payState, openPay, item, labs, labTests, titleOf, refInfo, counts, catalog };
})();
