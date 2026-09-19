import { useState, useEffect } from "react";
import {
  EMPLOYEES,
  SHIFT_COLORS,
  generateDates,
  formatDateDisplay,
  getWeekday,
  INITIAL_SCHEDULE,
  INITIAL_EVENTS,
  formatDate,
} from "./data";
import {
  ScheduleData,
  DayEvent,
  ShiftColor,
  ShiftEntry,
  Employee,
} from "./types";

const ADMIN_PASSWORD = "berthold2026";

const AVATAR_COLORS: Record<string, { bg: string; text: string }> = {
  "1": { bg: "#EF4444", text: "#fff" },
  "2": { bg: "#DC2626", text: "#fff" },
  "4": { bg: "#E11D48", text: "#fff" },
  "5": { bg: "#F59E0B", text: "#111" },
  "6": { bg: "#EAB308", text: "#111" },
  "7": { bg: "#FACC15", text: "#111" },
  "3": { bg: "#FF8C00", text: "#fff" },
  "8": { bg: "#22C55E", text: "#fff" },
  "9": { bg: "#16A34A", text: "#fff" },
  "10": { bg: "#15803D", text: "#fff" },
  "11": { bg: "#EC4899", text: "#fff" },
  "12": { bg: "#7C3AED", text: "#fff" },
  "13": { bg: "#A78BFA", text: "#fff" },
  "14": { bg: "#D97706", text: "#fff" },
  "15": { bg: "#B45309", text: "#fff" },
  "16": { bg: "#92400E", text: "#fff" },
};

