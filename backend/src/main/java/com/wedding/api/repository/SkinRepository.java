package com.wedding.api.repository;

import com.wedding.api.entity.Skin;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SkinRepository extends JpaRepository<Skin, String> {
    List<Skin> findAllByOrderByCreatedAtDesc();
    List<Skin> findByIsActiveTrueOrderByCreatedAtDesc();
    Optional<Skin> findBySlug(String slug);
}
