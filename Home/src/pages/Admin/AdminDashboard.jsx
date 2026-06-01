import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Calendar from "react-calendar";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  getFacilities,
  getFacilitiesSummary,
  subscribeFacilities,
} from "../../data/facilitiesStore";
import "../../styles/adminDashboard.css";
import "react-calendar/dist/Calendar.css";

const FACILITY_TYPE_ORDER = ["Room", "Lab", "Lecture Hall", "Equipment"];
const BAR_COLORS = ["#60a5fa", "#3b82f6", "#2563eb", "#1d4ed8"];

const BOOKING_NOTES_BY_DATE = {
  "2026-04-14": "2 bookings",
  "2026-04-15": "No bookings",
  "2026-04-16": "1 booking",
};

function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function formatDate(date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [facilities, setFacilities] = useState([]);
  const [summary, setSummary] = useState({
    totalFacilities: 0,
    activeFacilities: 0,
    outOfServiceFacilities: 0,
    facilitiesByType: {},
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Mock user data
  const [users] = useState([
    {
      id: 1,
      fullName: "My Account",
      email: "admin@paf.com",
      role: "ADMIN",
      status: "active",
      lastLogin: new Date("2024-04-25"),
    },
    {
      id: 2,
      fullName: "John Doe",
      email: "john.doe@student.paf.com",
      role: "USER",
      status: "active",
      lastLogin: new Date("2024-04-24"),
    },
    {
      id: 3,
      fullName: "Jane Smith",
      email: "jane.smith@student.paf.com",
      role: "USER",
      status: "active",
      lastLogin: new Date("2024-04-23"),
    },
    {
      id: 4,
      fullName: "Bob Wilson",
      email: "bob.wilson@staff.paf.com",
      role: "STAFF",
      status: "active",
      lastLogin: new Date("2024-04-22"),
    },
    {
      id: 5,
      fullName: "Alice Brown",
      email: "alice.brown@student.paf.com",
      role: "USER",
      status: "suspended",
      lastLogin: new Date("2024-04-10"),
    },
  ]);

  const userStats = useMemo(() => ({
    total: users.length,
    active: users.filter((u) => u.status === "active").length,
    suspended: users.filter((u) => u.status === "suspended").length,
    admins: users.filter((u) => u.role === "ADMIN").length,
  }), [users]);

  useEffect(() => {
    let isMounted = true;

    const loadDashboardData = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const [nextFacilities, nextSummary] = await Promise.all([
          getFacilities(),
          getFacilitiesSummary(),
        ]);

        if (!isMounted) {
          return;
        }

        setFacilities(nextFacilities);
        setSummary({
          totalFacilities: Number(nextSummary.totalFacilities || 0),
          activeFacilities: Number(nextSummary.activeFacilities || 0),
          outOfServiceFacilities: Number(nextSummary.outOfServiceFacilities || 0),
          facilitiesByType: nextSummary.facilitiesByType || {},
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setFacilities([]);
        setSummary({
          totalFacilities: 0,
          activeFacilities: 0,
          outOfServiceFacilities: 0,
          facilitiesByType: {},
        });
        setErrorMessage(error.message || "Failed to load dashboard data");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadDashboardData();

    const unsubscribe = subscribeFacilities(async (nextFacilities) => {
      if (!isMounted) {
        return;
      }

      setFacilities(nextFacilities);

      try {
        const nextSummary = await getFacilitiesSummary();
        if (!isMounted) {
          return;
        }

        setSummary({
          totalFacilities: Number(nextSummary.totalFacilities || 0),
          activeFacilities: Number(nextSummary.activeFacilities || 0),
          outOfServiceFacilities: Number(nextSummary.outOfServiceFacilities || 0),
          facilitiesByType: nextSummary.facilitiesByType || {},
        });
        setErrorMessage("");
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error.message || "Failed to refresh dashboard data");
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const totalFacilities = summary.totalFacilities;
  const activeFacilities = summary.activeFacilities;
  const outOfServiceFacilities = summary.outOfServiceFacilities;
  const activePercentage = totalFacilities > 0
    ? Math.round((activeFacilities / totalFacilities) * 100)
    : 0;
  const outOfServicePercentage = totalFacilities > 0
    ? Math.max(0, 100 - activePercentage)
    : 0;

  const facilityTypeData = useMemo(() => {
    const typeCounts = summary.facilitiesByType || {};
    return FACILITY_TYPE_ORDER.map((type) => ({
      label: type,
      count: Number(typeCounts[type] || 0),
    }));
  }, [summary.facilitiesByType]);

  const statusPieData = useMemo(
    () => [
      { name: "Active", value: activeFacilities, color: "#16a34a" },
      { name: "Out of Service", value: outOfServiceFacilities, color: "#ef4444" },
    ],
    [activeFacilities, outOfServiceFacilities]
  );

  const quickInsights = useMemo(() => {
    const totalCapacity = facilities.reduce((sum, facility) => sum + Number(facility.capacity || 0), 0);
    const highestCapacityFacility = facilities.reduce((topFacility, facility) => {
      if (!topFacility) {
        return facility;
      }

      return Number(facility.capacity || 0) > Number(topFacility.capacity || 0)
        ? facility
        : topFacility;
    }, null);

    return [
      {
        icon: "HC",
        label: "Highest Capacity",
        value: highestCapacityFacility ? highestCapacityFacility.name : "N/A",
      },
      {
        icon: "TC",
        label: "Total Capacity",
        value: String(totalCapacity),
      },
      {
        icon: "AR",
        label: "Active Rate",
        value: `${activePercentage}%`,
      },
    ];
  }, [facilities, activePercentage]);

  const recentActivity = useMemo(() => {
    return [...facilities]
      .sort((left, right) => Number(right.id || 0) - Number(left.id || 0))
      .slice(0, 4)
      .map((facility) => ({
        icon: "FAC",
        text: `${facility.name} (${facility.type})`,
        time: `ID #${facility.id}`,
      }));
  }, [facilities]);

  const selectedDateKey = toDateKey(selectedDate);
  const selectedDateBookingNote = BOOKING_NOTES_BY_DATE[selectedDateKey] || "No bookings";

  function handleDateChange(value) {
    if (Array.isArray(value)) {
      setSelectedDate(value[0] ?? new Date());
      return;
    }

    setSelectedDate(value);
  }

  return (
    <div className="admin-dashboard-container">
        {errorMessage && <p className="admin-dashboard-message">{errorMessage}</p>}

        <section className="admin-stats-grid" aria-label="Admin facility summary">
          <article className="admin-card admin-stat-card">
            <p>Total Facilities</p>
            <strong>{isLoading ? "..." : totalFacilities}</strong>
          </article>

          <article className="admin-card admin-stat-card">
            <p>Active Facilities</p>
            <strong>{isLoading ? "..." : activeFacilities}</strong>
          </article>

          <article className="admin-card admin-stat-card">
            <p>Out of Service</p>
            <strong>{isLoading ? "..." : outOfServiceFacilities}</strong>
          </article>
        </section>

        {/* User Management Section */}
        <section className="admin-card admin-users-section" aria-label="User management">
          <div className="users-section-header">
            <div>
              <h3>User Management</h3>
              <p>Quick overview of system users</p>
            </div>
            <button 
              className="btn-manage-users"
              onClick={() => navigate('/admin/users')}
            >
              Manage All Users →
            </button>
          </div>

          <div className="users-quick-stats">
            <div className="user-stat-card">
              <div className="user-stat-icon" style={{ background: '#dbeafe' }}>
                <span style={{ color: '#1e40af' }}>👥</span>
              </div>
              <div>
                <p>Total Users</p>
                <strong>{userStats.total}</strong>
              </div>
            </div>
            <div className="user-stat-card">
              <div className="user-stat-icon" style={{ background: '#d1fae5' }}>
                <span style={{ color: '#065f46' }}>✓</span>
              </div>
              <div>
                <p>Active</p>
                <strong>{userStats.active}</strong>
              </div>
            </div>
            <div className="user-stat-card">
              <div className="user-stat-icon" style={{ background: '#fee2e2' }}>
                <span style={{ color: '#991b1b' }}>⊘</span>
              </div>
              <div>
                <p>Suspended</p>
                <strong>{userStats.suspended}</strong>
              </div>
            </div>
            <div className="user-stat-card">
              <div className="user-stat-icon" style={{ background: '#fef3c7' }}>
                <span style={{ color: '#92400e' }}>⚡</span>
              </div>
              <div>
                <p>Admins</p>
                <strong>{userStats.admins}</strong>
              </div>
            </div>
          </div>

          <div className="recent-users-table">
            <h4>Recent Users</h4>
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last Login</th>
                </tr>
              </thead>
              <tbody>
                {users.slice(0, 5).map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="user-cell-compact">
                        <div className="user-avatar-small">
                          {user.fullName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </div>
                        <span>{user.fullName}</span>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`role-badge-small role-${user.role.toLowerCase()}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge-small status-${user.status}`}>
                        {user.status}
                      </span>
                    </td>
                    <td>{user.lastLogin.toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="admin-analytics-grid" aria-label="Facilities analytics charts">
          <article className="admin-card admin-chart-card">
            <h3>Facility Overview</h3>

            <div className="admin-chart-wrap" aria-label="Facilities by type bar chart">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={facilityTypeData}>
                  <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "#dbe4f4" }} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={{ stroke: "#dbe4f4" }} />
                  <Tooltip cursor={{ fill: "rgba(37, 99, 235, 0.08)" }} />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {facilityTypeData.map((entry, index) => (
                      <Cell key={entry.label} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="admin-card admin-chart-card">
            <h3>Status Distribution</h3>

            <div className="admin-chart-wrap" aria-label="Status distribution pie chart">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={92}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
                    labelLine={false}
                  >
                    {statusPieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={24} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="admin-status-legend">
              <p>
                <span className="admin-legend-dot admin-legend-active" />
                Active Facilities ({activePercentage}%)
              </p>
              <p>
                <span className="admin-legend-dot admin-legend-out" />
                Out of Service ({outOfServicePercentage}%)
              </p>
            </div>
          </article>
        </section>

        <section className="admin-card admin-facilities-card" aria-label="Facilities details">
          <h3>Facilities Details</h3>

          <div className="admin-facility-table-wrap" role="region" aria-label="Facility details table">
            <table className="admin-facility-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Location</th>
                  <th>Capacity</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {!isLoading && facilities.length === 0 && (
                  <tr>
                    <td colSpan="5">No facilities found</td>
                  </tr>
                )}

                {facilities.map((facility) => (
                  <tr key={facility.id}>
                    <td>{facility.name}</td>
                    <td>{facility.type}</td>
                    <td>{facility.location}</td>
                    <td>{facility.capacity}</td>
                    <td>
                      <span
                        className={
                          facility.status === "ACTIVE"
                            ? "admin-facility-status admin-facility-status-active"
                            : "admin-facility-status admin-facility-status-out"
                        }
                      >
                        {facility.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="admin-overview-grid" aria-label="Availability and quick insights">
          <article className="admin-card admin-calendar-card">
            <h3>Facility Availability Calendar</h3>
            <div className="admin-calendar-wrap">
              <Calendar onChange={handleDateChange} value={selectedDate} />
            </div>
            <p className="admin-calendar-note">{selectedDateBookingNote}</p>
            <p className="admin-calendar-selected">
              Selected Date: <strong>{formatDate(selectedDate)}</strong>
            </p>
          </article>

          <div className="admin-insights-left">
            <article className="admin-card admin-chart-card">
              <h3>Quick Insights</h3>
              <div className="admin-quick-insights-grid">
                {quickInsights.map((item) => (
                  <article key={item.label} className="admin-quick-card">
                    <span className="admin-quick-icon" aria-hidden="true">
                      {item.icon}
                    </span>
                    <p>{item.label}</p>
                    <strong>{item.value}</strong>
                  </article>
                ))}
              </div>
            </article>

            <article className="admin-card admin-activity-card">
              <h3>Recent Activity</h3>

              <ul className="admin-activity-list">
                {recentActivity.map((activity) => (
                  <li key={`${activity.text}-${activity.time}`}>
                    <span className="admin-activity-icon" aria-hidden="true">
                      {activity.icon}
                    </span>
                    <div>
                      <strong>{activity.text}</strong>
                      <p>{activity.time}</p>
                    </div>
                  </li>
                ))}

                {!isLoading && recentActivity.length === 0 && (
                  <li>
                    <div>
                      <strong>No recent facility activity</strong>
                      <p>Add or update facilities from Manage Facilities page.</p>
                    </div>
                  </li>
                )}
              </ul>
            </article>
          </div>
        </section>
      </div>
  );
}
