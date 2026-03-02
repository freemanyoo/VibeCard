package com.wedding.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wedding.api.dto.AiInvitationImageResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.MemoryCacheImageOutputStream;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class OpenAiInvitationService {
    private final ObjectMapper objectMapper;

    @Value("${openclaw.base-url:}")
    private String openClawBaseUrl;
    @Value("${openclaw.url.openclaw1:}")
    private String openClawUrlOpenClaw1;
    @Value("${openclaw.chat-path:/v1/chat/completions}")
    private String openClawChatPath;
    @Value("${openclaw.responses-path:/v1/responses}")
    private String openClawResponsesPath;
    @Value("${openclaw.auth.type:bearer}")
    private String openClawAuthType;
    @Value("${openclaw.auth.header:Authorization}")
    private String openClawAuthHeader;
    @Value("${openclaw.auth.token:}")
    private String openClawAuthToken;
    @Value("${openclaw.auth.token-openclaw1:}")
    private String openClawAuthTokenOpenClaw1;
    @Value("${openclaw.auth.token-openclaw2:}")
    private String openClawAuthTokenOpenClaw2;
    @Value("${openclaw.auth.token-openclaw3:}")
    private String openClawAuthTokenOpenClaw3;
    @Value("${openclaw.url.openclaw2:}")
    private String openClawUrlOpenClaw2;
    @Value("${openclaw.url.openclaw3:}")
    private String openClawUrlOpenClaw3;
    @Value("${openclaw.media-root.openclaw1:/volume1/docker/openclaw_1/data/workspace/files-api}")
    private String openClawMediaRootOpenClaw1;
    @Value("${openclaw.media-root.openclaw2:/volume1/docker/openclaw_2/data/workspace/files-api}")
    private String openClawMediaRootOpenClaw2;
    @Value("${openclaw.media-root.openclaw3:/volume1/docker/openclaw_3/data/workspace/files-api}")
    private String openClawMediaRootOpenClaw3;
    @Value("${openclaw.model.openclaw1:openclaw1}")
    private String modelOpenClaw1;
    @Value("${openclaw.model.openclaw2:openclaw2}")
    private String modelOpenClaw2;
    @Value("${openclaw.model.openclaw3:openclaw3}")
    private String modelOpenClaw3;
    @Value("${openclaw.model.openclaw3-general:}")
    private String modelOpenClaw3General;
    @Value("${openclaw.model.openclaw3-vision:}")
    private String modelOpenClaw3Vision;
    @Value("${openclaw.ollama-url.openclaw3:}")
    private String openClawOllamaUrlOpenClaw3;
    @Value("${openclaw.ollama-unload-after-vision:true}")
    private boolean openClawOllamaUnloadAfterVision;
    @Value("${openai.vision-model:gpt-4.1-mini}")
    private String visionModel;
    @Value("${upload.dir:./uploads}")
    private String uploadDir;

    public AiInvitationImageResponse generateFromReference(String photoUrl, String imageStyle, String modelAlias) {
        String alias = normalizeModelAlias(modelAlias);
        String resolvedToken = resolveAuthToken(alias);
        if (resolvedToken.isBlank()) {
            throw new IllegalStateException("OpenClaw 인증 토큰 설정이 비어 있습니다.");
        }
        if (photoUrl == null || photoUrl.isBlank()) {
            throw new IllegalStateException("참고 이미지를 먼저 업로드해 주세요.");
        }

        try {
            BufferedImage normalizedImage = loadAnalysisImage(photoUrl);
            String normalizedStyle = normalizeImageStyle(imageStyle);
            AnalysisResult analysis;
            try {
                analysis = generateWithUploadPayload(
                    alias,
                    normalizedImage,
                    normalizedStyle,
                    resolvedToken
                );
            } catch (Exception uploadError) {
                if (!isMethodNotAllowed(uploadError)) {
                    throw uploadError;
                }
                analysis = analyzeReferenceImageByMediaPath(
                    alias,
                    buildOpenClawMediaPath(alias, photoUrl),
                    resolveMediaType(photoUrl),
                    normalizedStyle,
                    resolvedToken
                );
            }
            return AiInvitationImageResponse.builder()
                .success(true)
                .analysisSummary(analysis.summary())
                .congratulatoryMessage(analysis.congratulatoryMessage())
                .configPatch(analysis.configPatch())
                .build();
        } catch (Exception e) {
            throw new IllegalStateException("AI 청첩장 생성 실패: " + e.getMessage(), e);
        }
    }

    public AiInvitationImageResponse generateFromPrompt(String prompt, String photoUrl, String imageStyle, String modelAlias) {
        String trimmedPrompt = clean(prompt);
        if (trimmedPrompt.isBlank()) {
            throw new IllegalStateException("AI 프롬프트를 입력해 주세요.");
        }

        String alias = normalizeModelAlias(modelAlias);
        String resolvedToken = resolveAuthToken(alias);
        if (resolvedToken.isBlank()) {
            throw new IllegalStateException("OpenClaw 인증 토큰 설정이 비어 있습니다.");
        }

        try {
            String normalizedStyle = normalizeImageStyle(imageStyle);
            AnalysisResult analysis;
            if (!clean(photoUrl).isBlank()) {
                BufferedImage normalizedImage = loadAnalysisImage(photoUrl);
                try {
                    analysis = generateWithUploadPayload(
                        alias,
                        normalizedImage,
                        normalizedStyle,
                        resolvedToken,
                        trimmedPrompt
                    );
                } catch (Exception uploadError) {
                    if (!isMethodNotAllowed(uploadError)) {
                        throw uploadError;
                    }
                    analysis = analyzeReferenceImageByMediaPath(
                        alias,
                        buildOpenClawMediaPath(alias, photoUrl),
                        resolveMediaType(photoUrl),
                        normalizedStyle,
                        resolvedToken,
                        trimmedPrompt
                    );
                }
            } else {
                analysis = analyzePromptOnly(alias, normalizedStyle, resolvedToken, trimmedPrompt);
            }

            return AiInvitationImageResponse.builder()
                .success(true)
                .analysisSummary(analysis.summary())
                .congratulatoryMessage(analysis.congratulatoryMessage())
                .configPatch(analysis.configPatch())
                .build();
        } catch (Exception e) {
            throw new IllegalStateException("AI 청첩장 생성 실패: " + e.getMessage(), e);
        }
    }

    private boolean isMethodNotAllowed(Throwable error) {
        Throwable current = error;
        while (current != null) {
            String message = clean(current.getMessage()).toLowerCase(Locale.ROOT);
            if (message.contains("(405)") || message.contains("method not allowed")) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }

    private AnalysisResult generateWithUploadPayload(String modelAlias, BufferedImage image, String imageStyle, String key) throws Exception {
        return generateWithUploadPayload(modelAlias, image, imageStyle, key, null);
    }

    private AnalysisResult generateWithUploadPayload(String modelAlias, BufferedImage image, String imageStyle, String key, String extraPrompt) throws Exception {
        Exception primaryError;
        try {
            UploadPayload primary = buildPrimaryUploadPayload(image);
            String fileId = uploadImageFile(modelAlias, primary, key);
            log.info("[AI Invitation] uploaded analysis image: alias={}, uploadName={}, fileId={}", normalizeModelAlias(modelAlias), primary.filename(), fileId);
            return analyzeReferenceImageByFileId(modelAlias, fileId, imageStyle, key, extraPrompt);
        } catch (Exception e) {
            primaryError = e;
        }

        try {
            UploadPayload fallback = buildFallbackUploadPayload(image);
            String fileId = uploadImageFile(modelAlias, fallback, key);
            log.info("[AI Invitation] uploaded analysis image: alias={}, uploadName={}, fileId={}", normalizeModelAlias(modelAlias), fallback.filename(), fileId);
            return analyzeReferenceImageByFileId(modelAlias, fileId, imageStyle, key, extraPrompt);
        } catch (Exception fallbackError) {
            throw new IllegalStateException(
                "실제 파일 업로드 분석 실패 (png: " + primaryError.getMessage() + ", jpg: " + fallbackError.getMessage() + ")",
                fallbackError
            );
        }
    }

    private AnalysisResult analyzeReferenceImageByFileId(String modelAlias, String fileId, String imageStyle, String key) throws Exception {
        return analyzeReferenceImageByFileId(modelAlias, fileId, imageStyle, key, null);
    }

    private AnalysisResult analyzeReferenceImageByFileId(String modelAlias, String fileId, String imageStyle, String key, String extraPrompt) throws Exception {
        if ("openclaw3".equals(normalizeModelAlias(modelAlias))) {
            String visionContext = extractVisionContextByFileId(modelAlias, fileId, key);
            return analyzeReferenceFromVisionContext(modelAlias, imageStyle, key, extraPrompt, visionContext);
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("SessionKey", newAnalysisSessionKey(modelAlias, "image-file", fileId));
        payload.put("model", resolveVisionModelName(modelAlias));
        payload.put("input", new Object[] {
            Map.of(
                "type", "message",
                "role", "user",
                "content", new Object[] {
                    Map.of("type", "input_text", "text", buildAnalysisPrompt(imageStyle, extraPrompt)),
                    Map.of(
                        "type", "input_image",
                        "source", Map.of(
                            "type", "file_id",
                            "file_id", fileId
                        )
                    )
                }
            )
        });

        JsonNode root = postJson(resolveResponsesEndpoint(modelAlias), payload, key, Duration.ofSeconds(120));
        return parseAnalysisResponse(root);
    }

    private AnalysisResult analyzeReferenceImageByMediaPath(String modelAlias, String mediaPath, String mediaType, String imageStyle, String key) throws Exception {
        return analyzeReferenceImageByMediaPath(modelAlias, mediaPath, mediaType, imageStyle, key, null);
    }

    private AnalysisResult analyzeReferenceImageByMediaPath(String modelAlias, String mediaPath, String mediaType, String imageStyle, String key, String extraPrompt) throws Exception {
        if ("openclaw3".equals(normalizeModelAlias(modelAlias))) {
            String visionContext = extractVisionContextByMediaPath(modelAlias, mediaPath, mediaType, key);
            return analyzeReferenceFromVisionContext(modelAlias, imageStyle, key, extraPrompt, visionContext);
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("SessionKey", newAnalysisSessionKey(modelAlias, "image-media", mediaPath));
        payload.put("model", resolveVisionModelName(modelAlias));
        payload.put("response_format", Map.of("type", "json_object"));
        payload.put("MediaPath", mediaPath);
        payload.put("MediaUrl", mediaPath);
        payload.put("MediaPaths", new String[] { mediaPath });
        payload.put("MediaUrls", new String[] { mediaPath });
        payload.put("MediaType", mediaType);
        payload.put("messages", new Object[] {
            Map.of(
                "role", "user",
                "content", new Object[] {
                    Map.of("type", "text", "text", buildAnalysisPrompt(imageStyle, extraPrompt))
                }
            )
        });

        JsonNode root = postJson(resolveEndpoint(modelAlias), payload, key);
        return parseAnalysisResponse(root);
    }

    private String extractVisionContextByFileId(String modelAlias, String fileId, String key) throws Exception {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("SessionKey", newAnalysisSessionKey(modelAlias, "vision-file", fileId));
        payload.put("model", resolveVisionModelName(modelAlias));
        payload.put("input", new Object[] {
            Map.of(
                "type", "message",
                "role", "user",
                "content", new Object[] {
                    Map.of("type", "input_text", "text", buildVisionExtractionPrompt()),
                    Map.of(
                        "type", "input_image",
                        "source", Map.of(
                            "type", "file_id",
                            "file_id", fileId
                        )
                    )
                }
            )
        });
        JsonNode root = postJson(resolveResponsesEndpoint(modelAlias), payload, key, Duration.ofSeconds(120));
        String content = extractResponseText(root);
        if (content.isBlank()) {
            throw new IllegalStateException("비전 분석 결과가 비어 있습니다.");
        }
        return content;
    }

    private String extractVisionContextByMediaPath(String modelAlias, String mediaPath, String mediaType, String key) throws Exception {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("SessionKey", newAnalysisSessionKey(modelAlias, "vision-media", mediaPath));
        payload.put("model", resolveVisionModelName(modelAlias));
        payload.put("MediaPath", mediaPath);
        payload.put("MediaUrl", mediaPath);
        payload.put("MediaPaths", new String[] { mediaPath });
        payload.put("MediaUrls", new String[] { mediaPath });
        payload.put("MediaType", mediaType);
        payload.put("messages", new Object[] {
            Map.of(
                "role", "user",
                "content", new Object[] {
                    Map.of("type", "text", "text", buildVisionExtractionPrompt())
                }
            )
        });
        JsonNode root = postJson(resolveEndpoint(modelAlias), payload, key, Duration.ofSeconds(120));
        String content = extractResponseText(root);
        if (content.isBlank()) {
            throw new IllegalStateException("비전 분석 결과가 비어 있습니다.");
        }
        return content;
    }

    private AnalysisResult analyzeReferenceFromVisionContext(String modelAlias, String imageStyle, String key, String extraPrompt, String visionContext) throws Exception {
        releaseVisionModelIfConfigured(modelAlias);

        String generalModelName = resolveGeneralModelName(modelAlias);
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("SessionKey", newAnalysisSessionKey(modelAlias, "vision-final", visionContext));
        payload.put("model", generalModelName);
        payload.put("input", new Object[] {
            Map.of(
                "type", "message",
                "role", "user",
                "content", new Object[] {
                    Map.of("type", "input_text", "text", buildAnalysisFromVisionContextPrompt(imageStyle, extraPrompt, visionContext))
                }
            )
        });

        try {
            JsonNode root = postJson(resolveResponsesEndpoint(modelAlias), payload, key, Duration.ofSeconds(120));
            return parseAnalysisResponse(root);
        } finally {
            releaseOllamaModelIfConfigured(modelAlias, generalModelName, "general");
        }
    }

    private void releaseVisionModelIfConfigured(String modelAlias) {
        releaseOllamaModelIfConfigured(modelAlias, resolveVisionModelName(modelAlias), "vision");
    }

    private void releaseOllamaModelIfConfigured(String modelAlias, String modelName, String phase) {
        if (!"openclaw3".equals(normalizeModelAlias(modelAlias))) {
            return;
        }
        if (!openClawOllamaUnloadAfterVision) {
            log.info("[OpenClaw3] skip Ollama {} unload: disabled", phase);
            return;
        }

        String baseUrl = clean(openClawOllamaUrlOpenClaw3);
        if (baseUrl.isBlank()) {
            log.info("[OpenClaw3] skip Ollama {} unload: ollama url is blank", phase);
            return;
        }

        String ollamaModelName = toOllamaModelName(modelName);
        if (ollamaModelName.isBlank()) {
            log.info("[OpenClaw3] skip Ollama {} unload: model name is blank", phase);
            return;
        }

        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("model", ollamaModelName);
            payload.put("prompt", "");
            payload.put("stream", false);
            payload.put("keep_alive", 0);

            HttpRequest request = HttpRequest.newBuilder(URI.create(join(baseUrl, "/api/generate")))
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(10))
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(payload), StandardCharsets.UTF_8))
                .build();

            HttpResponse<Void> response = HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.discarding());
            log.info("[OpenClaw3] Ollama {} unload requested: model={}, url={}, status={}", phase, ollamaModelName, baseUrl, response.statusCode());
        } catch (Exception e) {
            log.warn("[OpenClaw3] Ollama {} unload failed: model={}, url={}, error={}", phase, ollamaModelName, baseUrl, e.toString());
        }
    }

    private String buildAnalysisPrompt(String imageStyle) {
        return buildAnalysisPrompt(imageStyle, null);
    }

    private String buildAnalysisPrompt(String imageStyle, String extraPrompt) {
        String styleLabel = "full".equals(imageStyle) ? "전체 사진" : "일반 박스";
        String prompt = """
            Analyze this wedding photo for invitation design.
            Return only one JSON object.
            Required keys:
            - summary: short Korean summary of the mood (max 40 chars)
            - sceneType: one of [forest, sea, garden, city, indoor, hotel, studio, sunset, night, floral, classic, modern, luxury, other]
            - congratulatoryMessage: Korean factual scene description in 1-3 sentences (can be empty if not enough detail)
            - bgColor: hex color
            - subBgColor: hex color
            - textColor: hex color
            - pointColor: hex color
            - titleColor: hex color
            - nameColor: hex color
            - dateColor: hex color
            - messageColor: hex color
            - sectionTitleColor: hex color
            - buttonColor: hex color
            - buttonTextColor: hex color
            Rules:
            - Keep the uploaded photo as the main image. Do not generate a replacement image.
            - First understand the photo in detail before choosing colors.
            - Carefully inspect: background location, venue type, indoor or outdoor, natural elements, sky or water, trees or flowers, architecture, hotel mood, studio mood, city mood, time of day, season feeling, weather feeling, brightness, contrast, and overall luxury level.
            - Carefully inspect the couple: pose, distance between them, eye contact, smile, energy level, whether they are walking, running, standing, holding flowers, bouquet presence, dress silhouette, suit tone, veil, fabric texture, and whether the mood feels formal, romantic, lively, calm, elegant, luxurious, or natural.
            - Detect the dominant scene first, then choose sceneType from the allowed list.
            - Scene examples:
            - forest photo -> forest-friendly palette and natural premium background tone.
            - sea photo -> ocean-friendly palette and clean airy background tone.
            - luxury venue or hotel photo -> luxury premium background tone.
            - floral or garden photo -> soft botanical romantic background tone.
            - city or modern venue photo -> clean refined urban palette.
            - studio photo -> controlled soft editorial palette.
            - sunset or night photo -> warm dramatic or deep elegant palette.
            - The color palette must be intentionally derived from the actual image, not generic.
            - Match colors to the photo's real dominant hues, lighting, depth, and emotional tone.
            - If the background is vivid, keep readability high with a controlled premium contrast.
            - If the photo feels luxurious, use more sophisticated, darker, cleaner, richer tones.
            - If the photo feels natural or bright, use softer, cleaner, airier tones.
            - Summary must reflect the actual visual mood, not a generic wedding phrase.
            - congratulatoryMessage should NOT be a congratulation for this test.
            - Use congratulatoryMessage as a detailed factual description of what is visually happening in the image.
            - Describe the visible scene precisely: who is standing or walking, bouquet or flowers, pose, facial expression, dress and suit tone, venue or background, lighting direction, surrounding objects, and the overall composition.
            - If exact detail is unclear, say only what is visually plausible and avoid inventing hidden details.
            - Choose a matching invitation background and text palette that fits the uploaded photo and a Korean mobile wedding invitation hero section.
            - The result must fit a Korean mobile wedding invitation hero section.
            - Layout target: %s
            - The returned colors must feel intentionally matched to the detected scene, not generic.
            - Output only a raw JSON object with no markdown, no code fences, and no extra explanation.
            """.formatted(styleLabel);
        String extra = clean(extraPrompt);
        if (!extra.isBlank()) {
            prompt += """

                Additional user design request:
                %s

                - Apply the user request, but still keep the uploaded photo as the primary visual source.
                - Use the photo first, then refine the palette and mood to match the request.
                - If the user request conflicts with the actual photo, prioritize the actual photo while reflecting the request as a secondary styling hint.
                """.formatted(extra);
        }
        return prompt;
    }

    private String buildVisionExtractionPrompt() {
        return """
            Analyze the uploaded wedding image and describe only the visible facts.
            Do not return JSON.
            Write concise Korean prose in 4-8 sentences.
            Include:
            - background location and venue
            - indoor or outdoor
            - lighting, time-of-day, brightness, color temperature
            - visible people, pose, facial expression, bouquet, dress, suit, composition
            - dominant mood and notable colors
            Do not invent hidden details. Only describe what is visually plausible from the image.
            """;
    }

    private String buildAnalysisFromVisionContextPrompt(String imageStyle, String extraPrompt, String visionContext) {
        String styleLabel = "full".equals(imageStyle) ? "전체 사진" : "일반 박스";
        String prompt = """
            You are given a factual visual analysis of a wedding photo.
            Use only that analysis as the source of truth.
            Return only one JSON object.
            Required keys:
            - summary: short Korean summary of the mood (max 40 chars)
            - sceneType: one of [forest, sea, garden, city, indoor, hotel, studio, sunset, night, floral, classic, modern, luxury, other]
            - congratulatoryMessage: Korean factual scene description in 1-3 sentences (can be empty if not enough detail)
            - bgColor: hex color
            - subBgColor: hex color
            - textColor: hex color
            - pointColor: hex color
            - titleColor: hex color
            - nameColor: hex color
            - dateColor: hex color
            - messageColor: hex color
            - sectionTitleColor: hex color
            - buttonColor: hex color
            - buttonTextColor: hex color
            Rules:
            - Treat the visual analysis below as the only photo source.
            - Keep the uploaded photo as the main image. Do not generate a replacement image.
            - Derive the palette from the described scene, lighting, composition, and mood.
            - Layout target: %s
            - Output only a raw JSON object with no markdown, no code fences, and no extra explanation.

            Visual analysis:
            %s
            """.formatted(styleLabel, clean(visionContext));

        String extra = clean(extraPrompt);
        if (!extra.isBlank()) {
            prompt += """

                Additional user design request:
                %s

                - Apply the user request, but still prioritize the provided visual analysis.
                - If the request conflicts with the visual analysis, prioritize the visual analysis and use the request as a secondary styling hint.
                """.formatted(extra);
        }

        return prompt;
    }

    private AnalysisResult analyzePromptOnly(String modelAlias, String imageStyle, String key, String promptRequest) throws Exception {
        String generalModelName = resolveGeneralModelName(modelAlias);
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("SessionKey", newAnalysisSessionKey(modelAlias, "prompt-only", promptRequest));
        payload.put("model", generalModelName);
        payload.put("response_format", Map.of("type", "json_object"));
        payload.put("messages", new Object[] {
            Map.of(
                "role", "user",
                "content", new Object[] {
                    Map.of("type", "text", "text", buildPromptOnlyAnalysisPrompt(imageStyle, promptRequest))
                }
            )
        });

        try {
            JsonNode root = postJson(resolveEndpoint(modelAlias), payload, key);
            return parseAnalysisResponse(root);
        } finally {
            releaseOllamaModelIfConfigured(modelAlias, generalModelName, "general");
        }
    }

    private String buildPromptOnlyAnalysisPrompt(String imageStyle, String promptRequest) {
        String styleLabel = "full".equals(imageStyle) ? "전체 사진" : "일반 박스";
        return """
            Create a wedding invitation design direction from the user's prompt only.
            There is no reference photo.
            Return only one JSON object.
            Required keys:
            - summary: short Korean summary of the mood (max 40 chars)
            - sceneType: one of [forest, sea, garden, city, indoor, hotel, studio, sunset, night, floral, classic, modern, luxury, other]
            - congratulatoryMessage: Korean factual design description in 1-3 sentences (describe the intended mood and composition, not a congratulation)
            - bgColor: hex color
            - subBgColor: hex color
            - textColor: hex color
            - pointColor: hex color
            - titleColor: hex color
            - nameColor: hex color
            - dateColor: hex color
            - messageColor: hex color
            - sectionTitleColor: hex color
            - buttonColor: hex color
            - buttonTextColor: hex color
            Rules:
            - Infer the invitation mood only from the user's request.
            - Build a coherent Korean mobile wedding invitation palette and tone.
            - Layout target: %s
            - The palette must feel intentional, premium, and internally consistent.
            - congratulatoryMessage should describe the intended visual style and atmosphere in Korean.
            - Output only a raw JSON object with no markdown, no code fences, and no extra explanation.

            User design request:
            %s
            """.formatted(styleLabel, clean(promptRequest));
    }

    private AnalysisResult parseAnalysisResponse(JsonNode root) throws Exception {
        JsonNode contentNode = root.path("choices").path(0).path("message").path("content");
        if (contentNode == null || contentNode.isMissingNode() || contentNode.isNull()) {
            JsonNode outputNode = root.path("output");
            if (outputNode.isArray() && outputNode.size() > 0) {
                contentNode = outputNode.path(0).path("content");
            }
        }
        String content = extractResponseContent(contentNode);
        if (content.isBlank()) {
            throw new IllegalStateException("이미지 분석 응답이 비어 있습니다.");
        }
        JsonNode parsed = objectMapper.readTree(cleanJsonEnvelope(content));
        String sceneType = textOrDefault(parsed.path("sceneType").asText(""), "other");
        String summary = textOrDefault(parsed.path("summary").asText(""), defaultSummaryForScene(sceneType));
        String congratulatoryMessage = clean(parsed.path("congratulatoryMessage").asText(""));
        Map<String, Object> configPatch = new LinkedHashMap<>();
        putColor(configPatch, "bgColor", parsed.path("bgColor").asText(""));
        putColor(configPatch, "subBgColor", parsed.path("subBgColor").asText(""));
        putColor(configPatch, "textColor", parsed.path("textColor").asText(""));
        putColor(configPatch, "pointColor", parsed.path("pointColor").asText(""));
        putColor(configPatch, "titleColor", parsed.path("titleColor").asText(""));
        putColor(configPatch, "nameColor", parsed.path("nameColor").asText(""));
        putColor(configPatch, "dateColor", parsed.path("dateColor").asText(""));
        putColor(configPatch, "messageColor", parsed.path("messageColor").asText(""));
        putColor(configPatch, "sectionTitleColor", parsed.path("sectionTitleColor").asText(""));
        putColor(configPatch, "buttonColor", parsed.path("buttonColor").asText(""));
        putColor(configPatch, "buttonTextColor", parsed.path("buttonTextColor").asText(""));
        if (configPatch.isEmpty()) {
            configPatch.putAll(defaultPaletteForScene(sceneType));
        }
        return new AnalysisResult(summary, congratulatoryMessage, configPatch);
    }

    private String extractResponseContent(JsonNode contentNode) {
        if (contentNode == null || contentNode.isMissingNode() || contentNode.isNull()) {
            return "";
        }
        if (contentNode.isTextual()) {
            return contentNode.asText("");
        }
        if (contentNode.isArray()) {
            StringBuilder buffer = new StringBuilder();
            for (JsonNode item : contentNode) {
                if (item == null || item.isNull()) continue;
                if (item.isTextual()) {
                    buffer.append(item.asText(""));
                    continue;
                }
                JsonNode textNode = item.path("text");
                if (textNode.isTextual()) {
                    buffer.append(textNode.asText(""));
                    continue;
                }
                JsonNode nested = item.path("content");
                if (nested.isTextual()) {
                    buffer.append(nested.asText(""));
                }
            }
            return buffer.toString();
        }
        JsonNode textNode = contentNode.path("text");
        if (textNode.isTextual()) {
            return textNode.asText("");
        }
        return contentNode.asText("");
    }

    private String extractResponseText(JsonNode root) {
        JsonNode contentNode = root.path("choices").path(0).path("message").path("content");
        if (contentNode == null || contentNode.isMissingNode() || contentNode.isNull()) {
            JsonNode outputNode = root.path("output");
            if (outputNode.isArray() && outputNode.size() > 0) {
                contentNode = outputNode.path(0).path("content");
            }
        }
        return clean(extractResponseContent(contentNode));
    }

    private String cleanJsonEnvelope(String rawContent) {
        String cleaned = clean(rawContent);
        if (cleaned.startsWith("```")) {
            int firstNewline = cleaned.indexOf('\n');
            if (firstNewline >= 0) {
                cleaned = cleaned.substring(firstNewline + 1).trim();
            }
            if (cleaned.endsWith("```")) {
                cleaned = cleaned.substring(0, cleaned.length() - 3).trim();
            }
        }

        int firstBrace = cleaned.indexOf('{');
        int lastBrace = cleaned.lastIndexOf('}');
        if (firstBrace >= 0 && lastBrace > firstBrace) {
            cleaned = cleaned.substring(firstBrace, lastBrace + 1);
        }

        return cleaned;
    }

    private String buildOpenClawMediaPath(String modelAlias, String photoUrl) {
        String filename = extractUploadFilename(photoUrl);
        String root = clean(resolveMediaRoot(modelAlias));
        if (root.isBlank()) {
            throw new IllegalStateException("OpenClaw MediaPath 루트 설정이 비어 있습니다.");
        }
        return join(root, filename);
    }

    private String resolveMediaRoot(String modelAlias) {
        return switch (normalizeModelAlias(modelAlias)) {
            case "openclaw2" -> openClawMediaRootOpenClaw2;
            case "openclaw3" -> openClawMediaRootOpenClaw3;
            default -> openClawMediaRootOpenClaw1;
        };
    }

    private String extractUploadFilename(String photoUrl) {
        String raw = clean(photoUrl);
        if (raw.startsWith("/uploads/")) {
            return validateUploadFilename(Paths.get(raw).getFileName().toString());
        }
        if (raw.startsWith("file_")) {
            return validateUploadFilename(raw);
        }
        if (raw.startsWith("http://") || raw.startsWith("https://")) {
            try {
                URI uri = URI.create(raw);
                String path = clean(uri.getPath());
                if (path.startsWith("/uploads/")) {
                    return validateUploadFilename(Paths.get(path).getFileName().toString());
                }
            } catch (Exception ignored) {
                // Fall through.
            }
        }
        throw new IllegalStateException("지원하지 않는 이미지 참조 형식입니다.");
    }

    private String resolveMediaType(String photoUrl) {
        String filename = extractUploadFilename(photoUrl).toLowerCase(Locale.ROOT);
        if (filename.endsWith(".png")) return "image/png";
        if (filename.endsWith(".webp")) return "image/webp";
        if (filename.endsWith(".gif")) return "image/gif";
        return "image/jpeg";
    }

    private String uploadImageFile(String modelAlias, UploadPayload payload, String key) throws Exception {
        String boundary = "----OpenClawBoundary" + System.nanoTime();
        byte[] body = buildMultipartBody(boundary, payload);
        HttpRequest request = HttpRequest.newBuilder(URI.create(resolveFilesEndpoint(modelAlias)))
            .header("Content-Type", "multipart/form-data; boundary=" + boundary)
            .header(clean(openClawAuthHeader), "bearer".equalsIgnoreCase(clean(openClawAuthType)) ? "Bearer " + key : key)
            .timeout(Duration.ofSeconds(90))
            .POST(HttpRequest.BodyPublishers.ofByteArray(body))
            .build();

        HttpResponse<String> response = HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IllegalStateException("OpenClaw 파일 업로드 실패(" + response.statusCode() + "): " + response.body());
        }

        JsonNode root = objectMapper.readTree(response.body());
        String fileId = clean(root.path("id").asText(""));
        if (fileId.isBlank()) {
            throw new IllegalStateException("OpenClaw 파일 업로드 응답에 id가 없습니다.");
        }
        return fileId;
    }

    private JsonNode postJson(String url, Map<String, Object> payload, String key) throws Exception {
        return postJson(url, payload, key, Duration.ofSeconds(90));
    }

    private JsonNode postJson(String url, Map<String, Object> payload, String key, Duration timeout) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create(url))
            .header("Content-Type", "application/json")
            .header(clean(openClawAuthHeader), "bearer".equalsIgnoreCase(clean(openClawAuthType)) ? "Bearer " + key : key)
            .timeout(timeout)
            .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(payload), StandardCharsets.UTF_8))
            .build();

        HttpResponse<String> response = HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IllegalStateException("OpenClaw 호출 실패(" + response.statusCode() + "): " + response.body());
        }
        return objectMapper.readTree(response.body());
    }

    private BufferedImage loadAnalysisImage(String photoUrl) {
        String raw = clean(photoUrl);
        log.info("[AI Invitation] load analysis image: source={}", raw);
        if (raw.startsWith("/uploads/")) {
            return loadNormalizedUploadImage(Paths.get(raw).getFileName().toString());
        }
        if (raw.startsWith("file_")) {
            return loadNormalizedUploadImage(raw);
        }
        if (raw.startsWith("http://") || raw.startsWith("https://")) {
            try {
                URI uri = URI.create(raw);
                String path = clean(uri.getPath());
                if (path.startsWith("/uploads/")) {
                    return loadNormalizedUploadImage(Paths.get(path).getFileName().toString());
                }
            } catch (Exception ignored) {
                // Fall through to unsupported remote URL.
            }
            throw new IllegalStateException("외부 URL 이미지는 현재 지원하지 않습니다.");
        }
        throw new IllegalStateException("지원하지 않는 이미지 참조 형식입니다.");
    }

    private BufferedImage loadNormalizedUploadImage(String filename) {
        String safeName = validateUploadFilename(filename);
        Path imagePath = resolveUploadDirPath().resolve(safeName).normalize();
        log.info("[AI Invitation] resolve local analysis image: filename={}, path={}", safeName, imagePath.toAbsolutePath());
        if (!Files.exists(imagePath) || !Files.isRegularFile(imagePath)) {
            throw new IllegalStateException("업로드 이미지를 찾을 수 없습니다.");
        }
        try {
            BufferedImage source = ImageIO.read(imagePath.toFile());
            if (source == null) {
                throw new IllegalStateException("이미지 파일을 읽을 수 없습니다.");
            }
            return resizeForAnalysis(source, 1024);
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("업로드 이미지를 처리할 수 없습니다.", e);
        }
    }

    private Path resolveUploadDirPath() {
        String configured = clean(uploadDir);
        if (configured.isBlank()) {
            return Paths.get("uploads").toAbsolutePath().normalize();
        }
        return Paths.get(configured).toAbsolutePath().normalize();
    }

    private String validateUploadFilename(String filename) {
        String safeName = clean(filename);
        if (safeName.isBlank()) {
            throw new IllegalStateException("업로드 이미지 파일명이 비어 있습니다.");
        }
        if (safeName.contains("..") || safeName.contains("/") || safeName.contains("\\")) {
            throw new IllegalStateException("업로드 이미지 파일명이 올바르지 않습니다.");
        }
        return safeName;
    }

    private BufferedImage resizeForAnalysis(BufferedImage source, int maxDimension) {
        int width = source.getWidth();
        int height = source.getHeight();
        int longest = Math.max(width, height);
        if (longest <= maxDimension) {
            return toRgbImage(source, width, height);
        }

        double scale = maxDimension / (double) longest;
        int targetWidth = Math.max(1, (int) Math.round(width * scale));
        int targetHeight = Math.max(1, (int) Math.round(height * scale));
        return toRgbImage(source, targetWidth, targetHeight);
    }

    private BufferedImage toRgbImage(BufferedImage source, int targetWidth, int targetHeight) {
        BufferedImage output = new BufferedImage(targetWidth, targetHeight, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = output.createGraphics();
        try {
            graphics.setColor(Color.WHITE);
            graphics.fillRect(0, 0, targetWidth, targetHeight);
            graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            graphics.drawImage(source, 0, 0, targetWidth, targetHeight, null);
        } finally {
            graphics.dispose();
        }
        return output;
    }

    private byte[] writeJpeg(BufferedImage image, float quality) throws Exception {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        ImageWriter writer = ImageIO.getImageWritersByFormatName("jpeg").next();
        try (MemoryCacheImageOutputStream imageOutputStream = new MemoryCacheImageOutputStream(outputStream)) {
            writer.setOutput(imageOutputStream);
            ImageWriteParam params = writer.getDefaultWriteParam();
            if (params.canWriteCompressed()) {
                params.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
                params.setCompressionQuality(quality);
            }
            writer.write(null, new IIOImage(image, null, null), params);
        } finally {
            writer.dispose();
        }
        return outputStream.toByteArray();
    }

    private byte[] writePng(BufferedImage image) throws Exception {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        if (!ImageIO.write(image, "png", outputStream)) {
            throw new IllegalStateException("PNG 이미지로 변환할 수 없습니다.");
        }
        return outputStream.toByteArray();
    }

    private UploadPayload buildPrimaryUploadPayload(BufferedImage image) throws Exception {
        return new UploadPayload(
            image,
            writePng(image),
            "image/png",
            "a.png"
        );
    }

    private UploadPayload buildFallbackUploadPayload(BufferedImage image) throws Exception {
        return new UploadPayload(
            image,
            writeJpeg(image, 0.65f),
            "image/jpeg",
            "a.jpg"
        );
    }

    private byte[] buildMultipartBody(String boundary, UploadPayload payload) throws Exception {
        String lineBreak = "\r\n";
        ByteArrayOutputStream output = new ByteArrayOutputStream();

        output.write(("--" + boundary + lineBreak).getBytes(StandardCharsets.UTF_8));
        output.write(("Content-Disposition: form-data; name=\"purpose\"" + lineBreak + lineBreak).getBytes(StandardCharsets.UTF_8));
        output.write(("assistants" + lineBreak).getBytes(StandardCharsets.UTF_8));

        output.write(("--" + boundary + lineBreak).getBytes(StandardCharsets.UTF_8));
        output.write(("Content-Disposition: form-data; name=\"file\"; filename=\"" + payload.filename() + "\"" + lineBreak).getBytes(StandardCharsets.UTF_8));
        output.write(("Content-Type: " + payload.contentType() + lineBreak + lineBreak).getBytes(StandardCharsets.UTF_8));
        output.write(payload.bytes());
        output.write(lineBreak.getBytes(StandardCharsets.UTF_8));

        output.write(("--" + boundary + "--" + lineBreak).getBytes(StandardCharsets.UTF_8));
        return output.toByteArray();
    }

    private String normalizeImageStyle(String imageStyle) {
        return "full".equalsIgnoreCase(clean(imageStyle)) ? "full" : "standard";
    }

    private String textOrDefault(String value, String fallback) {
        String cleaned = clean(value);
        return cleaned.isBlank() ? fallback : cleaned;
    }

    private String defaultSummaryForScene(String sceneType) {
        return switch (clean(sceneType).toLowerCase(Locale.ROOT)) {
            case "forest" -> "푸른 숲 감성";
            case "sea" -> "맑은 바다 감성";
            case "garden", "floral" -> "부드러운 플로럴 감성";
            case "hotel", "luxury" -> "고급스러운 럭셔리 무드";
            case "city", "modern" -> "세련된 도시 감성";
            case "sunset" -> "따뜻한 노을 감성";
            case "night" -> "깊은 야간 무드";
            case "indoor", "studio", "classic" -> "단정한 실내 감성";
            default -> "사진 분위기 기반";
        };
    }

    private Map<String, Object> defaultPaletteForScene(String sceneType) {
        return switch (clean(sceneType).toLowerCase(Locale.ROOT)) {
            case "forest" -> Map.ofEntries(
                Map.entry("bgColor", "#EEF5EF"),
                Map.entry("subBgColor", "#DCEBDD"),
                Map.entry("textColor", "#1F3527"),
                Map.entry("pointColor", "#4C8B5F"),
                Map.entry("titleColor", "#1F3527"),
                Map.entry("nameColor", "#254330"),
                Map.entry("dateColor", "#426A4D"),
                Map.entry("messageColor", "#32523B"),
                Map.entry("sectionTitleColor", "#2E5A3A"),
                Map.entry("buttonColor", "#315F3D"),
                Map.entry("buttonTextColor", "#FFFFFF")
            );
            case "sea" -> Map.ofEntries(
                Map.entry("bgColor", "#EEF7FB"),
                Map.entry("subBgColor", "#D9ECF6"),
                Map.entry("textColor", "#16394F"),
                Map.entry("pointColor", "#3A84B8"),
                Map.entry("titleColor", "#16394F"),
                Map.entry("nameColor", "#1D4E6F"),
                Map.entry("dateColor", "#4A7391"),
                Map.entry("messageColor", "#32566F"),
                Map.entry("sectionTitleColor", "#2E668A"),
                Map.entry("buttonColor", "#2E6F9B"),
                Map.entry("buttonTextColor", "#FFFFFF")
            );
            case "hotel", "luxury" -> Map.ofEntries(
                Map.entry("bgColor", "#F6F0E7"),
                Map.entry("subBgColor", "#E8DBC6"),
                Map.entry("textColor", "#2B221A"),
                Map.entry("pointColor", "#B28A4A"),
                Map.entry("titleColor", "#2B221A"),
                Map.entry("nameColor", "#3A2E21"),
                Map.entry("dateColor", "#7A6240"),
                Map.entry("messageColor", "#4B3B2B"),
                Map.entry("sectionTitleColor", "#60492F"),
                Map.entry("buttonColor", "#8D6B36"),
                Map.entry("buttonTextColor", "#FFFFFF")
            );
            case "garden", "floral" -> Map.ofEntries(
                Map.entry("bgColor", "#FBF4F7"),
                Map.entry("subBgColor", "#F5E3EA"),
                Map.entry("textColor", "#4A2A35"),
                Map.entry("pointColor", "#C97A96"),
                Map.entry("titleColor", "#4A2A35"),
                Map.entry("nameColor", "#5A3341"),
                Map.entry("dateColor", "#8F5A6D"),
                Map.entry("messageColor", "#6F4656"),
                Map.entry("sectionTitleColor", "#7E4C5F"),
                Map.entry("buttonColor", "#B56785"),
                Map.entry("buttonTextColor", "#FFFFFF")
            );
            default -> Map.ofEntries(
                Map.entry("bgColor", "#F8F7F4"),
                Map.entry("subBgColor", "#EEEAE3"),
                Map.entry("textColor", "#2A2A2A"),
                Map.entry("pointColor", "#8B6E5A"),
                Map.entry("titleColor", "#2A2A2A"),
                Map.entry("nameColor", "#333333"),
                Map.entry("dateColor", "#6C6259"),
                Map.entry("messageColor", "#4A433D"),
                Map.entry("sectionTitleColor", "#5A5048"),
                Map.entry("buttonColor", "#6E5847"),
                Map.entry("buttonTextColor", "#FFFFFF")
            );
        };
    }

    private String defaultCongratulatoryMessage(String sceneType) {
        return switch (clean(sceneType).toLowerCase(Locale.ROOT)) {
            case "forest" -> "푸른 숲 속에서 함께한 두 분의 모습이 참 아름답습니다. 결혼을 진심으로 축하드리며, 오래도록 따뜻하고 행복한 결혼 생활이 되시길 바랍니다.";
            case "sea" -> "맑고 시원한 바다처럼 두 분의 앞날도 환하게 펼쳐지길 바랍니다. 결혼을 진심으로 축하드리며, 웃음 가득한 날들이 오래도록 이어지길 바랍니다.";
            case "hotel", "luxury" -> "고급스럽고 빛나는 분위기만큼 두 분의 시작도 참 아름답습니다. 결혼을 진심으로 축하드리며, 품격 있고 행복한 결혼 생활이 되시길 바랍니다.";
            case "garden", "floral" -> "꽃처럼 화사한 두 분의 순간이 참 인상적입니다. 결혼을 진심으로 축하드리며, 늘 설레고 다정한 날들이 이어지길 바랍니다.";
            default -> "두 분의 소중한 순간이 참 아름답습니다. 결혼을 진심으로 축하드리며, 오래도록 행복한 결혼 생활이 되시길 바랍니다.";
        };
    }

    private void putColor(Map<String, Object> target, String key, String raw) {
        String cleaned = normalizeHexColor(raw);
        if (!cleaned.isBlank()) {
            target.put(key, cleaned);
        }
    }

    private String normalizeHexColor(String raw) {
        String value = clean(raw);
        if (value.matches("^#[0-9a-fA-F]{6}$")) return value.toUpperCase(Locale.ROOT);
        if (value.matches("^#[0-9a-fA-F]{3}$")) {
            char r = value.charAt(1);
            char g = value.charAt(2);
            char b = value.charAt(3);
            return ("#" + r + r + g + g + b + b).toUpperCase(Locale.ROOT);
        }
        return "";
    }

    private String resolveEndpoint(String modelAlias) {
        String directUrl = clean(resolveDirectUrl(modelAlias));
        if (!directUrl.isBlank()) {
            return ensureChatPath(directUrl);
        }
        String base = clean(openClawBaseUrl);
        if (base.isBlank()) {
            throw new IllegalStateException("OPENCLAW_URL_OPENCLAW* 또는 OPENCLAW_BASE_URL 설정이 비어 있습니다.");
        }
        return join(base, clean(openClawChatPath));
    }

    private String resolveResponsesEndpoint(String modelAlias) {
        String directUrl = clean(resolveDirectUrl(modelAlias));
        if (!directUrl.isBlank()) {
            return join(stripPath(directUrl), clean(openClawResponsesPath));
        }
        String base = clean(openClawBaseUrl);
        if (base.isBlank()) {
            throw new IllegalStateException("OPENCLAW_URL_OPENCLAW* 또는 OPENCLAW_BASE_URL 설정이 비어 있습니다.");
        }
        return join(base, clean(openClawResponsesPath));
    }

    private String resolveFilesEndpoint(String modelAlias) {
        String directUrl = clean(resolveDirectUrl(modelAlias));
        if (!directUrl.isBlank()) {
            return join(stripPath(directUrl), "/v1/files");
        }
        String base = clean(openClawBaseUrl);
        if (base.isBlank()) {
            throw new IllegalStateException("OPENCLAW_URL_OPENCLAW* 또는 OPENCLAW_BASE_URL 설정이 비어 있습니다.");
        }
        return join(base, "/v1/files");
    }

    private String resolveDirectUrl(String modelAlias) {
        return switch (normalizeModelAlias(modelAlias)) {
            case "openclaw2" -> openClawUrlOpenClaw2;
            case "openclaw3" -> openClawUrlOpenClaw3;
            default -> openClawUrlOpenClaw1;
        };
    }

    private String ensureChatPath(String url) {
        try {
            URI uri = URI.create(url);
            String path = uri.getPath();
            if (path == null || path.isBlank() || "/".equals(path)) {
                return join(url, clean(openClawChatPath));
            }
            return url;
        } catch (Exception ignored) {
            return url;
        }
    }

    private String stripPath(String url) {
        try {
            URI uri = URI.create(url);
            String scheme = uri.getScheme();
            String authority = uri.getRawAuthority();
            if (scheme == null || authority == null) {
                return url;
            }
            return scheme + "://" + authority;
        } catch (Exception ignored) {
            return url;
        }
    }

    private String resolveAuthToken(String modelAlias) {
        String modelSpecific = switch (normalizeModelAlias(modelAlias)) {
            case "openclaw2" -> clean(openClawAuthTokenOpenClaw2);
            case "openclaw3" -> clean(openClawAuthTokenOpenClaw3);
            default -> clean(openClawAuthTokenOpenClaw1);
        };
        if (!modelSpecific.isBlank()) return modelSpecific;
        return clean(openClawAuthToken);
    }

    private String resolveVisionModelName(String modelAlias) {
        String alias = normalizeModelAlias(modelAlias);
        if ("openclaw3".equals(alias)) {
            String vision = clean(modelOpenClaw3Vision);
            if (vision.startsWith("ollama/qwen3-vl:")) {
                return "ollama-vl/" + vision.substring("ollama/".length());
            }
            if (!vision.isBlank()) return vision;
            return "ollama-vl/qwen3-vl:8b";
        }
        if ("openclaw2".equals(alias)) {
            String model = clean(modelOpenClaw2);
            if (!model.isBlank()) return model;
            return "google-gemini-cli/gemini-3-pro-preview";
        }
        String explicitVision = clean(visionModel);
        if (!explicitVision.isBlank()) return explicitVision;
        String fallback = clean(modelOpenClaw1);
        if (!fallback.isBlank()) return fallback;
        return "gpt-4.1-mini";
    }

    private String resolveGeneralModelName(String modelAlias) {
        String alias = normalizeModelAlias(modelAlias);
        if ("openclaw3".equals(alias)) {
            String general = clean(modelOpenClaw3General);
            if (!general.isBlank()) return general;
            String fallback = clean(modelOpenClaw3);
            if (!fallback.isBlank()) return fallback;
            return "ollama/gpt-oss:20b";
        }
        if ("openclaw2".equals(alias)) {
            String model = clean(modelOpenClaw2);
            if (!model.isBlank()) return model;
            return "google-gemini-cli/gemini-3-pro-preview";
        }
        String model = clean(modelOpenClaw1);
        if (!model.isBlank()) return model;
        return "openai-codex/gpt-5.3-codex";
    }

    private String newAnalysisSessionKey(String modelAlias, String stage, String reference) {
        String alias = normalizeModelAlias(modelAlias);
        String safeStage = clean(stage).replaceAll("[^a-zA-Z0-9_-]+", "-");
        String ref = clean(reference);
        if (ref.contains("/")) {
            ref = ref.substring(ref.lastIndexOf('/') + 1);
        }
        if (ref.contains("\\")) {
            ref = ref.substring(ref.lastIndexOf('\\') + 1);
        }
        ref = ref.replaceAll("[^a-zA-Z0-9._-]+", "-");
        if (ref.length() > 48) {
            ref = ref.substring(0, 48);
        }
        if (ref.isBlank()) {
            ref = "na";
        }
        return "wedding:" + alias + ":" + safeStage + ":" + ref + ":" + UUID.randomUUID();
    }

    private String toOllamaModelName(String model) {
        String value = clean(model);
        if (value.startsWith("ollama-vl/")) {
            return value.substring("ollama-vl/".length());
        }
        if (value.startsWith("ollama/")) {
            return value.substring("ollama/".length());
        }
        return value;
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

    private String join(String base, String path) {
        String cleanedBase = clean(base);
        String cleanedPath = clean(path);
        if (cleanedBase.endsWith("/") && cleanedPath.startsWith("/")) {
            return cleanedBase + cleanedPath.substring(1);
        }
        if (!cleanedBase.endsWith("/") && !cleanedPath.startsWith("/")) {
            return cleanedBase + "/" + cleanedPath;
        }
        return cleanedBase + cleanedPath;
    }

    private String clean(String raw) {
        if (raw == null) return "";
        String value = raw.trim();
        while (value.length() >= 2) {
            boolean doubleQuoted = value.startsWith("\"") && value.endsWith("\"");
            boolean singleQuoted = value.startsWith("'") && value.endsWith("'");
            if (!doubleQuoted && !singleQuoted) break;
            value = value.substring(1, value.length() - 1).trim();
        }
        return value;
    }

    private record AnalysisResult(String summary, String congratulatoryMessage, Map<String, Object> configPatch) {}
    private record UploadPayload(BufferedImage image, byte[] bytes, String contentType, String filename) {}
}
