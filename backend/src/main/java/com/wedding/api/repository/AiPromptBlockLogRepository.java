package com.wedding.api.repository;

import com.wedding.api.entity.AiPromptBlockLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AiPromptBlockLogRepository extends JpaRepository<AiPromptBlockLog, String> {
    List<AiPromptBlockLog> findTop200ByOrderByCreatedAtDesc();
}

