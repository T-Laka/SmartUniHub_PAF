// Member 2 – Booking Management API store

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8081";
const BOOKINGS_URL = `${API_BASE}/api/bookings`;

async function parseError(response) {
  try {
    const body = await response.json();
    if (body?.message) return body.message;
  } catch (_) { /* ignore */ }
  return `Request failed with status ${response.status}`;
}

async function request(path = "", options = {}) {
  const response = await fetch(`${BOOKINGS_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  if (!response.ok) throw new Error(await parseError(response));
  if (response.status === 204) return null;
  return response.json();
}

function normalizeBooking(b) {
  return {
    id: b?.id ?? 0,
    userEmail: b?.userEmail ?? "",
    userName: b?.userName ?? "",
    facilityId: b?.facilityId ?? null,
    facilityName: b?.facilityName ?? "",
    startTime: b?.startTime ?? null,
    endTime: b?.endTime ?? null,
    purpose: b?.purpose ?? "",
    expectedAttendees: b?.expectedAttendees ?? 1,
    status: b?.status ?? "PENDING",
    adminReason: b?.adminReason ?? "",
    adminComment: b?.adminComment ?? "",
    qrCode: b?.qrCode ?? "",
    createdAt: b?.createdAt ?? null,
    updatedAt: b?.updatedAt ?? null,
  };
}

// Create a booking request
export async function createBooking(payload) {
  const data = await request("", { method: "POST", body: JSON.stringify(payload) });
  return normalizeBooking(data);
}

// Get bookings for a specific user
export async function getMyBookings(userEmail) {
  const params = new URLSearchParams({ userEmail });
  const data = await request(`?${params}`, { method: "GET" });
  return Array.isArray(data) ? data.map(normalizeBooking) : [];
}

// Admin: get all bookings, optionally filtered by status
export async function getAllBookings(status = "") {
  const params = status ? new URLSearchParams({ status }) : "";
  const data = await request(params ? `?${params}` : "", { method: "GET" });
  return Array.isArray(data) ? data.map(normalizeBooking) : [];
}

// Get single booking
export async function getBookingById(id) {
  const data = await request(`/${id}`, { method: "GET" });
  return normalizeBooking(data);
}

// Admin: approve or reject
export async function processBooking(id, action, reason = "") {
  const data = await request(`/${id}/action`, {
    method: "PATCH",
    body: JSON.stringify({ action, reason }),
  });
  return normalizeBooking(data);
}

// User: cancel own booking
export async function cancelBooking(id, userEmail) {
  const params = new URLSearchParams({ userEmail });
  const data = await request(`/${id}/cancel?${params}`, { method: "PATCH" });
  return normalizeBooking(data);
}

// Admin: hard delete
export async function deleteBooking(id) {
  await request(`/${id}`, { method: "DELETE" });
}

// Get booked slots for a facility on a specific date (for timeline visualizer)
export async function getTimelineForDay(facilityId, date) {
  const params = new URLSearchParams({ facilityId, date });
  const data = await request(`/timeline?${params}`, { method: "GET" });
  return Array.isArray(data) ? data.map(normalizeBooking) : [];
}
