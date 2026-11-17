import { useEffect, useState } from "react";

const TITLES = [
  "HTML bilan tanishuv", "Matnlar bilan ishlash", "Link va rasmlar", "Ro‘yxatlar",
  "Jadvallar", "Form va inputlar", "Semantic HTML", "Multimedia",
  "HTML atributlari", "SEO va accessibility", "Katta amaliy loyiha", "Yakuniy imtihon",
];
const DEFAULT_LESSONS = TITLES.map((title, i) => ({ id: i + 1, title, status: "todo" }));
const STATUS = { todo: "O‘tilmagan", doing: "O‘tilmoqda", done: "Tugallangan" };
const CAME_SHARE = 0.6; // bir dars bahosining 60% i — kelganiga
const HW_SHARE = 0.4; // 40% i — uy ishiga

const today = () => new Date().toLocaleDateString("sv-SE");
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const WEEKDAYS = ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"];
const shiftDate = (d, n) => {
  const t = new Date(`${d}T00:00:00`);
  t.setDate(t.getDate() + n);
  return t.toLocaleDateString("sv-SE");
};
const norm = (v) => (typeof v === "boolean" ? { came: v } : v || {});

// Oy bo‘yicha o‘zlashtirish: 1 oyda eng ko‘pi bilan 100%
const monthScore = (s, month, perMonth) => {
  const per = 100 / perMonth;
  let total = 0;
  for (const [d, raw] of Object.entries(s.attendance)) {
    if (d.slice(0, 7) !== month) continue;
    const v = norm(raw);
    if (v.came === true) total += per * CAME_SHARE;
    if (v.hw === true) total += per * HW_SHARE;
  }
  return Math.min(100, Math.round(total));
};

const attendanceRate = (s) => {
  const marks = Object.values(s.attendance).map(norm).filter((v) => typeof v.came === "boolean");
  return pct(marks.filter((v) => v.came).length, marks.length);
};

function useStore(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue];
}

