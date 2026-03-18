package com.wedding.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "media_files")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MediaFile {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    @JsonIgnore
    private User user;

    @Column(name = "storage_mode", nullable = false, length = 20)
    private String storageMode;

    @Column(name = "original_bucket")
    private String originalBucket;

    @Column(name = "original_object_key", length = 500)
    private String originalObjectKey;

    @Column(name = "original_url", nullable = false, length = 1000)
    private String originalUrl;

    @Column(name = "thumb_bucket")
    private String thumbBucket;

    @Column(name = "thumb_object_key", length = 500)
    private String thumbObjectKey;

    @Column(name = "thumb_url", length = 1000)
    private String thumbUrl;

    @Column(name = "analysis_bucket")
    private String analysisBucket;

    @Column(name = "analysis_object_key", length = 500)
    private String analysisObjectKey;

    @Column(name = "analysis_url", length = 1000)
    private String analysisUrl;

    @Column(name = "mime_type", length = 100)
    private String mimeType;

    private Integer width;

    private Integer height;

    @Column(name = "file_size")
    private Long fileSize;

    @Builder.Default
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
