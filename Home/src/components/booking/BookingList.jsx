// Member 2 – BookingList component (user's own bookings)
import { useEffect, useState } from "react";
import { cancelBooking, getMyBookings } from "../../data/bookingStore";
import BookingQRCode from "./BookingQRCode";
import "../../styles/booking/bookingList.css";

const STATUS_LABELS = {
  PENDING:   { label: "Pending",   cls: "status--pending"   },
  APPROVED:  { label: "Approved",  cls: "status--approved"  },
  REJECTED:  { label: "Rejected",  cls: "status--rejected"  },
  CANCELLED: { label: "Cancelled", cls: "status--cancelled" },
};

function formatDT(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export default function BookingList({ userEmail }) {
  const [bookings, setBookings]     = useState([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [error, setError]           = useState("");
  const [cancellingId, setCancellingId] = useState(null);
  const [qrBooking, setQrBooking]   = useState(null);   // booking to show QR for

  useEffect(() => {
    if (!userEmail) return;
    setIsLoading(true);
    getMyBookings(userEmail)
      .then(setBookings)
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [userEmail]);

  async function handleCancel(id) {
    if (!window.confirm("Cancel this booking?")) return;
    setCancellingId(id);
    try {
      const updated = await cancelBooking(id, userEmail);
      setBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
    } catch (err) {
      alert(err.message || "Failed to cancel booking.");
    } finally {
      setCancellingId(null);
    }
  }

  if (!userEmail)          return <p className="booking-list__empty">Enter your email to view your bookings.</p>;
  if (isLoading)           return <p className="booking-list__empty">Loading bookings…</p>;
  if (error)               return <p className="booking-list__error">{error}</p>;
  if (bookings.length === 0) return <p className="booking-list__empty">No bookings found.</p>;

  return (
    <>
      <div className="booking-list">
        {bookings.map((b) => {
          const { label, cls } = STATUS_LABELS[b.status] || { label: b.status, cls: "" };
          const canCancel  = b.status === "PENDING" || b.status === "APPROVED";
          const isApproved = b.status === "APPROVED";

          return (
            <article key={b.id} className="booking-card">
              <header className="booking-card__header">
                <span className="booking-card__id">#{b.id}</span>
                <span className={`booking-card__status ${cls}`}>{label}</span>
              </header>

              <p className="booking-card__facility">{b.facilityName}</p>
              <p className="booking-card__time">
                {formatDT(b.startTime)} → {formatDT(b.endTime)}
              </p>
              <p className="booking-card__purpose">{b.purpose}</p>
              <p className="booking-card__attendees">Attendees: {b.expectedAttendees}</p>

              {b.adminReason && (
                <p className="booking-card__reason">Admin note: {b.adminReason}</p>
              )}

              <div className="booking-card__actions">
                {isApproved && (
                  <button
                    className="booking-card__qr"
                    onClick={() => setQrBooking(b)}
                    title="Show QR check-in pass"
                  >
                    📱 Show QR Pass
                  </button>
                )}
                {canCancel && (
                  <button
                    className="booking-card__cancel"
                    onClick={() => handleCancel(b.id)}
                    disabled={cancellingId === b.id}
                  >
                    {cancellingId === b.id ? "Cancelling…" : "Cancel"}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {qrBooking && (
        <BookingQRCode booking={qrBooking} onClose={() => setQrBooking(null)} />
      )}
    </>
  );
}
