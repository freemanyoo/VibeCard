package com.wedding.api.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wedding.api.dto.AiInvitationImageResponse;
import com.wedding.api.entity.AiGenerationHistory;
import com.wedding.api.entity.MediaFile;
import com.wedding.api.entity.User;
import com.wedding.api.repository.AiGenerationHistoryRepository;
import com.wedding.api.repository.MediaFileRepository;
import com.wedding.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AiGenerationHistoryService {

    private final AiGenerationHistoryRepository aiGenerationHistoryRepository;
    private final ObjectMapper objectMapper;
    private final UserRepository userRepository;
    private final MediaFileRepository mediaFileRepository;

    public void record(String userId, String sourceImageId, String sourceImageUrl, String type,
                       String provider, AiInvitationImageResponse response) {
        String normalizedUserId = blankToNull(userId);
        String normalizedSourceImageId = blankToNull(sourceImageId);
        User user = normalizedUserId == null ? null : userRepository.findById(normalizedUserId).orElse(null);
        MediaFile sourceImage = normalizedSourceImageId == null ? null
                : mediaFileRepository.findById(normalizedSourceImageId).orElse(null);

        AiGenerationHistory history = AiGenerationHistory.builder()
                .userId(normalizedUserId)
                .user(user)
                .sourceImageId(normalizedSourceImageId)
                .sourceImage(sourceImage)
                .sourceImageUrl(blankToNull(sourceImageUrl))
                .type(type)
                .provider(normalizeProvider(provider))
                .resultSummary(blankToNull(response.getAnalysisSummary()))
                .configPatchJson(toJson(response))
                .build();
        aiGenerationHistoryRepository.save(history);
    }

    private String toJson(AiInvitationImageResponse response) {
        if (response.getConfigPatch() == null || response.getConfigPatch().isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(response.getConfigPatch());
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize AI config patch", e);
        }
    }

    private String normalizeProvider(String provider) {
        if (provider == null || provider.isBlank()) {
            return "openclaw1";
        }
        return provider.trim();
    }

    private String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
