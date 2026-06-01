import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { createTicket, deleteTicket, getTickets, updateTicket } from "../data/ticketStore";
import "../styles/tickets.css";

const AUTH_STORAGE_KEY = "sch.currentUser";

const CATEGORY_OPTIONS = [
  { value: "REGISTRATION", label: "Registration" },
  { value: "EXAM", label: "Exam" },
  { value: "RESULTS", label: "Results" },
  { value: "ATTENDANCE", label: "Attendance" },
  { value: "COURSE_CONTENT", label: "Course Content" },
  { value: "ASSIGNMENT", label: "Assignment" },
  { value: "FEE", label: "Fee" },
  { value: "OTHER", label: "Other" },
];

const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

const FACULTY_OPTIONS = [
  { value: "FACULTY_OF_COMPUTING", label: "Faculty of Computing" },
  { value: "FACULTY_OF_BUSINESS", label: "Faculty of Business" },
  { value: "FACULTY_OF_ARCHITECTURE", label: "Faculty of Architecture" },
  { value: "FACULTY_OF_ENGINEERING", label: "Faculty of Engineering" },
  { value: "FACULTY_OF_HUMANITIES_AND_SCIENCES", label: "Faculty of Humanities & Sciences" },
];

const STATUS_FILTER_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
];

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
const REGISTER_NUMBER_REGEX = /^IT\d{8}$/;
const CONTACT_NUMBER_REGEX = /^\d{10}$/;
const COURSE_CODE_REGEX = /^IT\d{4}$/;

const DEFAULT_FORM = {
  reporterName: "",
  reporterEmail: "",
  registerNumber: "",
  faculty: "FACULTY_OF_COMPUTING",
  contactNumber: "",
  title: "",
  category: "REGISTRATION",
  priority: "MEDIUM",
  courseCode: "",
  year: "1",
  semester: "1",
  description: "",
};

const YEAR_OPTIONS = [
  { value: "1", label: "Year 1" },
  { value: "2", label: "Year 2" },
  { value: "3", label: "Year 3" },
  { value: "4", label: "Year 4" },
];

const SEMESTER_OPTIONS = [
  { value: "1", label: "Semester 1" },
  { value: "2", label: "Semester 2" },
];

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

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const base64Data = result.includes(",") ? result.split(",")[1] : "";

      if (!base64Data) {
        reject(new Error(`Failed to process ${file.name}`));
        return;
      }

      resolve(base64Data);
    };

    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function buildAttachmentDataUrl(attachment) {
  if (!attachment?.dataBase64) {
    return "#";
  }

  const contentType = attachment.contentType || "application/octet-stream";
  return `data:${contentType};base64,${attachment.dataBase64}`;
}

function splitAttachmentsByOwner(attachments = []) {
  const studentAttachments = [];
  const adminAttachments = [];

  attachments.forEach((attachment) => {
    if (String(attachment?.uploadedBy || "").toUpperCase() === "UPLOADED_BY_ADMIN") {
      adminAttachments.push(attachment);
    } else {
      studentAttachments.push(attachment);
    }
  });

  return { studentAttachments, adminAttachments };
}

