"use client";

import { useState, useCallback } from "react";
import { X, Save, CheckCircle, ChevronLeft, ChevronRight, FileText, Trash2 } from "lucide-react";

/* ─── Types ─────────────────────────────────────────────── */
interface Note {
  id: string;
  date: string; // "YYYY-MM-DD"
  content: string;
  savedAt: string;
}

/* ─── Helpers ────────────────────────────────────────────── */
const DAYS = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];
const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function pad(n: number) { return String(n).padStart(2, "0"); }

function toIso(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

function formatDisplay(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d} de ${MONTHS[parseInt(m, 10) - 1]} de ${y}`;
}

/* ─── Status Badge (mirrors main dashboard logic) ────────── */
const LATEST_VITALS = {
  heartRate: 80,
  spo2: 98,
  temperature: 36.8,
  respiratoryRate: 19,
};

type StatusLevel = "stable" | "warning" | "critical";

function computeStatus(): StatusLevel {
  const { heartRate: hr, spo2, temperature: temp, respiratoryRate: rr } = LATEST_VITALS;
  if (hr >= 130 || hr <= 35 || spo2 <= 85 || temp >= 41 || temp <= 34.5 || rr >= 35 || rr <= 6)
    return "critical";
  if (hr >= 100 || hr <= 50 || spo2 <= 92 || temp >= 38.5 || temp <= 35.5 || rr >= 25 || rr <= 10)
    return "warning";
  return "stable";
}

const STATUS_CFG = {
  stable:   { label: "Estable",    dot: "#4AAA64", bg: "rgba(74,170,100,0.13)",  border: "rgba(74,170,100,0.45)",  text: "#2e7a48",  pulse: "3s"   },
  warning:  { label: "Precaución", dot: "#E6A51E", bg: "rgba(230,165,30,0.13)",  border: "rgba(230,165,30,0.50)",  text: "#9a6b00", pulse: "1.6s" },
  critical: { label: "Crítico",    dot: "#DC3C3C", bg: "rgba(220,60,60,0.13)",   border: "rgba(220,60,60,0.50)",   text: "#9a1c1c", pulse: "0.9s" },
};

function StatusBadge() {
  const level = computeStatus();
  const cfg = STATUS_CFG[level];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "7px",
        padding: "3px 12px 3px 8px",
        borderRadius: "999px",
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        marginLeft: "8px",
        flexShrink: 0,
      }}
    >
      <style>{`
        @keyframes mhStatusPulse {
          0%, 100% { transform: scale(1); opacity: 0.35; }
          50% { transform: scale(2.4); opacity: 0; }
        }
      `}</style>
      {/* Animated dot */}
      <span style={{ position: "relative", width: "10px", height: "10px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <span style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: cfg.dot, opacity: 0.35,
          animation: `mhStatusPulse ${cfg.pulse} ease-in-out infinite`,
        }} />
        <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: cfg.dot, position: "relative", zIndex: 1 }} />
      </span>
      <span style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase", color: cfg.text }}>
        {cfg.label}
      </span>
    </span>
  );
}

/* ─── Mini Calendar ──────────────────────────────────────── */
function MiniCalendar({
  selected,
  onSelect,
  noteDates,
}: {
  selected: string;
  onSelect: (iso: string) => void;
  noteDates: Set<string>;
}) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const todayIso = toIso(today.getFullYear(), today.getMonth(), today.getDate());

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-default)",
        borderRadius: "14px",
        padding: "18px",
        userSelect: "none",
      }}
    >
      {/* Month navigation */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
        <button onClick={prevMonth} style={navBtnStyle} title="Mes anterior">
          <ChevronLeft size={16} />
        </button>
        <span style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "13px" }}>
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button onClick={nextMonth} style={navBtnStyle} title="Mes siguiente">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px", marginBottom: "6px" }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: "center", fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", paddingBottom: "4px" }}>
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px" }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;
          const iso = toIso(viewYear, viewMonth, day);
          const isSelected = iso === selected;
          const isToday = iso === todayIso;
          const hasNote = noteDates.has(iso);

          return (
            <button
              key={iso}
              onClick={() => onSelect(iso)}
              title={hasNote ? "Tiene nota guardada" : undefined}
              style={{
                width: "100%",
                aspectRatio: "1",
                borderRadius: "8px",
                border: isSelected
                  ? "2px solid var(--accent-main)"
                  : isToday
                    ? "1px solid var(--accent-main)"
                    : "1px solid transparent",
                background: isSelected
                  ? "var(--accent-main)"
                  : isToday
                    ? "var(--accent-main)22"
                    : "transparent",
                color: isSelected ? "#fff" : "var(--text-primary)",
                fontSize: "12px",
                fontWeight: isSelected || isToday ? 700 : 400,
                cursor: "pointer",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              {day}
              {hasNote && (
                <span
                  style={{
                    position: "absolute",
                    bottom: "2px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "4px",
                    height: "4px",
                    borderRadius: "50%",
                    background: isSelected ? "#fff" : "var(--accent-main)",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "var(--text-secondary)",
  display: "flex",
  alignItems: "center",
  padding: "4px",
  borderRadius: "6px",
};

/* ─── Saved Notes List ───────────────────────────────────── */
function SavedNotesList({
  notes,
  selectedDate,
  onSelect,
  onDelete,
}: {
  notes: Note[];
  selectedDate: string;
  onSelect: (iso: string) => void;
  onDelete: (id: string) => void;
}) {
  if (notes.length === 0) return null;

  return (
    <div style={{ marginTop: "16px" }}>
      <p style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>
        Registro del paciente
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "180px", overflowY: "auto" }}>
        {notes.map(n => (
          <div
            key={n.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 10px",
              borderRadius: "8px",
              background: n.date === selectedDate ? "var(--accent-main)22" : "var(--bg-panel)",
              border: n.date === selectedDate ? "1px solid var(--accent-main)" : "1px solid var(--border-default)",
              cursor: "pointer",
              transition: "background 0.15s",
              gap: "6px",
            }}
            onClick={() => onSelect(n.date)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
              <FileText size={12} style={{ color: "var(--accent-main)", flexShrink: 0 }} />
              <div style={{ overflow: "hidden" }}>
                <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {formatDisplay(n.date)}
                </p>
                <p style={{ fontSize: "10px", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {n.content.slice(0, 40)}{n.content.length > 40 ? "…" : ""}
                </p>
              </div>
            </div>
            <button
              onClick={e => { e.stopPropagation(); onDelete(n.id); }}
              title="Eliminar nota"
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", flexShrink: 0, padding: "2px", borderRadius: "4px" }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────── */
export function MedicalHistoryDashboard({ onClose }: { onClose: () => void }) {
  const today = new Date();
  const todayIso = toIso(today.getFullYear(), today.getMonth(), today.getDate());

  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);

  /* Load note for selected date */
  const loadNote = useCallback(
    (iso: string) => {
      setSelectedDate(iso);
      const existing = notes.find(n => n.date === iso);
      setText(existing ? existing.content : "");
      setSaved(false);
    },
    [notes],
  );

  const handleSave = () => {
    if (!text.trim()) return;
    setNotes(prev => {
      const filtered = prev.filter(n => n.date !== selectedDate);
      return [
        ...filtered,
        {
          id: `${selectedDate}-${Date.now()}`,
          date: selectedDate,
          content: text,
          savedAt: new Date().toISOString(),
        },
      ].sort((a, b) => b.date.localeCompare(a.date));
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleDelete = (id: string) => {
    setNotes(prev => {
      const updated = prev.filter(n => n.id !== id);
      // If the deleted note was the one displayed, clear the text
      const wasSelected = !updated.find(n => n.date === selectedDate);
      if (wasSelected) setText("");
      return updated;
    });
  };

  const noteDates = new Set(notes.map(n => n.date));

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "var(--bg-dashboard)",
        display: "flex",
        flexDirection: "column",
        animation: "mhFadeIn 0.25s ease-out both",
      }}
    >
      <style>{`
        @keyframes mhFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .mh-textarea::placeholder { color: var(--text-muted); }
        .mh-textarea:focus { outline: none; box-shadow: 0 0 0 2px var(--accent-main)55; }
        .mh-save-btn:hover { background: var(--accent-hover) !important; }
        .mh-save-btn:active { transform: scale(0.97); }
      `}</style>

      {/* ── Header ── */}
      <div
        style={{
          background: "var(--bg-panel)",
          borderBottom: "1px solid var(--border-default)",
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <FileText size={20} style={{ color: "var(--accent-main)" }} />
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "var(--text-primary)" }}>
            Historial Médico
          </h2>
          <span style={{ fontSize: "16px", color: "var(--text-muted)", fontWeight: 500 }}>
            — Ronald Martínez
          </span>
          <StatusBadge />
        </div>
        <button
          onClick={onClose}
          title="Cerrar historial"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            padding: "6px",
            borderRadius: "8px",
            transition: "background 0.15s, color 0.15s",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(220,60,60,0.1)";
            (e.currentTarget as HTMLButtonElement).style.color = "#e05252";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = "none";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: "flex", gap: "24px", padding: "24px", overflow: "hidden" }}>

        {/* ── LEFT: Notes editor ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "14px", minWidth: 0 }}>
          {/* Date label */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)" }}>
              Nota para el{" "}
              <span style={{ color: "var(--text-primary)" }}>{formatDisplay(selectedDate)}</span>
            </p>
            {text.trim().length > 0 && (
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                {text.length} caracteres
              </span>
            )}
          </div>

          {/* Textarea */}
          <textarea
            className="mh-textarea"
            value={text}
            onChange={e => { setText(e.target.value); setSaved(false); }}
            placeholder="Escribe tus notas clínicas aquí…&#10;&#10;• Diagnóstico&#10;• Medicamentos&#10;• Observaciones&#10;• Plan de tratamiento"
            style={{
              flex: 1,
              resize: "none",
              background: "var(--bg-card)",
              border: "1px solid var(--border-default)",
              borderRadius: "14px",
              padding: "20px 22px",
              fontSize: "14px",
              lineHeight: "1.75",
              color: "var(--text-primary)",
              fontFamily: "inherit",
              transition: "border-color 0.2s, box-shadow 0.2s",
            }}
          />

          {/* Save button */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              className="mh-save-btn"
              onClick={handleSave}
              disabled={!text.trim()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 24px",
                background: text.trim() ? "var(--accent-main)" : "var(--border-default)",
                color: text.trim() ? "#fff" : "var(--text-muted)",
                border: "none",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: text.trim() ? "pointer" : "default",
                transition: "background 0.2s, transform 0.1s",
              }}
            >
              <Save size={15} />
              Guardar nota
            </button>

            {saved && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--accent-main)", fontSize: "13px", fontWeight: 600, animation: "mhFadeIn 0.2s ease-out" }}>
                <CheckCircle size={16} />
                Guardado
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Calendar + saved list ── */}
        <div
          style={{
            width: "240px",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: "0",
            overflowY: "auto",
          }}
        >
          <MiniCalendar
            selected={selectedDate}
            onSelect={loadNote}
            noteDates={noteDates}
          />
          <SavedNotesList
            notes={notes}
            selectedDate={selectedDate}
            onSelect={loadNote}
            onDelete={handleDelete}
          />
        </div>

      </div>
    </div>
  );
}
