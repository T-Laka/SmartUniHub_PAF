import { useEffect, useState } from "react";
import { getAllBookings, deleteBooking } from "../../data/bookingStore";
import "../../styles/admin/adminBookings.css";

const STATUS_LABELS = {
  PENDING: { label: "Pending", cls: "status--pending" },
  APPROVED: { label: "Approved", cls: "status--approved" },
  REJECTED: { label: "Rejected", cls: "status--rejected" },
  CANCELLED: { label: "Cancelled", cls: "status--cancelled" },
};

function formatDT(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [actioningId, setActioningId] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);

  useEffect(() => {
    loadBookings();
  }, [filterStatus]);

  async function loadBookings() {
    setIsLoading(true);
    setError("");
    try {
      const data = await getAllBookings(filterStatus);
      setBookings(data);
    } catch (err) {
      setError(err.message || "Failed to load bookings");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUpdateStatus(id, newStatus, comment = "") {
    if (!window.confirm(`Are you sure you want to ${newStatus.toLowerCase()} this booking?`)) {
      return;
    }

    setActioningId(id);
    try {
      const response = await fetch(`http://localhost:8081/api/bookings/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, adminComment: comment }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update booking");
      }

      const updated = await response.json();
      setBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
      setSelectedBooking(null);
    } catch (err) {
      alert(err.message || "Failed to update booking status");
    } finally {
      setActioningId(null);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Permanently delete this booking? This cannot be undone.")) {
      return;
    }

    setActioningId(id);
    try {
      await deleteBooking(id);
      setBookings((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      alert(err.message || "Failed to delete booking");
    } finally {
      setActioningId(null);
    }
  }

  const filteredBookings = bookings.filter((b) => {
    const term = searchTerm.toLowerCase();
    return (
      b.userName?.toLowerCase().includes(term) ||
      b.userEmail?.toLowerCase().includes(term) ||
      b.facilityName?.toLowerCase().includes(term) ||
      b.purpose?.toLowerCase().includes(term)
    );
  });

  const stats = {
    total: bookings.length,
    pending: bookings.filter((b) => b.status === "PENDING").length,
    approved: bookings.filter((b) => b.status === "APPROVED").length,
    rejected: bookings.filter((b) => b.status === "REJECTED").length,
    cancelled: bookings.filter((b) => b.status === "CANCELLED").length,
  };

  return (
    <div className="admin-bookings">
      <header className="admin-bookings__header">
        <h2>Booking Management</h2>
        <p>Review and manage all facility booking requests</p>
      </header>

      {/* Stats Cards */}
      <div className="admin-bookings__stats">
        <div className="stat-card stat-card--total">
          <span className="stat-card__value">{stats.total}</span>
          <span className="stat-card__label">Total Bookings</span>
        </div>
        <div className="stat-card stat-card--pending">
          <span className="stat-card__value">{stats.pending}</span>
          <span className="stat-card__label">Pending</span>
        </div>
        <div className="stat-card stat-card--approved">
          <span className="stat-card__value">{stats.approved}</span>
          <span className="stat-card__label">Approved</span>
        </div>
        <div className="stat-card stat-card--rejected">
          <span className="stat-card__value">{stats.rejected}</span>
          <span className="stat-card__label">Rejected</span>
        </div>
      </div>

      {/* Filters */}
      <div className="admin-bookings__filters">
        <input
          type="text"
          placeholder="Search by user, facility, or purpose..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="admin-bookings__search"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="admin-bookings__filter"
        >
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <button onClick={loadBookings} className="admin-bookings__refresh">
          🔄 Refresh
        </button>
      </div>

      {/* Content */}
      {isLoading && <p className="admin-bookings__loading">Loading bookings...</p>}
      {error && <p className="admin-bookings__error">{error}</p>}

      {!isLoading && !error && filteredBookings.length === 0 && (
        <p className="admin-bookings__empty">No bookings found.</p>
      )}

      {!isLoading && !error && filteredBookings.length > 0 && (
        <div className="admin-bookings__table-wrapper">
          <table className="admin-bookings__table">
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Facility</th>
                <th>Date & Time</th>
                <th>Attendees</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((booking) => {
                const { label, cls } = STATUS_LABELS[booking.status] || {
                  label: booking.status,
                  cls: "",
                };
                const isPending = booking.status === "PENDING";

                return (
                  <tr key={booking.id}>
                    <td>#{booking.id}</td>
                    <td>
                      <div className="user-cell">
                        <strong>{booking.userName}</strong>
                        <small>{booking.userEmail}</small>
                      </div>
                    </td>
                    <td>{booking.facilityName}</td>
                    <td>
                      <div className="time-cell">
                        <div>{formatDT(booking.startTime)}</div>
                        <div>→ {formatDT(booking.endTime)}</div>
                      </div>
                    </td>
                    <td>{booking.expectedAttendees}</td>
                    <td>
                      <span className={`status-badge ${cls}`}>{label}</span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={() => setSelectedBooking(booking)}
                          className="btn-view"
                          title="View Details"
                        >
                          👁️
                        </button>
                        {isPending && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(booking.id, "APPROVED")}
                              disabled={actioningId === booking.id}
                              className="btn-approve"
                              title="Approve"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(booking.id, "REJECTED")}
                              disabled={actioningId === booking.id}
                              className="btn-reject"
                              title="Reject"
                            >
                              ✗
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDelete(booking.id)}
                          disabled={actioningId === booking.id}
                          className="btn-delete"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selectedBooking && (
        <div className="modal-overlay" onClick={() => setSelectedBooking(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h3>Booking Details #{selectedBooking.id}</h3>
              <button onClick={() => setSelectedBooking(null)} className="modal-close">
                ✕
              </button>
            </header>
            <div className="modal-body">
              <div className="detail-row">
                <strong>User:</strong>
                <span>
                  {selectedBooking.userName} ({selectedBooking.userEmail})
                </span>
              </div>
              <div className="detail-row">
                <strong>Facility:</strong>
                <span>{selectedBooking.facilityName}</span>
              </div>
              <div className="detail-row">
                <strong>Start Time:</strong>
                <span>{formatDT(selectedBooking.startTime)}</span>
              </div>
              <div className="detail-row">
                <strong>End Time:</strong>
                <span>{formatDT(selectedBooking.endTime)}</span>
              </div>
              <div className="detail-row">
                <strong>Expected Attendees:</strong>
                <span>{selectedBooking.expectedAttendees}</span>
              </div>
              <div className="detail-row">
                <strong>Purpose:</strong>
                <span>{selectedBooking.purpose}</span>
              </div>
              <div className="detail-row">
                <strong>Status:</strong>
                <span className={`status-badge ${STATUS_LABELS[selectedBooking.status]?.cls}`}>
                  {STATUS_LABELS[selectedBooking.status]?.label}
                </span>
              </div>
              {selectedBooking.adminComment && (
                <div className="detail-row">
                  <strong>Admin Comment:</strong>
                  <span>{selectedBooking.adminComment}</span>
                </div>
              )}
              <div className="detail-row">
                <strong>Created:</strong>
                <span>{formatDT(selectedBooking.createdAt)}</span>
              </div>
              <div className="detail-row">
                <strong>Updated:</strong>
                <span>{formatDT(selectedBooking.updatedAt)}</span>
              </div>
            </div>
            {selectedBooking.status === "PENDING" && (
              <footer className="modal-footer">
                <button
                  onClick={() => handleUpdateStatus(selectedBooking.id, "APPROVED")}
                  className="btn-modal-approve"
                >
                  ✓ Approve
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedBooking.id, "REJECTED")}
                  className="btn-modal-reject"
                >
                  ✗ Reject
                </button>
              </footer>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
