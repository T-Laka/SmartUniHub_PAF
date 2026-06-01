// Member 2 – Conflict-aware Time Slot Visualizer
import { useEffect, useRef, useState } from "react";
import { getTimelineForDay } from "../../data/bookingStore";
import "../../styles/booking/timeline.css";

const HOUR_START = 7;   // 7 AM
const HOUR_END   = 22;  // 10 PM
const TOTAL_HOURS = HOUR_END - HOUR_START;

function pad(n) { return String(n).padStart(2, "0"); }

function toMinutes(dtString) {
  if (!dtString) return null;
  const d = new Date(dtString);
  return d.getHours() * 60 + d.getMinutes();
}

function formatHour(h) {
  if (h === 0 || h === 24) return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

const STATUS_COLOR = {
  APPROVED: { bg: "#dc2626", label: "#fff", name: "Approved" },
  PENDING:  { bg: "#f59e0b", label: "#fff", name: "Pending"  },
};

export default function TimelineVisualizer({ facilityId, selectedDate, selStart, selEnd }) {
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]   = useState("");
  const prevKey = useRef("");

  useEffect(() => {
    if (!facilityId || !selectedDate) { setBookings([]); return; }
    const key = `${facilityId}|${selectedDate}`;
    if (key === prevKey.current) return;
    prevKey.current = key;

    setIsLoading(true);
    setError("");
    getTimelineForDay(facilityId, selectedDate)
      .then(setBookings)
      .catch((err) => setError(err.message || "Could not load timeline"))
      .finally(() => setIsLoading(false));
  }, [facilityId, selectedDate]);

  if (!facilityId || !selectedDate) return null;

  // Convert selection to minutes
  const selStartMin = selStart ? toMinutes(selStart) : null;
  const selEndMin   = selEnd   ? toMinutes(selEnd)   : null;
  const dayStart    = HOUR_START * 60;
  const dayEnd      = HOUR_END   * 60;

  // Check if selection conflicts with any existing booking
  const hasConflict = selStartMin !== null && selEndMin !== null &&
    bookings.some((b) => {
      const bStart = toMinutes(b.startTime);
      const bEnd   = toMinutes(b.endTime);
      return bStart !== null && bEnd !== null && selStartMin < bEnd && selEndMin > bStart;
    });

  function pct(minutes) {
    return ((clamp(minutes, dayStart, dayEnd) - dayStart) / (TOTAL_HOURS * 60)) * 100;
  }

  const hourTicks = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => HOUR_START + i);

  return (
    <div className="tl-wrap" aria-label="Facility availability timeline">
      <div className="tl-header">
        <span className="tl-title">Availability on {selectedDate}</span>
        {isLoading && <span className="tl-loading">Loading…</span>}
        {error && <span className="tl-error">{error}</span>}
        {!isLoading && !error && (
          <span className="tl-count">
            {bookings.length === 0 ? "No bookings — fully available" : `${bookings.length} booking(s)`}
          </span>
        )}
      </div>

      <div className="tl-legend">
        <span className="tl-legend-item">
          <span className="tl-dot" style={{ background: STATUS_COLOR.APPROVED.bg }} />Approved
        </span>
        <span className="tl-legend-item">
          <span className="tl-dot" style={{ background: STATUS_COLOR.PENDING.bg }} />Pending
        </span>
        <span className="tl-legend-item">
          <span className="tl-dot tl-dot--free" />Free
        </span>
        {selStartMin !== null && selEndMin !== null && (
          <span className="tl-legend-item">
            <span className="tl-dot" style={{ background: hasConflict ? "#ef4444" : "#22c55e", opacity: .7 }} />
            Your selection {hasConflict ? "⚠ Conflict" : "✓ Available"}
          </span>
        )}
      </div>

      <div className="tl-track" role="img" aria-label="Timeline track">
        {/* Hour tick marks */}
        {hourTicks.map((h) => (
          <div
            key={h}
            className="tl-tick"
            style={{ left: `${pct(h * 60)}%` }}
            aria-hidden="true"
          >
            <span className="tl-tick-label">{formatHour(h)}</span>
          </div>
        ))}

        {/* Free background */}
        <div className="tl-free-bar" aria-hidden="true" />

        {/* Existing bookings */}
        {bookings.map((b) => {
          const bStart = toMinutes(b.startTime);
          const bEnd   = toMinutes(b.endTime);
          if (bStart === null || bEnd === null) return null;
          const left  = pct(bStart);
          const width = pct(bEnd) - left;
          const color = STATUS_COLOR[b.status] || STATUS_COLOR.PENDING;
          const startStr = `${pad(Math.floor(bStart / 60))}:${pad(bStart % 60)}`;
          const endStr   = `${pad(Math.floor(bEnd   / 60))}:${pad(bEnd   % 60)}`;
          return (
            <div
              key={b.id}
              className="tl-slot tl-slot--booked"
              style={{ left: `${left}%`, width: `${width}%`, background: color.bg }}
              title={`${b.facilityName} — ${b.purpose}\n${startStr}–${endStr} (${color.name})`}
              aria-label={`Booked ${startStr} to ${endStr}: ${b.purpose}`}
            >
              <span className="tl-slot-label">{startStr}–{endStr}</span>
            </div>
          );
        })}

        {/* User's selected range */}
        {selStartMin !== null && selEndMin !== null && (() => {
          const left  = pct(selStartMin);
          const width = pct(selEndMin) - left;
          return (
            <div
              className="tl-slot tl-slot--selection"
              style={{
                left: `${left}%`,
                width: `${width}%`,
                background: hasConflict ? "rgba(239,68,68,.35)" : "rgba(34,197,94,.35)",
                borderColor: hasConflict ? "#ef4444" : "#22c55e",
              }}
              aria-label={`Your selection: ${hasConflict ? "conflicts with existing booking" : "available"}`}
            />
          );
        })()}
      </div>

      {hasConflict && (
        <p className="tl-conflict-msg" role="alert">
          ⚠ Your selected time overlaps with an existing booking. Please choose a different slot.
        </p>
      )}
    </div>
  );
}