export default function App() {
  const [students, setStudents] = useStore("dn_students", []);
  const [lessons, setLessons] = useStore("dn_lessons", DEFAULT_LESSONS);
  const [perMonth, setPerMonth] = useStore("dn_per_month", 12);
  const [name, setName] = useState("");
  const [date, setDate] = useState(today());
  const [historyId, setHistoryId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [draft, setDraft] = useState("");

  const month = date.slice(0, 7);
  const doneCount = lessons.filter((l) => l.status === "done").length;
  const weekday = WEEKDAYS[new Date(`${date}T00:00:00`).getDay()];
  const marked = students.filter((s) => typeof norm(s.attendance[date]).came === "boolean").length;
  const scores = students.map((s) => monthScore(s, month, perMonth));
  const allMarks = students.flatMap((s) => Object.values(s.attendance).map(norm)).filter((v) => typeof v.came === "boolean");
  const stats = [
    { icon: "👥", label: "Jami o‘quvchilar", value: students.length },
    { icon: "✅", label: "Tugallangan darslar", value: `${lessons.filter((l) => l.status === "done").length}/${lessons.length}` },
    { icon: "📅", label: "Davomat foizi", value: `${pct(allMarks.filter((v) => v.came).length, allMarks.length)}%` },
  ];

  const updateStudent = (id, fn) => setStudents((list) => list.map((s) => (s.id === id ? fn(s) : s)));

  const addStudent = (e) => {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    setStudents((list) => [...list, { id: Date.now(), name: clean, attendance: {} }]);
    setName("");
  };

  const removeStudent = (s) => {
    if (!window.confirm(`“${s.name}” o‘chirilsinmi?`)) return;
    setStudents((list) => list.filter((x) => x.id !== s.id));
    if (historyId === s.id) setHistoryId(null);
  };

  // field: "came" yoki "hw"; bir xil tugma qayta bosilsa belgi olib tashlanadi
  const mark = (id, field, value) =>
    updateStudent(id, (s) => {
      const day = { ...norm(s.attendance[date]) };
      if (day[field] === value) delete day[field];
      else day[field] = value;
      const attendance = { ...s.attendance };
      if (Object.keys(day).length === 0) delete attendance[date];
      else attendance[date] = day;
      return { ...s, attendance };
    });

  // Tanlangan kun uchun hammaga bir martada belgi qo‘yish
  const setAll = (field) =>
    setStudents((list) =>
      list.map((s) => ({ ...s, attendance: { ...s.attendance, [date]: { ...norm(s.attendance[date]), [field]: true } } }))
    );

  const setStatus = (id, status) => setLessons((list) => list.map((l) => (l.id === id ? { ...l, status } : l)));
  const startEdit = (l) => { setEditId(l.id); setDraft(l.title); };
  const saveEdit = () => {
    const clean = draft.trim();
    if (clean) setLessons((list) => list.map((l) => (l.id === editId ? { ...l, title: clean } : l)));
    setEditId(null);
  };

  const historyStudent = students.find((s) => s.id === historyId);
  const history = historyStudent
    ? Object.entries(historyStudent.attendance).map(([d, v]) => [d, norm(v)]).sort((a, b) => b[0].localeCompare(a[0]))
    : [];

  return (
    <div className="app">
      <header className="hero">
        <h1>HTML Dars Nazorati</h1>
        <p>O‘quvchilar, davomat va darslar nazorati</p>
      </header>

      <section className="stats">
        {stats.map((s) => (
          <div className="card stat" key={s.label}>
            <span className="ico">{s.icon}</span>
            <div className="stat-text">
              <span>{s.label}</span>
              <strong>{s.value}</strong>
            </div>
          </div>
        ))}
      </section>

      <section className="card">
        <h2>O‘quvchilar</h2>
        <form className="row" onSubmit={addStudent}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ism-familiya" />
          <button className="btn primary" type="submit">+ Qo‘shish</button>
        </form>
        <label className="setting">
          Oyda darslar soni
          <input
            type="number" min="1" max="31" value={perMonth}
            onChange={(e) => setPerMonth(Math.min(31, Math.max(1, Number(e.target.value) || 1)))}
          />
        </label>
        <p className="hint">
          O‘zlashtirish {month} oyi uchun hisoblanadi: har bir darsda “Keldi” — {Math.round(CAME_SHARE * 100)}%, “Uy ishi bor” — {Math.round(HW_SHARE * 100)}% (bir dars = {Math.round((100 / perMonth) * 10) / 10}%). Oy davomida 100% dan oshmaydi.
        </p>
        {students.length === 0 && <p className="empty">Hozircha o‘quvchi yo‘q.</p>}
        <ul className="list">
          {students.map((s, i) => (
            <li className="item" key={s.id}>
              <div className="item-top">
                <div className="who">
                  <span className="avatar">{s.name.trim().charAt(0).toUpperCase()}</span>
                  <div>
                    <b>{s.name}</b>
                    <small>Davomat: {attendanceRate(s)}%</small>
                  </div>
                </div>
                <button className="btn danger" onClick={() => removeStudent(s)}>O‘chirish</button>
              </div>
              <div className="progress-row">
                <div className="bar"><div className="fill" style={{ width: `${scores[i]}%` }} /></div>
                <span className="percent">{scores[i]}%</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>Davomat va uy ishi</h2>
        <div className="daybar">
          <button className="btn round" onClick={() => setDate(shiftDate(date, -1))} aria-label="Oldingi kun">‹</button>
          <div className="daymid">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value || today())} />
            <small>{weekday}{date === today() ? " · Bugun" : ""}</small>
          </div>
          <button className="btn round" onClick={() => setDate(shiftDate(date, 1))} aria-label="Keyingi kun">›</button>
        </div>
        <div className="bulk">
          <button className="btn" onClick={() => setAll("came")}>Hammasi keldi</button>
          <button className="btn" onClick={() => setAll("hw")}>Hammasida uy ishi bor</button>
          <button className="btn" onClick={() => setDate(today())}>Bugun</button>
        </div>
        <p className="hint">Bu kun belgilandi: {marked}/{students.length}</p>
        {students.length === 0 && <p className="empty">Avval o‘quvchi qo‘shing.</p>}
        <ul className="list">
          {students.map((s) => {
            const d = norm(s.attendance[date]);
            return (
              <li className="item att" key={s.id}>
                <b>{s.name}</b>
                <div className="actions">
                  <div className="seg">
                    <button className={d.came === true ? "on-ok" : ""} onClick={() => mark(s.id, "came", true)}>Keldi</button>
                    <button className={d.came === false ? "on-bad" : ""} onClick={() => mark(s.id, "came", false)}>Kelmadi</button>
                  </div>
                  <div className="seg">
                    <button className={d.hw === true ? "on-ok" : ""} onClick={() => mark(s.id, "hw", true)}>Uy ishi bor</button>
                    <button className={d.hw === false ? "on-bad" : ""} onClick={() => mark(s.id, "hw", false)}>Uy ishi yo‘q</button>
                  </div>
                  <button className="btn" onClick={() => setHistoryId(s.id)}>Tarix</button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card">
        <div className="head">
          <h2>Darslar rejasi</h2>
          <span className="chip">{doneCount}/{lessons.length} tugallangan</span>
        </div>
        <div className="bar"><div className="fill" style={{ width: `${pct(doneCount, lessons.length)}%` }} /></div>
        <ul className="list">
          {lessons.map((l) => (
            <li className={`item lesson ${l.status}`} key={l.id}>
              <span className="num">{l.id}</span>
              {editId === l.id ? (
                <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveEdit()} />
              ) : (
                <b className="title">{l.title}</b>
              )}
              <select className={`status ${l.status}`} value={l.status} onChange={(e) => setStatus(l.id, e.target.value)}>
                {Object.entries(STATUS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              {editId === l.id ? (
                <button className="btn primary" onClick={saveEdit}>Saqlash</button>
              ) : (
                <button className="btn" onClick={() => startEdit(l)}>Tahrirlash</button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {historyStudent && (
        <div className="overlay" onClick={() => setHistoryId(null)}>
          <div className="modal card" onClick={(e) => e.stopPropagation()}>
            <div className="head">
              <h2>{historyStudent.name} — tarix</h2>
              <button className="btn" onClick={() => setHistoryId(null)}>Yopish</button>
            </div>
            {history.length === 0 && <p className="empty">Hali belgilanmagan.</p>}
            <ul className="list">
              {history.map(([d, v]) => (
                <li className="item att" key={d}>
                  <span>{d}</span>
                  <span className="badges">
                    {typeof v.came === "boolean" && <span className={`badge ${v.came ? "ok" : "bad"}`}>{v.came ? "Keldi" : "Kelmadi"}</span>}
                    {typeof v.hw === "boolean" && <span className={`badge ${v.hw ? "ok" : "bad"}`}>{v.hw ? "Uy ishi bor" : "Uy ishi yo‘q"}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