export default function TicketsPage({ view = "create" }) {
  const navigate = useNavigate();
  const [loggedUser, setLoggedUser] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [editingTicketId, setEditingTicketId] = useState(null);
  const [editForm, setEditForm] = useState(DEFAULT_FORM);
  const [editSelectedFiles, setEditSelectedFiles] = useState([]);
  const [attachmentsToDelete, setAttachmentsToDelete] = useState([]);
  const fileInputRef = useRef(null);
  const editFileInputRef = useRef(null);
  const isListView = view === "list";

  const hasEmail = form.reporterEmail.trim().length > 0;
  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedTicketId) || null,
    [tickets, selectedTicketId]
  );

  useEffect(() => {
    try {
      const persistedUser = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!persistedUser) {
        return;
      }

      const user = JSON.parse(persistedUser);
      const nextName = typeof user?.fullName === "string" ? user.fullName : "";
      const nextEmail = typeof user?.email === "string" ? user.email : "";
      const nextRegisterNumber = typeof user?.registerNumber === "string" ? user.registerNumber : "";
      const nextFaculty = typeof user?.faculty === "string" ? user.faculty : "";
      const nextContactNumber = typeof user?.contactNumber === "string" ? user.contactNumber : "";

      setLoggedUser(user);

      setForm((prev) => ({
        ...prev,
        reporterName: nextName || prev.reporterName,
        reporterEmail: nextEmail || prev.reporterEmail,
        registerNumber: nextRegisterNumber || prev.registerNumber,
        faculty: nextFaculty || prev.faculty,
        contactNumber: nextContactNumber || prev.contactNumber,
      }));
    } catch (error) {
      // Ignore local storage parsing errors.
    }
  }, []);

  useEffect(() => {
    if (!isListView) {
      return;
    }

    if (!hasEmail) {
      setTickets([]);
      return;
    }

    loadTickets();
  }, [statusFilter, hasEmail, isListView]);

  useEffect(() => {
    if (!isListView) {
      return;
    }

    if (tickets.length === 0) {
      setSelectedTicketId(null);
      return;
    }

    setSelectedTicketId((currentId) => (
      tickets.some((ticket) => ticket.id === currentId) ? currentId : null
    ));
  }, [tickets, isListView]);

  useEffect(() => {
    if (!isListView) {
      return;
    }

    if (!editingTicketId) {
      return;
    }

    const editingTicket = tickets.find((ticket) => ticket.id === editingTicketId);
    if (!editingTicket) {
      setEditingTicketId(null);
      setEditForm(DEFAULT_FORM);
      return;
    }

    if (editingTicket.status !== "PENDING") {
      setEditingTicketId(null);
      setEditForm(DEFAULT_FORM);
    }
  }, [tickets, editingTicketId, isListView]);

  async function loadTickets() {
    if (!form.reporterEmail.trim()) {
      setTickets([]);
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const items = await getTickets({
        reporterEmail: form.reporterEmail,
        status: statusFilter,
      });
      setTickets(items);
    } catch (error) {
      setErrorMessage(error.message || "Failed to load your tickets");
    } finally {
      setIsLoading(false);
    }
  }

  function handleFieldChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleEditFieldChange(field, value) {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleAttachmentsChange(event) {
    const files = Array.from(event.target.files || []);
    setErrorMessage("");

    if (files.length > MAX_ATTACHMENT_FILES) {
      setSelectedFiles([]);
      setErrorMessage(`You can attach up to ${MAX_ATTACHMENT_FILES} files.`);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    const invalidFile = files.find((file) => file.size > MAX_ATTACHMENT_BYTES);
    if (invalidFile) {
      setSelectedFiles([]);
      setErrorMessage(`Each file must be 5 MB or smaller. Invalid file: ${invalidFile.name}`);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    const invalidImageFile = files.find((file) => !isAllowedImageFile(file));
    if (invalidImageFile) {
      setSelectedFiles([]);
      setErrorMessage(`Only image files are allowed. Invalid file: ${invalidImageFile.name}`);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setSelectedFiles(files);
  }

  function handleEditAttachmentsChange(event, existingAttachmentCount = 0) {
    const files = Array.from(event.target.files || []);
    setErrorMessage("");

    if (files.length + existingAttachmentCount > MAX_ATTACHMENT_FILES) {
      setEditSelectedFiles([]);
      setErrorMessage(`You can attach up to ${MAX_ATTACHMENT_FILES} files.`);
      if (editFileInputRef.current) {
        editFileInputRef.current.value = "";
      }
      return;
    }

    const invalidFile = files.find((file) => file.size > MAX_ATTACHMENT_BYTES);
    if (invalidFile) {
      setEditSelectedFiles([]);
      setErrorMessage(`Each file must be 5 MB or smaller. Invalid file: ${invalidFile.name}`);
      if (editFileInputRef.current) {
        editFileInputRef.current.value = "";
      }
      return;
    }

    const invalidImageFile = files.find((file) => !isAllowedImageFile(file));
    if (invalidImageFile) {
      setEditSelectedFiles([]);
      setErrorMessage(`Only image files are allowed. Invalid file: ${invalidImageFile.name}`);
      if (editFileInputRef.current) {
        editFileInputRef.current.value = "";
      }
      return;
    }

    setEditSelectedFiles(files);
  }

  function handleDeleteAttachment(attachmentFileName) {
    setAttachmentsToDelete((prev) => [...prev, attachmentFileName]);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!loggedUser || !form.reporterName.trim() || !form.reporterEmail.trim()) {
      setErrorMessage("Please login first. Name and email are taken from your account.");
      return;
    }

    if (!REGISTER_NUMBER_REGEX.test(form.registerNumber.trim().toUpperCase())) {
      setErrorMessage("Register number must follow IT######## format. Example: IT23986587.");
      return;
    }

    if (!CONTACT_NUMBER_REGEX.test(form.contactNumber.trim())) {
      setErrorMessage("Contact number must contain exactly 10 digits.");
      return;
    }

    if (!COURSE_CODE_REGEX.test(form.courseCode.trim().toUpperCase())) {
      setErrorMessage("Course code must follow IT#### format. Example: IT3030.");
      return;
    }

    setIsSubmitting(true);

    try {
      const attachments = await Promise.all(
        selectedFiles.map(async (file) => ({
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
          sizeInBytes: file.size,
          dataBase64: await readFileAsBase64(file),
          uploadedBy: "UPLOADED_BY_STUDENT",
        }))
      );

      await createTicket({
        reporterName: form.reporterName,
        reporterEmail: form.reporterEmail,
        registerNumber: form.registerNumber.trim().toUpperCase(),
        faculty: form.faculty,
        contactNumber: form.contactNumber.trim(),
        title: form.title,
        category: form.category,
        priority: form.priority,
        courseCode: form.courseCode.trim().toUpperCase(),
        year: form.year,
        semester: form.semester,
        description: form.description,
        attachments,
      });

      setSuccessMessage("Ticket raised successfully.");
      setForm((prev) => ({
        ...prev,
        title: "",
        category: "REGISTRATION",
        priority: "MEDIUM",
        courseCode: "",
        year: "1",
        semester: "1",
        description: "",
      }));
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

    } catch (error) {
      setErrorMessage(error.message || "Failed to raise ticket");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteTicket(ticketId) {
    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await deleteTicket(ticketId);

      setTickets((currentTickets) => currentTickets.filter((ticket) => ticket.id !== ticketId));

      setSuccessMessage("Ticket deleted successfully.");

      if (selectedTicketId === ticketId) {
        setSelectedTicketId(null);
      }

      const refreshedTickets = await getTickets({
        reporterEmail: form.reporterEmail,
        status: statusFilter,
      });
      setTickets(refreshedTickets);
    } catch (error) {
      setErrorMessage(error.message || "Failed to delete ticket");
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEditingTicket(ticket) {
    setErrorMessage("");
    setSuccessMessage("");
    setEditingTicketId(ticket.id);
    setEditSelectedFiles([]);
    setAttachmentsToDelete([]);
    if (editFileInputRef.current) {
      editFileInputRef.current.value = "";
    }
    setEditForm({
      reporterName: ticket.reporterName || "",
      reporterEmail: ticket.reporterEmail || "",
      registerNumber: ticket.registerNumber || "",
      faculty: ticket.faculty || "FACULTY_OF_COMPUTING",
      contactNumber: ticket.contactNumber || "",
      title: ticket.title || "",
      category: ticket.category || "REGISTRATION",
      priority: ticket.priority || "MEDIUM",
      courseCode: ticket.courseCode || "",
      year: ticket.year || "1",
      semester: ticket.semester || "1",
      description: ticket.description || "",
    });
  }

  function cancelEditingTicket() {
    setEditingTicketId(null);
    setEditForm(DEFAULT_FORM);
    setEditSelectedFiles([]);
    setAttachmentsToDelete([]);
    if (editFileInputRef.current) {
      editFileInputRef.current.value = "";
    }
    setErrorMessage("");
  }

  async function handleUpdateTicket(ticketId) {
    setErrorMessage("");
    setSuccessMessage("");

    if (!loggedUser || !editForm.reporterName.trim() || !editForm.reporterEmail.trim()) {
      setErrorMessage("Please login first. Name and email are taken from your account.");
      return;
    }

    if (!REGISTER_NUMBER_REGEX.test(editForm.registerNumber.trim().toUpperCase())) {
      setErrorMessage("Register number must follow IT######## format. Example: IT23986587.");
      return;
    }

    if (!CONTACT_NUMBER_REGEX.test(editForm.contactNumber.trim())) {
      setErrorMessage("Contact number must contain exactly 10 digits.");
      return;
    }

    if (!COURSE_CODE_REGEX.test(editForm.courseCode.trim().toUpperCase())) {
      setErrorMessage("Course code must follow IT#### format. Example: IT3030.");
      return;
    }

    const existingTicket = tickets.find((ticket) => ticket.id === ticketId);
    if (!existingTicket) {
      setErrorMessage("Ticket not found.");
      return;
    }

    setIsSubmitting(true);

    try {
      const newAttachments = await Promise.all(
        editSelectedFiles.map(async (file) => ({
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
          sizeInBytes: file.size,
          dataBase64: await readFileAsBase64(file),
          uploadedBy: "UPLOADED_BY_STUDENT",
        }))
      );

      // Filter out attachments marked for deletion
      const remainingAttachments = (existingTicket.attachments || []).filter(
        (attachment) => !attachmentsToDelete.includes(attachment.fileName)
      );

      const updatedTicket = await updateTicket(ticketId, {
        reporterName: editForm.reporterName,
        reporterEmail: editForm.reporterEmail,
        registerNumber: editForm.registerNumber.trim().toUpperCase(),
        faculty: editForm.faculty,
        contactNumber: editForm.contactNumber.trim(),
        title: editForm.title.trim(),
        category: editForm.category,
        priority: editForm.priority,
        courseCode: editForm.courseCode.trim().toUpperCase(),
        year: editForm.year,
        semester: editForm.semester,
        description: editForm.description.trim(),
        attachments: [...remainingAttachments, ...newAttachments],
      });

      setTickets((currentTickets) => currentTickets.map((ticket) => (
        ticket.id === ticketId ? updatedTicket : ticket
      )));
      setEditingTicketId(null);
      setEditForm(DEFAULT_FORM);
      setEditSelectedFiles([]);
      setAttachmentsToDelete([]);
      if (editFileInputRef.current) {
        editFileInputRef.current.value = "";
      }
      setSuccessMessage("Ticket updated successfully.");
    } catch (error) {
      setErrorMessage(error.message || "Failed to update ticket");
    } finally {
      setIsSubmitting(false);
    }
  }

  const ticketCountLabel = useMemo(() => {
    if (!hasEmail) {
      return "Enter your email to load your tickets.";
    }

    if (isLoading) {
      return "Loading your tickets...";
    }

    return `${tickets.length} ticket${tickets.length === 1 ? "" : "s"} found.`;
  }, [hasEmail, isLoading, tickets.length]);

  return (
    <div className="app-shell">
      <Navbar role="USER" />

      <main className="tickets-main-content">
        <section className="tickets-hero">
          <div className="tickets-hero-head">
            <div className="tickets-hero-copy">
              <h1>{isListView ? "My Tickets" : "Raise an Academic Support Ticket"}</h1>
              <p>
                {isListView
                  ? "Check the status of your submitted academic support tickets and review admin responses."
                  : "Report issues related to registration, exams, results, attendance, or coursework."}
              </p>
            </div>
            <button
              type="button"
              className="ticket-refresh-btn ticket-hero-action"
              onClick={() => navigate(isListView ? "/tickets" : "/tickets/my")}
            >
              {isListView ? "Raise New Ticket" : "My Tickets"}
            </button>
          </div>
        </section>

        {!isListView && (
          <section className="tickets-layout">
            <article className="ticket-panel ticket-form-panel">
            <h2>Raise New Ticket</h2>
            <p>Fill in the details clearly so the support team can resolve it quickly.</p>

            <form className="ticket-form" onSubmit={handleSubmit}>
              <label htmlFor="reporterName">Your Name</label>
              <input
                id="reporterName"
                type="text"
                className="ticket-readonly-input"
                value={form.reporterName}
                placeholder="Name from login"
                readOnly
                required
              />

              <label htmlFor="reporterEmail">Your Email</label>
              <input
                id="reporterEmail"
                type="email"
                className="ticket-readonly-input"
                value={form.reporterEmail}
                placeholder="Email from login"
                readOnly
                required
              />
              <p className="ticket-helper-text">These fields are auto-filled from your logged-in account.</p>

              <label htmlFor="registerNumber">Register Number</label>
              <input
                id="registerNumber"
                type="text"
                value={form.registerNumber}
                onChange={(event) => handleFieldChange("registerNumber", event.target.value.toUpperCase())}
                placeholder="IT23986587"
                pattern="^IT\d{8}$"
                title="Format: IT followed by 8 digits"
                required
              />
              <p className="ticket-helper-text">Format: IT + 8 digits (example: IT23986587).</p>

              <label htmlFor="faculty">Faculty</label>
              <select
                id="faculty"
                value={form.faculty}
                onChange={(event) => handleFieldChange("faculty", event.target.value)}
                required
              >
                {FACULTY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <label htmlFor="contactNumber">Contact Number</label>
              <input
                id="contactNumber"
                type="tel"
                value={form.contactNumber}
                onChange={(event) => handleFieldChange("contactNumber", event.target.value.replace(/\D/g, ""))}
                placeholder="0771234567"
                pattern="^\d{10}$"
                title="Enter exactly 10 digits"
                required
              />
              <p className="ticket-helper-text">Enter 10 digits (example: 0771234567).</p>

              <label htmlFor="title">Ticket Title</label>
              <input
                id="title"
                type="text"
                value={form.title}
                onChange={(event) => handleFieldChange("title", event.target.value)}
                placeholder="Short summary of the academic issue"
                required
              />

              <div className="ticket-form-row">
                <div>
                  <label htmlFor="category">Category</label>
                  <select
                    id="category"
                    value={form.category}
                    onChange={(event) => handleFieldChange("category", event.target.value)}
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="priority">Priority</label>
                  <select
                    id="priority"
                    value={form.priority}
                    onChange={(event) => handleFieldChange("priority", event.target.value)}
                  >
                    {PRIORITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <label htmlFor="courseCode">Course Code</label>
              <input
                id="courseCode"
                type="text"
                value={form.courseCode}
                onChange={(event) => handleFieldChange("courseCode", event.target.value.toUpperCase())}
                placeholder="IT3030"
                pattern="^IT\d{4}$"
                title="Format: IT followed by 4 digits"
                required
              />
              <p className="ticket-helper-text">Format: IT + 4 digits (example: IT3030).</p>

              <div className="ticket-form-row">
                <div>
                  <label htmlFor="year">Year</label>
                  <select
                    id="year"
                    value={form.year}
                    onChange={(event) => handleFieldChange("year", event.target.value)}
                    required
                  >
                    {YEAR_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="semester">Semester</label>
                  <select
                    id="semester"
                    value={form.semester}
                    onChange={(event) => handleFieldChange("semester", event.target.value)}
                    required
                  >
                    {SEMESTER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                value={form.description}
                onChange={(event) => handleFieldChange("description", event.target.value)}
                placeholder="Explain the issue clearly and include useful details"
                rows={5}
                required
              />

              <label htmlFor="attachments">Attachments (Optional)</label>
              <input
                id="attachments"
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleAttachmentsChange}
                accept=".jpg,.jpeg,.png,.gif,.webp,.bmp,image/jpeg,image/png,image/gif,image/webp,image/bmp"
              />
              <p className="ticket-helper-text">Up to 5 image files, max 5 MB each.</p>

              {selectedFiles.length > 0 && (
                <div className="ticket-selected-files">
                  {selectedFiles.map((file) => (
                    <span key={`${file.name}-${file.size}`} className="ticket-file-chip">
                      {file.name} ({formatBytes(file.size)})
                    </span>
                  ))}
                </div>
              )}

              {successMessage && <p className="ticket-message ticket-success">{successMessage}</p>}
              {errorMessage && <p className="ticket-message ticket-error">{errorMessage}</p>}

              <button className="ticket-submit-btn" type="submit" disabled={isSubmitting || !loggedUser}>
                {isSubmitting ? "Submitting..." : "Submit Ticket"}
              </button>
            </form>
            </article>
          </section>
        )}

        {isListView && (
          <section className="tickets-layout">
            <article className="ticket-panel ticket-list-panel">
            <div className="ticket-list-head">
              <div>
                <h2>My Tickets</h2>
                <p>{ticketCountLabel}</p>
              </div>
              <button type="button" className="ticket-refresh-btn" onClick={loadTickets}>
                Refresh
              </button>
            </div>

            <div className="ticket-filter-row">
              <label htmlFor="statusFilter">Status</label>
              <select
                id="statusFilter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                {STATUS_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {!hasEmail && <p className="ticket-note">Please login to view your submitted tickets.</p>}

            {hasEmail && tickets.length === 0 && !isLoading && (
              <p className="ticket-note">No tickets found for this email and status filter.</p>
            )}

            {tickets.length > 0 && (
              <div className="ticket-list ticket-summary-list">
                {tickets.map((ticket) => {
                  const isSelected = selectedTicketId === ticket.id;
                  const isEditing = editingTicketId === ticket.id;
                  const isPending = ticket.status === "PENDING";
                  const { studentAttachments, adminAttachments } = splitAttachmentsByOwner(ticket.attachments || []);

                  return (
                    <article key={ticket.id} className="ticket-summary-entry">
                      <div className={isSelected ? "ticket-summary-item selected" : "ticket-summary-item"}>
                        <div className="ticket-summary-main">
                          <h3>{ticket.title}</h3>
                          <p>{formatDateTime(ticket.createdAt)}</p>
                        </div>
                        <div className="ticket-summary-actions">
                          <span className={`ticket-status ticket-status-${ticket.status.toLowerCase()}`}>
                            {toLabel(ticket.status)}
                          </span>
                          <button
                            type="button"
                            className="ticket-refresh-btn ticket-view-btn"
                            onClick={() => setSelectedTicketId((currentId) => (currentId === ticket.id ? null : ticket.id))}
                          >
                            {isSelected ? "Hide Ticket" : "View Ticket"}
                          </button>
                        </div>
                      </div>

                      {isSelected && (
                        <article className="ticket-card ticket-detail-card inline">
                          <div className="ticket-card-head">
                            <h3>{ticket.title}</h3>
                            <span className={`ticket-status ticket-status-${ticket.status.toLowerCase()}`}>
                              {toLabel(ticket.status)}
                            </span>
                          </div>

                          {isEditing ? (
                            <div className="ticket-edit-form">
                              <label htmlFor={`ticket-title-${ticket.id}`}>Ticket Title</label>
                              <input
                                id={`ticket-title-${ticket.id}`}
                                type="text"
                                value={editForm.title}
                                onChange={(event) => handleEditFieldChange("title", event.target.value)}
                                required
                              />

                              <div className="ticket-form-row">
                                <div>
                                  <label htmlFor={`ticket-category-${ticket.id}`}>Category</label>
                                  <select
                                    id={`ticket-category-${ticket.id}`}
                                    value={editForm.category}
                                    onChange={(event) => handleEditFieldChange("category", event.target.value)}
                                  >
                                    {CATEGORY_OPTIONS.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label htmlFor={`ticket-priority-${ticket.id}`}>Priority</label>
                                  <select
                                    id={`ticket-priority-${ticket.id}`}
                                    value={editForm.priority}
                                    onChange={(event) => handleEditFieldChange("priority", event.target.value)}
                                  >
                                    {PRIORITY_OPTIONS.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              <div className="ticket-form-row">
                                <div>
                                  <label htmlFor={`ticket-register-${ticket.id}`}>Register Number</label>
                                  <input
                                    id={`ticket-register-${ticket.id}`}
                                    type="text"
                                    value={editForm.registerNumber}
                                    onChange={(event) => handleEditFieldChange("registerNumber", event.target.value.toUpperCase())}
                                    pattern="^IT\\d{8}$"
                                    required
                                  />
                                </div>

                                <div>
                                  <label htmlFor={`ticket-contact-${ticket.id}`}>Contact Number</label>
                                  <input
                                    id={`ticket-contact-${ticket.id}`}
                                    type="tel"
                                    value={editForm.contactNumber}
                                    onChange={(event) => handleEditFieldChange("contactNumber", event.target.value.replace(/\D/g, ""))}
                                    pattern="^\\d{10}$"
                                    required
                                  />
                                </div>
                              </div>

                              <div className="ticket-form-row">
                                <div>
                                  <label htmlFor={`ticket-faculty-${ticket.id}`}>Faculty</label>
                                  <select
                                    id={`ticket-faculty-${ticket.id}`}
                                    value={editForm.faculty}
                                    onChange={(event) => handleEditFieldChange("faculty", event.target.value)}
                                  >
                                    {FACULTY_OPTIONS.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label htmlFor={`ticket-course-${ticket.id}`}>Course Code</label>
                                  <input
                                    id={`ticket-course-${ticket.id}`}
                                    type="text"
                                    value={editForm.courseCode}
                                    onChange={(event) => handleEditFieldChange("courseCode", event.target.value.toUpperCase())}
                                    pattern="^IT\\d{4}$"
                                    required
                                  />
                                </div>
                              </div>

                              <div className="ticket-form-row">
                                <div>
                                  <label htmlFor={`ticket-year-${ticket.id}`}>Year</label>
                                  <select
                                    id={`ticket-year-${ticket.id}`}
                                    value={editForm.year}
                                    onChange={(event) => handleEditFieldChange("year", event.target.value)}
                                  >
                                    {YEAR_OPTIONS.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label htmlFor={`ticket-semester-${ticket.id}`}>Semester</label>
                                  <select
                                    id={`ticket-semester-${ticket.id}`}
                                    value={editForm.semester}
                                    onChange={(event) => handleEditFieldChange("semester", event.target.value)}
                                  >
                                    {SEMESTER_OPTIONS.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              <label htmlFor={`ticket-description-${ticket.id}`}>Description</label>
                              <textarea
                                id={`ticket-description-${ticket.id}`}
                                value={editForm.description}
                                onChange={(event) => handleEditFieldChange("description", event.target.value)}
                                rows={5}
                                required
                              />

                              <label htmlFor={`ticket-attachments-${ticket.id}`}>Upload New Attachments (Optional)</label>
                              <input
                                id={`ticket-attachments-${ticket.id}`}
                                ref={editFileInputRef}
                                type="file"
                                multiple
                                onChange={(event) => handleEditAttachmentsChange(event, studentAttachments.length)}
                                accept=".jpg,.jpeg,.png,.gif,.webp,.bmp,image/jpeg,image/png,image/gif,image/webp,image/bmp"
                              />
                              <p className="ticket-helper-text">
                                You can keep current files and add new ones. Total limit: {MAX_ATTACHMENT_FILES} image files, max 5 MB each.
                              </p>
                            </div>
                          ) : (
                            <>
                              <p className="ticket-description">{ticket.description}</p>

                              <div className="ticket-meta-grid">
                                <span>
                                  <strong>Register No:</strong> {ticket.registerNumber || "-"}
                                </span>
                                <span>
                                  <strong>Faculty:</strong> {toLabel(ticket.faculty) || "-"}
                                </span>
                                <span>
                                  <strong>Contact:</strong> {ticket.contactNumber || "-"}
                                </span>
                                <span>
                                  <strong>Category:</strong> {toLabel(ticket.category)}
                                </span>
                                <span>
                                  <strong>Priority:</strong> {toLabel(ticket.priority)}
                                </span>
                                <span>
                                  <strong>Course Code:</strong> {ticket.courseCode || "-"}
                                </span>
                                <span>
                                  <strong>Year:</strong> {ticket.year || "-"}
                                </span>
                                <span>
                                  <strong>Semester:</strong> {ticket.semester || "-"}
                                </span>
                                <span>
                                  <strong>Created:</strong> {formatDateTime(ticket.createdAt)}
                                </span>
                              </div>
                            </>
                          )}

                          {studentAttachments.length > 0 && (
                            <div className="ticket-attachments">
                              <strong>Your Attachments:</strong>
                              <ul>
                                {studentAttachments.map((attachment, index) => {
                                  const isMarkedForDeletion = attachmentsToDelete.includes(attachment.fileName);
                                  return (
                                    <li 
                                      key={`${ticket.id}-${attachment.fileName}-${index}`}
                                      className={isMarkedForDeletion ? "attachment-deleted" : ""}
                                    >
                                      <a
                                        href={buildAttachmentDataUrl(attachment)}
                                        download={attachment.fileName}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={isMarkedForDeletion ? { textDecoration: "line-through", opacity: 0.5 } : {}}
                                      >
                                        {attachment.fileName}
                                      </a>
                                      <span style={isMarkedForDeletion ? { textDecoration: "line-through", opacity: 0.5 } : {}}>
                                        {formatBytes(attachment.sizeInBytes)}
                                      </span>
                                      {isEditing && (
                                        <button
                                          type="button"
                                          className="attachment-delete-btn"
                                          onClick={() => handleDeleteAttachment(attachment.fileName)}
                                          disabled={isMarkedForDeletion}
                                          title={isMarkedForDeletion ? "Marked for deletion" : "Delete attachment"}
                                        >
                                          {isMarkedForDeletion ? "✓" : "×"}
                                        </button>
                                      )}
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          )}

                          {isEditing && editSelectedFiles.length > 0 && (
                            <div className="ticket-attachments">
                              <strong>New Attachments to Upload:</strong>
                              <ul>
                                {editSelectedFiles.map((file) => (
                                  <li key={`${ticket.id}-new-${file.name}-${file.size}`}>
                                    <span>{file.name}</span>
                                    <span>{formatBytes(file.size)}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {(ticket.adminComment || adminAttachments.length > 0) && (
                            <div className="ticket-admin-response-block">
                              <strong>Admin Response:</strong>
                              <p className="ticket-admin-comment">
                                {ticket.adminComment || "Admin shared attachments for this ticket."}
                              </p>

                              {adminAttachments.length > 0 && (
                                <div className="ticket-admin-attachments">
                                  <strong>Admin Attachments:</strong>
                                  <ul>
                                    {adminAttachments.map((attachment, index) => (
                                      <li key={`${ticket.id}-admin-${attachment.fileName}-${index}`}>
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
                            </div>
                          )}

                          {ticket.status === "CLOSED" && (
                            <div className="admin-ticket-actions">
                              <button
                                type="button"
                                className="admin-ticket-btn danger"
                                disabled={isSubmitting}
                                onClick={() => handleDeleteTicket(ticket.id)}
                              >
                                Delete Ticket
                              </button>
                            </div>
                          )}

                          {isPending && !isEditing && (
                            <div className="ticket-student-actions">
                              <button
                                type="button"
                                className="ticket-refresh-btn"
                                disabled={isSubmitting}
                                onClick={() => startEditingTicket(ticket)}
                              >
                                Edit Ticket
                              </button>
                            </div>
                          )}

                          {isEditing && (
                            <div className="ticket-student-actions">
                              <button
                                type="button"
                                className="ticket-refresh-btn"
                                disabled={isSubmitting}
                                onClick={() => handleUpdateTicket(ticket.id)}
                              >
                                {isSubmitting ? "Updating..." : "Update Ticket"}
                              </button>
                              <button
                                type="button"
                                className="ticket-secondary-btn"
                                disabled={isSubmitting}
                                onClick={cancelEditingTicket}
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </article>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
            </article>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
