package com.wedding.api.repository;

import com.wedding.api.entity.AiGenerationHistory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AiGenerationHistoryRepository extends JpaRepository<AiGenerationHistory, String> {
}
