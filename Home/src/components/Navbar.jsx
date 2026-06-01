import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";

const AUTH_STORAGE_KEY = "sch.currentUser";

const menuItems = [
  { label: "Home", to: "/" },
  { label: "Resources" }, // remove "to"
  { label: "Bookings", to: "/booking" },
  { label: "Tickets", to: "/tickets" },
];

export default function Navbar({ userName = "Alex Silva", role = "USER" }) {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const displayName = currentUser?.fullName || userName;
  const displayRole = currentUser?.role || role;
  const avatar = (displayName || "MY")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8081";
  const oauthBaseUrl = import.meta.env.VITE_OAUTH_BASE_URL || "http://localhost:5000";
  const passwordChecks = [
    {
      id: "length",
      label: "At least 8 characters",
      passed: password.length >= 8,
    },
    {
      id: "upper",
      label: "One uppercase letter",
      passed: /[A-Z]/.test(password),
    },
    {
      id: "number",
      label: "One number",
      passed: /\d/.test(password),
    },
    {
      id: "special",
      label: "One special character",
      passed: /[^A-Za-z0-9]/.test(password),
    },
  ];
  const passedPasswordChecks = passwordChecks.filter((item) => item.passed).length;
  const passwordStrengthLabel =
    passedPasswordChecks <= 1 ? "Weak" : passedPasswordChecks <= 3 ? "Medium" : "Strong";

  function persistCurrentUser(user) {
    setCurrentUser(user);

    try {
      if (user) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
      
      // Dispatch custom event for other components to react to auth change
      window.dispatchEvent(new Event("sch:authchange"));
    } catch (error) {
      // Ignore storage errors and keep in-memory auth state.
    }
  }

  function clearFieldError(fieldName) {
    setFieldErrors((prev) => {
      if (!prev[fieldName]) {
        return prev;
      }

      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
  }

  function validateRegisterForm() {
    const nextErrors = {};

    if (fullName.trim().length < 2) {
      nextErrors.fullName = "Please enter your full name";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = "Please enter a valid email address";
    }

    if (passwordChecks.some((item) => !item.passed)) {
      nextErrors.password = "Password does not meet all requirements";
    }

    if (password !== confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match";
    }

    if (!agreeTerms) {
      nextErrors.agreeTerms = "You need to accept the terms and privacy policy";
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleLogin(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message || "Login failed");
        return;
      }

      persistCurrentUser(data);
      setIsLoginOpen(false);
      setEmail("");
      setPassword("");
      setIsProfileOpen(false);
      goToCustomerDashboard();
    } catch (error) {
      setErrorMessage("Unable to reach backend server");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    if (!validateRegisterForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fullName, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message || "Registration failed");
        return;
      }

      persistCurrentUser(data);
      setSuccessMessage("Registration successful");
      setIsLoginOpen(false);
      setFullName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setAgreeTerms(false);
      setFieldErrors({});
      setIsProfileOpen(false);
      setAuthMode("login");
      goToCustomerDashboard();
    } catch (error) {
      setErrorMessage("Unable to reach backend server");
    } finally {
      setIsSubmitting(false);
    }
  }

  function openAuthModal(mode) {
    setAuthMode(mode);
    setIsLoginOpen(true);
    setErrorMessage("");
    setSuccessMessage("");
    setFieldErrors({});

    if (mode === "login") {
      setConfirmPassword("");
      setAgreeTerms(false);
    }
  }

  function handleSignOut() {
    persistCurrentUser(null);
    setIsProfileOpen(false);
    
    // Dispatch custom event for other components to react to auth change
    window.dispatchEvent(new Event("sch:authchange"));
    
    // Navigate to home page and reload to clear all state
    navigate("/");
    
    // Small delay to ensure navigation completes before reload
    setTimeout(() => {
      window.location.reload();
    }, 100);
  }

  function goToCustomerDashboard() {
    const dashboard = document.getElementById("customer-dashboard");
    if (dashboard) {
      dashboard.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setIsProfileOpen(false);
  }

  function handleGoogleLogin() {
    window.location.href = `${oauthBaseUrl}/auth/google`;
  }

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);
      if (storedUser) {
        setCurrentUser(JSON.parse(storedUser));
      }
    } catch (error) {
      // Ignore parsing/storage errors and continue without persisted auth.
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authStatus = params.get("auth");

    if (authStatus !== "success") {
      return;
    }

    const fullNameFromGoogle = params.get("fullName") || "Customer";
    const emailFromGoogle = params.get("email") || "";
    const roleFromGoogle = params.get("role") || "CUSTOMER";
    const profilePicFromGoogle = params.get("profilePic") || "";

    const googleUser = {
      fullName: fullNameFromGoogle,
      email: emailFromGoogle,
      role: roleFromGoogle,
      profilePic: profilePicFromGoogle,
    };

    persistCurrentUser(googleUser);
    setIsLoginOpen(false);
    setIsProfileOpen(false);
    setErrorMessage("");
    setSuccessMessage("Google login successful");

    window.history.replaceState(null, "", window.location.pathname);
    setTimeout(() => {
      goToCustomerDashboard();
    }, 0);
  }, []);

  // Close notifications dropdown when clicking outside
  useEffect(() => {
    if (!isNotificationsOpen) return;

    function handleClickOutside(event) {
      const notificationsWrapper = event.target.closest('.notifications-wrapper');
      if (!notificationsWrapper) {
        setIsNotificationsOpen(false);
      }
    }

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isNotificationsOpen]);

  return (
    <>
    <header className="top-nav">
      <div className="brand-wrap">
        <div className="brand-logo">SC</div>
        <div>
          <p className="brand-title">Smart Campus Hub</p>
          <p className="brand-subtitle">Operations Hub</p>
        </div>
      </div>

      <button
        className="mobile-toggle"
        onClick={() => setIsMenuOpen((prev) => !prev)}
        aria-label="Toggle menu"
      >
        <span />
        <span />
        <span />
      </button>

      <nav className={`nav-links ${isMenuOpen ? "open" : ""}`}>
        {currentUser?.role === "ADMIN" && (
          <NavLink
            to="/admin/dashboard"
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
            onClick={() => setIsMenuOpen(false)}
            style={{ fontWeight: "600", color: "#2563eb" }}
          >
            🔧 Admin Panel
          </NavLink>
        )}
        
        {menuItems.map((item) => {
          if (item.label === "Resources" && !currentUser) {
            return (
              <button
                key={item.label}
                type="button"
                className="nav-link nav-link-lock"
                onClick={() => {
                  setIsMenuOpen(false);
                  openAuthModal("login");
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  {item.label}
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" style={{ opacity: 0.6 }}>
                    <path d="M10 5V3.5C10 1.57 8.43 0 6.5 0S3 1.57 3 3.5V5c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1h7c.55 0 1-.45 1-1V6c0-.55-.45-1-1-1zM6.5 8c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zM8 5H5V3.5C5 2.67 5.67 2 6.5 2S8 2.67 8 3.5V5z"/>
                  </svg>
                </span>
              </button>
            );
          }

          if (item.label === "Resources") {
            const targetPath =
              currentUser?.role === "ADMIN" ? "/admin/facilities" : "/facilities";

            return (
              <NavLink
                key={item.label}
                to={targetPath}
                className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </NavLink>
            );
          }

          // Protect Bookings and Tickets - require login
          if ((item.label === "Bookings" || item.label === "Tickets") && !currentUser) {
            return (
              <button
                key={item.label}
                type="button"
                className="nav-link nav-link-lock"
                onClick={() => {
                  setIsMenuOpen(false);
                  openAuthModal("login");
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  {item.label}
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" style={{ opacity: 0.6 }}>
                    <path d="M10 5V3.5C10 1.57 8.43 0 6.5 0S3 1.57 3 3.5V5c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1h7c.55 0 1-.45 1-1V6c0-.55-.45-1-1-1zM6.5 8c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zM8 5H5V3.5C5 2.67 5.67 2 6.5 2S8 2.67 8 3.5V5z"/>
                  </svg>
                </span>
              </button>
            );
          }

          if (item.to) {
            return (
              <NavLink
                key={item.label}
                to={item.to}
                className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </NavLink>
            );
          }

          return (
            <a key={item.label} href={item.href} className="nav-link">
              {item.label}
            </a>
          );
        })}
      </nav>

      <div className="navbar-actions">
        {/* Notifications Button */}
        {currentUser && (
          <div className="notifications-wrapper">
            <button
              className="notifications-btn"
              onClick={() => setIsNotificationsOpen((prev) => !prev)}
              aria-label="Notifications"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <span className="notification-badge">3</span>
            </button>

            {isNotificationsOpen && (
              <div className="notifications-dropdown">
                <div className="notifications-header">
                  <h3>Notifications</h3>
                  <button className="mark-read-btn">Mark all as read</button>
                </div>
                <div className="notifications-list">
                  <div className="notification-item unread">
                    <div className="notification-icon success">
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                        <path d="M9 0C4.03 0 0 4.03 0 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm4.3 6.7l-5 5c-.2.2-.5.2-.7 0l-2-2c-.2-.2-.2-.5 0-.7s.5-.2.7 0l1.6 1.6 4.6-4.6c.2-.2.5-.2.7 0s.2.5.1.7z"/>
                      </svg>
                    </div>
                    <div className="notification-content">
                      <strong>Booking Confirmed</strong>
                      <p>Your booking for Conference Room A has been approved</p>
                      <span className="notification-time">2 hours ago</span>
                    </div>
                  </div>

                  <div className="notification-item unread">
                    <div className="notification-icon info">
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                        <path d="M9 0C4.03 0 0 4.03 0 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm1 13H8V8h2v5zm0-6H8V5h2v2z"/>
                      </svg>
                    </div>
                    <div className="notification-content">
                      <strong>System Maintenance</strong>
                      <p>Scheduled maintenance on Sunday 2AM-4AM</p>
                      <span className="notification-time">5 hours ago</span>
                    </div>
                  </div>

                  <div className="notification-item">
                    <div className="notification-icon warning">
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                        <path d="M9 0C4.03 0 0 4.03 0 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm1 13H8V8h2v5zm0-6H8V5h2v2z"/>
                      </svg>
                    </div>
                    <div className="notification-content">
                      <strong>Ticket Update</strong>
                      <p>Your support ticket #1234 has been resolved</p>
                      <span className="notification-time">1 day ago</span>
                    </div>
                  </div>
                </div>
                <div className="notifications-footer">
                  <button className="view-all-btn">View All Notifications</button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="profile-wrap">
          {currentUser ? (
            <>
              <button
                className="profile-btn"
                onClick={() => setIsProfileOpen((prev) => !prev)}
                aria-label="User profile"
              >
                <span className="profile-avatar">{avatar}</span>
                <span className="profile-meta">
                  <strong>{displayName}</strong>
                  <small>{displayRole}</small>
                </span>
                <span className="chevron">v</span>
              </button>

              {isProfileOpen && (
                <div className="profile-dropdown" role="menu">
                  {displayRole === "ADMIN" && (
                    <NavLink to="/admin/dashboard" onClick={() => setIsProfileOpen(false)}>
                      🔧 Admin Dashboard
                    </NavLink>
                  )}
                  <a
                    href="#customer-dashboard"
                    onClick={(event) => {
                      event.preventDefault();
                      goToCustomerDashboard();
                    }}
                  >
                    Customer Dashboard
                  </a>
                  <a href="#">Settings</a>
                  <button type="button" className="dropdown-action" onClick={handleSignOut}>
                    Sign out
                  </button>
                </div>
              )}
            </>
          ) : (
            <button
              className="auth-btn"
              onClick={() => {
                openAuthModal("login");
              }}
            >
              My Account Login
            </button>
          )}
        </div>
      </div>
    </header>

      {/* Modal outside header for proper z-index stacking */}
      {isLoginOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setIsLoginOpen(false)}>
          <div className="login-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              type="button"
              onClick={() => setIsLoginOpen(false)}
              aria-label="Close"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>

            <div className="modal-header-section">
              <div className="modal-icon">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <circle cx="16" cy="16" r="14" fill="url(#gradient1)" opacity="0.2"/>
                  <path d="M16 8C13.24 8 11 10.24 11 13C11 15.76 13.24 18 16 18C18.76 18 21 15.76 21 13C21 10.24 18.76 8 16 8ZM16 16C14.34 16 13 14.66 13 13C13 11.34 14.34 10 16 10C17.66 10 19 11.34 19 13C19 14.66 17.66 16 16 16ZM16 19C12.67 19 6 20.67 6 24V26H26V24C26 20.67 19.33 19 16 19ZM8 24C8.22 23.28 12.31 21 16 21C19.7 21 23.77 23.29 24 24H8Z" fill="url(#gradient1)"/>
                  <defs>
                    <linearGradient id="gradient1" x1="6" y1="8" x2="26" y2="26" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#3359ff"/>
                      <stop offset="1" stopColor="#7a54ff"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <h3 className="modal-title">{authMode === "login" ? "Welcome Back" : "Create Account"}</h3>
              <p className="modal-subtitle">
                {authMode === "login" 
                  ? "Sign in to access your Smart Campus account" 
                  : "Join Smart Campus Hub today"}
              </p>
            </div>

            <div className="auth-tabs">
              <button
                type="button"
                className={`auth-tab ${authMode === "login" ? "active" : ""}`}
                onClick={() => openAuthModal("login")}
              >
                <span>Sign In</span>
              </button>
              <button
                type="button"
                className={`auth-tab ${authMode === "register" ? "active" : ""}`}
                onClick={() => openAuthModal("register")}
              >
                <span>Sign Up</span>
              </button>
            </div>

            <form
              className="login-form"
              onSubmit={authMode === "login" ? handleLogin : handleRegister}
            >
              {authMode === "register" && (
                <div className="form-group">
                  <label htmlFor="fullName">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 8c1.66 0 3-1.34 3-3S9.66 2 8 2 5 3.34 5 5s1.34 3 3 3zm0 2c-2 0-6 1-6 3v1h12v-1c0-2-4-3-6-3z"/>
                    </svg>
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(event) => {
                      setFullName(event.target.value);
                      clearFieldError("fullName");
                    }}
                    placeholder="Enter your full name"
                    required
                    className={fieldErrors.fullName ? "error" : ""}
                  />
                  {fieldErrors.fullName && (
                    <p className="field-error">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                        <path d="M7 0C3.13 0 0 3.13 0 7s3.13 7 7 7 7-3.13 7-7-3.13-7-7-7zm1 10H6V6h2v4zm0-5H6V3h2v2z"/>
                      </svg>
                      {fieldErrors.fullName}
                    </p>
                  )}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="email">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M14 3H2c-.55 0-1 .45-1 1v8c0 .55.45 1 1 1h12c.55 0 1-.45 1-1V4c0-.55-.45-1-1-1zm0 2l-6 4-6-4V4l6 4 6-4v1z"/>
                  </svg>
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    clearFieldError("email");
                  }}
                  placeholder="you@example.com"
                  required
                  className={fieldErrors.email ? "error" : ""}
                />
                {fieldErrors.email && (
                  <p className="field-error">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                      <path d="M7 0C3.13 0 0 3.13 0 7s3.13 7 7 7 7-3.13 7-7-3.13-7-7-7zm1 10H6V6h2v4zm0-5H6V3h2v2z"/>
                    </svg>
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="password">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M12 7V5c0-2.21-1.79-4-4-4S4 2.79 4 5v2c-.55 0-1 .45-1 1v5c0 .55.45 1 1 1h8c.55 0 1-.45 1-1V8c0-.55-.45-1-1-1zM8 11c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm2-4H6V5c0-1.1.9-2 2-2s2 .9 2 2v2z"/>
                  </svg>
                  Password
                </label>
                <div className="password-input-wrapper">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      clearFieldError("password");
                      clearFieldError("confirmPassword");
                    }}
                    placeholder="Enter your password"
                    required
                    className={fieldErrors.password ? "error" : ""}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="field-error">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                      <path d="M7 0C3.13 0 0 3.13 0 7s3.13 7 7 7 7-3.13 7-7-3.13-7-7-7zm1 10H6V6h2v4zm0-5H6V3h2v2z"/>
                    </svg>
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              {authMode === "register" && (
                <>
                  <div className="password-strength-section">
                    <div className="password-strength-head">
                      <span>Password strength</span>
                      <strong className={`strength-${passwordStrengthLabel.toLowerCase()}`}>
                        {passwordStrengthLabel}
                      </strong>
                    </div>
                    <div className="password-meter" aria-hidden="true">
                      <span 
                        className={`strength-${passwordStrengthLabel.toLowerCase()}`}
                        style={{ width: `${(passedPasswordChecks / passwordChecks.length) * 100}%` }} 
                      />
                    </div>
                    <ul className="password-rules">
                      {passwordChecks.map((rule) => (
                        <li key={rule.id} className={rule.passed ? "passed" : ""}>
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                            {rule.passed ? (
                              <path d="M10.5 3L4.5 9L1.5 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                            ) : (
                              <circle cx="6" cy="6" r="2"/>
                            )}
                          </svg>
                          {rule.label}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="form-group">
                    <label htmlFor="confirmPassword">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M12 7V5c0-2.21-1.79-4-4-4S4 2.79 4 5v2c-.55 0-1 .45-1 1v5c0 .55.45 1 1 1h8c.55 0 1-.45 1-1V8c0-.55-.45-1-1-1zM8 11c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm2-4H6V5c0-1.1.9-2 2-2s2 .9 2 2v2z"/>
                      </svg>
                      Confirm Password
                    </label>
                    <div className="password-input-wrapper">
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(event) => {
                          setConfirmPassword(event.target.value);
                          clearFieldError("confirmPassword");
                        }}
                        placeholder="Re-enter your password"
                        required
                        className={fieldErrors.confirmPassword ? "error" : ""}
                      />
                      <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                            <line x1="1" y1="1" x2="23" y2="23"/>
                          </svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                        )}
                      </button>
                    </div>
                    {fieldErrors.confirmPassword && (
                      <p className="field-error">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                          <path d="M7 0C3.13 0 0 3.13 0 7s3.13 7 7 7 7-3.13 7-7-3.13-7-7-7zm1 10H6V6h2v4zm0-5H6V3h2v2z"/>
                        </svg>
                        {fieldErrors.confirmPassword}
                      </p>
                    )}
                  </div>

                  <label className="terms-check">
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(event) => {
                        setAgreeTerms(event.target.checked);
                        clearFieldError("agreeTerms");
                      }}
                    />
                    <span>I agree to the <a href="#terms">Terms of Service</a> and <a href="#privacy">Privacy Policy</a></span>
                  </label>
                  {fieldErrors.agreeTerms && (
                    <p className="field-error">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                        <path d="M7 0C3.13 0 0 3.13 0 7s3.13 7 7 7 7-3.13 7-7-3.13-7-7-7zm1 10H6V6h2v4zm0-5H6V3h2v2z"/>
                      </svg>
                      {fieldErrors.agreeTerms}
                    </p>
                  )}
                </>
              )}

              {successMessage && (
                <div className="alert alert-success">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                    <path d="M9 0C4.03 0 0 4.03 0 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm4.3 6.7l-5 5c-.2.2-.5.2-.7 0l-2-2c-.2-.2-.2-.5 0-.7s.5-.2.7 0l1.6 1.6 4.6-4.6c.2-.2.5-.2.7 0s.2.5.1.7z"/>
                  </svg>
                  {successMessage}
                </div>
              )}
              {errorMessage && (
                <div className="alert alert-error">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                    <path d="M9 0C4.03 0 0 4.03 0 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm1 13H8V8h2v5zm0-6H8V5h2v2z"/>
                  </svg>
                  {errorMessage}
                </div>
              )}

              <button className="btn btn-primary auth-primary-btn" type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <svg className="spinner" width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="32" strokeDashoffset="32">
                        <animateTransform attributeName="transform" type="rotate" from="0 9 9" to="360 9 9" dur="1s" repeatCount="indefinite"/>
                      </circle>
                    </svg>
                    {authMode === "login" ? "Signing in..." : "Creating account..."}
                  </>
                ) : (
                  <>
                    {authMode === "login" ? "Sign in to Account" : "Create Account"}
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 0L6.59 1.41 12.17 7H0v2h12.17l-5.58 5.59L8 16l8-8z"/>
                    </svg>
                  </>
                )}
              </button>

              {authMode === "login" && (
                <>
                  <div className="oauth-divider" aria-hidden="true">
                    <span>or continue with</span>
                  </div>
                  <button className="btn btn-google auth-google-btn" type="button" onClick={handleGoogleLogin}>
                    <span className="google-mark" aria-hidden="true">
                      <svg className="google-mark-svg" viewBox="0 0 18 18" role="img" aria-hidden="true">
                        <path
                          fill="#4285F4"
                          d="M17.64 9.2045c0-.638-.0573-1.2518-.1636-1.8409H9v3.4818h4.8436c-.2086 1.125-.8427 2.0782-1.7968 2.715v2.2582h2.9086c1.7023-1.5668 2.6846-3.8741 2.6846-6.6141z"
                        />
                        <path
                          fill="#34A853"
                          d="M9 18c2.43 0 4.4673-.8059 5.9564-2.1818l-2.9086-2.2582c-.8059.54-1.8368.8591-3.0478.8591-2.3441 0-4.3282-1.5827-5.0364-3.7091H.9573v2.3327C2.4382 15.9832 5.4818 18 9 18z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M3.9636 10.7091c-.18-.54-.2836-1.1168-.2836-1.7091s.1036-1.1691.2836-1.7091V4.9582H.9573C.3477 6.1732 0 7.5482 0 9s.3477 2.8268.9573 4.0418l3.0063-2.3327z"
                        />
                        <path
                          fill="#EA4335"
                          d="M9 3.5809c1.3214 0 2.5078.4541 3.4405 1.345L15.0218 2.344C13.4636.8923 11.4264 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582l3.0063 2.3327C4.6718 5.1636 6.6559 3.5809 9 3.5809z"
                        />
                      </svg>
                    </span>
                    <span>Google</span>
                  </button>
                </>
              )}

              <div className="auth-footer">
                {authMode === "login" ? (
                  <p>
                    Don't have an account?{" "}
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => openAuthModal("register")}
                    >
                      Sign up for free
                    </button>
                  </p>
                ) : (
                  <p>
                    Already have an account?{" "}
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => openAuthModal("login")}
                    >
                      Sign in
                    </button>
                  </p>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
