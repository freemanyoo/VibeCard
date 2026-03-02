package com.wedding.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.wedding.api.dto.AdminUserDto;
import com.wedding.api.dto.SkinAiGenerateRequest;
import com.wedding.api.dto.SkinRequest;
import com.wedding.api.entity.AiPromptBlockLog;
import com.wedding.api.entity.Skin;
import com.wedding.api.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final InvitationRepository invitationRepository;
    private final AttendanceRepository attendanceRepository;
    private final GuestbookRepository guestbookRepository;
    private final SkinRepository skinRepository;
    private final AiPromptBlockLogRepository aiPromptBlockLogRepository;
    private final OpenClawAiService openClawAiService;

    private static final Set<String> ALLOWED_AI_CONFIG_KEYS = Set.of(
        "theme","textScale","fontFamily","bgColor","subBgColor","textColor","pointColor","titleColor","nameColor","dateColor","messageColor",
        "sectionTitleColor","calendarBgColor","calendarDayColor","calendarActiveColor","buttonColor","buttonTextColor","footerColor",
        "saveTheDateText","mainTitleText","groomDisplayName","brideDisplayName","venueDisplayName","heroVenueNameText","invitationBodyText",
        "groomFatherText","groomMotherText","groomRelationText","brideFatherText","brideMotherText","brideRelationText",
        "titleSize","namesSize","dateSize","saveTheDateSize","heroVenueNameSize","heroDDaySize","contentSize","familyLineSize",
        "galleryTitleSize","locationTitleSize","locationVenueNameSize","locationAddressSize","navButtonTextSize","accountTitleSize","accountSubtitleSize",
        "accountToggleLabelSize","accountHeaderSize","accountInfoSize","attendanceTitleSize","attendanceDescSize","guestbookTitleSize","guestbookDescSize",
        "attendanceLabelSize","attendanceOptionTextSize","formPlaceholderSize","calendarTitleSize","calendarDaySize","footerWeddingOfSize"
    );
    private static final Set<String> ALLOWED_AI_META_KEYS = Set.of("skinName", "skinSlug", "skinDescription");
    private static final Set<String> ALLOWED_FONT_FAMILIES = Set.of(
        "sans-serif",
        "'Noto Sans KR', sans-serif",
        "'Nanum Gothic', sans-serif",
        "'IBM Plex Sans KR', sans-serif",
        "'Gothic A1', sans-serif",
        "'Do Hyeon', sans-serif",
        "'Jua', sans-serif",
        "'Black Han Sans', sans-serif",
        "'Noto Serif KR', serif",
        "'Nanum Myeongjo', serif",
        "'Gowun Batang', serif",
        "'Gowun Dodum', sans-serif",
        "'Song Myung', serif",
        "'Hahmlet', serif",
        "'Nanum Pen Script', cursive",
        "'Nanum Brush Script', cursive",
        "'Stylish', sans-serif",
        "'Gaegu', cursive",
        "'Hi Melody', cursive",
        "'Gamja Flower', cursive",
        "'Single Day', cursive",
        "'Cormorant Garamond', serif",
        "'Playfair Display', serif",
        "'Lora', serif",
        "'Montserrat', sans-serif",
        "'Inter', sans-serif",
        "'Roboto', sans-serif",
        "'Open Sans', sans-serif",
        "'Dancing Script', cursive",
        "'Great Vibes', cursive",
        "'Satisfy', cursive",
        "'Libre Baskerville', serif",
        "'Crimson Text', serif"
    );
    private static final String DEFAULT_ALLOWED_FONT_FAMILY = "'Noto Sans KR', sans-serif";

    private static final List<Pattern> BLOCKED_AI_PROMPT_PATTERNS = List.of(
        Pattern.compile("\\b(api\\s*key|apikey|secret|token|password|passwd|private\\s*key)\\b", Pattern.CASE_INSENSITIVE),
        Pattern.compile("\\b(env|\\.env|credential|auth\\s*header|bearer)\\b", Pattern.CASE_INSENSITIVE),
        Pattern.compile("\\b(키\\s*알려|키\\s*보여|토큰\\s*알려|비밀번호\\s*알려|시크릿\\s*알려|환경변수\\s*보여)\\b", Pattern.CASE_INSENSITIVE),
        Pattern.compile("\\b(hack|exploit|inject|bypass|jailbreak|prompt\\s*injection)\\b", Pattern.CASE_INSENSITIVE)
    );

    public Map<String, Object> getStats() {
        Map<String, Object> result = new HashMap<>();

        Map<String, Long> stats = new HashMap<>();
        stats.put("totalUsers", userRepository.count());
        stats.put("totalInvitations", invitationRepository.count());
        stats.put("totalRSVPs", attendanceRepository.count());
        stats.put("totalMessages", guestbookRepository.count());
        result.put("stats", stats);

        result.put("recentInvitations", invitationRepository.findTop10ByOrderByCreatedAtDesc());
        result.put("users", userRepository.findAll().stream()
                .map(AdminUserDto::from)
                .toList());

        return result;
    }

    @Transactional
    public List<Skin> getSkins() {
        List<Skin> skins = skinRepository.findAllByOrderByCreatedAtDesc();
        boolean changed = false;
        for (Skin skin : skins) {
            String current = skin.getConfig();
            String normalized = normalizeSkinImageGradientsZero(current);
            if (!Objects.equals(current, normalized)) {
                skin.setConfig(normalized);
                changed = true;
            }
        }
        if (changed) {
            skinRepository.saveAll(skins);
        }
        return skins;
    }

    public List<AiPromptBlockLog> getBlockedAiPromptLogs() {
        return aiPromptBlockLogRepository.findTop200ByOrderByCreatedAtDesc();
    }

    public Map<String, String> getSkinAiLocalModelOptions() {
        return openClawAiService.getSkinAiLocalModelOptions();
    }

    public Skin createSkin(SkinRequest req) {
        Skin skin = Skin.builder()
                .name(req.getName())
                .slug(req.getSlug())
                .description(req.getDescription())
                .config(sanitizeSkinConfigJson(req.getConfig()))
                .thumbnail(req.getThumbnail())
                .build();
        return skinRepository.save(skin);
    }

    public void updateSkin(String id, SkinRequest req) {
        Skin skin = skinRepository.findById(id).orElseThrow();
        if (req.getName() != null) skin.setName(req.getName());
        if (req.getDescription() != null) skin.setDescription(req.getDescription());
        if (req.getConfig() != null) skin.setConfig(sanitizeSkinConfigJson(req.getConfig()));
        if (req.getThumbnail() != null) skin.setThumbnail(req.getThumbnail());
        skinRepository.save(skin);
    }

    public void deleteSkin(String id) {
        skinRepository.deleteById(id);
    }

    public Map<String, Object> generateSkinConfigByAi(SkinAiGenerateRequest req) {
        if (req == null || req.getPrompt() == null || req.getPrompt().isBlank()) {
            throw new IllegalArgumentException("프롬프트를 입력해 주세요.");
        }
        if (containsBlockedAiPrompt(req.getPrompt())) {
            saveBlockedPromptLog(req.getPrompt(), "suspicious_prompt");
            throw new IllegalArgumentException("스킨 생성 프롬프트에는 디자인/스타일 요청만 입력할 수 있습니다.");
        }
        String template = req.getTemplate() == null || req.getTemplate().isBlank() ? "modern" : req.getTemplate().trim();
        String model = req.getModel() == null || req.getModel().isBlank() ? "openai" : req.getModel().trim();
        String localPurpose = req.getLocalPurpose() == null || req.getLocalPurpose().isBlank()
            ? "general"
            : req.getLocalPurpose().trim();
        Map<String, Object> raw = openClawAiService.generateSkinConfig(req.getPrompt(), template, model, localPurpose);

        Map<String, Object> sanitizedConfig = new LinkedHashMap<>();
        Map<String, String> sanitizedMeta = new LinkedHashMap<>();
        Map<String, Object> rawMetaCandidates = new LinkedHashMap<>();
        for (Map.Entry<String, Object> e : raw.entrySet()) {
            if (ALLOWED_AI_META_KEYS.contains(e.getKey())) {
                String metaValue = String.valueOf(e.getValue() == null ? "" : e.getValue()).trim();
                if (metaValue.isBlank()) continue;
                if ("skinSlug".equals(e.getKey())) {
                    metaValue = normalizeAiSlug(metaValue);
                }
                if (!metaValue.isBlank()) {
                    sanitizedMeta.put(e.getKey(), metaValue);
                }
                continue;
            }
            // 메타 별칭도 허용해서 AI 응답 편차를 흡수
            String key = e.getKey() == null ? "" : e.getKey().trim();
            if ("name".equalsIgnoreCase(key) || "title".equalsIgnoreCase(key)
                || "slug".equalsIgnoreCase(key) || "key".equalsIgnoreCase(key)
                || "description".equalsIgnoreCase(key) || "desc".equalsIgnoreCase(key)
                || "summary".equalsIgnoreCase(key)) {
                rawMetaCandidates.put(key, e.getValue());
                continue;
            }
            if (!ALLOWED_AI_CONFIG_KEYS.contains(e.getKey())) continue;
            Object v = e.getValue();
            if (v == null) continue;
            if ("fontFamily".equals(e.getKey())) {
                String resolved = resolveAllowedFontFamily(String.valueOf(v));
                if (resolved == null) {
                    throw new IllegalArgumentException("AI가 허용된 폰트 목록에서 fontFamily를 선택하지 못했습니다. 다시 시도해 주세요.");
                }
                sanitizedConfig.put(e.getKey(), resolved);
                continue;
            }
            if (v instanceof String || v instanceof Number || v instanceof Boolean) {
                sanitizedConfig.put(e.getKey(), v);
            }
        }
        if (!sanitizedConfig.containsKey("fontFamily")) {
            throw new IllegalArgumentException("AI 응답에 fontFamily가 없습니다. 다시 시도해 주세요.");
        }
        String skinName = firstNonBlank(
            sanitizedMeta.get("skinName"),
            asText(rawMetaCandidates.get("name")),
            asText(rawMetaCandidates.get("title"))
        );
        String skinSlug = firstNonBlank(
            sanitizedMeta.get("skinSlug"),
            asText(rawMetaCandidates.get("slug")),
            asText(rawMetaCandidates.get("key"))
        );
        String skinDescription = firstNonBlank(
            sanitizedMeta.get("skinDescription"),
            asText(rawMetaCandidates.get("description")),
            asText(rawMetaCandidates.get("desc")),
            asText(rawMetaCandidates.get("summary"))
        );

        skinSlug = normalizeAiSlug(skinSlug);
        if (skinName.isBlank() || skinSlug.isBlank() || skinDescription.isBlank()) {
            throw new IllegalArgumentException("AI 응답에 스킨 이름/고유키/설명이 누락되었습니다. 다시 시도해 주세요.");
        }
        sanitizedMeta.put("skinName", skinName);
        sanitizedMeta.put("skinSlug", skinSlug);
        sanitizedMeta.put("skinDescription", skinDescription);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("config", sanitizedConfig);
        result.put("meta", sanitizedMeta);
        return result;
    }

    private String normalizeAiSlug(String raw) {
        if (raw == null) return "";
        String slug = raw.trim().toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9\\s-]", " ")
            .replaceAll("\\s+", "-")
            .replaceAll("-{2,}", "-")
            .replaceAll("^-|-$", "");
        return slug;
    }

    private String asText(Object value) {
        if (value == null) return "";
        return String.valueOf(value).trim();
    }

    private String firstNonBlank(String... values) {
        if (values == null) return "";
        for (String v : values) {
            if (v != null && !v.trim().isBlank()) return v.trim();
        }
        return "";
    }

    private String sanitizeSkinConfigJson(String configJson) {
        String raw = (configJson == null || configJson.isBlank()) ? "{}" : configJson;
        try {
            JsonNode tree = objectMapper.readTree(raw);
            if (!(tree instanceof ObjectNode node)) {
                return raw;
            }
            JsonNode fontNode = node.get("fontFamily");
            if (fontNode != null && !fontNode.isNull()) {
                String resolved = resolveAllowedFontFamily(fontNode.asText());
                node.put("fontFamily", resolved != null ? resolved : DEFAULT_ALLOWED_FONT_FAMILY);
            }
            return objectMapper.writeValueAsString(node);
        } catch (Exception ignored) {
            return raw;
        }
    }

    private String resolveAllowedFontFamily(String raw) {
        if (raw == null) return null;
        String input = raw.trim();
        if (input.isBlank()) return null;
        if (ALLOWED_FONT_FAMILIES.contains(input)) return input;

        String normalizedInput = normalizeFontKey(input);
        for (String allowed : ALLOWED_FONT_FAMILIES) {
            String normalizedAllowed = normalizeFontKey(allowed);
            if (normalizedAllowed.equals(normalizedInput)) return allowed;
            if (normalizedAllowed.startsWith(normalizedInput + ",")) return allowed;
            if (normalizedAllowed.contains(normalizedInput)) return allowed;
            if (normalizedInput.contains(normalizedAllowed)) return allowed;
        }
        return null;
    }

    private String normalizeFontKey(String value) {
        return value == null ? "" : value
            .toLowerCase(Locale.ROOT)
            .replace("'", "")
            .replace("\"", "")
            .replaceAll("\\s+", "");
    }

    private boolean containsBlockedAiPrompt(String prompt) {
        String value = prompt == null ? "" : prompt.trim();
        if (value.isBlank()) return false;
        for (Pattern p : BLOCKED_AI_PROMPT_PATTERNS) {
            if (p.matcher(value).find()) return true;
        }
        return false;
    }

    private void saveBlockedPromptLog(String prompt, String reason) {
        String userId = null;
        String userEmail = null;
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.getPrincipal() != null) {
                userId = String.valueOf(authentication.getPrincipal());
                userEmail = userRepository.findById(userId).map(u -> u.getEmail()).orElse(null);
            }
        } catch (Exception ignored) {
        }

        String safePrompt = prompt == null ? "" : prompt.trim();
        if (safePrompt.length() > 2000) {
            safePrompt = safePrompt.substring(0, 2000);
        }

        aiPromptBlockLogRepository.save(
            AiPromptBlockLog.builder()
                .userId(userId)
                .userEmail(userEmail)
                .prompt(safePrompt)
                .reason(reason == null || reason.isBlank() ? "blocked" : reason)
                .build()
        );
    }

    @Transactional
    public boolean deleteUserByEmail(String email) {
        if (email == null || email.isBlank()) return false;
        String normalized = email.trim().toLowerCase(Locale.ROOT);
        if (!userRepository.existsByEmail(normalized)) return false;
        userRepository.deleteByEmail(normalized);
        return true;
    }

    private static final ObjectMapper objectMapper = new ObjectMapper();

    private String normalizeSkinImageGradientsZero(String configJson) {
        String raw = (configJson == null || configJson.isBlank()) ? "{}" : configJson;
        try {
            JsonNode tree = objectMapper.readTree(raw);
            if (!(tree instanceof ObjectNode node)) return raw;
            node.put("imageGradient", 0);
            node.put("standardImageGradient", 0);
            node.put("fullImageGradient", 0);
            node.put("bottomImageGradient", 0);
            return objectMapper.writeValueAsString(node);
        } catch (Exception ignored) {
            return raw;
        }
    }

    /** 모던/클래식 스킨에 현재 기본 테마 색상을 적용 (DB에 저장). 한 번 호출로 직접 수정 없이 반영 */
    public int applyDefaultThemeColors() {
        Map<String, String> modernDefaults = Map.of(
                "bgColor", "#f1f5f9", "subBgColor", "#e2e8f0", "textColor", "#0f172a", "pointColor", "#475569",
                "fontFamily", "'Noto Sans KR', sans-serif", "theme", "modern"
        );
        Map<String, String> classicDefaults = Map.of(
                "bgColor", "#faf6f1", "subBgColor", "#f5efe6", "textColor", "#4a4035", "pointColor", "#8b6914",
                "fontFamily", "'Nanum Myeongjo', serif", "theme", "classic"
        );
        int updated = 0;
        for (Skin skin : skinRepository.findAll()) {
            String slug = skin.getSlug();
            Map<String, String> defaults = "modern".equals(slug) ? modernDefaults : "classic".equals(slug) ? classicDefaults : null;
            if (defaults == null) continue;
            try {
                String configJson = skin.getConfig() != null ? skin.getConfig() : "{}";
                JsonNode tree = objectMapper.readTree(configJson);
                if (!(tree instanceof ObjectNode)) continue;
                ObjectNode node = (ObjectNode) tree;
                for (Map.Entry<String, String> e : defaults.entrySet()) {
                    node.put(e.getKey(), e.getValue());
                }
                skin.setConfig(objectMapper.writeValueAsString(node));
                skinRepository.save(skin);
                updated++;
            } catch (Exception ignored) {
            }
        }
        return updated;
    }
}
