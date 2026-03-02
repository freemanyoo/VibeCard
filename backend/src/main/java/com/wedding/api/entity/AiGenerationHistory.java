package com.wedding.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "ai_generation_history")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiGenerationHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "source_image_id")
    private String sourceImageId;

    @Column(name = "source_image_url", length = 1000)
    private String sourceImageUrl;

    @Column(nullable = false, length = 50)
    private String type;

    @Column(nullable = false, length = 50)
    private String provider;

    @Column(name = "result_summary", length = 4000)
    private String resultSummary;

    @Column(name = "config_patch_json", length = 10000)
    private String configPatchJson;

    @Builder.Default
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
