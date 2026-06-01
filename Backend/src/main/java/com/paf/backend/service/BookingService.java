package com.paf.backend.service;

import com.paf.backend.dto.BookingRequest;
import com.paf.backend.dto.BookingResponse;
import com.paf.backend.dto.BookingStatusRequest;
import com.paf.backend.model.Booking;
import com.paf.backend.repository.BookingRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class BookingService {

    private final BookingRepository bookingRepository;
    private final SequenceGeneratorService sequenceGenerator;

    public BookingService(BookingRepository bookingRepository, SequenceGeneratorService sequenceGenerator) {
        this.bookingRepository = bookingRepository;
        this.sequenceGenerator = sequenceGenerator;
    }

    public List<BookingResponse> getAllBookings() {
        return bookingRepository.findAll().stream()
                .map(BookingResponse::new)
                .collect(Collectors.toList());
    }

    public List<BookingResponse> getBookingsByUserEmail(String userEmail) {
        return bookingRepository.findByUserEmail(userEmail).stream()
                .map(BookingResponse::new)
                .collect(Collectors.toList());
    }

    public List<BookingResponse> getBookingsByFacilityId(Long facilityId) {
        return bookingRepository.findByFacilityId(facilityId).stream()
                .map(BookingResponse::new)
                .collect(Collectors.toList());
    }

    public List<BookingResponse> getBookingsByStatus(String status) {
        return bookingRepository.findByStatus(status).stream()
                .map(BookingResponse::new)
                .collect(Collectors.toList());
    }

    public BookingResponse getBookingById(Long id) {
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Booking not found with id: " + id));
        return new BookingResponse(booking);
    }

    public BookingResponse createBooking(BookingRequest request) {
        // Validate time range
        if (request.getEndTime().isBefore(request.getStartTime()) || 
            request.getEndTime().isEqual(request.getStartTime())) {
            throw new IllegalArgumentException("End time must be after start time");
        }

        // Check for conflicts
        List<Booking> conflicts = bookingRepository.findConflictingBookings(
                request.getFacilityId(),
                request.getStartTime(),
                request.getEndTime()
        );

        if (!conflicts.isEmpty()) {
            throw new IllegalArgumentException("Time slot conflicts with existing booking");
        }

        Booking booking = new Booking();
        booking.setId(sequenceGenerator.generateSequence(Booking.SEQUENCE_NAME));
        booking.setFacilityId(request.getFacilityId());
        booking.setFacilityName(request.getFacilityName());
        booking.setUserEmail(request.getUserEmail());
        booking.setUserName(request.getUserName());
        booking.setStartTime(request.getStartTime());
        booking.setEndTime(request.getEndTime());
        booking.setExpectedAttendees(request.getExpectedAttendees());
        booking.setPurpose(request.getPurpose());
        booking.setStatus("PENDING");
        booking.setQrCode(generateQRCode(booking.getId()));

        Booking saved = bookingRepository.save(booking);
        return new BookingResponse(saved);
    }

    public BookingResponse updateBookingStatus(Long id, BookingStatusRequest request) {
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Booking not found with id: " + id));

        booking.setStatus(request.getStatus());
        booking.setAdminComment(request.getAdminComment());
        booking.setUpdatedAt(LocalDateTime.now());

        Booking updated = bookingRepository.save(booking);
        return new BookingResponse(updated);
    }

    public void deleteBooking(Long id) {
        if (!bookingRepository.existsById(id)) {
            throw new NoSuchElementException("Booking not found with id: " + id);
        }
        bookingRepository.deleteById(id);
    }

    public List<BookingResponse> getTimelineBookings(Long facilityId, LocalDate date) {
        LocalDateTime startOfDay = date.atStartOfDay();
        LocalDateTime endOfDay = date.atTime(LocalTime.MAX);

        return bookingRepository.findByFacilityIdAndDateRange(facilityId, startOfDay, endOfDay).stream()
                .map(BookingResponse::new)
                .collect(Collectors.toList());
    }

    private String generateQRCode(Long bookingId) {
        return "QR-" + bookingId + "-" + UUID.randomUUID().toString().substring(0, 8);
    }
}