function toISODate(dmy: string): string {
  if (!dmy) return "";
  const [d, m, y] = dmy.split("/");
  return `${y}-${m}-${d}`;
}
function fromISODate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function App() {
  const [startDate, setStartDate] = useState("04/08/2026"); // Funktion das es das Datum von heute nimmt
  const [dayCount, setDayCount] = useState(28);
  const [dates, setDates] = useState<string[]>(() =>
    generateDates(startDate, dayCount),
  );
  const [schedule, setSchedule] = useState<ScheduleData>(() => {
    const saved = localStorage.getItem("pfanderbahn_schedule");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return INITIAL_SCHEDULE;
  });
  const [events, setEvents] = useState<DayEvent[]>(() => {
    const saved = localStorage.getItem("pfanderbahn_events");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return INITIAL_EVENTS;
  });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [editingCell, setEditingCell] = useState<{
    empId: string;
    date: string;
  } | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventDraft, setEventDraft] = useState<{
    id: string | null;
    date: string;
    title: string;
    description: string;
  }>({
    id: null,
    date: "",
    title: "",
    description: "",
  });
  const [noteInput, setNoteInput] = useState("");
  const [currentMonthOffset, setCurrentMonthOffset] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeNav, setActiveNav] = useState("overview");

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    localStorage.setItem("pfanderbahn_schedule", JSON.stringify(schedule));
  }, [schedule]);

  useEffect(() => {
    localStorage.setItem("pfanderbahn_events", JSON.stringify(events));
  }, [events]);

  const handleMonthChange = (offset: number) => {
    const newOffset = currentMonthOffset + offset;
    setCurrentMonthOffset(newOffset);
    const base = new Date(2026, 7, 4);
    base.setMonth(base.getMonth() + newOffset);
    const y = base.getFullYear();
    const m = String(base.getMonth() + 1).padStart(2, "0");
    const d = String(
      Math.min(4, new Date(y, base.getMonth() + 1, 0).getDate()),
    ).padStart(2, "0");
    setStartDate(`${d}/${m}/${y}`);
    setDayCount(14);
    setDates(generateDates(`${d}/${m}/${y}`, 14));
  };

  const handleGoToday = () => {
    setCurrentMonthOffset(0);
    setStartDate("04/08/2026");
    setDayCount(14);
    setDates(generateDates("04/08/2026", 14));
  };

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setIsLoggedIn(true);
      setShowLogin(false);
      setPassword("");
      setLoginError("");
    } else {
      setLoginError("Falsches Passwort");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  const getCell = (empId: string, date: string): ShiftEntry => {
    return schedule[empId]?.[date] || { color: "frei" };
  };

  const handleCellClick = (emp: Employee, date: string) => {
    if (!isLoggedIn) return;
    setEditingCell({ empId: emp.id, date });
    setNoteInput(getCell(emp.id, date).note || "");
  };

  const handleColorChange = (color: ShiftColor) => {
    if (!editingCell) return;
    setSchedule((prev) => {
      const next = { ...prev };
      if (!next[editingCell.empId]) next[editingCell.empId] = {};
      next[editingCell.empId] = {
        ...next[editingCell.empId],
        [editingCell.date]: {
          color,
          note: noteInput || undefined,
        },
      };
      return next;
    });
  };

  const handleSaveNote = () => {
    if (!editingCell) return;
    setSchedule((prev) => {
      const next = { ...prev };
      if (!next[editingCell.empId]) next[editingCell.empId] = {};
      const current = next[editingCell.empId][editingCell.date] || {
        color: "frei",
      };
      next[editingCell.empId] = {
        ...next[editingCell.empId],
        [editingCell.date]: {
          ...current,
          note: noteInput || undefined,
        },
      };
      return next;
    });
  };

  const openNewEventModal = () => {
    setEventDraft({ id: null, date: "", title: "", description: "" });
    setShowEventModal(true);
  };

  const openEditEventModal = (ev: DayEvent) => {
    setEventDraft({
      id: ev.id,
      date: ev.date,
      title: ev.title,
      description: ev.description || "",
    });
    setShowEventModal(true);
  };

  const handleSaveEvent = () => {
    if (!eventDraft.date || !eventDraft.title) return;
    if (eventDraft.id) {
      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventDraft.id
            ? {
                ...e,
                date: eventDraft.date,
                title: eventDraft.title,
                description: eventDraft.description,
              }
            : e,
        ),
      );
    } else {
      const event: DayEvent = {
        id: Date.now().toString(),
        date: eventDraft.date,
        title: eventDraft.title,
        description: eventDraft.description,
      };
      setEvents((prev) => [...prev, event]);
    }
    setShowEventModal(false);
    setEventDraft({ id: null, date: "", title: "", description: "" });
  };

  const handleDeleteEvent = (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    if (eventDraft.id === id) {
      setShowEventModal(false);
      setEventDraft({ id: null, date: "", title: "", description: "" });
    }
  };

  const getEventsForDate = (date: string): DayEvent[] => {
    return events.filter((e) => e.date === date);
  };

  const currentMonthRange = (() => {
    if (dates.length === 0) return "";
    const first = dates[0];
    const last = dates[dates.length - 1];
    const [fd, fm, fy] = first.split("/");
    const [ld, lm, ly] = last.split("/");
    const months = [
      "Januar",
      "Februar",
      "März",
      "April",
      "Mai",
      "Juni",
      "Juli",
      "August",
      "September",
      "Oktober",
      "November",
      "Dezember",
    ];
    if (fm === lm && fy === ly) {
      return `${fd}. – ${ld}. ${months[parseInt(fm) - 1]} ${fy}`;
    }
    return `${fd}.${fm}. – ${ld}.${lm}.${ly}`;
  })();

  const formatTime = (d: Date) => {
    return d.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getWeekdayLong = (date: string) => {
    const days = [
      "Sonntag",
      "Montag",
      "Dienstag",
      "Mittwoch",
      "Donnerstag",
      "Freitag",
      "Samstag",
    ];
    const [day, month, year] = date.split("/").map(Number);
    const d = new Date(year, month - 1, day);
    return days[d.getDay()];
  };

  const handleExport = () => {
    alert("Export-Funktion kommt bald!");
  };

  const getAvatarColor = (emp: Employee) => {
    return AVATAR_COLORS[emp.id] || { bg: "#cbd5e1", text: "#0f172a" };
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("");
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">
            <img
              src=".\public\icon.ico"
              alt="OPTIVO"
              height={30}
              width={30}
            ></img>
          </div>
          <span className="logo-text">OPTIVIO</span>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeNav === "overview" ? "active" : ""}`}
            onClick={() => setActiveNav("overview")}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            Übersicht
          </button>
          <button
            className={`nav-item ${activeNav === "schedule" ? "active" : ""}`}
            onClick={() => setActiveNav("schedule")}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Zeitplan
          </button>
          <button
            className={`nav-item ${activeNav === "team" ? "active" : ""}`}
            onClick={() => setActiveNav("team")}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Team
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-divider" />
          <button
            className={`nav-item ${activeNav === "settings" ? "active" : ""}`}
            onClick={() => setActiveNav("settings")}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82V9a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Einstellungen
          </button>
          {isLoggedIn ? (
            <button className="nav-item logout" onClick={handleLogout}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Abmelden
            </button>
          ) : (
            <button
              className="nav-item login-nav"
              onClick={() => setShowLogin(true)}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              Anmelden
            </button>
          )}
        </div>
      </aside>

      <main className="main-content">
        <div className="page-header">
          <div className="page-title-section">
            <h1 className="page-title">
              <span className="brand-blue">Optivio</span>
              <span className="brand-divider"> - </span>
              <span className="brand-rest">Pfänderbahn</span>
            </h1>
            <p className="page-subtitle">
              Digitaler Dienstplan
              <span className="dot-divider">•</span>
              <span className="time-now">
                Aktuelle Zeit: <strong>{formatTime(currentTime)}</strong> Uhr
              </span>
            </p>
          </div>
          <div className="page-actions">
            <div className="month-nav-optivio">
              <button
                className="nav-arrow"
                onClick={() => handleMonthChange(-1)}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <div className="month-display">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ color: "#165DFF" }}
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span className="month-text">{currentMonthRange}</span>
              </div>
              <button
                className="nav-arrow"
                onClick={() => handleMonthChange(1)}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
              <button className="today-btn" onClick={handleGoToday}>
                Heute
              </button>
            </div>

            <div className="action-btns">
              {isLoggedIn && (
                <button className="btn btn-action" onClick={openNewEventModal}>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Event
                </button>
              )}
              <button className="btn btn-export" onClick={handleExport}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Dienstplan exportieren
              </button>
            </div>
          </div>
        </div>

        {isLoggedIn && (
          <div className="admin-banner">
            <span>
              Als <strong>Berthold Martan</strong> angemeldet — du kannst den
              Dienstplan bearbeiten.
            </span>
          </div>
        )}

        <div className="timetable-card">
          <div className="timetable-wrapper-opt">
            <table className="timetable-opt">
              <thead>
                <tr>
                  <th className="opt-col-employee">
                    <span className="th-label">MITARBEITER</span>
                  </th>
                  {dates.map((date) => {
                    const dayEvents = getEventsForDate(date);
                    const isWeekend =
                      getWeekday(date) === "Sa" || getWeekday(date) === "So";
                    const isToday = formatDate(new Date()) === date;
                    return (
                      <th
                        key={date}
                        className={`opt-col-date ${isWeekend ? "weekend-col" : ""} ${isToday ? "today-col" : ""}`}
                      >
                        <span className="th-label">
                          {getWeekdayLong(date).toUpperCase()}
                        </span>
                        <div className="th-date">
                          {formatDateDisplay(date).split(".")[0]}.{" "}
                          {formatDateDisplay(date).split(".")[1]}.
                        </div>
                        {dayEvents.length > 0 && (
                          <div className="event-mini-dots">
                            {dayEvents.slice(0, 3).map((ev) => (
                              <span
                                key={ev.id}
                                className="event-dot"
                                title={ev.title}
                              />
                            ))}
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {EMPLOYEES.map((emp) => {
                  const avatar = getAvatarColor(emp);
                  return (
                    <tr key={emp.id} className="t-row">
                      <td className="opt-col-employee-body">
                        <div className="employee-card2">
                          <div
                            className="avatar2"
                            style={{
                              background: avatar.bg,
                              color: avatar.text,
                            }}
                          >
                            {getInitials(emp.name)}
                          </div>
                          <div className="emp-meta2">
                            <div className="emp-name2">
                              {emp.isAdmin && (
                                <span
                                  className="admin-star-mini"
                                  title="Betriebsleiter"
                                >
                                  ★
                                </span>
                              )}
                              {emp.name}
                              <span className="emp-frei">Frei</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      {dates.map((date) => {
                        const entry = getCell(emp.id, date);
                        const ci = SHIFT_COLORS[entry.color];
                        const dayEvents = getEventsForDate(date);
                        const isFrei = entry.color === "frei" && !entry.note;
                        const style: Record<string, string> = {};
                        if (!isFrei) {
                          style.borderColor = ci.bg;
                          style.background = ci.bg + "14";
                          style.color = ci.text === "#FFFFFF" ? ci.bg : ci.text;
                        }
                        return (
                          <td
                            key={date}
                            className={`opt-col-body ${isLoggedIn ? "editable-opt" : ""}`}
                            onClick={() => handleCellClick(emp, date)}
                          >
                            <div
                              className={`shift-pill ${isFrei ? "frei" : ""}`}
                              style={style}
                            >
                              <span>
                                {entry.note
                                  ? entry.note
                                  : isFrei
                                    ? "Frei"
                                    : ci.label}
                              </span>
                            </div>
                            {dayEvents.length > 0 && (
                              <div className="cell-events-inline">
                                {dayEvents.slice(0, 1).map((ev) => (
                                  <button
                                    key={ev.id}
                                    className="cell-event-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (isLoggedIn) openEditEventModal(ev);
                                    }}
                                    title={ev.title}
                                  >
                                    📌 {ev.title}
                                  </button>
                                ))}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {events.length > 0 && (
          <div className="events-section-opt">
            <h2 className="section-head">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: "#165DFF" }}
              >
                <path d="M12 8v4l3 3" />
                <circle cx="12" cy="12" r="10" />
              </svg>
              Events & Hinweise
            </h2>
            <div className="events-grid">
              {events.map((ev) => (
                <div
                  key={ev.id}
                  className={`event-card-opt ${isLoggedIn ? "clickable" : ""}`}
                  onClick={() => isLoggedIn && openEditEventModal(ev)}
                >
                  <div className="event-date-badge">
                    <div className="ev-day">
                      {formatDateDisplay(ev.date).split(".")[0]}
                    </div>
                    <div className="ev-month">
                      {
                        [
                          "Jan",
                          "Feb",
                          "Mär",
                          "Apr",
                          "Mai",
                          "Jun",
                          "Jul",
                          "Aug",
                          "Sep",
                          "Okt",
                          "Nov",
                          "Dez",
                        ][
                          parseInt(formatDateDisplay(ev.date).split(".")[1]) - 1
                        ]
                      }
                    </div>
                  </div>
                  <div className="event-body">
                    <div className="event-title-opt">{ev.title}</div>
                    {ev.description && (
                      <div className="event-desc-opt">{ev.description}</div>
                    )}
                    <div className="event-meta-info">
                      {getWeekdayLong(ev.date)}, {formatDateDisplay(ev.date)}
                    </div>
                  </div>
                  {isLoggedIn && (
                    <button
                      className="event-del"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteEvent(ev.id);
                      }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {showLogin && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowLogin(false);
            setLoginError("");
            setPassword("");
          }}
        >
          <div className="login-page-wrap" onClick={(e) => e.stopPropagation()}>
            <div className="login-brand">
              <div className="login-logo">
                <img src=".\public\icon.ico" alt="" height={36} width={36} />
                <span>OPTIVIO</span>
              </div>
              <div className="login-sub">PARTNER PORTAL</div>
            </div>
            <div className="login-card">
              <h2 className="login-head">Anmelden</h2>
              <p className="login-desc">
                Verwalten Sie den Dienstplan der Pfänderbahn.
              </p>
              <div className="form-group">
                <label>Benutzer</label>
                <input
                  type="text"
                  className="opt-input"
                  value="Berthold Martan"
                  disabled
                />
              </div>
              <div className="form-group">
                <div className="label-row">
                  <label>Passwort</label>
                </div>
                <input
                  type="password"
                  className="opt-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  autoFocus
                />
              </div>
              {loginError && <div className="login-err">{loginError}</div>}
              <button className="btn-login" onClick={handleLogin}>
                Anmelden
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
              <div className="login-foot">
                © 2026 OPTIVIO DIGITAL SOLUTIONS. ALLE RECHTE VORBEHALTEN.
              </div>
            </div>
          </div>
        </div>
      )}

      {editingCell && isLoggedIn && (
        <div
          className="modal-overlay"
          onClick={() => {
            setEditingCell(null);
            setNoteInput("");
          }}
        >
          <div className="modal-opt" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head-opt">
              <div>
                <div className="modal-title-opt">Schicht bearbeiten</div>
                <div className="modal-sub-opt">
                  {EMPLOYEES.find((e) => e.id === editingCell.empId)?.name} •{" "}
                  {formatDateDisplay(editingCell.date)}
                </div>
              </div>
              <button
                className="modal-close"
                onClick={() => {
                  setEditingCell(null);
                  setNoteInput("");
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="modal-body-opt">
              <div className="form-group">
                <label>Farbe / Dienst</label>
                <div className="color-grid-opt">
                  {(() => {
                    const emp = EMPLOYEES.find(
                      (e) => e.id === editingCell.empId,
                    );
                    const availableColors: ShiftColor[] = emp
                      ? [
                          ...emp.allowedColors,
                          "frei",
                          "krank",
                          "urlaub",
                          "ou",
                          "feiertag",
                          "sonstiges",
                        ]
                      : (Object.keys(SHIFT_COLORS) as ShiftColor[]);
                    const uniqueColors = [...new Set(availableColors)];
                    const currentEntry = getCell(
                      editingCell.empId,
                      editingCell.date,
                    );
                    return uniqueColors.map((colorKey) => {
                      const ci = SHIFT_COLORS[colorKey];
                      const isSelected = currentEntry.color === colorKey;
                      return (
                        <button
                          key={colorKey}
                          className={`color-chip ${isSelected ? "selected" : ""}`}
                          onClick={() => handleColorChange(colorKey)}
                        >
                          <span
                            className="chip-dot"
                            style={{
                              background: ci.bg,
                              border: `2px solid ${ci.bg}`,
                            }}
                          />
                          <span>{ci.label}</span>
                          {isSelected && (
                            <svg
                              className="chip-check"
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
              <div className="form-group">
                <label>Notiz / Uhrzeit</label>
                <input
                  type="text"
                  className="opt-input"
                  placeholder="z.B. 6:30, krank, Urlaub, Tal zum Bertl, ..."
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-foot-opt">
              <button
                className="btn-cancel"
                onClick={() => {
                  setEditingCell(null);
                  setNoteInput("");
                }}
              >
                Abbrechen
              </button>
              <button
                className="btn-save"
                onClick={() => {
                  handleSaveNote();
                  setEditingCell(null);
                  setNoteInput("");
                }}
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {showEventModal && isLoggedIn && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowEventModal(false);
            setEventDraft({ id: null, date: "", title: "", description: "" });
          }}
        >
          <div className="modal-opt" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head-opt">
              <div>
                <div className="modal-title-opt">
                  {eventDraft.id ? "Event bearbeiten" : "Neues Event / Hinweis"}
                </div>
                <div className="modal-sub-opt">
                  Trage einen speziellen Hinweis für einen Tag ein
                </div>
              </div>
              <button
                className="modal-close"
                onClick={() => {
                  setShowEventModal(false);
                  setEventDraft({
                    id: null,
                    date: "",
                    title: "",
                    description: "",
                  });
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="modal-body-opt">
              <div className="form-group">
                <label>Datum</label>
                <input
                  type="date"
                  className="opt-input calendar-input"
                  value={toISODate(eventDraft.date)}
                  min="2024-01-01"
                  max="2030-12-31"
                  onChange={(e) =>
                    setEventDraft((prev) => ({
                      ...prev,
                      date: fromISODate(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="form-group">
                <label>Titel</label>
                <input
                  type="text"
                  className="opt-input"
                  placeholder="z.B. Sonnenfinsternis, Wagen versetzen, ..."
                  value={eventDraft.title}
                  onChange={(e) =>
                    setEventDraft((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="form-group">
                <label>Beschreibung (optional)</label>
                <textarea
                  className="opt-input textarea"
                  placeholder="Weitere Details..."
                  value={eventDraft.description}
                  onChange={(e) =>
                    setEventDraft((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="modal-foot-opt flex-between">
              <div>
                {eventDraft.id && (
                  <button
                    className="btn-danger"
                    onClick={() => handleDeleteEvent(eventDraft.id!)}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ marginRight: 6 }}
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    Löschen
                  </button>
                )}
              </div>
              <div className="btn-group">
                <button
                  className="btn-cancel"
                  onClick={() => {
                    setShowEventModal(false);
                    setEventDraft({
                      id: null,
                      date: "",
                      title: "",
                      description: "",
                    });
                  }}
                >
                  Abbrechen
                </button>
                <button className="btn-save" onClick={handleSaveEvent}>
                  {eventDraft.id ? "Speichern" : "Hinzufügen"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
