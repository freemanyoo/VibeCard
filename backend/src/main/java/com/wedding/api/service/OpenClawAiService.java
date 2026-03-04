package com.wedding.api.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class OpenClawAiService {
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
        .version(HttpClient.Version.HTTP_1_1)
        .connectTimeout(Duration.ofSeconds(15))
        .build();

    @Value("${openclaw.base-url:}")
    private String baseUrl;
    @Value("${openclaw.auth.type:bearer}")
    private String authType;
    @Value("${openclaw.auth.header:Authorization}")
    private String authHeader;
    @Value("${openclaw.auth.token:}")
    private String authToken;
    @Value("${openclaw.auth.token-openclaw1:}")
    private String authTokenOpenClaw1;
    @Value("${openclaw.auth.token-openclaw2:}")
    private String authTokenOpenClaw2;
    @Value("${openclaw.auth.token-openclaw3:}")
    private String authTokenOpenClaw3;
    @Value("${openclaw.mode:single_endpoint}")
    private String mode;
    @Value("${openclaw.chat-path:/v1/chat/completions}")
    private String chatPath;
    @Value("${openclaw.path.openclaw1:}")
    private String pathOpenClaw1;
    @Value("${openclaw.path.openclaw2:}")
    private String pathOpenClaw2;
    @Value("${openclaw.path.openclaw3:}")
    private String pathOpenClaw3;
    @Value("${openclaw.url.openclaw1:}")
    private String urlOpenClaw1;
    @Value("${openclaw.url.openclaw2:}")
    private String urlOpenClaw2;
    @Value("${openclaw.url.openclaw3:}")
    private String urlOpenClaw3;
    @Value("${openclaw.model.openclaw1:openclaw1}")
    private String modelOpenClaw1;
    @Value("${openclaw.model.openclaw2:openclaw2}")
    private String modelOpenClaw2;
    @Value("${openclaw.model.openclaw3:openclaw3}")
    private String modelOpenClaw3;
    @Value("${openclaw.model.openclaw3-general:}")
    private String modelOpenClaw3General;
    @Value("${openclaw.model.openclaw3-coding:}")
    private String modelOpenClaw3Coding;
    @Value("${openclaw.model.openclaw3-vision:}")
    private String modelOpenClaw3Vision;

    public Map<String, String> getSkinAiLocalModelOptions() {
        String general = !cleanEnv(modelOpenClaw3General).isBlank() ? cleanEnv(modelOpenClaw3General) : cleanEnv(modelOpenClaw3);
        String coding = !cleanEnv(modelOpenClaw3Coding).isBlank() ? cleanEnv(modelOpenClaw3Coding) : general;
        Map<String, String> options = new LinkedHashMap<>();
        options.put("general", general);
        options.put("coding", coding);
        return options;
    }

    public Map<String, Object> generateSkinConfig(String prompt, String template, String modelAlias, String localPurpose) {
        String alias = normalizeModelAlias(modelAlias);
        String cleanedBaseUrl = cleanEnv(baseUrl);
        if (cleanedBaseUrl.isBlank()) {
            if (cleanEnv(urlOpenClaw1).isBlank()
                && cleanEnv(urlOpenClaw2).isBlank()
                && cleanEnv(urlOpenClaw3).isBlank()) {
                throw new IllegalStateException("OPENCLAW_BASE_URL 또는 OPENCLAW_URL_OPENCLAW* 설정이 비어 있습니다.");
            }
        }
        String resolvedToken = resolveAuthToken(alias);
        if (resolvedToken == null || resolvedToken.isBlank()) {
            throw new IllegalStateException("OpenClaw 인증 토큰 설정이 비어 있습니다.");
        }

        String normalizedTemplate = normalizeTemplate(template);
        String systemPrompt = """
                You are an expert wedding invitation skin designer.
                Return ONLY one JSON object. No markdown.
                Keep values practical and elegant.
                Use this template context: %s
                Allowed keys (subset allowed): theme,textScale,fontFamily,bgColor,subBgColor,textColor,pointColor,titleColor,nameColor,dateColor,messageColor,sectionTitleColor,calendarBgColor,calendarDayColor,calendarActiveColor,buttonColor,buttonTextColor,footerColor,saveTheDateText,mainTitleText,groomDisplayName,brideDisplayName,venueDisplayName,heroVenueNameText,invitationBodyText,groomFatherText,groomMotherText,groomRelationText,brideFatherText,brideMotherText,brideRelationText,titleSize,namesSize,dateSize,saveTheDateSize,heroVenueNameSize,heroDDaySize,contentSize,familyLineSize,galleryTitleSize,locationTitleSize,locationVenueNameSize,locationAddressSize,navButtonTextSize,accountTitleSize,accountSubtitleSize,accountToggleLabelSize,accountHeaderSize,accountInfoSize,attendanceTitleSize,attendanceDescSize,guestbookTitleSize,guestbookDescSize,attendanceLabelSize,attendanceOptionTextSize,formPlaceholderSize,calendarTitleSize,calendarDaySize,footerWeddingOfSize,skinName,skinSlug,skinDescription
                Additional rules:
                - Always include skinName, skinSlug, skinDescription, fontFamily.
                - Never omit required keys. Never return null or empty string for required keys.
                - skinSlug must be lowercase kebab-case (a-z, 0-9, hyphen only).
                - fontFamily must be selected from the provided font list only.
                - Output must be exactly one flat JSON object.
                """.formatted(normalizedTemplate);

        String endpoint = resolveEndpoint(alias);
        String modelName = resolveModelName(alias, localPurpose);

        Map<String, Object> payload = Map.of(
            "model", modelName,
            "temperature", 0.8,
            "messages", List.of(
                Map.of("role", "system", "content", systemPrompt),
                Map.of("role", "user", "content", prompt == null ? "" : prompt)
            )
        );

        try {
            log.info("OpenClaw AI request: alias={}, endpoint={}, model={}, localPurpose={}",
                alias, endpoint, modelName, normalizeLocalPurpose(localPurpose));
            HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(endpoint))
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .timeout(Duration.ofSeconds(60))
                .expectContinue(false)
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(payload), StandardCharsets.UTF_8));

            String cleanedAuthType = cleanEnv(authType);
            String cleanedAuthHeader = cleanEnv(authHeader);
            if ("bearer".equalsIgnoreCase(cleanedAuthType)) {
                builder.header(cleanedAuthHeader, "Bearer " + resolvedToken);
            } else {
                builder.header(cleanedAuthHeader, resolvedToken);
            }

            HttpResponse<String> resp = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() < 200 || resp.statusCode() >= 300) {
                log.error("OpenClaw AI non-2xx response: alias={}, endpoint={}, status={}, body={}",
                    alias, endpoint, resp.statusCode(), resp.body());
                throw new IllegalStateException("OpenClaw 호출 실패(" + resp.statusCode() + "): " + resp.body());
            }

            String text = extractResponseText(resp.body());
            String jsonText = extractJsonObject(text);
            return objectMapper.readValue(jsonText, new TypeReference<>() {});
        } catch (Exception e) {
            String detail = e.getMessage() == null || e.getMessage().isBlank()
                ? e.getClass().getSimpleName()
                : e.getMessage();
            log.error("OpenClaw AI request failed: alias={}, localPurpose={}", alias, normalizeLocalPurpose(localPurpose), e);
            throw new IllegalStateException("AI 스킨 생성 실패: " + detail, e);
        }
    }

    private String normalizeTemplate(String template) {
        if (template == null || template.isBlank()) return "modern";
        return template.trim().toLowerCase(Locale.ROOT);
    }

    private String resolveEndpoint(String modelAlias) {
        String alias = normalizeModelAlias(modelAlias);
        String directUrl = switch (alias) {
            case "openclaw1" -> urlOpenClaw1;
            case "openclaw2" -> urlOpenClaw2;
            case "openclaw3" -> urlOpenClaw3;
            default -> "";
        };
        String cleanedDirectUrl = cleanEnv(directUrl);
        if (!cleanedDirectUrl.isBlank()) {
            return ensureChatPath(cleanedDirectUrl);
        }

        if ("per_model_endpoint".equalsIgnoreCase(mode) || "multi_endpoint".equalsIgnoreCase(mode)) {
            String configuredPath = switch (alias) {
                case "openclaw1" -> cleanEnv(pathOpenClaw1);
                case "openclaw2" -> cleanEnv(pathOpenClaw2);
                case "openclaw3" -> cleanEnv(pathOpenClaw3);
                default -> "";
            };
            if (configuredPath.isBlank()) {
                return ensureChatPath(join(baseUrl, chatPath));
            }
            return ensureChatPath(join(baseUrl, configuredPath));
        }
        return ensureChatPath(join(baseUrl, chatPath));
    }

    private String ensureChatPath(String url) {
        try {
            URI uri = URI.create(url);
            String path = uri.getPath();
            if (path == null || path.isBlank() || "/".equals(path)) {
                return join(url, chatPath);
            }
            return url;
        } catch (Exception ignored) {
            return url;
        }
    }

    private String resolveModelName(String modelAlias, String localPurpose) {
        String alias = normalizeModelAlias(modelAlias);
        if ("openclaw3".equals(alias)) {
            String purpose = normalizeLocalPurpose(localPurpose);
            if ("coding".equals(purpose) && !cleanEnv(modelOpenClaw3Coding).isBlank()) {
                return cleanEnv(modelOpenClaw3Coding);
            }
            if ("vision".equals(purpose) && !cleanEnv(modelOpenClaw3Vision).isBlank()) {
                return cleanEnv(modelOpenClaw3Vision);
            }
            if (!cleanEnv(modelOpenClaw3General).isBlank()) {
                return cleanEnv(modelOpenClaw3General);
            }
        }
        return switch (alias) {
            case "openclaw1" -> cleanEnv(modelOpenClaw1);
            case "openclaw2" -> cleanEnv(modelOpenClaw2);
            case "openclaw3" -> cleanEnv(modelOpenClaw3);
            default -> cleanEnv(modelOpenClaw1);
        };
    }

    private String normalizeLocalPurpose(String localPurpose) {
        if (localPurpose == null || localPurpose.isBlank()) return "general";
        return switch (localPurpose.trim().toLowerCase(Locale.ROOT)) {
            case "coding", "code" -> "coding";
            case "vision", "image" -> "vision";
            default -> "general";
        };
    }

    private String normalizeModelAlias(String modelAlias) {
        if (modelAlias == null || modelAlias.isBlank()) return "openclaw1";
        return switch (modelAlias.trim().toLowerCase(Locale.ROOT)) {
            case "openai" -> "openclaw1";
            case "gemini" -> "openclaw2";
            case "local", "localllm", "local-llm" -> "openclaw3";
            case "openclaw1", "openclaw2", "openclaw3" -> modelAlias.trim().toLowerCase(Locale.ROOT);
            default -> "openclaw1";
        };
    }

    private String resolveAuthToken(String modelAlias) {
        return switch (normalizeModelAlias(modelAlias)) {
            case "openclaw1" -> !cleanEnv(authTokenOpenClaw1).isBlank() ? cleanEnv(authTokenOpenClaw1) : cleanEnv(authToken);
            case "openclaw2" -> !cleanEnv(authTokenOpenClaw2).isBlank() ? cleanEnv(authTokenOpenClaw2) : cleanEnv(authToken);
            case "openclaw3" -> !cleanEnv(authTokenOpenClaw3).isBlank() ? cleanEnv(authTokenOpenClaw3) : cleanEnv(authToken);
            default -> cleanEnv(authToken);
        };
    }

    private String join(String base, String path) {
        String cleanedBase = cleanEnv(base);
        String cleanedPath = cleanEnv(path);
        if (cleanedBase.isBlank()) return cleanedPath;
        if (cleanedPath.isBlank()) return cleanedBase;
        boolean baseEndsWith = cleanedBase.endsWith("/");
        boolean pathStartsWith = cleanedPath.startsWith("/");
        if (baseEndsWith && pathStartsWith) return cleanedBase + cleanedPath.substring(1);
        if (!baseEndsWith && !pathStartsWith) return cleanedBase + "/" + cleanedPath;
        return cleanedBase + cleanedPath;
    }

    private String cleanEnv(String raw) {
        if (raw == null) return "";
        String value = raw.trim();
        while (value.length() >= 2) {
            boolean hasDoubleQuotes = value.startsWith("\"") && value.endsWith("\"");
            boolean hasSingleQuotes = value.startsWith("'") && value.endsWith("'");
            if (!hasDoubleQuotes && !hasSingleQuotes) break;
            value = value.substring(1, value.length() - 1).trim();
        }
        return value;
    }

    private String extractResponseText(String body) throws Exception {
        Map<String, Object> map = objectMapper.readValue(body, new TypeReference<>() {});
        Object choicesObj = map.get("choices");
        if (choicesObj instanceof List<?> choices && !choices.isEmpty()) {
            Object first = choices.get(0);
            if (first instanceof Map<?, ?> firstMapRaw) {
                Object messageObj = firstMapRaw.get("message");
                if (messageObj instanceof Map<?, ?> messageRaw) {
                    Object content = messageRaw.get("content");
                    if (content != null) return String.valueOf(content);
                }
                Object text = firstMapRaw.get("text");
                if (text != null) return String.valueOf(text);
            }
        }
        Object outputText = map.get("output_text");
        if (outputText != null) return String.valueOf(outputText);
        Object content = map.get("content");
        if (content != null) return String.valueOf(content);
        return body;
    }

    private String extractJsonObject(String text) {
        if (text == null) throw new IllegalArgumentException("AI 응답이 비어 있습니다.");
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        if (start < 0 || end <= start) {
            throw new IllegalArgumentException("AI 응답에서 JSON 객체를 찾을 수 없습니다.");
        }
        return text.substring(start, end + 1);
    }
}
