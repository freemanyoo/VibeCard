package com.wedding.api.repository;

import com.wedding.api.entity.Invitation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface InvitationRepository extends JpaRepository<Invitation, String> {
    List<Invitation> findByUser_IdOrderByCreatedAtDesc(String userId);
    Optional<Invitation> findBySlug(String slug);
    List<Invitation> findTop10ByOrderByCreatedAtDesc();
}
