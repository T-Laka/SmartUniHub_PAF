import { useState, useEffect } from "react";
import "../../styles/adminNotifications.css";

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    type: "info",
    targetAudience: "all",
    priority: "normal",
  });
  const [filter, setFilter] = useState("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = () => {
    // Mock data - replace with actual API call
    const mockNotifications = [
      {
        id: 1,
        title: "System Maintenance",
        message: "Scheduled maintenance on Sunday 2AM-4AM",
        type: "warning",
        targetAudience: "all",
        priority: "high",
        status: "active",
        createdAt: new Date("2024-04-20"),
        createdBy: "Admin",
      },
      {
        id: 2,
        title: "New Facility Available",
        message: "Conference Room B is now available for booking",
        type: "success",
        targetAudience: "students",
        priority: "normal",
        status: "active",
        createdAt: new Date("2024-04-19"),
        createdBy: "Admin",
      },
      {
        id: 3,
        title: "Booking Policy Update",
        message: "New cancellation policy effective from next month",
        type: "info",
        targetAudience: "all",
        priority: "normal",
        status: "active",
        createdAt: new Date("2024-04-18"),
        createdBy: "Admin",
      },
      {
        id: 4,
        title: "Holiday Notice",
        message: "Campus will be closed on May 1st",
        type: "info",
        targetAudience: "all",
        priority: "high",
        status: "archived",
        createdAt: new Date("2024-04-15"),
        createdBy: "Admin",
      },
    ];
    setNotifications(mockNotifications);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Mock API call - replace with actual API
    setTimeout(() => {
      const newNotification = {
        id: Date.now(),
        ...formData,
        status: "active",
        createdAt: new Date(),
        createdBy: "Admin",
      };

      setNotifications([newNotification, ...notifications]);
      setFormData({
        title: "",
        message: "",
        type: "info",
        targetAudience: "all",
        priority: "normal",
      });
      setIsCreating(false);
      setIsSubmitting(false);
    }, 500);
  };

  const handleArchive = (id) => {
    setNotifications(
      notifications.map((notif) =>
        notif.id === id ? { ...notif, status: "archived" } : notif
      )
    );
    setOpenMenuId(null);
  };

  const handleDelete = (id) => {
    if (confirm("Are you sure you want to delete this notification?")) {
      setNotifications(notifications.filter((notif) => notif.id !== id));
      setOpenMenuId(null);
    }
  };

  const handleReactivate = (id) => {
    setNotifications(
      notifications.map((notif) =>
        notif.id === id ? { ...notif, status: "active" } : notif
      )
    );
    setOpenMenuId(null);
  };

  const toggleMenu = (id) => {
    setOpenMenuId(openMenuId === id ? null : id);
  };

  const filteredNotifications = notifications.filter((notif) => {
    if (filter === "all") return true;
    return notif.status === filter;
  });

  const getTypeIcon = (type) => {
    switch (type) {
      case "success":
        return "✓";
      case "warning":
        return "⚠";
      case "error":
        return "✕";
      default:
        return "ℹ";
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case "success":
        return "#10b981";
      case "warning":
        return "#f59e0b";
      case "error":
        return "#ef4444";
      default:
        return "#3b82f6";
    }
  };

  return (
    <div className="admin-notifications-container">
      <div className="notifications-header">
        <div>
          <h2>Notifications Management</h2>
          <p>Create and manage system-wide notifications</p>
        </div>
        <button
          className="btn-create-notification"
          onClick={() => setIsCreating(!isCreating)}
        >
          {isCreating ? "✕ Cancel" : "+ Create Notification"}
        </button>
      </div>

      {isCreating && (
        <div className="notification-form-card">
          <h3>Create New Notification</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Enter notification title"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Message *</label>
              <textarea
                value={formData.message}
                onChange={(e) =>
                  setFormData({ ...formData, message: e.target.value })
                }
                placeholder="Enter notification message"
                rows="4"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Type</label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                >
                  <option value="info">Info</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                </select>
              </div>

              <div className="form-group">
                <label>Target Audience</label>
                <select
                  value={formData.targetAudience}
                  onChange={(e) =>
                    setFormData({ ...formData, targetAudience: e.target.value })
                  }
                >
                  <option value="all">All Users</option>
                  <option value="students">Students Only</option>
                  <option value="staff">Staff Only</option>
                  <option value="admins">Admins Only</option>
                </select>
              </div>

              <div className="form-group">
                <label>Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({ ...formData, priority: e.target.value })
                  }
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setIsCreating(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating..." : "Create Notification"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="notifications-filters">
        <button
          className={`filter-btn ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          All ({notifications.length})
        </button>
        <button
          className={`filter-btn ${filter === "active" ? "active" : ""}`}
          onClick={() => setFilter("active")}
        >
          Active ({notifications.filter((n) => n.status === "active").length})
        </button>
        <button
          className={`filter-btn ${filter === "archived" ? "active" : ""}`}
          onClick={() => setFilter("archived")}
        >
          Archived ({notifications.filter((n) => n.status === "archived").length})
        </button>
      </div>

      <div className="notifications-list">
        {filteredNotifications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No notifications found</h3>
            <p>
              {filter === "all"
                ? "Create your first notification to get started"
                : `No ${filter} notifications`}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              className={`notification-card ${notif.status}`}
            >
              <div className="notification-header">
                <div className="notification-type-badge">
                  <span
                    className="type-icon"
                    style={{ backgroundColor: getTypeColor(notif.type) }}
                  >
                    {getTypeIcon(notif.type)}
                  </span>
                  <span className="type-label">{notif.type}</span>
                </div>
                <div className="notification-meta">
                  <span className={`priority-badge priority-${notif.priority}`}>
                    {notif.priority}
                  </span>
                  <span className={`status-badge status-${notif.status}`}>
                    {notif.status}
                  </span>
                </div>
              </div>

              <h3 className="notification-title">{notif.title}</h3>
              <p className="notification-message">{notif.message}</p>

              <div className="notification-footer">
                <div className="notification-info">
                  <span className="info-item">
                    👥 {notif.targetAudience}
                  </span>
                  <span className="info-item">
                    📅 {notif.createdAt.toLocaleDateString()}
                  </span>
                  <span className="info-item">
                    👤 {notif.createdBy}
                  </span>
                </div>

                <div className="notification-actions">
                  <div className="action-menu-wrapper">
                    <button
                      className="btn-action-menu"
                      onClick={() => toggleMenu(notif.id)}
                    >
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <circle cx="10" cy="4" r="1.5"/>
                        <circle cx="10" cy="10" r="1.5"/>
                        <circle cx="10" cy="16" r="1.5"/>
                      </svg>
                      <span>Actions</span>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className={`chevron ${openMenuId === notif.id ? 'open' : ''}`}>
                        <path d="M4 6l4 4 4-4"/>
                      </svg>
                    </button>
                    
                    {openMenuId === notif.id && (
                      <div className="action-dropdown">
                        {notif.status === "active" ? (
                          <>
                            <button
                              className="dropdown-item archive-item"
                              onClick={() => handleArchive(notif.id)}
                            >
                              <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                                <path d="M2 3h14v2H2V3zm1 3h12v9H3V6zm2 2v5h8V8H5z"/>
                              </svg>
                              <div>
                                <strong>Archive</strong>
                                <span>Move to archive</span>
                              </div>
                            </button>
                            <div className="dropdown-divider"></div>
                            <button
                              className="dropdown-item delete-item"
                              onClick={() => handleDelete(notif.id)}
                            >
                              <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                                <path d="M6 1a1 1 0 0 0-1 1v1h8V2a1 1 0 0 0-1-1H6zM4 4v10a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4H4zm3 2h1v6H7V6zm3 0h1v6h-1V6z"/>
                              </svg>
                              <div>
                                <strong>Delete</strong>
                                <span>Remove permanently</span>
                              </div>
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="dropdown-item reactivate-item"
                              onClick={() => handleReactivate(notif.id)}
                            >
                              <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                                <path d="M9 3a6 6 0 1 0 5.455 3.497.5.5 0 0 1 .909-.417A7 7 0 1 1 9 2v1z"/>
                                <path d="M9 5.466V1.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L9.41 5.658A.25.25 0 0 1 9 5.466z"/>
                              </svg>
                              <div>
                                <strong>Reactivate</strong>
                                <span>Make active again</span>
                              </div>
                            </button>
                            <div className="dropdown-divider"></div>
                            <button
                              className="dropdown-item delete-item"
                              onClick={() => handleDelete(notif.id)}
                            >
                              <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                                <path d="M6 1a1 1 0 0 0-1 1v1h8V2a1 1 0 0 0-1-1H6zM4 4v10a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4H4zm3 2h1v6H7V6zm3 0h1v6h-1V6z"/>
                              </svg>
                              <div>
                                <strong>Delete</strong>
                                <span>Remove permanently</span>
                              </div>
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
