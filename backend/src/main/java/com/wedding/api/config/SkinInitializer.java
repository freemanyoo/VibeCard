package com.wedding.api.config;

import com.wedding.api.entity.Skin;
import com.wedding.api.repository.SkinRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Slf4j
@Component
@RequiredArgsConstructor
public class SkinInitializer {

    private final SkinRepository skinRepository;

    @PostConstruct
    public void initDefaultSkins() {
        createIfMissing("modern", "모던 기본 스킨");
        createIfMissing("elegant", "엘레강트 기본 스킨");
        createIfMissing("classic", "클래식 기본 스킨");
    }

    private void createIfMissing(String slug, String description) {
        Optional<Skin> existing = skinRepository.findBySlug(slug);
        if (existing.isPresent()) {
            return;
        }
        String displayName = switch (slug) {
            case "modern" -> "모던";
            case "elegant" -> "엘레강트";
            case "classic" -> "클래식";
            default -> slug;
        };
        Skin skin = Skin.builder()
                .name(displayName)
                .slug(slug)
                .description(description)
                .build();
        skinRepository.save(skin);
        log.info("Initialized default skin: {}", slug);
    }
}

