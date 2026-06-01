import { useEffect, useRef, useState } from "react";
import "../../styles/tickets.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8081";
const MAX_ATTACHMENT_FILES = 5;
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
]);
const ALLOWED_IMAGE_FILE_PATTERN = /\.(jpe?g|png|gif|webp|bmp)$/i;

function toLabel(value) {
  return String(value || "")
    .toLowerCase()
    .split("_")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : ""))
    .join(" ");
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString();
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function isAllowedImageFile(file) {
  if (!file) {
    return false;
  }

  const normalizedType = String(file.type || "").toLowerCase();
  return ALLOWED_IMAGE_MIME_TYPES.has(normalizedType) || ALLOWED_IMAGE_FILE_PATTERN.test(file.name || "");
}

function buildAttachmentDataUrl(attachment) {
  if (!attachment?.dataBase64) {
    return "#";
  }

  const contentType = attachment.contentType || "application/octet-stream";
  return `data:${contentType};base64,${attachment.dataBase64}`;
}

function isAdminAttachment(attachment) {
  const normalizedSource = String(attachment?.uploadedBy || "").trim().toUpperCase();
  return normalizedSource === "UPLOADED_BY_ADMIN" || normalizedSource === "ADMIN";
}

async function parseErrorMessage(response) {
  try {
    const payload = await response.json();
    if (payload && typeof payload.message === "string" && payload.message.trim().length > 0) {
      return payload.message;
    }
  } catch (error) {
    // Ignore parse errors and use fallback.
  }

  return `Request failed with status ${response.status}`;
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const commaIndex = result.indexOf(",");
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function normalizeTicket(ticket) {
  return {
    id: Number(ticket?.id) || 0,
    reporterName: ticket?.reporterName || "",
    reporterEmail: ticket?.reporterEmail || "",
    registerNumber: ticket?.registerNumber || "",
    faculty: ticket?.faculty || "",
    contactNumber: ticket?.contactNumber || "",
    title: ticket?.title || "",
    category: ticket?.category || "OTHER",
    priority: ticket?.priority || "MEDIUM",
    courseCode: ticket?.courseCode || "",
    year: ticket?.year || "",
    semester: ticket?.semester || "",
    description: ticket?.description || "",
    status: ticket?.status || "PENDING",
    createdAt: ticket?.createdAt || null,
    updatedAt: ticket?.updatedAt || null,
    adminComment: ticket?.adminComment || "",
    attachments: Array.isArray(ticket?.attachments)
      ? ticket.attachments.map((attachment) => ({
          fileName: attachment?.fileName || "attachment",
          contentType: attachment?.contentType || "application/octet-stream",
          sizeInBytes: Number(attachment?.sizeInBytes) || 0,
          dataBase64: attachment?.dataBase64 || "",
          uploadedBy: attachment?.uploadedBy || "UPLOADED_BY_STUDENT",
        }))
      : [],
  };
}

async function getAdminTickets({ status = "ALL", registerNumber = "" } = {}) {
  const params = new URLSearchParams();

  if (status && status !== "ALL") {
    params.set("status", status);
  }

  if (registerNumber.trim()) {
    params.set("registerNumber", registerNumber.trim().toUpperCase());
  }

  const query = params.toString();
  const payload = await request(`/api/tickets${query ? `?${query}` : ""}`, { method: "GET" });

  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.map(normalizeTicket);
}

async function openTicket(ticketId) {
  return request(`/api/tickets/${ticketId}/status?status=IN_PROGRESS`, {
    method: "PATCH",
  });
}

async function closeTicket(ticketId) {
  return request(`/api/tickets/${ticketId}/status?status=CLOSED`, {
    method: "PATCH",
  });
}

async function respondToTicket(ticketId, payload) {
  return request(`/api/tickets/${ticketId}/comment`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export default function AdminTickets() {
  const fileInputRef = useRef(null);
  const [tickets, setTickets] = useState([]);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [registerNumberFilter, setRegisterNumberFilter] = useState("");
  const [responseMessage, setResponseMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedTicket = tickets.find((ticket) => ticket.id === selectedTicketId) || null;
  const studentAttachments = selectedTicket?.attachments?.filter((attachment) => !isAdminAttachment(attachment)) || [];
  const adminAttachments = selectedTicket?.attachments?.filter((attachment) => isAdminAttachment(attachment)) || [];

  useEffect(() => {
    if (!selectedTicketId) {
      setResponseMessage("");
      resetAttachmentInput();
      return;
    }

    const latestSelected = tickets.find((ticket) => ticket.id === selectedTicketId);
    if (latestSelected) {
      setResponseMessage(latestSelected.adminComment || "");
      return;
    }

    setSelectedTicketId(null);
    setResponseMessage("");
    resetAttachmentInput();
  }, [tickets, selectedTicketId]);

  async function loadTickets() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const data = await getAdminTickets({
        registerNumber: registerNumberFilter,
      });

      const filteredTickets = data.filter((ticket) =>
        showHistory
          ? ticket.status === "RESOLVED"
          : ticket.status !== "RESOLVED" && ticket.status !== "CLOSED"
      );

      setTickets(filteredTickets);
    } catch (error) {
      setErrorMessage(error.message || "Failed to load tickets");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadTickets();
  }, [showHistory]);

  function resetAttachmentInput() {
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleSelectTicket(ticket) {
    setSelectedTicketId(ticket.id);
    setResponseMessage(ticket.adminComment || "");
    resetAttachmentInput();
    setSuccessMessage("");
    setErrorMessage("");
  }

  async function handleOpenTicketFromList(ticket) {
    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (!showHistory && ticket.status === "PENDING") {
        await openTicket(ticket.id);
        setSuccessMessage("Ticket opened. Student now sees In Progress.");
        const refreshedTickets = await getAdminTickets({
          registerNumber: registerNumberFilter,
        });
        const filteredTickets = refreshedTickets.filter((item) =>
          showHistory
            ? item.status === "RESOLVED"
            : item.status !== "RESOLVED" && item.status !== "CLOSED"
        );
        setTickets(filteredTickets);
        const latestTicket = filteredTickets.find((item) => item.id === ticket.id) || null;
        if (latestTicket) {
          handleSelectTicket(latestTicket);
        } else {
          setSelectedTicketId(null);
        }
        return;
      }

      handleSelectTicket(ticket);
    } catch (error) {
      setErrorMessage(error.message || "Failed to open ticket");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleAttachmentsChange(event) {
    const files = Array.from(event.target.files || []);
    setErrorMessage("");

    if (files.length > MAX_ATTACHMENT_FILES) {
      resetAttachmentInput();
      setErrorMessage(`You can attach up to ${MAX_ATTACHMENT_FILES} files.`);
      return;
    }

    const invalidFile = files.find((file) => file.size > MAX_ATTACHMENT_BYTES);
    if (invalidFile) {
      resetAttachmentInput();
      setErrorMessage(`Each file must be 5 MB or smaller. Invalid file: ${invalidFile.name}`);
      return;
    }

    const invalidImageFile = files.find((file) => !isAllowedImageFile(file));
    if (invalidImageFile) {
      resetAttachmentInput();
      setErrorMessage(`Only image files are allowed. Invalid file: ${invalidImageFile.name}`);
      return;
    }

    setSelectedFiles(files);
  }

  async function handleSearch(event) {
    event.preventDefault();
    await loadTickets();
  }

  async function handleRespondTicket() {
    if (!selectedTicket) {
      return;
    }

    if (!responseMessage.trim() && selectedFiles.length === 0) {
      setErrorMessage("Please enter a response message or attach at least one file.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const attachments = await Promise.all(
        selectedFiles.map(async (file) => ({
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
          sizeInBytes: file.size,
          dataBase64: await readFileAsBase64(file),
          uploadedBy: "UPLOADED_BY_ADMIN",
        }))
      );

      await respondToTicket(selectedTicket.id, {
        comment: responseMessage.trim(),
        attachments,
      });

      resetAttachmentInput();
      setSuccessMessage("Response sent. Ticket moved to Resolved.");
      await loadTickets();
    } catch (error) {
      setErrorMessage(error.message || "Failed to respond to ticket");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCloseTicket() {
    if (!selectedTicket) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await closeTicket(selectedTicket.id);
      setSuccessMessage("Ticket closed. The student can now delete it from My Tickets.");
      await loadTickets();
      setSelectedTicketId(null);
    } catch (error) {
      setErrorMessage(error.message || "Failed to close ticket");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="admin-ticket-page">
      <section className="admin-ticket-layout">
        <article className="admin-ticket-list-card">
          <div className="admin-ticket-list-head">
            <h3>{showHistory ? "Ticket History" : "Tickets"}</h3>
            <div className="admin-ticket-list-head-actions">
              <button
                type="button"
                className="admin-ticket-btn secondary"
                onClick={() => {
                  setShowHistory((currentValue) => !currentValue);
                  setSuccessMessage("");
                  setErrorMessage("");
                }}
              >
                {showHistory ? "Active Tickets" : "Ticket History"}
              </button>
              <button type="button" className="admin-ticket-btn secondary" onClick={loadTickets}>
                Refresh
              </button>
            </div>
          </div>

          <form className="admin-ticket-filter-form" onSubmit={handleSearch}>
            <div>
              <label htmlFor="adminRegFilter">Student Register No</label>
              <input
                id="adminRegFilter"
                type="text"
                value={registerNumberFilter}
                onChange={(event) => setRegisterNumberFilter(event.target.value.toUpperCase())}
                placeholder="IT23986587"
              />
            </div>

            <button type="submit" className="admin-ticket-btn">Search</button>
          </form>

          {isLoading && <p className="admin-ticket-note">Loading tickets...</p>}
          {!isLoading && tickets.length === 0 && (
            <p className="admin-ticket-note">
              {showHistory ? "No resolved tickets waiting to be closed." : "No active tickets found."}
            </p>
          )}

          <div className="admin-ticket-list">
            {tickets.map((ticket) => {
              const isSelected = selectedTicketId === ticket.id;
              return (
                <article
                  key={ticket.id}
                  className={isSelected ? "admin-ticket-item selected" : "admin-ticket-item"}
                >
                  <div className="admin-ticket-item-main">
                    <strong>{ticket.title}</strong>
                    <p>{ticket.registerNumber}</p>
                  </div>
                  <div className="admin-ticket-item-actions">
                    <span className={`admin-ticket-badge status-${String(ticket.status || "").toLowerCase()}`}>
                      {toLabel(ticket.status)}
                    </span>
                    <button
                      type="button"
                      className="admin-ticket-btn"
                      disabled={isSubmitting}
                      onClick={() => handleOpenTicketFromList(ticket)}
                    >
                      {showHistory ? "View Ticket" : "Open Ticket"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </article>

        <article className="admin-ticket-detail-card">
          {!selectedTicket && <p className="admin-ticket-note">Open a ticket from the list to view and manage its details.</p>}

          {selectedTicket && (
            <>
              <div className="admin-ticket-detail-head">
                <h3>{selectedTicket.title}</h3>
              </div>

              <div className="admin-ticket-detail-grid">
                <p><strong>Student:</strong> {selectedTicket.reporterName}</p>
                <p><strong>Email:</strong> {selectedTicket.reporterEmail}</p>
                <p><strong>Register No:</strong> {selectedTicket.registerNumber}</p>
                <p><strong>Faculty:</strong> {toLabel(selectedTicket.faculty)}</p>
                <p><strong>Contact:</strong> {selectedTicket.contactNumber}</p>
                <p><strong>Category:</strong> {toLabel(selectedTicket.category)}</p>
                <p><strong>Priority:</strong> {toLabel(selectedTicket.priority)}</p>
                <p><strong>Course Code:</strong> {selectedTicket.courseCode || "-"}</p>
                <p><strong>Year:</strong> {selectedTicket.year || "-"}</p>
                <p><strong>Semester:</strong> {selectedTicket.semester || "-"}</p>
                <p><strong>Created:</strong> {formatDateTime(selectedTicket.createdAt)}</p>
              </div>
              <p className="admin-ticket-block"><strong>Description:</strong> {selectedTicket.description}</p>

              {studentAttachments.length > 0 && (
                <div className="ticket-attachments">
                  <strong>Student Attachments:</strong>
                  <ul>
                    {studentAttachments.map((attachment, index) => (
                      <li key={`${selectedTicket.id}-${attachment.fileName}-${index}`}>
                        <a
                          href={buildAttachmentDataUrl(attachment)}
                          download={attachment.fileName}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {attachment.fileName}
                        </a>
                        <span>{formatBytes(attachment.sizeInBytes)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <label htmlFor="adminResponse">Admin Response Message</label>
              <textarea
                id="adminResponse"
                value={responseMessage}
                onChange={(event) => setResponseMessage(event.target.value)}
                placeholder="Type your response to the student"
                rows={4}
                disabled={showHistory}
              />

              {adminAttachments.length > 0 && (
                <div className="ticket-admin-attachments">
                  <strong>Admin Attachments:</strong>
                  <ul>
                    {adminAttachments.map((attachment, index) => (
                      <li key={`${selectedTicket.id}-admin-${attachment.fileName}-${index}`}>
                        <a
                          href={buildAttachmentDataUrl(attachment)}
                          download={attachment.fileName}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {attachment.fileName}
                        </a>
                        <span>{formatBytes(attachment.sizeInBytes)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="admin-ticket-attachment-field">
                <label htmlFor="adminAttachments">Attachments for Student</label>
                <input
                  id="adminAttachments"
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleAttachmentsChange}
                  accept=".jpg,.jpeg,.png,.gif,.webp,.bmp,image/jpeg,image/png,image/gif,image/webp,image/bmp"
                  disabled={showHistory || isSubmitting || selectedTicket.status !== "IN_PROGRESS"}
                />
                <p className="ticket-helper-text">Up to 5 image files, each max 5 MB.</p>
                {selectedFiles.length > 0 && (
                  <div className="ticket-selected-files">
                    {selectedFiles.map((file) => (
                      <span key={`${file.name}-${file.size}`} className="ticket-file-chip">
                        {file.name} ({formatBytes(file.size)})
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="admin-ticket-actions">
                <button
                  type="button"
                  className="admin-ticket-btn"
                  disabled={showHistory || isSubmitting || selectedTicket.status !== "IN_PROGRESS"}
                  onClick={handleRespondTicket}
                >
                  Respond & Resolve
                </button>
                <button
                  type="button"
                  className="admin-ticket-btn secondary"
                  disabled={!showHistory || isSubmitting || selectedTicket.status !== "RESOLVED"}
                  onClick={handleCloseTicket}
                >
                  Close Ticket
                </button>
              </div>
            </>
          )}

          {successMessage && <p className="ticket-message ticket-success">{successMessage}</p>}
          {errorMessage && <p className="ticket-message ticket-error">{errorMessage}</p>}
        </article>
      </section>
    </div>
  );
}
