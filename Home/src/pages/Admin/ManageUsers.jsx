import { useState, useEffect } from "react";
import "../../styles/manageUsers.css";

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreating, setIsCreating] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    role: "USER",
    status: "active",
    password: "",
  });

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter, statusFilter]);

  const loadUsers = () => {
    // Mock data - replace with actual API call
    const mockUsers = [
      {
        id: 1,
        fullName: "My Account",
        email: "admin@paf.com",
        role: "ADMIN",
        status: "active",
        createdAt: new Date("2024-01-15"),
        lastLogin: new Date("2024-04-25"),
      },
      {
        id: 2,
        fullName: "John Doe",
        email: "john.doe@student.paf.com",
        role: "USER",
        status: "active",
        createdAt: new Date("2024-02-10"),
        lastLogin: new Date("2024-04-24"),
      },
      {
        id: 3,
        fullName: "Jane Smith",
        email: "jane.smith@student.paf.com",
        role: "USER",
        status: "active",
        createdAt: new Date("2024-02-15"),
        lastLogin: new Date("2024-04-23"),
      },
      {
        id: 4,
        fullName: "Bob Wilson",
        email: "bob.wilson@staff.paf.com",
        role: "STAFF",
        status: "active",
        createdAt: new Date("2024-03-01"),
        lastLogin: new Date("2024-04-22"),
      },
      {
        id: 5,
        fullName: "Alice Brown",
        email: "alice.brown@student.paf.com",
        role: "USER",
        status: "suspended",
        createdAt: new Date("2024-03-10"),
        lastLogin: new Date("2024-04-10"),
      },
    ];
    setUsers(mockUsers);
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter((user) => user.role === roleFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((user) => user.status === statusFilter);
    }

    setFilteredUsers(filtered);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (editingUser) {
      // Update existing user
      setUsers(
        users.map((user) =>
          user.id === editingUser.id
            ? { ...user, ...formData, password: undefined }
            : user
        )
      );
      setEditingUser(null);
    } else {
      // Create new user
      const newUser = {
        id: Date.now(),
        ...formData,
        createdAt: new Date(),
        lastLogin: null,
      };
      setUsers([newUser, ...users]);
    }

    resetForm();
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      status: user.status,
      password: "",
    });
    setIsCreating(true);
    
    // Scroll to form
    setTimeout(() => {
      const formCard = document.querySelector('.user-form-card');
      if (formCard) {
        formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleDelete = (id) => {
    if (confirm("Are you sure you want to delete this user?")) {
      setUsers(users.filter((user) => user.id !== id));
    }
  };

  const handleSuspend = (id) => {
    setUsers(
      users.map((user) =>
        user.id === id
          ? { ...user, status: user.status === "active" ? "suspended" : "active" }
          : user
      )
    );
  };

  const resetForm = () => {
    setFormData({
      fullName: "",
      email: "",
      role: "USER",
      status: "active",
      password: "",
    });
    setIsCreating(false);
    setEditingUser(null);
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case "ADMIN":
        return "role-badge-admin";
      case "STAFF":
        return "role-badge-staff";
      default:
        return "role-badge-user";
    }
  };

  const getStatusBadgeClass = (status) => {
    return status === "active" ? "status-badge-active" : "status-badge-suspended";
  };

  const stats = {
    total: users.length,
    active: users.filter((u) => u.status === "active").length,
    suspended: users.filter((u) => u.status === "suspended").length,
    admins: users.filter((u) => u.role === "ADMIN").length,
    staff: users.filter((u) => u.role === "STAFF").length,
    users: users.filter((u) => u.role === "USER").length,
  };

  return (
    <div className="manage-users-container">
      <div className="users-header">
        <div>
          <h2>User Management</h2>
          <p>Manage system users, roles, and permissions</p>
        </div>
        <button
          className="btn-create-user"
          onClick={() => setIsCreating(!isCreating)}
        >
          {isCreating ? "✕ Cancel" : "+ Add New User"}
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="users-stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#dbeafe" }}>
            <span style={{ color: "#1e40af" }}>👥</span>
          </div>
          <div className="stat-content">
            <p>Total Users</p>
            <strong>{stats.total}</strong>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#d1fae5" }}>
            <span style={{ color: "#065f46" }}>✓</span>
          </div>
          <div className="stat-content">
            <p>Active</p>
            <strong>{stats.active}</strong>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#fee2e2" }}>
            <span style={{ color: "#991b1b" }}>⊘</span>
          </div>
          <div className="stat-content">
            <p>Suspended</p>
            <strong>{stats.suspended}</strong>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#e0e7ff" }}>
            <span style={{ color: "#4338ca" }}>⚡</span>
          </div>
          <div className="stat-content">
            <p>Admins</p>
            <strong>{stats.admins}</strong>
          </div>
        </div>
      </div>

      {/* Create/Edit User Form */}
      {isCreating && (
        <div className="user-form-card">
          <h3>{editingUser ? "Edit User" : "Create New User"}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  placeholder="Enter full name"
                  required
                />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="user@example.com"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                >
                  <option value="USER">User</option>
                  <option value="STAFF">Staff</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="form-group">
                <label>Status *</label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              {!editingUser && (
                <div className="form-group">
                  <label>Password *</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder="Enter password"
                    required={!editingUser}
                  />
                </div>
              )}
            </div>

            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={resetForm}>
                Cancel
              </button>
              <button type="submit" className="btn-submit">
                {editingUser ? "Update User" : "Create User"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="users-filters">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span className="search-icon">🔍</span>
        </div>

        <select
          className="filter-select"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="all">All Roles</option>
          <option value="ADMIN">Admin</option>
          <option value="STAFF">Staff</option>
          <option value="USER">User</option>
        </select>

        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="users-table-card">
        <div className="table-header">
          <h3>Users List ({filteredUsers.length})</h3>
        </div>
        <div className="table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="empty-row">
                    <div className="empty-state">
                      <span className="empty-icon">👤</span>
                      <p>No users found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar">
                          {user.fullName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </div>
                        <strong>{user.fullName}</strong>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`role-badge ${getRoleBadgeClass(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`status-badge ${getStatusBadgeClass(user.status)}`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td>{user.createdAt.toLocaleDateString()}</td>
                    <td>
                      {user.lastLogin
                        ? user.lastLogin.toLocaleDateString()
                        : "Never"}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          type="button"
                          className="btn-action btn-edit"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(user);
                          }}
                          title="Edit user"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          className="btn-action btn-suspend"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSuspend(user.id);
                          }}
                          title={
                            user.status === "active" ? "Suspend user" : "Activate user"
                          }
                        >
                          {user.status === "active" ? "⊘" : "✓"}
                        </button>
                        <button
                          type="button"
                          className="btn-action btn-delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(user.id);
                          }}
                          title="Delete user"
                          disabled={user.role === "ADMIN"}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
