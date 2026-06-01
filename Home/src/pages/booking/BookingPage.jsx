// Member 2 – User Booking Page
import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import BookingForm from "../../components/booking/BookingForm";
import BookingList from "../../components/booking/BookingList";
import "../../styles/booking/bookingPage.css";

const AUTH_KEY = "sch.currentUser";

function getStoredUser() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function BookingPage() {
  const [activeTab, setActiveTab] = useState("request");
  const [user, setUser] = useState(null);

  // Read logged-in user from localStorage (same key Navbar uses)
  useEffect(() => {
    setUser(getStoredUser());

    function onAuthChange() { setUser(getStoredUser()); }

    // same-tab sign-out/sign-in (custom event from Navbar)
    window.addEventListener("sch:authchange", onAuthChange);
    // cross-tab
    window.addEventListener("storage", onAuthChange);
    return () => {
      window.removeEventListener("sch:authchange", onAuthChange);
      window.removeEventListener("storage", onAuthChange);
    };
  }, []);

  function handleSuccess() {
    setActiveTab("my-bookings");
  }

  return (
    <div className="booking-page">
      <Navbar />

      <main className="booking-page__main">
        <div className="booking-page__container">
          <h1 className="booking-page__heading">Facility Bookings</h1>

          <nav className="booking-page__tabs" aria-label="Booking tabs">
            <button
              className={`booking-tab ${activeTab === "request" ? "booking-tab--active" : ""}`}
              onClick={() => setActiveTab("request")}
            >
              Request Booking
            </button>
            <button
              className={`booking-tab ${activeTab === "my-bookings" ? "booking-tab--active" : ""}`}
              onClick={() => setActiveTab("my-bookings")}
            >
              My Bookings
            </button>
          </nav>

          {activeTab === "request" && (
            <BookingForm
              prefillEmail={user?.email ?? ""}
              prefillName={user?.fullName ?? ""}
              onSuccess={handleSuccess}
            />
          )}

          {activeTab === "my-bookings" && (
            <section className="booking-page__my">
              {user?.email ? (
                <>
                  <p className="booking-page__viewing">
                    Showing bookings for: <strong>{user.email}</strong>
                  </p>
                  <BookingList userEmail={user.email} />
                </>
              ) : (
                <p className="booking-page__no-user">
                  Please log in to view your bookings.
                </p>
              )}
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
