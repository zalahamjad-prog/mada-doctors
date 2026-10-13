// Case History (step 2 of the doctor visit). Seven sections, each saved on its own in order.doctorVisit.history[key]:
//   social:    { occupation, marital, smoking, notes }
//   complaint: { items: [{ type, text, durMode: "set" | "unsure", durN, durU, severity, pain, details }] }
//   hpi:       { onsetUnknown, onsetN, onsetU, onsetDate, course: [], character, locNA, location, body: [], aggr, relief, assoc: [], notes }
//   meds:      { status: "current" | "none" | "unknown", current: [{ name, dose, freq }], previous: [{ name, note }], nkda, allergies: [{ drug, reaction, severity }] }
//   pmh:       { chronic: [], surgeries }
//   ros:       { sys: { [system]: { v: "pos" | "neg" | "na", note } } }
//   family:    { status: "present" | "none" | "unknown", conditions: [], notes }
// Each saved section also has savedAt and by; "Save as Draft" keeps it with draft: true (shown as In progress, required checks skipped). The step is complete (doctorVisit.steps.history) once Chief Complaint and Present Illness are saved.
const DrHistory = (() => {
  const SECS = ["social", "complaint", "hpi", "meds", "pmh", "ros", "family"];
  const REQUIRED = ["complaint", "hpi"];
  const MAX = 500;
  const I = {
    social: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    complaint: '<path d="M4 5h16v11H9l-5 4z"/><path d="M12 8v3M12 13.5h.01"/>',
    hpi: '<path d="M3 12h4l2-5 4 10 2-5h6"/>',
    meds: '<rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-45 12 12)"/><path d="m9.5 9.5 5 5"/>',
    pmh: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M12.5 11v6M9.5 14h6"/>',
    ros: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 13l2 2 4-4"/>',
    family: '<circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><path d="M3 20a5 5 0 0 1 10 0M11 20a5 5 0 0 1 10 0"/>',
    pain: '<circle cx="12" cy="7" r="3.5"/><path d="M5 21a7 7 0 0 1 14 0"/><path d="M10.5 8.6c.9-.6 2.1-.6 3 0"/>',
    fever: '<path d="M10 4a2 2 0 0 1 4 0v10a4 4 0 1 1-4 0z"/><path d="M12 9v7"/>',
    resp: '<path d="M12 4v8"/><path d="M12 12c-1-2-3-4-5-4-2 0-3 3-3 7 0 3 2 4 4 4s4-2 4-5"/><path d="M12 12c1-2 3-4 5-4 2 0 3 3 3 7 0 3-2 4-4 4s-4-2-4-5"/>',
    gi: '<path d="M9 3v4c0 2 2 3 4 3s5 1 5 5-3 6-7 6-6-2-6-4"/>',
    neuro: '<path d="M8 21v-3c-2-1-4-3-4-7a8 8 0 0 1 16 0c0 2-1 3-1 4l1 2h-2v2a2 2 0 0 1-2 2h-2"/><circle cx="12" cy="10" r="2.5"/>',
    cardio: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
    uri: '<path d="M8 4c-3 0-4 3-4 6s1 6 4 6 3-3 2-5 0-4 1-5-1-2-3-2z"/><path d="M16 4c3 0 4 3 4 6s-1 6-4 6-3-3-2-5 0-4-1-5 1-2 3-2z"/>',
    skin: '<path d="M3 15h18M3 19h18"/><path d="M6 15c0-2 1-3 3-3s3 1 3 3"/><circle cx="16" cy="9" r="1.5"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    more: '<circle cx="5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="19" cy="12" r="1.3" fill="currentColor"/>',
    chest: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/><path d="M7 12h3l1-2 2 4 1-2h3"/>',
    fatigue: '<rect x="7" y="4" width="10" height="17" rx="2"/><path d="M10 2h4M12 9v4M12 16h.01"/>',
    dizzy: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
    weight: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 10a3 3 0 0 1 6 0M12 10l1-1.5"/>',
    drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
    smile: '<circle cx="12" cy="12" r="9"/><path d="M8.5 14c1.8 2 5.2 2 7 0M9 10h.01M15 10h.01"/>',
    doc: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
    pin: '<path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>',
    back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    chev: '<path d="m9 6 6 6-6 6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    hist: '<path d="M12 8v4l3 2"/><path d="M3.5 12a8.5 8.5 0 1 0 2.5-6"/><path d="M3 4v4h4"/>',
    allergy: '<rect x="3" y="8.5" width="14" height="7" rx="3.5" transform="rotate(-45 10 12)"/><circle cx="17.5" cy="17.5" r="4"/><path d="M17.5 15.5v2M17.5 19.5h.01"/>',
    list: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>'
  };
  const TYPES = [["pain", "pain"], ["fever", "fever"], ["resp", "resp"], ["gi", "gi"], ["neuro", "neuro"], ["cardio", "cardio"], ["uri", "uri"], ["skin", "skin"], ["eye", "eye"], ["more", "more"]];
  const ASSOC = [["fever", "fever"], ["nausea", "gi"], ["cough", "resp"], ["sob", "resp"], ["chestPain", "chest"], ["urinary", "uri"], ["headache", "neuro"], ["fatigue", "fatigue"], ["dizzy", "dizzy"], ["weightLoss", "weight"], ["rash", "skin"], ["other", "more"]];
  const ROS = [["const", "social"], ["cv", "cardio"], ["resp", "resp"], ["gi", "gi"], ["gu", "uri"], ["msk", "pain"], ["neuro", "neuro"], ["skin", "skin"], ["ent", "eye"], ["endo", "fever"], ["heme", "drop"], ["psych", "smile"], ["other", "more"]];
  const UNITS = ["hours", "days", "weeks", "months", "years"];
  // Body map regions (front and back share the arm and leg keys).
  const FRONT = [["head", "c", 45, 18, 13], ["neck", "r", 39, 31, 12, 8], ["chest", "r", 25, 39, 40, 25], ["abdomen", "r", 25, 64, 40, 20], ["pelvis", "r", 25, 84, 40, 14],
    ["rArm", "r", 10, 41, 13, 52], ["lArm", "r", 67, 41, 13, 52], ["rLeg", "r", 26, 98, 18, 62], ["lLeg", "r", 46, 98, 18, 62]];
  const BACK = [["head", "c", 45, 18, 13], ["neck", "r", 39, 31, 12, 8], ["upperBack", "r", 25, 39, 40, 25], ["lowerBack", "r", 25, 64, 40, 20], ["buttocks", "r", 25, 84, 40, 14],
    ["lArm", "r", 10, 41, 13, 52], ["rArm", "r", 67, 41, 13, 52], ["lLeg", "r", 26, 98, 18, 62], ["rLeg", "r", 46, 98, 18, 62]];

  const L = {
    en: {
      checklist: "Visit Checklist", stepsDone: "Steps completed",
      hTitle: "Case History", hSub: "Take the patient's history one section at a time.", hInfo: "Chief Complaint and Present Illness are required. The other sections are filled when relevant.",
      st_none: "Not started", st_done: "Completed", notFilled: "Not filled yet", required: "Required",
      completeStep: "Save & Mark Complete", needReq: "Complete Chief Complaint and Present Illness first.", stepSaved: "Case history completed.",
      doneInfo: "Case history completed. You can still update any section.", toVitals: "Continue to Vital Signs",
      prev: "Previous", saveNext: "Save & Next", saveFinish: "Save & Finish", backList: "Back to case history", saved: "{s} saved.", optional: "(optional)", fixErr: "Fill in the required fields.",
      s_social: "Personal & Social History", s_complaint: "Chief Complaint", s_hpi: "Present Illness", s_meds: "Medication History", s_pmh: "Past Medical History", s_ros: "Review of Systems (ROS)", s_family: "Family History",
      d_social: "Occupation, marital status and smoking", d_complaint: "Main reason for the visit", d_hpi: "History of present illness (HPI)", d_meds: "Current and previous medications",
      d_pmh: "Chronic conditions, surgeries and admissions", d_ros: "Review symptoms by body system. Mark as Positive, Negative, or Not assessed.", d_family: "Hereditary and family conditions",
      occupation: "Occupation", occPh: "e.g. Teacher", marital: "Marital Status", m_single: "Single", m_married: "Married", m_divorced: "Divorced", m_widowed: "Widowed",
      smoking: "Smoking Status", sm_non: "Non-smoker", sm_yes: "Smoker", sm_ex: "Ex-smoker", socNotes: "Additional Social History (Optional)", socPh: "Living situation, diet, exercise, travel, caregiver...",
      ccInfo: "Use one block per complaint.", addComplaint: "Add Another Complaint", complaintN: "Complaint {n}", remove: "Remove",
      selType: "Select complaint type", selTypeS: "Choose the most relevant category to help organize the case",
      t_pain: "Pain", t_fever: "Fever", t_resp: "Respiratory", t_gi: "Gastrointestinal", t_neuro: "Neurological", t_cardio: "Cardiovascular", t_uri: "Urinary", t_skin: "Skin", t_eye: "Eye / ENT", t_more: "More",
      describe: "Describe the main complaint", describePh: "e.g. Right knee pain, abdominal pain, persistent cough...", describeErr: "Describe the complaint.",
      duration: "Duration", durSet: "Specify duration", durUnsure: "Not sure", durPh: "e.g. 3",
      u_hours: "Hours", u_days: "Days", u_weeks: "Weeks", u_months: "Months", u_years: "Years",
      severity: "Severity", sevInfo: "General severity, and the pain scale when the complaint is pain.", genSev: "General severity", sv_mild: "Mild", sv_moderate: "Moderate", sv_severe: "Severe",
      painScale: "If pain, use pain scale (0-10)", noPain: "No pain", modPain: "Moderate pain", worstPain: "Worst pain",
      addDetails: "Additional details", addDetailsPh: "e.g. location, character, what makes it better or worse, associated symptoms...",
      hpiInfo: "Onset, course, character, location and what changes it.",
      onset: "Onset", onsetS: "When did the symptoms start?", unknown: "Unknown",
      course: "Course", courseS: "How have the symptoms changed over time?",
      c_sudden: "Sudden", c_gradual: "Gradual", c_intermittent: "Intermittent", c_constant: "Constant", c_worsening: "Worsening", c_improving: "Improving", c_stable: "Stable",
      character: "Character / Description", characterS: "Describe the symptoms in the patient's own words or clinical description", characterPh: "e.g. sharp pain, dull ache, pressure, burning, etc...", characterErr: "Describe the symptoms.",
      location: "Location", locationS: "Where is the symptom located?", notApplicable: "Not applicable", locationPh: "e.g. right lower abdomen, chest, back, etc...",
      front: "Front", backV: "Back", bodyMap: "Select on body map",
      b_head: "Head", b_neck: "Neck", b_chest: "Chest", b_abdomen: "Abdomen", b_pelvis: "Pelvis", b_rArm: "Right arm", b_lArm: "Left arm", b_rLeg: "Right leg", b_lLeg: "Left leg",
      b_upperBack: "Upper back", b_lowerBack: "Lower back", b_buttocks: "Buttocks",
      aggr: "Aggravating Factors", aggrS: "What makes it worse?", aggrPh: "e.g. movement, eating, stress, lying down...",
      relief: "Relieving Factors", reliefS: "What makes it better?", reliefPh: "e.g. rest, medication, specific position...",
      assoc: "Associated Symptoms", assocS: "Any other symptoms with this complaint?",
      a_fever: "Fever", a_nausea: "Nausea / Vomiting", a_cough: "Cough", a_sob: "Shortness of breath", a_chestPain: "Chest pain", a_urinary: "Urinary symptoms", a_headache: "Headache",
      a_fatigue: "Fatigue", a_dizzy: "Dizziness", a_weightLoss: "Weight loss", a_rash: "Rash", a_other: "Other",
      notes: "Additional Notes", notesS: "Any other relevant details?", notesPh: "e.g. impact on daily activities, previous similar episodes, treatment tried...",
      ms_current: "Currently taking medications", ms_none: "No current medications", ms_unknown: "Unknown / Not assessed",
      curMeds: "Current Medications", curMedsS: "Medicine, dose and how often.", addMed: "Add Medication", medName: "Medicine", dose: "Dose", freq: "Frequency", medPh: "e.g. Metformin", dosePh: "e.g. 500 mg", freqPh: "e.g. twice daily",
      prevMeds: "Previous Medications", prevMedsS: "List important medications previously used.", addPrev: "Add Previous Medication", prevUsed: "Previously used medications", prevNote: "Note", prevNotePh: "e.g. stopped in 2023, side effects",
      allergies: "Drug Allergies", allergiesS: "Record all known drug allergies and reactions.", addAllergy: "Add Allergy", nkda: "No known drug allergies",
      drug: "Drug", drugPh: "e.g. Penicillin", reaction: "Reaction", reactionPh: "e.g. rash, swelling", noneYet: "Nothing added yet.",
      chronic: "Chronic conditions", ch_diabetes: "Diabetes", ch_htn: "Hypertension", ch_asthma: "Asthma", ch_heart: "Heart disease", ch_kidney: "Kidney disease", ch_none: "None",
      surgeries: "Previous surgeries / hospital admissions", surgeriesPh: "Type and year...",
      rosInfo: "Positive means the patient has symptoms in this system.", quick: "Quick Select", q_neg: "Mark all Negative", q_na: "Mark all Not assessed", q_clear: "Clear all",
      r_pos: "Positive", r_neg: "Negative", r_na: "Not assessed", rosNote: "Details", rosNotePh: "Describe the positive findings...",
      ros_const: "Constitutional", rh_const: "Fever, weight loss, fatigue, night sweats...", ros_cv: "Cardiovascular", rh_cv: "Chest pain, palpitations, swelling...",
      ros_resp: "Respiratory", rh_resp: "Cough, shortness of breath, wheezing...", ros_gi: "Gastrointestinal", rh_gi: "Nausea, vomiting, abdominal pain...",
      ros_gu: "Genitourinary", rh_gu: "Burning, frequency, blood in urine...", ros_msk: "Musculoskeletal", rh_msk: "Joint pain, stiffness, back pain...",
      ros_neuro: "Neurological", rh_neuro: "Headache, dizziness, numbness, weakness...", ros_skin: "Skin", rh_skin: "Rash, itching, wounds...",
      ros_ent: "Eyes / ENT", rh_ent: "Vision changes, ear pain, sore throat...", ros_psych: "Psychiatric", rh_psych: "Anxiety, depression, sleep disturbances...", ros_heme: "Hematologic", rh_heme: "Easy bruising, bleeding...", ros_other: "Other", rh_other: "Other system-related symptoms...",
      ros_endo: "Endocrine", rh_endo: "Thirst, heat or cold intolerance...",
      rosSum: "{p} positive · {n} negative",
      fs_present: "Family history present", fsd_present: "Select relevant family conditions below", fs_none: "No known family history", fsd_none: "No significant family medical history reported",
      fs_unknown: "Unknown / Not assessed", fsd_unknown: "Family history was not assessed", famNotesT: "Notes", famNotesS: "Any other family history details",
      draft: "Save as Draft", draftSaved: "{s} saved as draft.", st_draft: "In progress",
      famCond: "Conditions in the family", fc_diabetes: "Diabetes", fc_htn: "Hypertension", fc_heart: "Heart disease", fc_cancer: "Cancer", fc_stroke: "Stroke", fc_asthma: "Asthma", fc_none: "None known",
      famNotes: "Details", famNotesPh: "Who has it (father, mother, sibling) and at what age...",
      famDraft: "This section follows a draft layout until its design is ready."
    },
    ar: {
      checklist: "قائمة الزيارة", stepsDone: "الخطوات المكتملة",
      hTitle: "التاريخ المرضي", hSub: "سجّل تاريخ المريض قسم قسم.", hInfo: "الشكوى الرئيسية والمرض الحالي مطلوبة. باقي الأقسام تعبّيها إذا لها علاقة.",
      st_none: "ما بدأ", st_done: "مكتمل", notFilled: "ما تعبّى للحين", required: "مطلوب",
      completeStep: "حفظ وإكمال الخطوة", needReq: "كمّل الشكوى الرئيسية والمرض الحالي أول.", stepSaved: "اكتمل التاريخ المرضي.",
      doneInfo: "اكتمل التاريخ المرضي. تقدر تعدل أي قسم.", toVitals: "الانتقال للعلامات الحيوية",
      prev: "السابق", saveNext: "حفظ والتالي", saveFinish: "حفظ وإنهاء", backList: "رجوع للتاريخ المرضي", saved: "تم حفظ {s}.", optional: "(اختياري)", fixErr: "عبّ الحقول المطلوبة.",
      s_social: "التاريخ الشخصي والاجتماعي", s_complaint: "الشكوى الرئيسية", s_hpi: "المرض الحالي", s_meds: "التاريخ الدوائي", s_pmh: "التاريخ المرضي السابق", s_ros: "مراجعة الأجهزة (ROS)", s_family: "التاريخ العائلي",
      d_social: "الوظيفة والحالة الاجتماعية والتدخين", d_complaint: "السبب الرئيسي للزيارة", d_hpi: "تاريخ المرض الحالي (HPI)", d_meds: "الأدوية الحالية والسابقة",
      d_pmh: "الأمراض المزمنة والعمليات والتنويم", d_ros: "راجع الأعراض حسب كل جهاز. اختر إيجابي أو سلبي أو لم يُقيّم.", d_family: "الأمراض الوراثية والعائلية",
      occupation: "الوظيفة", occPh: "مثال: معلم", marital: "الحالة الاجتماعية", m_single: "أعزب", m_married: "متزوج", m_divorced: "مطلق", m_widowed: "أرمل",
      smoking: "التدخين", sm_non: "غير مدخن", sm_yes: "مدخن", sm_ex: "مدخن سابق", socNotes: "معلومات اجتماعية إضافية (اختياري)", socPh: "السكن، الأكل، الرياضة، السفر، المرافق...",
      ccInfo: "كل شكوى في خانة لحالها.", addComplaint: "إضافة شكوى ثانية", complaintN: "الشكوى {n}", remove: "حذف",
      selType: "اختر نوع الشكوى", selTypeS: "اختر الأقرب عشان ننظم الحالة",
      t_pain: "ألم", t_fever: "حرارة", t_resp: "تنفسي", t_gi: "جهاز هضمي", t_neuro: "أعصاب", t_cardio: "قلب وأوعية", t_uri: "مسالك بولية", t_skin: "جلد", t_eye: "عيون / أنف وأذن", t_more: "أخرى",
      describe: "صف الشكوى الرئيسية", describePh: "مثال: ألم الركبة اليمين، ألم بطن، كحة مستمرة...", describeErr: "اكتب وصف الشكوى.",
      duration: "المدة", durSet: "حدد المدة", durUnsure: "مو متأكد", durPh: "مثال: 3",
      u_hours: "ساعات", u_days: "أيام", u_weeks: "أسابيع", u_months: "شهور", u_years: "سنوات",
      severity: "الشدة", sevInfo: "الشدة العامة، ومقياس الألم إذا الشكوى ألم.", genSev: "الشدة العامة", sv_mild: "خفيف", sv_moderate: "متوسط", sv_severe: "شديد",
      painScale: "إذا فيه ألم، استخدم مقياس الألم (0-10)", noPain: "بدون ألم", modPain: "ألم متوسط", worstPain: "أشد ألم",
      addDetails: "تفاصيل إضافية", addDetailsPh: "مثال: المكان، نوع الألم، وش يخففه أو يزيده، أعراض مصاحبة...",
      hpiInfo: "البداية، التطور، الوصف، المكان، ووش يغيره.",
      onset: "البداية", onsetS: "متى بدأت الأعراض؟", unknown: "غير معروف",
      course: "التطور", courseS: "كيف تغيرت الأعراض مع الوقت؟",
      c_sudden: "مفاجئ", c_gradual: "تدريجي", c_intermittent: "متقطع", c_constant: "مستمر", c_worsening: "يزيد", c_improving: "يتحسن", c_stable: "ثابت",
      character: "الوصف", characterS: "صف الأعراض بكلام المريض أو وصف سريري", characterPh: "مثال: ألم حاد، ألم خفيف مستمر، ضغط، حرقان...", characterErr: "اكتب وصف الأعراض.",
      location: "المكان", locationS: "وين مكان العرض؟", notApplicable: "لا ينطبق", locationPh: "مثال: أسفل البطن يمين، الصدر، الظهر...",
      front: "أمام", backV: "خلف", bodyMap: "اختر من خريطة الجسم",
      b_head: "الرأس", b_neck: "الرقبة", b_chest: "الصدر", b_abdomen: "البطن", b_pelvis: "الحوض", b_rArm: "الذراع اليمين", b_lArm: "الذراع اليسار", b_rLeg: "الرجل اليمين", b_lLeg: "الرجل اليسار",
      b_upperBack: "أعلى الظهر", b_lowerBack: "أسفل الظهر", b_buttocks: "المقعدة",
      aggr: "عوامل تزيده", aggrS: "وش يزيده سوء؟", aggrPh: "مثال: الحركة، الأكل، التوتر، الاستلقاء...",
      relief: "عوامل تخففه", reliefS: "وش يخففه؟", reliefPh: "مثال: الراحة، الدواء، وضعية معينة...",
      assoc: "أعراض مصاحبة", assocS: "فيه أعراض ثانية مع الشكوى؟",
      a_fever: "حرارة", a_nausea: "غثيان / استفراغ", a_cough: "كحة", a_sob: "ضيق تنفس", a_chestPain: "ألم صدر", a_urinary: "أعراض بولية", a_headache: "صداع",
      a_fatigue: "تعب وإرهاق", a_dizzy: "دوخة", a_weightLoss: "نقص وزن", a_rash: "طفح جلدي", a_other: "أخرى",
      notes: "ملاحظات إضافية", notesS: "فيه تفاصيل ثانية مهمة؟", notesPh: "مثال: تأثيره على الحياة اليومية، نوبات سابقة، علاج جربه...",
      ms_current: "يستخدم أدوية حالياً", ms_none: "ما يستخدم أدوية حالياً", ms_unknown: "غير معروف / لم يُقيّم",
      curMeds: "الأدوية الحالية", curMedsS: "اسم الدواء والجرعة وكم مرة.", addMed: "إضافة دواء", medName: "الدواء", dose: "الجرعة", freq: "التكرار", medPh: "مثال: ميتفورمين", dosePh: "مثال: 500 ملغ", freqPh: "مثال: مرتين يومياً",
      prevMeds: "الأدوية السابقة", prevMedsS: "الأدوية المهمة اللي استخدمها قبل.", addPrev: "إضافة دواء سابق", prevUsed: "أدوية استخدمها سابقاً", prevNote: "ملاحظة", prevNotePh: "مثال: وقفه 2023، أعراض جانبية",
      allergies: "حساسية الأدوية", allergiesS: "سجّل كل حساسية أدوية معروفة وردة الفعل.", addAllergy: "إضافة حساسية", nkda: "ما عنده حساسية أدوية معروفة",
      drug: "الدواء", drugPh: "مثال: بنسلين", reaction: "ردة الفعل", reactionPh: "مثال: طفح، تورم", noneYet: "ما أضيف شي للحين.",
      chronic: "الأمراض المزمنة", ch_diabetes: "سكري", ch_htn: "ضغط", ch_asthma: "ربو", ch_heart: "أمراض قلب", ch_kidney: "أمراض كلى", ch_none: "لا يوجد",
      surgeries: "العمليات / التنويم السابق", surgeriesPh: "النوع والسنة...",
      rosInfo: "إيجابي يعني المريض عنده أعراض في هذا الجهاز.", quick: "اختيار سريع", q_neg: "الكل سلبي", q_na: "الكل لم يُقيّم", q_clear: "مسح الكل",
      r_pos: "إيجابي", r_neg: "سلبي", r_na: "لم يُقيّم", rosNote: "التفاصيل", rosNotePh: "اكتب الأعراض الإيجابية...",
      ros_const: "أعراض عامة", rh_const: "حرارة، نقص وزن، تعب، تعرق ليلي...", ros_cv: "القلب والأوعية", rh_cv: "ألم صدر، خفقان، تورم...",
      ros_resp: "الجهاز التنفسي", rh_resp: "كحة، ضيق تنفس، صفير...", ros_gi: "الجهاز الهضمي", rh_gi: "غثيان، استفراغ، ألم بطن...",
      ros_gu: "الجهاز البولي والتناسلي", rh_gu: "حرقان، كثرة تبول، دم في البول...", ros_msk: "العضلات والعظام", rh_msk: "ألم مفاصل، تيبس، ألم ظهر...",
      ros_neuro: "الأعصاب", rh_neuro: "صداع، دوخة، تنميل، ضعف...", ros_skin: "الجلد", rh_skin: "طفح، حكة، جروح...",
      ros_ent: "العيون / الأنف والأذن", rh_ent: "تغير النظر، ألم أذن، التهاب حلق...", ros_psych: "النفسية", rh_psych: "قلق، اكتئاب، اضطرابات نوم...", ros_heme: "الدم", rh_heme: "كدمات بسهولة، نزيف...", ros_other: "أخرى", rh_other: "أعراض ثانية متعلقة بالأجهزة...",
      ros_endo: "الغدد", rh_endo: "عطش، عدم تحمل الحر أو البرد...",
      rosSum: "{p} إيجابي · {n} سلبي",
      fs_present: "يوجد تاريخ عائلي", fsd_present: "اختر الأمراض الموجودة في العائلة تحت", fs_none: "لا يوجد تاريخ عائلي معروف", fsd_none: "ما ذكر أمراض مهمة في العائلة",
      fs_unknown: "غير معروف / لم يُقيّم", fsd_unknown: "ما تم تقييم التاريخ العائلي", famNotesT: "ملاحظات", famNotesS: "أي تفاصيل ثانية عن تاريخ العائلة",
      draft: "حفظ كمسودة", draftSaved: "تم حفظ {s} كمسودة.", st_draft: "قيد التعبئة",
      famCond: "أمراض في العائلة", fc_diabetes: "سكري", fc_htn: "ضغط", fc_heart: "أمراض قلب", fc_cancer: "سرطان", fc_stroke: "جلطة دماغية", fc_asthma: "ربو", fc_none: "لا يوجد معروف",
      famNotes: "التفاصيل", famNotesPh: "مين عنده (الأب، الأم، الإخوان) وبأي عمر...",
      famDraft: "هذا القسم بتصميم مبدئي لين يجهز تصميمه."
    }
  };

  let sub = null, draft = null, tried = false, rosOpen = {}, prevOpen = false;
  let lang = "en", ctx = null;
  const t = () => L[lang];
  const tx = (k, v) => t()[k].replace(/\{(\w+)\}/g, (_, n) => v[n]);
  const histOf = o => (o.doctorVisit && o.doctorVisit.history) || {};
  const blank = k => ({
    social: { occupation: "", marital: "", smoking: "", notes: "" },
    complaint: { items: [newComplaint()] },
    hpi: { onsetUnknown: false, onsetN: "", onsetU: "days", onsetDate: "", course: [], character: "", locNA: false, location: "", body: [], aggr: "", relief: "", assoc: [], notes: "" },
    meds: { status: "", current: [], previous: [], nkda: false, allergies: [] },
    pmh: { chronic: [], surgeries: "" },
    ros: { sys: {} },
    family: { status: "", conditions: [], notes: "" }
  })[k];
  function newComplaint() { return { type: "", text: "", durMode: "set", durN: "", durU: "days", severity: "", pain: null, details: "" }; }
  const clone = v => JSON.parse(JSON.stringify(v));
  const reset = () => { sub = null; draft = null; tried = false; };
  const ready = o => REQUIRED.every(k => histOf(o)[k] && !histOf(o)[k].draft);

  // Path helpers for data-p="a.b.0.c".
  function getP(obj, p) { return p.split(".").reduce((v, k) => v == null ? v : v[k], obj); }
  function setP(obj, p, val) {
    const ks = p.split("."), last = ks.pop();
    const tgt = ks.reduce((v, k, i) => { if (v[k] == null) v[k] = /^\d+$/.test(ks[i + 1] || last) ? [] : {}; return v[k]; }, obj);
    tgt[last] = val;
  }

  /* ---------- small builders ---------- */
  const S = p => ctx.svg(p), E = s => ctx.esc(s);
  const chip = (path, v, label, multi, cls) => {
    const cur = getP(draft, path), on = multi ? (cur || []).includes(v) : cur === v;
    return `<button type="button" class="hx-chip ${cls || ""} ${on ? "on" : ""}" data-pick="${path}" data-v="${v}" ${multi ? "data-multi" : ""} aria-pressed="${on}">${label}</button>`;
  };
  const area = (path, ph, rows, req) => {
    const v = getP(draft, path) || "";
    return `<div class="hx-area ${req && tried && !v.trim() ? "bad" : ""}"><textarea data-p="${path}" maxlength="${MAX}" rows="${rows || 3}" placeholder="${E(ph)}">${E(v)}</textarea>
      <div class="hx-count"><span data-count="${path}">${v.length}</span> / ${MAX}</div></div>`;
  };
  const input = (path, ph, extra) => `<input class="hx-in" data-p="${path}" value="${E(getP(draft, path) || "")}" placeholder="${E(ph)}" ${extra || ""}>`;
  const unitSel = path => `<select class="hx-in" data-p="${path}">${UNITS.map(u => `<option value="${u}" ${getP(draft, path) === u ? "selected" : ""}>${t()["u_" + u]}</option>`).join("")}</select>`;
  const box = (n, title, sub, body, extra, aside) => `<div class="hx-box">${title ? `<div class="hx-bh">${n ? `<span class="hx-n">${n}</span>` : ""}<div class="hx-bt"><b>${title}</b>${extra || ""}${sub ? `<small>${sub}</small>` : ""}</div>${aside || ""}</div>` : ""}${body}</div>`;
  const opt = () => `<span class="hx-opt">${t().optional}</span>`;
  const info = k => `<span class="hx-i" title="${E(t()[k])}" aria-label="${E(t()[k])}" tabindex="0">i</span>`;

  /* ---------- list view ---------- */
  function summary(k, d, o) {
    if (!d) return t().notFilled;
    const join = a => a.filter(Boolean).join(" · ");
    if (k === "social") return join([d.occupation, d.marital && t()["m_" + d.marital], d.smoking && t()["sm_" + d.smoking]]) || t().st_done;
    if (k === "complaint") return d.items.map(c => c.text).filter(Boolean).join("، ").slice(0, 90);
    if (k === "hpi") return (d.character || "").slice(0, 90);
    if (k === "meds") return join([d.status && t()["ms_" + d.status], d.current.length ? `${t().curMeds}: ${d.current.length}` : "", d.nkda ? t().nkda : d.allergies.length ? `${t().allergies}: ${d.allergies.length}` : ""]);
    if (k === "pmh") return join(d.chronic.map(c => t()["ch_" + c])) || (d.surgeries || "").slice(0, 80) || t().st_done;
    if (k === "ros") { const v = Object.values(d.sys || {}); return tx("rosSum", { p: v.filter(x => x.v === "pos").length, n: v.filter(x => x.v === "neg").length }); }
    if (k === "family") return d.status === "present" ? join(d.conditions.map(c => t()["fc_" + c])) || t()["fs_present"] : d.status ? t()["fs_" + d.status] : t().st_done;
    return "";
  }
  function listView(o) {
    const h = histOf(o), complete = !!(o.doctorVisit && o.doctorVisit.steps && o.doctorVisit.steps.history);
    const rows = SECS.map((k, i) => {
      const d = h[k], st = !d ? "none" : d.draft ? "draft" : "done";
      return `<button type="button" class="hx-row ${st === "done" ? "is-done" : ""}" data-sub="${k}">
        <span class="hx-ric">${S(I[k])}</span>
        <span class="hx-rt"><b>${i + 1}. ${t()["s_" + k]}${REQUIRED.includes(k) ? ` <span class="req">*</span>` : ""}</b><small>${E(summary(k, d, o))}</small></span>
        <span class="hx-st ${st === "done" ? "ok" : st === "draft" ? "wip" : ""}">${t()["st_" + st]}</span>
        <span class="hx-chev">${S(I.chev)}</span></button>`;
    }).join("");
    return `<div class="sec-h"><span class="sec-ic">${S(I.hist)}</span><div><h1>${t().hTitle}</h1><p>${t().hSub}</p></div></div>
      <div class="info ${complete ? "ok" : ""}">${S(complete ? I.check : I.info)}<span>${complete ? t().doneInfo : t().hInfo}</span></div>
      <div class="hx-list">${rows}</div>
      ${complete ? `<button type="button" class="save" id="hxNext">${t().toVitals}${ctx.svg(I.arrow, 2)}</button>`
        : `<button type="button" class="save ${ready(o) ? "" : "dim"}" id="hxComplete">${t().completeStep}${ctx.svg(I.arrow, 2)}</button>`}`;
  }

  /* ---------- section forms ---------- */
  function socialForm() {
    return `<div class="hx-grid2">
        <div class="hx-f"><label>${t().occupation}</label>${input("occupation", t().occPh)}</div>
        <div class="hx-f"><label>${t().marital}</label><div class="hx-chips">${["single", "married", "divorced", "widowed"].map(v => chip("marital", v, t()["m_" + v])).join("")}</div></div>
      </div>
      <div class="hx-f"><label>${t().smoking}</label><div class="hx-chips">${["non", "yes", "ex"].map(v => chip("smoking", v, t()["sm_" + v])).join("")}</div></div>
      <div class="hx-f"><label>${t().socNotes}</label>${area("notes", t().socPh, 4)}</div>`;
  }
  function complaintForm() {
    const many = draft.items.length > 1;
    return draft.items.map((c, i) => {
      const p = `items.${i}`;
      const types = `<div class="hx-tiles">${TYPES.map(([v, ic]) => {
        const on = c.type === v;
        return `<button type="button" class="hx-tile ${on ? "on" : ""}" data-pick="${p}.type" data-v="${v}" aria-pressed="${on}">${S(I[ic])}<span>${t()["t_" + v]}</span></button>`;
      }).join("")}</div>`;
      const dur = `<div class="hx-radios">
          <label class="hx-radio"><input type="radio" name="dm${i}" data-p="${p}.durMode" value="set" ${c.durMode !== "unsure" ? "checked" : ""}><span>${t().durSet}</span></label>
          <label class="hx-radio"><input type="radio" name="dm${i}" data-p="${p}.durMode" value="unsure" ${c.durMode === "unsure" ? "checked" : ""}><span>${t().durUnsure}</span></label></div>
        ${c.durMode === "unsure" ? "" : `<div class="hx-dur">${input(`${p}.durN`, t().durPh, 'inputmode="numeric" maxlength="3"')}${unitSel(`${p}.durU`)}</div>`}`;
      const sev = `<div class="hx-sev"><div><div class="hx-lbl">${t().genSev}</div><div class="hx-chips">${["mild", "moderate", "severe"].map(v => chip(`${p}.severity`, v, t()["sv_" + v], false, "sev sev-" + v)).join("")}</div></div>
        <div class="hx-pain"><div class="hx-lbl">${t().painScale}</div><div class="hx-scale" dir="ltr">${Array.from({ length: 11 }, (_, n) =>
          `<button type="button" class="hx-pn ${c.pain === n ? "on" : ""} ${n >= 7 ? "hi" : n >= 4 ? "mid" : ""}" data-pain="${i}" data-v="${n}" aria-pressed="${c.pain === n}">${n}</button>`).join("")}</div>
          <div class="hx-scale-l"><span>${t().noPain}</span><span>${t().modPain}</span><span>${t().worstPain}</span></div></div></div>`;
      return `<div class="hx-cc">
        ${many ? `<div class="hx-cch"><b>${tx("complaintN", { n: i + 1 })}</b><button type="button" class="hx-rm" data-rmc="${i}">${S(I.trash)}${t().remove}</button></div>` : ""}
        ${box(1, t().selType, t().selTypeS, types, " " + opt())}
        ${box(2, `${t().describe} <span class="req">*</span>`, "", area(`${p}.text`, t().describePh, 3, true) + (tried && !c.text.trim() ? `<div class="hx-err">${t().describeErr}</div>` : ""))}
        ${box(3, t().duration, "", dur)}
        ${box(4, t().severity, "", sev, " " + info("sevInfo"))}
        ${box(5, t().addDetails, "", area(`${p}.details`, t().addDetailsPh, 3), " " + opt())}
      </div>`;
    }).join("");
  }
  function bodyMap() {
    const sel = draft.body || [];
    const fig = (regs, label) => `<figure class="hx-fig"><svg viewBox="0 0 90 164" aria-label="${E(label)}">${regs.map(([k, s, a, b, c, d]) => {
      const on = sel.includes(k) ? "on" : "", attrs = `class="hx-reg ${on}" data-region="${k}" tabindex="0" role="button" aria-pressed="${!!on}"`;
      return s === "c" ? `<circle ${attrs} cx="${a}" cy="${b}" r="${c}"><title>${E(t()["b_" + k])}</title></circle>` : `<rect ${attrs} x="${a}" y="${b}" width="${c}" height="${d}" rx="2"><title>${E(t()["b_" + k])}</title></rect>`;
    }).join("")}</svg><figcaption>${label}</figcaption></figure>`;
    return `<div class="hx-map"><div class="hx-figs" dir="ltr">${fig(FRONT, t().front)}${fig(BACK, t().backV)}</div><b>${t().bodyMap}</b>
      ${sel.length ? `<div class="hx-tags">${sel.map(k => `<span>${t()["b_" + k]}</span>`).join("")}</div>` : ""}</div>`;
  }
  function hpiForm() {
    const d = draft;
    const onset = `<div class="hx-onset ${d.onsetUnknown ? "off" : ""}">${input("onsetN", t().durPh, `inputmode="numeric" maxlength="3" ${d.onsetUnknown ? "disabled" : ""}`)}${unitSel("onsetU")}
      <input class="hx-in" type="date" dir="ltr" data-p="onsetDate" value="${E(d.onsetDate)}" max="${new Date().toISOString().slice(0, 10)}" ${d.onsetUnknown ? "disabled" : ""}></div>`;
    const ck = (path, label) => `<label class="hx-ck"><input type="checkbox" data-p="${path}" ${getP(d, path) ? "checked" : ""}><span>${label}</span></label>`;
    const loc = `<div class="hx-locwrap">${box(4, t().location, t().locationS,
        `<div class="hx-icon-in ${d.locNA ? "off" : ""}">${S(I.pin)}${input("location", t().locationPh, d.locNA ? "disabled" : "")}</div>`, "", ck("locNA", t().notApplicable))}${d.locNA ? "" : bodyMap()}</div>`;
    return `${box(1, t().onset, t().onsetS, onset, "", ck("onsetUnknown", t().unknown))}
      ${box(2, t().course, t().courseS, `<div class="hx-chips">${["sudden", "gradual", "intermittent", "constant", "worsening", "improving", "stable"].map(v => chip("course", v, t()["c_" + v], true)).join("")}</div>`)}
      ${box(3, t().character, `${t().characterS} <span class="req">*</span>`, area("character", t().characterPh, 3, true) + (tried && !d.character.trim() ? `<div class="hx-err">${t().characterErr}</div>` : ""))}
      ${loc}
      <div class="hx-grid2 hx-af">
        ${box(5, t().aggr, t().aggrS, `<textarea class="hx-ta" data-p="aggr" rows="3" maxlength="${MAX}" placeholder="${E(t().aggrPh)}">${E(d.aggr)}</textarea>`)}
        ${box("", t().relief, t().reliefS, `<textarea class="hx-ta" data-p="relief" rows="3" maxlength="${MAX}" placeholder="${E(t().reliefPh)}">${E(d.relief)}</textarea>`)}
      </div>
      ${box(6, t().assoc, t().assocS, `<div class="hx-tiles hx-tiles-row">${ASSOC.map(([v, ic]) => {
        const on = d.assoc.includes(v);
        return `<button type="button" class="hx-tile row ${on ? "on" : ""}" data-pick="assoc" data-v="${v}" data-multi aria-pressed="${on}">${S(I[ic])}<span>${t()["a_" + v]}</span></button>`;
      }).join("")}</div>`)}
      ${box(7, t().notes, t().notesS, area("notes", t().notesPh, 3), " " + opt())}`;
  }
  function rows(list, cols, rm) {
    const d = draft[list];
    if (!d.length) return `<p class="hx-empty">${t().noneYet}</p>`;
    return `<div class="hx-rows">${d.map((_, i) => `<div class="hx-mrow">${cols.map(([k, ph, sel]) => sel
      ? `<select class="hx-in" data-p="${list}.${i}.${k}" aria-label="${E(t()[ph])}"><option value="">${t().severity}</option>${sel.map(v => `<option value="${v}" ${draft[list][i][k] === v ? "selected" : ""}>${t()["sv_" + v]}</option>`).join("")}</select>`
      : input(`${list}.${i}.${k}`, t()[ph], `aria-label="${E(t()[ph])}"`)).join("")}<button type="button" class="hx-x" data-rm="${list}" data-i="${i}" aria-label="${t().remove}">${S(I.x)}</button></div>`).join("")}</div>`;
  }
  function medsForm() {
    const d = draft;
    const status = `<div class="hx-cards">${["current", "none", "unknown"].map(v => `<label class="hx-rc ${d.status === v ? "on" : ""}"><input type="radio" name="ms" data-p="status" value="${v}" ${d.status === v ? "checked" : ""}><span class="dot"></span>${t()["ms_" + v]}</label>`).join("")}</div>`;
    const head = (title, sub, btn, add, icon, extra) => `<div class="hx-sh">${icon ? `<span class="hx-shic">${S(icon)}</span>` : ""}<div><b>${title}</b>${extra || ""}<small>${sub}</small></div>
      <button type="button" class="hx-add" data-add="${add}" ${add === "allergies" && d.nkda ? "disabled" : ""}>${S(I.plus)}${btn}</button></div>`;
    const cur = d.status === "current" ? `<div class="hx-part">${head(t().curMeds, t().curMedsS, t().addMed, "current")}${rows("current", [["name", "medPh"], ["dose", "dosePh"], ["freq", "freqPh"]])}</div>` : "";
    const prev = `<div class="hx-part">${head(t().prevMeds, t().prevMedsS, t().addPrev, "previous", null, " " + opt())}
      <div class="hx-coll ${prevOpen ? "open" : ""}"><button type="button" class="hx-collh" id="prevToggle" aria-expanded="${prevOpen}">${S(I.hist)}<b>${t().prevUsed}</b> <span class="hx-opt">(${d.previous.length})</span><span class="hx-chev2">${S(I.down)}</span></button>
      ${prevOpen ? `<div class="hx-collb">${rows("previous", [["name", "medPh"], ["note", "prevNotePh"]])}</div>` : ""}</div></div>`;
    const alg = `<div class="hx-part">${head(t().allergies, t().allergiesS, t().addAllergy, "allergies", I.allergy)}
      <label class="hx-ck"><input type="checkbox" data-p="nkda" ${d.nkda ? "checked" : ""}><span>${t().nkda}</span></label>
      ${d.nkda ? "" : rows("allergies", [["drug", "drugPh"], ["reaction", "reactionPh"], ["severity", "severity", ["mild", "moderate", "severe"]]])}</div>`;
    return status + cur + prev + alg;
  }
  function pmhForm() {
    return `<div class="hx-f"><label>${t().chronic}</label><div class="hx-chips">${["diabetes", "htn", "asthma", "heart", "kidney", "none"].map(v => chip("chronic", v, t()["ch_" + v], true)).join("")}</div></div>
      <div class="hx-f"><label>${t().surgeries}</label>${area("surgeries", t().surgeriesPh, 4)}</div>`;
  }
  function rosForm() {
    return `<div class="hx-ros">${ROS.map(([k, ic]) => {
      const cur = (draft.sys[k] || {}).v || "", open = rosOpen[k] || cur === "pos";
      const r = v => `<label class="hx-rr ${cur === v ? "on " + v : ""}"><input type="radio" name="ros-${k}" data-p="sys.${k}.v" value="${v}" ${cur === v ? "checked" : ""}><span class="dot"></span>${t()["r_" + v]}</label>`;
      return `<div class="hx-rs"><div class="hx-rsh"><span class="hx-rsic">${S(I[ic])}</span><div><b>${t()["ros_" + k]}</b><small>${t()["rh_" + k]}</small></div>
        <button type="button" class="hx-rsx ${open ? "open" : ""}" data-ros="${k}" aria-expanded="${open}" aria-label="${E(t().rosNote)}">${S(I.down)}</button></div>
        <div class="hx-rrs">${r("pos")}${r("neg")}${r("na")}</div>
        ${open ? `<div class="hx-rsn"><label>${t().rosNote}</label><textarea class="hx-ta" data-p="sys.${k}.note" rows="2" maxlength="${MAX}" placeholder="${E(t().rosNotePh)}">${E((draft.sys[k] || {}).note || "")}</textarea></div>` : ""}</div>`;
    }).join("")}</div>`;
  }
  function familyForm() {
    const d = draft;
    const card = v => `<label class="hx-rc tall ${d.status === v ? "on" : ""}"><input type="radio" name="fs" data-p="status" value="${v}" ${d.status === v ? "checked" : ""}><span class="dot"></span><span><b>${t()["fs_" + v]}</b><small>${t()["fsd_" + v]}</small></span></label>`;
    return `<div class="hx-stack">${["present", "none", "unknown"].map(card).join("")}</div>
      ${d.status === "present" ? `<div class="hx-f"><label>${t().famCond}</label><div class="hx-chips">${["diabetes", "htn", "heart", "cancer", "stroke", "asthma"].map(v => chip("conditions", v, t()["fc_" + v], true)).join("")}</div></div>` : ""}
      <div class="hx-box"><div class="hx-sh"><span class="hx-shic">${S(I.doc)}</span><div><b>${t().famNotesT}</b> ${opt()}<small>${t().famNotesS}</small></div></div>${area("notes", t().famNotesPh, 3)}</div>`;
  }
  const FORMS = { social: socialForm, complaint: complaintForm, hpi: hpiForm, meds: medsForm, pmh: pmhForm, ros: rosForm, family: familyForm };

  function formView(o) {
    const h = histOf(o), i = SECS.indexOf(sub);
    const bar = SECS.map((k, n) => `<span class="${k === sub ? "cur" : h[k] && !h[k].draft ? "ok" : ""}"></span>`).join("");
    const action = sub === "complaint" ? `<button type="button" class="hx-addc" id="addComplaint">+ ${t().addComplaint}</button>`
      : sub === "ros" ? `<details class="hx-quick"><summary>${S(I.list)}${t().quick}${S(I.down)}</summary><div>${["neg", "na", "clear"].map(v => `<button type="button" data-quick="${v}">${t()["q_" + v]}</button>`).join("")}</div></details>` : "";
    const tip = sub === "complaint" ? " " + info("ccInfo") : sub === "hpi" ? " " + info("hpiInfo") : sub === "ros" ? " " + info("rosInfo") : "";
    return `<div class="hx-top"><button type="button" class="hx-bk" id="hxBack" aria-label="${E(t().backList)}">${S(I.back)}</button>
        <div class="hx-tt"><small>${t().hTitle}</small><b>${t()["s_" + sub]}</b></div><span class="hx-pill">${i + 1}/${SECS.length}</span><div class="hx-bar">${bar}</div></div>
      <div class="hx-body">
        <div class="hx-head"><span class="hx-num ${h[sub] && !h[sub].draft ? "ok" : ""}">${i + 1}</span><div><h2>${t()["s_" + sub]}${tip}</h2><p>${t()["d_" + sub]}</p></div>${action}</div>
        ${FORMS[sub]()}
      </div>
      <div class="hx-foot"><button type="button" class="hx-btn out" id="hxPrev"><span class="flip">${S(I.back)}</span>${i ? t().prev : t().backList}</button>
        <span class="hx-sp"></span><button type="button" class="hx-btn soft" id="hxDraft">${S(I.doc)}${t().draft}</button>
        <button type="button" class="hx-btn dark" id="hxSave">${i === SECS.length - 1 ? t().saveFinish : t().saveNext}${S(I.arrow)}</button></div>`;
  }

  function view(o, c) {
    ctx = c; lang = c.lang;
    if (sub && !draft) draft = clone(histOf(o)[sub] || blank(sub));
    return sub ? `<div class="hx-form">${formView(o)}</div>` : listView(o);
  }
  function open(k, o) { sub = k; draft = clone(histOf(o)[k] || blank(k)); tried = false; prevOpen = false; rosOpen = {}; ctx.rerender(true); }
  function valid() {
    if (sub === "complaint") return draft.items.every(c => c.text.trim());
    if (sub === "hpi") return !!draft.character.trim();
    return true;
  }
  function clean() {
    if (sub === "meds") ["current", "previous", "allergies"].forEach(l => draft[l] = draft[l].filter(r => Object.values(r).some(v => String(v || "").trim())));
    if (sub === "meds" && draft.nkda) draft.allergies = [];
    if (sub === "meds" && draft.status !== "current") draft.current = [];
    if (sub === "family" && draft.status !== "present") draft.conditions = [];
  }

  function bind(root, o, c) {
    ctx = c;
    const q = s => root.querySelector(s);
    root.querySelectorAll("[data-sub]").forEach(b => b.addEventListener("click", () => open(b.dataset.sub, o)));
    if (q("#hxComplete")) q("#hxComplete").addEventListener("click", () => {
      if (!ready(MadaOrders.get(o.id))) return ctx.toast(t().needReq);
      ctx.complete(); ctx.toast(t().stepSaved);
    });
    if (q("#hxNext")) q("#hxNext").addEventListener("click", () => ctx.go("vitals"));
    if (!sub) return;

    const redraw = () => ctx.rerender(false);
    q("#hxBack").addEventListener("click", () => { reset(); ctx.rerender(true); });
    q("#hxPrev").addEventListener("click", () => {
      const i = SECS.indexOf(sub);
      if (!i) { reset(); return ctx.rerender(true); }
      open(SECS[i - 1], MadaOrders.get(o.id));
    });
    q("#hxDraft").addEventListener("click", () => {
      clean();
      ctx.saveSection(sub, { ...draft, draft: true, savedAt: new Date().toISOString(), by: ctx.me });
      ctx.toast(tx("draftSaved", { s: t()["s_" + sub] }));
      reset(); ctx.rerender(true);
    });
    q("#hxSave").addEventListener("click", () => {
      tried = true;
      if (!valid()) { redraw(); ctx.toast(t().fixErr); const b = root.querySelector(".hx-area.bad"); if (b) b.scrollIntoView({ block: "center" }); return; }
      clean();
      const { draft: _d, ...data } = draft;
      ctx.saveSection(sub, { ...data, savedAt: new Date().toISOString(), by: ctx.me });
      ctx.toast(tx("saved", { s: t()["s_" + sub] }));
      const i = SECS.indexOf(sub);
      if (i < SECS.length - 1) open(SECS[i + 1], MadaOrders.get(o.id)); else { reset(); ctx.rerender(true); }
    });
    // Text, select, radio and checkbox fields write to the draft.
    root.querySelectorAll("[data-p]").forEach(el => {
      const ev = el.tagName === "SELECT" || el.type === "radio" || el.type === "checkbox" || el.type === "date" ? "change" : "input";
      el.addEventListener(ev, () => {
        let v = el.type === "checkbox" ? el.checked : el.value;
        if (el.inputMode === "numeric") { v = v.replace(/\D/g, ""); el.value = v; }
        setP(draft, el.dataset.p, v);
        const cnt = root.querySelector(`[data-count="${el.dataset.p}"]`); if (cnt) cnt.textContent = v.length;
        if (el.type === "radio" || el.type === "checkbox") redraw();
        else if (tried && el.closest(".hx-area.bad") && v.trim()) { el.closest(".hx-area").classList.remove("bad"); const er = el.closest(".hx-box").querySelector(".hx-err"); if (er) er.remove(); }
      });
    });
    root.querySelectorAll("[data-pick]").forEach(b => b.addEventListener("click", () => {
      const p = b.dataset.pick, v = b.dataset.v;
      if (b.hasAttribute("data-multi")) {
        let a = (getP(draft, p) || []).slice();
        const none = v === "none";
        a = a.includes(v) ? a.filter(x => x !== v) : none ? [v] : a.filter(x => x !== "none").concat(v);
        setP(draft, p, a);
      } else setP(draft, p, getP(draft, p) === v ? "" : v);
      redraw();
    }));
    root.querySelectorAll("[data-pain]").forEach(b => b.addEventListener("click", () => {
      const c = draft.items[+b.dataset.pain], n = +b.dataset.v; c.pain = c.pain === n ? null : n; redraw();
    }));
    root.querySelectorAll("[data-region]").forEach(r => {
      const tog = () => { const k = r.dataset.region; draft.body = draft.body.includes(k) ? draft.body.filter(x => x !== k) : draft.body.concat(k); redraw(); };
      r.addEventListener("click", tog);
      r.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tog(); } });
    });
    if (q("#addComplaint")) q("#addComplaint").addEventListener("click", () => { draft.items.push(newComplaint()); redraw(); const all = root.querySelectorAll(".hx-cc"); all[all.length - 1].scrollIntoView({ block: "start", behavior: "smooth" }); });
    root.querySelectorAll("[data-rmc]").forEach(b => b.addEventListener("click", () => { draft.items.splice(+b.dataset.rmc, 1); redraw(); }));
    root.querySelectorAll("[data-add]").forEach(b => b.addEventListener("click", () => {
      const l = b.dataset.add;
      draft[l].push(l === "current" ? { name: "", dose: "", freq: "" } : l === "previous" ? { name: "", note: "" } : { drug: "", reaction: "", severity: "" });
      if (l === "previous") prevOpen = true;
      redraw();
      const rs = root.querySelectorAll(`[data-p^="${l}.${draft[l].length - 1}."]`); if (rs[0]) rs[0].focus();
    }));
    root.querySelectorAll("[data-rm]").forEach(b => b.addEventListener("click", () => { draft[b.dataset.rm].splice(+b.dataset.i, 1); redraw(); }));
    if (q("#prevToggle")) q("#prevToggle").addEventListener("click", () => { prevOpen = !prevOpen; redraw(); });
    root.querySelectorAll("[data-ros]").forEach(b => b.addEventListener("click", () => { rosOpen[b.dataset.ros] = !rosOpen[b.dataset.ros]; redraw(); }));
    root.querySelectorAll("[data-quick]").forEach(b => b.addEventListener("click", () => {
      const v = b.dataset.quick;
      ROS.forEach(([k]) => { if (v === "clear") delete draft.sys[k]; else draft.sys[k] = { ...(draft.sys[k] || {}), v }; });
      redraw();
    }));
  }

  return { view, bind, reset, ready, SECS, L, isOpen: () => !!sub };
})();
