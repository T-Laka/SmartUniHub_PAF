package com.paf.backend.service;

import com.paf.backend.dto.AdminCommentRequest;
import com.paf.backend.dto.TicketAttachmentRequest;
import com.paf.backend.dto.TicketAttachmentResponse;
import com.paf.backend.dto.TicketRequest;
import com.paf.backend.dto.TicketResponse;
import com.paf.backend.repository.TicketRepository;
import jakarta.annotation.PostConstruct;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.regex.Pattern;
import javax.imageio.ImageIO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

@Service
public class TicketService {

    private static final Logger LOGGER = LoggerFactory.getLogger(TicketService.class);

    private static final String TICKET_SEQUENCE_NAME = "tickets_sequence";
    private static final String UPLOADED_BY_STUDENT = "UPLOADED_BY_STUDENT";
    private static final String UPLOADED_BY_ADMIN = "UPLOADED_BY_ADMIN";
    private static final int MAX_ATTACHMENT_COUNT = 5;
    private static final long MAX_ATTACHMENT_BYTES = 5L * 1024L * 1024L;
    private static final Pattern REGISTER_NUMBER_PATTERN = Pattern.compile("^IT\\d{8}$");
    private static final Pattern CONTACT_NUMBER_PATTERN = Pattern.compile("^\\d{10}$");
    private static final Pattern COURSE_CODE_PATTERN = Pattern.compile("^IT\\d{4}$");

    private static final Map<String, String> FACULTY_NORMALIZATION = Map.of(
            "FACULTY_OF_COMPUTING", "FACULTY_OF_COMPUTING",
            "FACULTY_OF_BUSINESS", "FACULTY_OF_BUSINESS",
            "FACULTY_OF_ARCHITECTURE", "FACULTY_OF_ARCHITECTURE",
            "FACULTY_OF_ENGINEERING", "FACULTY_OF_ENGINEERING",
            "FACULTY_OF_HUMANITIES_AND_SCIENCES", "FACULTY_OF_HUMANITIES_AND_SCIENCES"
    );

    private static final Map<String, String> CATEGORY_NORMALIZATION = Map.of(
            "REGISTRATION", "REGISTRATION",
            "EXAM", "EXAM",
            "EXAMS", "EXAM",
            "RESULT", "RESULTS",
            "RESULTS", "RESULTS",
            "ATTENDANCE", "ATTENDANCE",
            "COURSE_CONTENT", "COURSE_CONTENT",
            "ASSIGNMENT", "ASSIGNMENT",
            "FEE", "FEE",
            "OTHER", "OTHER"
    );

    private static final Map<String, String> PRIORITY_NORMALIZATION = Map.of(
            "LOW", "LOW",
            "MEDIUM", "MEDIUM",
            "HIGH", "HIGH",
            "URGENT", "URGENT"
    );

    private static final Map<String, String> YEAR_NORMALIZATION = Map.of(
            "1", "1",
            "2", "2",
            "3", "3",
            "4", "4"
    );

    private static final Map<String, String> SEMESTER_NORMALIZATION = Map.of(
            "1", "1",
            "2", "2"
    );

    private static final Map<String, String> STATUS_NORMALIZATION = Map.of(
            "PENDING", "PENDING",
            "OPEN", "PENDING",
            "IN_PROGRESS", "IN_PROGRESS",
            "RESOLVED", "RESOLVED",
            "CLOSED", "CLOSED"
    );

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private final TicketRepository ticketRepository;
    private final SequenceGeneratorService sequenceGeneratorService;

    public TicketService(TicketRepository ticketRepository, SequenceGeneratorService sequenceGeneratorService) {
        this.ticketRepository = ticketRepository;
        this.sequenceGeneratorService = sequenceGeneratorService;
    }

    @PostConstruct
    public void seedTickets() {
        try {
            if (ticketRepository.count() > 0) {
                return;
            }

            createTicket(new TicketRequest(
                    "System User",
                    "system@campus.local",
                    "IT23986587",
                    "FACULTY_OF_COMPUTING",
                    "0771234567",
                    "Registration not updated for semester 2",
                    "REGISTRATION",
                    "MEDIUM",
                    "IT3030",
                    "2",
                    "2",
                    "Semester registration still shows pending even after payment.",
                    List.of()
            ));
        } catch (RuntimeException ex) {
            LOGGER.warn("Skipping initial ticket seed because MongoDB is unavailable: {}", ex.getMessage());
        }
    }

