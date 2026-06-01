import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import FacilitiesPage from "./pages/FacilitiesPage";
import ViewFacilities from "./pages/ViewFacilities";
import AdminSidebarLayout from "./components/AdminSidebarLayout";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import ManageFacilities from "./pages/Admin/ManageFacilities";
import AdminBookings from "./pages/Admin/AdminBookings";
import AdminTickets from "./pages/Admin/AdminTickets";
import AdminNotifications from "./pages/Admin/AdminNotifications";
import ManageUsers from "./pages/Admin/ManageUsers";
import FacilityDetails from "./pages/FacilityDetails";
import BookingPage from "./pages/BookingPage";
import TicketsPage from "./pages/TicketsPage";
import "./styles/home.css";

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/facilities" element={<FacilitiesPage />} />
        <Route path="/view-facilities" element={<ViewFacilities />} />

        <Route path="/admin" element={<AdminSidebarLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="facilities" element={<ManageFacilities />} />
          <Route path="manage-facilities" element={<Navigate to="../facilities" replace />} />
          <Route path="bookings" element={<AdminBookings />} />
          <Route path="tickets" element={<AdminTickets />} />
          <Route path="notifications" element={<AdminNotifications />} />
          <Route path="users" element={<ManageUsers />} />
        </Route>

        <Route path="/facilities/view" element={<Navigate to="/view-facilities" replace />} />
        <Route path="/facility-details/:id" element={<FacilityDetails />} />
        <Route path="/facility-details" element={<Navigate to="/view-facilities" replace />} />
        <Route path="/booking" element={<BookingPage />} />
        <Route path="/tickets" element={<TicketsPage view="create" />} />
        <Route path="/tickets/my" element={<TicketsPage view="list" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
