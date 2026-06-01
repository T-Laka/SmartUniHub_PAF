package com.paf.backend.repository;

import com.paf.backend.model.Booking;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface BookingRepository extends MongoRepository<Booking, Long> {

    List<Booking> findByUserEmail(String userEmail);

    List<Booking> findByFacilityId(Long facilityId);

    List<Booking> findByStatus(String status);

    @Query("{ 'facilityId': ?0, 'startTime': { $lt: ?2 }, 'endTime': { $gt: ?1 }, 'status': { $in: ['PENDING', 'APPROVED'] } }")
    List<Booking> findConflictingBookings(Long facilityId, LocalDateTime startTime, LocalDateTime endTime);

    @Query("{ 'facilityId': ?0, 'startTime': { $gte: ?1, $lt: ?2 } }")
    List<Booking> findByFacilityIdAndDateRange(Long facilityId, LocalDateTime startOfDay, LocalDateTime endOfDay);
}