    public TicketResponse createTicket(TicketRequest request) {
        ValidatedTicket validated = validateAndNormalize(request);

        long nextId = sequenceGeneratorService.generateSequence(TICKET_SEQUENCE_NAME);
        TicketResponse created = new TicketResponse(
                nextId,
                validated.reporterName(),
                validated.reporterEmail(),
                validated.registerNumber(),
                validated.faculty(),
                validated.contactNumber(),
                validated.title(),
                validated.category(),
                validated.priority(),
                validated.courseCode(),
                validated.year(),
                validated.semester(),
                validated.description(),
                "PENDING",
                LocalDateTime.now(),
                null,
                "",
                validated.attachments()
        );

        return ticketRepository.save(created);
    }

    public TicketResponse updateTicket(Long id, TicketRequest request) {
        TicketResponse existing = findExistingTicket(id);

        if (!"PENDING".equals(existing.status())) {
            throw new IllegalArgumentException("Only pending tickets can be updated");
        }

        TicketRequest normalizedRequest = preserveExistingAttachmentsWhenMissing(request, existing);
        ValidatedTicket validated = validateAndNormalize(normalizedRequest);

        TicketResponse updated = new TicketResponse(
                existing.id(),
                validated.reporterName(),
                validated.reporterEmail(),
                validated.registerNumber(),
                validated.faculty(),
                validated.contactNumber(),
                validated.title(),
                validated.category(),
                validated.priority(),
                validated.courseCode(),
                validated.year(),
                validated.semester(),
                validated.description(),
                existing.status(),
                existing.createdAt(),
                LocalDateTime.now(),
                existing.adminComment(),
                validated.attachments()
        );

        return ticketRepository.save(updated);
    }

    public List<TicketResponse> listTickets(String reporterEmail, String status, String registerNumber) {
        String normalizedReporterEmail = normalizeFilterValue(reporterEmail).toLowerCase(Locale.ROOT);
        String normalizedStatus = normalizeEnumFilter(status, STATUS_NORMALIZATION, "status");
        String normalizedRegisterNumber = normalizeFilterValue(registerNumber).toUpperCase(Locale.ROOT);

        return ticketRepository.findAll(Sort.by(Sort.Direction.DESC, "id")).stream()
                .filter(ticket -> normalizedReporterEmail.isBlank()
                        || ticket.reporterEmail().equalsIgnoreCase(normalizedReporterEmail))
                .filter(ticket -> normalizedStatus.isBlank() || ticket.status().equals(normalizedStatus))
                .filter(ticket -> normalizedRegisterNumber.isBlank()
                        || ticket.registerNumber().contains(normalizedRegisterNumber))
                .toList();
    }

    public TicketResponse updateTicketStatus(Long id, String status) {
        String normalizedStatus = normalizeRequiredEnum(status, STATUS_NORMALIZATION, "status");
        TicketResponse existing = findExistingTicket(id);
        String currentStatus = existing.status();

        if ("IN_PROGRESS".equals(normalizedStatus)) {
            if (!"PENDING".equals(currentStatus)) {
                throw new IllegalArgumentException("Only pending tickets can be opened");
            }
        } else if ("CLOSED".equals(normalizedStatus)) {
            if (!"RESOLVED".equals(currentStatus)) {
                throw new IllegalArgumentException("Only resolved tickets can be closed");
            }
        } else {
            throw new IllegalArgumentException("Only IN_PROGRESS and CLOSED transitions are allowed");
        }

        TicketResponse updated = new TicketResponse(
                existing.id(),
                existing.reporterName(),
                existing.reporterEmail(),
                existing.registerNumber(),
                existing.faculty(),
                existing.contactNumber(),
                existing.title(),
                existing.category(),
                existing.priority(),
                existing.courseCode(),
                existing.year(),
                existing.semester(),
                existing.description(),
                normalizedStatus,
                existing.createdAt(),
                LocalDateTime.now(),
                existing.adminComment(),
                existing.attachments()
        );

            return ticketRepository.save(updated);
    }

    public TicketResponse addAdminComment(Long id, AdminCommentRequest request) {
        TicketResponse existing = findExistingTicket(id);
        String normalizedComment = normalizeFilterValue(request == null ? null : request.comment());
        List<TicketAttachmentResponse> adminAttachments = normalizeAttachments(
                request == null ? List.of() : request.attachments(),
                UPLOADED_BY_ADMIN
        );

        if (!"IN_PROGRESS".equals(existing.status())) {
            throw new IllegalArgumentException("Admin response is allowed only for in-progress tickets");
        }

        if (normalizedComment.isBlank() && adminAttachments.isEmpty()) {
            throw new IllegalArgumentException("Provide a comment or at least one attachment");
        }

        List<TicketAttachmentResponse> mergedAttachments = mergeAttachments(existing.attachments(), adminAttachments);

        TicketResponse updated = new TicketResponse(
                existing.id(),
                existing.reporterName(),
                existing.reporterEmail(),
                existing.registerNumber(),
                existing.faculty(),
                existing.contactNumber(),
                existing.title(),
                existing.category(),
                existing.priority(),
                existing.courseCode(),
                existing.year(),
                existing.semester(),
                existing.description(),
                "RESOLVED",
                existing.createdAt(),
                LocalDateTime.now(),
                normalizedComment,
                mergedAttachments
        );

            return ticketRepository.save(updated);
    }

