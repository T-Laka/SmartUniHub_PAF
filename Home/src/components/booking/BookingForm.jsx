// Member 2 – BookingForm component
import { useEffect, useState } from "react";
import { getFacilities } from "../../data/facilitiesStore";
import { createBooking } from "../../data/bookingStore";
import TimelineVisualizer from "./TimelineVisualizer";
import "../../styles/booking/bookingForm.css";

function toLocalISOString(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}

function minDateTime() {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 5);
  return toLocalISOString(now);
}

const EMPTY_FORM = {
  userEmail: "",
  userName: "",
  facilityId: "",
  facilityName: "",
  startTime: "",
  endTime: "",
  purpose: "",
  expectedAttendees: 1,
};

export default function BookingForm({ prefillEmail = "", prefillName = "", onSuccess }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, userEmail: prefillEmail, userName: prefillName });
  const [facilities, setFacilities] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Sync prefill values if they arrive after mount (e.g. localStorage loads async)
  useEffect(() => {
    if (prefillEmail || prefillName) {
      setForm((prev) => ({
        ...prev,
        userEmail: prefillEmail || prev.userEmail,
        userName: prefillName || prev.userName,
      }));
    }
  }, [prefillEmail, prefillName]);

  useEffect(() => {
    getFacilities({ status: "ACTIVE" })
      .then(setFacilities)
      .catch(() => setFacilities([]));
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    if (name === "facilityId") {
      const selected = facilities.find((f) => String(f.id) === value);
      setForm((prev) => ({
        ...prev,
        facilityId: value,
        facilityName: selected ? selected.name : "",
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.facilityId) { setError("Please select a facility."); return; }
    if (!form.startTime || !form.endTime) { setError("Please set start and end times."); return; }
    if (form.endTime <= form.startTime) { setError("End time must be after start time."); return; }

    setIsSubmitting(true);
    try {
      const payload = {
        userEmail: form.userEmail,
        userName: form.userName,
        facilityId: Number(form.facilityId),
        facilityName: form.facilityName,
        startTime: form.startTime,
        endTime: form.endTime,
        purpose: form.purpose,
        expectedAttendees: Number(form.expectedAttendees),
      };
      const created = await createBooking(payload);
      setSuccess(`Booking #${created.id} submitted successfully! Status: PENDING`);
      setForm({ ...EMPTY_FORM, userEmail: prefillEmail, userName: prefillName });
      if (onSuccess) onSuccess(created);
    } catch (err) {
      setError(err.message || "Failed to submit booking.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="booking-form" onSubmit={handleSubmit} noValidate>
      <h2 className="booking-form__title">Request a Booking</h2>

      {error && <p className="booking-form__error" role="alert">{error}</p>}
      {success && <p className="booking-form__success" role="status">{success}</p>}

      <div className="booking-form__grid">
        <div className="booking-form__field">
          <label htmlFor="bf-name">Your Name</label>
          <input id="bf-name" name="userName" value={form.userName}
            onChange={handleChange} required placeholder="Full name"
            readOnly={!!prefillName}
            className={prefillName ? "booking-form__input--readonly" : ""} />
        </div>

        <div className="booking-form__field">
          <label htmlFor="bf-email">Your Email</label>
          <input id="bf-email" name="userEmail" type="email" value={form.userEmail}
            onChange={handleChange} required placeholder="you@example.com"
            readOnly={!!prefillEmail}
            className={prefillEmail ? "booking-form__input--readonly" : ""} />
        </div>

        <div className="booking-form__field booking-form__field--full">
          <label htmlFor="bf-facility">Facility</label>
          <select id="bf-facility" name="facilityId" value={form.facilityId}
            onChange={handleChange} required>
            <option value="">-- Select a facility --</option>
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.type}) – Capacity: {f.capacity}
              </option>
            ))}
          </select>
        </div>

        <div className="booking-form__field">
          <label htmlFor="bf-start">Start Time</label>
          <input id="bf-start" name="startTime" type="datetime-local"
            value={form.startTime} min={minDateTime()}
            onChange={handleChange} required />
        </div>

        <div className="booking-form__field">
          <label htmlFor="bf-end">End Time</label>
          <input id="bf-end" name="endTime" type="datetime-local"
            value={form.endTime} min={form.startTime || minDateTime()}
            onChange={handleChange} required />
        </div>

        <div className="booking-form__field">
          <label htmlFor="bf-attendees">Expected Attendees</label>
          <input id="bf-attendees" name="expectedAttendees" type="number"
            min="1" value={form.expectedAttendees} onChange={handleChange} required />
        </div>

        <div className="booking-form__field booking-form__field--full">
          <label htmlFor="bf-purpose">Purpose</label>
          <textarea id="bf-purpose" name="purpose" rows={3}
            value={form.purpose} onChange={handleChange}
            required placeholder="Describe the purpose of this booking..." />
        </div>
      </div>

      {/* Timeline visualizer — shows when facility + date are selected */}
      <TimelineVisualizer
        facilityId={form.facilityId ? Number(form.facilityId) : null}
        selectedDate={form.startTime ? form.startTime.slice(0, 10) : null}
        selStart={form.startTime || null}
        selEnd={form.endTime || null}
      />

      <button className="booking-form__submit" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Submitting…" : "Submit Booking Request"}
      </button>
    </form>
  );
}
