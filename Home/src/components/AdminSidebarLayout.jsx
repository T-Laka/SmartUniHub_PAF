import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import "../styles/adminSidebarLayout.css";

const ADMIN_MENU_ITEMS = [
  { to: "/admin/dashboard", label: "Dashboard", icon: "DB" },
  { to: "/admin/facilities", label: "Facilities", icon: "FC" },
  { to: "/admin/bookings", label: "Bookings", icon: "BK" },
  { to: "/admin/tickets", label: "Tickets", icon: "TK" },
  { to: "/admin/notifications", label: "Notifications", icon: "NT" },
  { to: "/admin/users", label: "Users", icon: "US" },
];

const ADMIN_PAGE_META = {
  "/admin/dashboard": {
    title: "Admin Dashboard",
    subtitle: "Overview and insights for facilities analytics and monitoring.",
  },
  "/admin/facilities": {
    title: "Manage Facilities",
    subtitle: "Add, edit, and remove facilities using this admin interface.",
  },
  "/admin/bookings": {
    title: "Admin Bookings",
    subtitle: "Review and manage booking operations from this section.",
  },
  "/admin/tickets": {
    title: "Admin Tickets",
    subtitle: "Track and resolve support tickets across facilities services.",
  },
  "/admin/notifications": {
    title: "Admin Notifications",
    subtitle: "Monitor alerts and broadcast updates to campus operations teams.",
  },
  "/admin/users": {
    title: "User Management",
    subtitle: "Manage system users, roles, and permissions.",
  },
};

function getAdminPageMeta(pathname) {
  if (pathname.startsWith("/admin/facilities")) {
    return ADMIN_PAGE_META["/admin/facilities"];
  }

  return (
    ADMIN_PAGE_META[pathname] || {
      title: "Admin Panel",
      subtitle: "Manage campus operations from the admin console.",
    }
  );
}

export default function AdminSidebarLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const pageMeta = getAdminPageMeta(location.pathname);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem("sch.currentUser");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const handleLogout = () => {
    if (confirm("Are you sure you want to logout?")) {
      // Clear user data
      localStorage.removeItem("sch.currentUser");
      setCurrentUser(null);
      
      // Dispatch auth change event
      window.dispatchEvent(new Event("sch:authchange"));
      
      // Navigate to home
      navigate("/");
      
      // Reload to clear all state
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  };

  return (
    <div className="admin-layout-shell">
      <aside className="admin-sidebar" aria-label="Admin sidebar navigation">
        <div className="admin-sidebar-header">
          <h1>Admin Panel</h1>
          {currentUser && (
            <div className="admin-user-info">
              <div className="admin-user-avatar">
                {currentUser.fullName
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2) || "AD"}
              </div>
              <div className="admin-user-details">
                <strong>{currentUser.fullName || "Admin"}</strong>
                <span>{currentUser.role || "ADMIN"}</span>
              </div>
            </div>
          )}
        </div>

        <nav className="admin-sidebar-nav">
          {ADMIN_MENU_ITEMS.map((item) => {
            const isActive = item.to === "/admin/facilities"
              ? location.pathname.startsWith("/admin/facilities")
              : location.pathname === item.to;

            const handleNavigate = () => {
              if (item.to === "/admin/dashboard") {
                navigate("/admin/dashboard");
                return;
              }

              if (item.to === "/admin/facilities") {
                navigate("/admin/facilities");
                return;
              }

              navigate(item.to);
            };

            return (
              <button
                key={item.to}
                type="button"
                className={isActive ? "admin-nav-item admin-nav-item-active" : "admin-nav-item"}
                onClick={handleNavigate}
              >
                <span className="admin-nav-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="admin-sidebar-footer">
          <button
            type="button"
            className="admin-logout-btn"
            onClick={handleLogout}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M3 3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h6v-2H4V5h5V3H3zm9.707 3.293a1 1 0 0 0-1.414 1.414L13.586 10l-2.293 2.293a1 1 0 1 0 1.414 1.414l3-3a1 1 0 0 0 0-1.414l-3-3z"/>
              <path d="M11 9h7v2h-7z"/>
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="admin-content-area">
        <header className="admin-content-header">
          <h2>{pageMeta.title}</h2>
          <p>{pageMeta.subtitle}</p>
        </header>

        <section className="admin-content-body">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