    public void deleteTicket(Long id, String actor) {
        TicketResponse existing = findExistingTicket(id);
        String normalizedActor = normalizeRequiredText(actor, "Actor is required")
                .replace('-', '_')
                .replace(' ', '_')
                .toUpperCase(Locale.ROOT);

        if (!"STUDENT".equals(normalizedActor)) {
            throw new IllegalArgumentException("Only students can delete tickets");
        }

        if (!"CLOSED".equals(existing.status())) {
            throw new IllegalArgumentException("Only closed tickets can be deleted");
        }

        ticketRepository.deleteById(id);
    }

    private List<TicketAttachmentResponse> mergeAttachments(
            List<TicketAttachmentResponse> existingAttachments,
            List<TicketAttachmentResponse> newAttachments
    ) {
        if (newAttachments == null || newAttachments.isEmpty()) {
            return existingAttachments == null ? List.of() : existingAttachments;
        }

        List<TicketAttachmentResponse> merged = new ArrayList<>();
        if (existingAttachments != null && !existingAttachments.isEmpty()) {
            merged.addAll(existingAttachments);
        }
        merged.addAll(newAttachments);

        return List.copyOf(merged);
    }

    private TicketResponse findExistingTicket(Long id) {
        return ticketRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Ticket not found"));
    }

    private TicketRequest preserveExistingAttachmentsWhenMissing(TicketRequest request, TicketResponse existing) {
        if (request != null && request.attachments() != null) {
            return request;
        }

        List<TicketAttachmentRequest> attachments = existing.attachments() == null
                ? List.of()
                : existing.attachments().stream()
                        .map(attachment -> new TicketAttachmentRequest(
                                attachment.fileName(),
                                attachment.contentType(),
                                attachment.sizeInBytes(),
                                attachment.dataBase64(),
                                attachment.uploadedBy()
                        ))
                        .toList();

        return new TicketRequest(
                request.reporterName(),
                request.reporterEmail(),
                request.registerNumber(),
                request.faculty(),
                request.contactNumber(),
                request.title(),
                request.category(),
                request.priority(),
                request.courseCode(),
                request.year(),
                request.semester(),
                request.description(),
                attachments
        );
    }

    private ValidatedTicket validateAndNormalize(TicketRequest request) {
        String reporterName = normalizeRequiredText(request.reporterName(), "Reporter name is required");
        String reporterEmail = normalizeRequiredText(request.reporterEmail(), "Reporter email is required")
                .toLowerCase(Locale.ROOT);
        String registerNumber = normalizeRequiredText(request.registerNumber(), "Register number is required")
                .toUpperCase(Locale.ROOT);
        String faculty = normalizeRequiredEnum(request.faculty(), FACULTY_NORMALIZATION, "faculty");
        String contactNumber = normalizeRequiredText(request.contactNumber(), "Contact number is required");

        if (!EMAIL_PATTERN.matcher(reporterEmail).matches()) {
            throw new IllegalArgumentException("Reporter email must be valid");
        }

        if (!REGISTER_NUMBER_PATTERN.matcher(registerNumber).matches()) {
            throw new IllegalArgumentException("Register number must follow IT######## format");
        }

        if (!CONTACT_NUMBER_PATTERN.matcher(contactNumber).matches()) {
            throw new IllegalArgumentException("Contact number must contain exactly 10 digits");
        }

        String title = normalizeRequiredText(request.title(), "Ticket title is required");
        String category = normalizeRequiredEnum(request.category(), CATEGORY_NORMALIZATION, "category");
        String priority = normalizeRequiredEnum(request.priority(), PRIORITY_NORMALIZATION, "priority");
        String courseCode = normalizeRequiredText(request.courseCode(), "Course code is required")
                .toUpperCase(Locale.ROOT);

        if (!COURSE_CODE_PATTERN.matcher(courseCode).matches()) {
            throw new IllegalArgumentException("Course code must follow IT#### format");
        }

        String year = normalizeRequiredEnum(request.year(), YEAR_NORMALIZATION, "year");
        String semester = normalizeRequiredEnum(request.semester(), SEMESTER_NORMALIZATION, "semester");
        String description = normalizeRequiredText(request.description(), "Description is required");
        List<TicketAttachmentResponse> attachments = normalizeAttachments(
                request.attachments(),
                UPLOADED_BY_STUDENT
        );

        return new ValidatedTicket(
                reporterName,
                reporterEmail,
                registerNumber,
                faculty,
                contactNumber,
                title,
                category,
                priority,
                courseCode,
                year,
                semester,
                description,
                attachments
        );
    }

