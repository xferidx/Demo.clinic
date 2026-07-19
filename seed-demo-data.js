// seed-demo-data.js
// -----------------------------------------------------------------------------
// TRIAL BUILD ONLY. Fills the local (localStorage) demo database with
// believable sample data the first time the trial is opened, so a prospective
// buyer sees a working, populated system instead of an empty shell.
// All names/phones/records below are fictional. Runs once (guarded by a flag)
// and never overwrites anything a demo user later adds or edits themselves.
// -----------------------------------------------------------------------------
(function () {
  const APP_ID = "dental-clinic-trial";
  const BASE = "artifacts/" + APP_ID + "/public/data";
  const SEED_FLAG = "mockfs:seeded-v1";

  if (localStorage.getItem(SEED_FLAG)) return;

  function put(path, data) {
    localStorage.setItem("mockfs:doc:" + path, JSON.stringify(data));
  }
  function ts(daysAgo) {
    const d = Date.now() - daysAgo * 86400000;
    return { __ts: d };
  }
  function isoDate(daysFromToday) {
    const d = new Date();
    d.setDate(d.getDate() + daysFromToday);
    return d.toISOString().split("T")[0];
  }

  // ---- waiting room ----
  put(BASE + "/clinic_state/waiting_room", { count: 2, updatedAt: ts(0) });

  // ---- today's / tomorrow's bookings (skip Fridays automatically) ----
  function nextOpenDay(offset) {
    let d = offset;
    while (new Date(isoDate(d) + "T00:00:00").getDay() === 5) d += 1;
    return isoDate(d);
  }
  const day0 = nextOpenDay(0);
  const day1 = nextOpenDay(1);

  const bookings = [
    { date: day0, time: "05:30 PM", name: "أحمد كريم جواد", phone: "0790 111 2233", reasons: ["ألم أسنان"] },
    { date: day0, time: "07:00 PM", name: "نور حسين علي", phone: "0770 222 3344", reasons: ["تنظيف وتلميع"] },
    { date: day1, time: "06:00 PM", name: "ياسمين عبد الرزاق", phone: "0781 333 4455", reasons: ["تقويم أسنان"] },
  ];
  bookings.forEach((b) => {
    put(BASE + "/clinic_bookings/" + b.date + "_" + b.time, {
      name: b.name,
      phone: b.phone,
      reasons: b.reasons,
      timestamp: new Date().toISOString(),
      date: b.date,
      time: b.time,
    });
  });

  // ---- sample patient records ----
  const patients = [
    {
      id: "seed-p1",
      name: "أحمد كريم جواد",
      patientId: "1001",
      phone: "0790 111 2233",
      pinned: true,
      caseHistory: [
        {
          id: "e1",
          date: isoDate(-10),
          notes: "فحص أولي وشكوى من ألم عند المضغ.",
          paid: 25000,
          remaining: 0,
          teeth: ["LR6"],
          procedure: "Filling",
          canalDetails: {},
          fillingMaterials: { bond: "Premio", composite: "Toko" },
        },
        {
          id: "e2",
          date: isoDate(-2),
          notes: "متابعة بعد الحشوة — لا ألم.",
          paid: 0,
          remaining: 0,
          teeth: [],
          procedure: "Checkup",
          canalDetails: {},
          fillingMaterials: {},
        },
      ],
      createdAt: ts(30),
      updatedAt: ts(2),
    },
    {
      id: "seed-p2",
      name: "نور حسين علي",
      patientId: "1002",
      phone: "0770 222 3344",
      pinned: false,
      caseHistory: [
        {
          id: "e1",
          date: isoDate(-5),
          notes: "تنظيف وتلميع دوري.",
          paid: 20000,
          remaining: 0,
          teeth: [],
          procedure: "Cleaning",
          canalDetails: {},
          fillingMaterials: {},
        },
      ],
      createdAt: ts(60),
      updatedAt: ts(5),
    },
    {
      id: "seed-p3",
      name: "مصطفى جبار حسن",
      patientId: "1003",
      phone: "0781 444 5566",
      pinned: false,
      caseHistory: [
        {
          id: "e1",
          date: isoDate(-20),
          notes: "بدء علاج عصب — الجلسة الأولى.",
          paid: 60000,
          remaining: 90000,
          teeth: ["UL4"],
          procedure: "Instrumentation",
          canalDetails: { canals: "2", workingLength: "21mm" },
          fillingMaterials: {},
        },
        {
          id: "e2",
          date: isoDate(-6),
          notes: "إكمال الحشو التعبوي لعلاج العصب.",
          paid: 90000,
          remaining: 0,
          teeth: ["UL4"],
          procedure: "Obturation",
          canalDetails: { canals: "2", technique: "Lateral Condensation" },
          fillingMaterials: {},
        },
      ],
      createdAt: ts(21),
      updatedAt: ts(6),
    },
    {
      id: "seed-p4",
      name: "ياسمين عبد الرزاق",
      patientId: "1004",
      phone: "0781 333 4455",
      pinned: false,
      caseHistory: [
        {
          id: "e1",
          date: isoDate(-1),
          notes: "استشارة تقويم أسنان — بانتظار تحويل خطة العلاج.",
          paid: 0,
          remaining: 0,
          teeth: [],
          procedure: "Checkup",
          canalDetails: {},
          fillingMaterials: {},
        },
      ],
      createdAt: ts(3),
      updatedAt: ts(1),
    },
    {
      id: "seed-p5",
      name: "سارة نبيل عبود",
      patientId: "1005",
      phone: "0750 555 6677",
      pinned: false,
      caseHistory: [],
      createdAt: ts(1),
      updatedAt: ts(1),
    },
  ];

  patients.forEach((p) => {
    const id = p.id;
    const data = { ...p };
    delete data.id;
    put(BASE + "/patient_records/" + id, data);
  });

  localStorage.setItem(SEED_FLAG, "1");
})();