    private List<TicketAttachmentResponse> normalizeAttachments(
            List<TicketAttachmentRequest> attachments,
            String defaultUploadedBy
    ) {
        if (attachments == null || attachments.isEmpty()) {
            return List.of();
        }

        if (attachments.size() > MAX_ATTACHMENT_COUNT) {
            throw new IllegalArgumentException("Maximum " + MAX_ATTACHMENT_COUNT + " attachments are allowed");
        }

        return attachments.stream()
                .map(attachment -> normalizeAttachment(attachment, defaultUploadedBy))
                .toList();
    }

    private TicketAttachmentResponse normalizeAttachment(TicketAttachmentRequest attachment, String defaultUploadedBy) {
        if (attachment == null) {
            throw new IllegalArgumentException("Attachment is missing");
        }

        String fileName = normalizeRequiredText(attachment.fileName(), "Attachment file name is required");
        String contentType = normalizeFilterValue(attachment.contentType());
        String dataBase64 = normalizeRequiredText(attachment.dataBase64(), "Attachment data is required");

        byte[] decoded;
        try {
            decoded = Base64.getDecoder().decode(dataBase64);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Attachment data is invalid base64");
        }

        if (decoded.length == 0) {
            throw new IllegalArgumentException("Attachment cannot be empty");
        }

        if (!isImageAttachment(decoded)) {
            throw new IllegalArgumentException("Only image attachments are allowed");
        }

        if (decoded.length > MAX_ATTACHMENT_BYTES) {
            throw new IllegalArgumentException("Each attachment must be 5 MB or smaller");
        }

        long normalizedSize = attachment.sizeInBytes() == null || attachment.sizeInBytes() <= 0
                ? decoded.length
                : attachment.sizeInBytes();

        String normalizedContentType = contentType.isBlank() ? "application/octet-stream" : contentType;
        String normalizedUploadedBy = normalizeAttachmentSource(attachment.uploadedBy(), defaultUploadedBy);

        return new TicketAttachmentResponse(
                fileName,
                normalizedContentType,
                normalizedSize,
                dataBase64,
                normalizedUploadedBy
        );
    }

    private String normalizeAttachmentSource(String uploadedBy, String defaultUploadedBy) {
        String normalized = normalizeFilterValue(uploadedBy)
                .replace('-', '_')
                .replace(' ', '_')
                .toUpperCase(Locale.ROOT);

        if (normalized.isBlank()) {
            return defaultUploadedBy;
        }

        if (!UPLOADED_BY_ADMIN.equals(normalized) && !UPLOADED_BY_STUDENT.equals(normalized)) {
            throw new IllegalArgumentException("Invalid attachment source");
        }

        return normalized;
    }

    private boolean isImageAttachment(byte[] data) {
        try {
            return ImageIO.read(new ByteArrayInputStream(data)) != null;
        } catch (IOException ex) {
            return false;
        }
    }

    private String normalizeRequiredText(String value, String message) {
        String normalized = normalizeFilterValue(value);
        if (normalized.isBlank()) {
            throw new IllegalArgumentException(message);
        }

        return normalized;
    }

    private String normalizeRequiredEnum(String value, Map<String, String> normalizationMap, String fieldName) {
        String normalized = normalizeEnumFilter(value, normalizationMap, fieldName);
        if (normalized.isBlank()) {
            throw new IllegalArgumentException("Invalid " + fieldName + " value");
        }

        return normalized;
    }

    private String normalizeEnumFilter(String value, Map<String, String> normalizationMap, String fieldName) {
        String normalizedInput = normalizeFilterValue(value)
                .replace('-', '_')
                .replace(' ', '_')
                .toUpperCase(Locale.ROOT);

        if (normalizedInput.isBlank()) {
            return "";
        }

        String normalized = normalizationMap.get(normalizedInput);
        if (normalized == null) {
            throw new IllegalArgumentException("Invalid " + fieldName + " value");
        }

        return normalized;
    }

    private String normalizeFilterValue(String value) {
        return value == null ? "" : value.trim();
    }

    private record ValidatedTicket(
            String reporterName,
            String reporterEmail,
            String registerNumber,
            String faculty,
            String contactNumber,
            String title,
            String category,
            String priority,
            String courseCode,
            String year,
            String semester,
            String description,
            List<TicketAttachmentResponse> attachments
    ) {
    }
}
