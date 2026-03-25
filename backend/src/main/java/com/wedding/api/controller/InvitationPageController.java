package com.wedding.api.controller;

import com.wedding.api.entity.Invitation;
import com.wedding.api.service.InvitationService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.util.HtmlUtils;

import jakarta.servlet.http.HttpServletRequest;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.TimeUnit;

@Controller
@RequiredArgsConstructor
public class InvitationPageController {

    private static final DateTimeFormatter SHARE_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy년 M월 d일");
    private static final DateTimeFormatter SHARE_TIME_FORMAT = DateTimeFormatter.ofPattern("a h:mm");
    private static final String DEFAULT_SHARE_IMAGE = "/placeholder-hero.svg";

    private final InvitationService invitationService;

    @Value("${invitation.page.template-path:/app/frontend-dist/index.html}")
    private String invitationPageTemplatePath;

    @GetMapping("/invitation/{slug}")
    public ResponseEntity<String> invitationPage(@PathVariable String slug, HttpServletRequest request) {
        Invitation invitation = invitationService.getBySlug(slug);
        if (invitation == null) {
            return ResponseEntity.notFound().build();
        }

        String html = loadTemplateHtml();
        String pageUrl = buildAbsoluteUrl(request, request.getRequestURI());
        String imageUrl = buildAbsoluteUrl(request, "/invitation/" + invitation.getSlug() + "/og-image");
        String title = buildShareTitle(invitation);
        String description = buildShareDescription(invitation);
        String tags = buildMetaTags(pageUrl, imageUrl, title, description);

        String rendered = html
                .replace("</head>", tags + "\n</head>")
                .replace("<title>VibeCard</title>", "<title>" + escapeHtml(title) + "</title>");

        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(5, TimeUnit.MINUTES).cachePublic())
                .contentType(new MediaType("text", "html", StandardCharsets.UTF_8))
                .body(rendered);
    }

    @GetMapping("/invitation/{slug}/og-image")
    public ResponseEntity<byte[]> invitationOgImage(@PathVariable String slug, HttpServletRequest request) throws IOException {
        Invitation invitation = invitationService.getBySlug(slug);
        if (invitation == null) {
            return ResponseEntity.notFound().build();
        }

        String sourceUrl = buildAbsoluteUrl(request, resolveShareImageUrl(invitation));
        HttpURLConnection connection = (HttpURLConnection) new URL(sourceUrl).openConnection();
        connection.setConnectTimeout(5000);
        connection.setReadTimeout(10000);
        connection.setInstanceFollowRedirects(true);
        connection.setRequestProperty("User-Agent", "VibeCard-OG-Image");

        int status = connection.getResponseCode();
        if (status >= 400) {
            return ResponseEntity.notFound().build();
        }

        byte[] bytes;
        try (InputStream inputStream = connection.getInputStream();
             ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            inputStream.transferTo(outputStream);
            bytes = outputStream.toByteArray();
        } finally {
            connection.disconnect();
        }

        String contentType = connection.getContentType();
        MediaType mediaType = MediaType.IMAGE_JPEG;
        if (contentType != null && !contentType.isBlank()) {
            try {
                mediaType = MediaType.parseMediaType(contentType);
            } catch (Exception ignored) {
            }
        }

        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(1, TimeUnit.HOURS).cachePublic())
                .contentType(mediaType)
                .body(bytes);
    }

    private String loadTemplateHtml() {
        try {
            return Files.readString(Path.of(invitationPageTemplatePath), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new RuntimeException("초대장 페이지 템플릿을 불러오지 못했습니다.", e);
        }
    }

    private String resolveShareImageUrl(Invitation invitation) {
        String raw = invitation.getMainPhotoUrl();
        if (raw == null || raw.isBlank()) {
            return DEFAULT_SHARE_IMAGE;
        }
        return raw.trim();
    }

    private String buildShareTitle(Invitation invitation) {
        String groom = safeText(invitation.getGroomName(), "신랑");
        String bride = safeText(invitation.getBrideName(), "신부");
        return groom + " · " + bride + " 결혼 소식을 전합니다";
    }

    private String buildShareDescription(Invitation invitation) {
        if (invitation.getWeddingDate() == null) {
            return safeText(invitation.getVenueName(), "모바일 청첩장");
        }
        String dateText = invitation.getWeddingDate().format(SHARE_DATE_FORMAT);
        String timeText = invitation.getWeddingDate().format(SHARE_TIME_FORMAT);
        String venueText = safeText(invitation.getVenueName(), "");
        if (venueText.isBlank()) {
            return dateText + " · " + timeText;
        }
        return dateText + " · " + timeText + " · " + venueText;
    }

    private String buildMetaTags(String pageUrl, String imageUrl, String title, String description) {
        String escapedPageUrl = escapeHtml(pageUrl);
        String escapedImageUrl = escapeHtml(imageUrl);
        String escapedTitle = escapeHtml(title);
        String escapedDescription = escapeHtml(description);
        return """
                <meta property="og:type" content="website" />
                <meta property="og:site_name" content="VibeCard" />
                <meta property="og:url" content="%s" />
                <meta property="og:title" content="%s" />
                <meta property="og:description" content="%s" />
                <meta property="og:image" content="%s" />
                <meta property="og:image:secure_url" content="%s" />
                <meta property="og:image:alt" content="%s" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="%s" />
                <meta name="twitter:description" content="%s" />
                <meta name="twitter:image" content="%s" />
                <meta name="description" content="%s" />
                <link rel="canonical" href="%s" />
                """.formatted(
                escapedPageUrl,
                escapedTitle,
                escapedDescription,
                escapedImageUrl,
                escapedImageUrl,
                escapedTitle,
                escapedTitle,
                escapedDescription,
                escapedImageUrl,
                escapedDescription,
                escapedPageUrl
        );
    }

    private String buildAbsoluteUrl(HttpServletRequest request, String rawPathOrUrl) {
        if (rawPathOrUrl == null || rawPathOrUrl.isBlank()) {
            return "";
        }
        String raw = rawPathOrUrl.trim();
        if (raw.startsWith("http://") || raw.startsWith("https://")) {
            return raw;
        }
        String scheme = headerOrDefault(request, "X-Forwarded-Proto", request.getScheme());
        String host = headerOrDefault(request, "X-Forwarded-Host", request.getHeader("Host"));
        if (host == null || host.isBlank()) {
            host = request.getServerName() + (request.getServerPort() > 0 ? ":" + request.getServerPort() : "");
        }
        if (!isLocalHost(host) && !"https".equalsIgnoreCase(scheme)) {
            scheme = "https";
        }
        String normalizedPath = raw.startsWith("/") ? raw : "/" + raw;
        return scheme + "://" + host + normalizedPath;
    }

    private String headerOrDefault(HttpServletRequest request, String headerName, String fallback) {
        String value = request.getHeader(headerName);
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return value.split(",")[0].trim();
    }

    private String safeText(String value, String fallback) {
        String trimmed = value == null ? "" : value.trim();
        return trimmed.isBlank() ? fallback : trimmed;
    }

    private boolean isLocalHost(String host) {
        String normalized = host == null ? "" : host.trim().toLowerCase();
        if (normalized.isBlank()) {
            return true;
        }
        int colonIndex = normalized.indexOf(':');
        String hostOnly = colonIndex >= 0 ? normalized.substring(0, colonIndex) : normalized;
        return hostOnly.equals("localhost")
                || hostOnly.equals("127.0.0.1")
                || hostOnly.equals("0.0.0.0")
                || hostOnly.equals("::1")
                || hostOnly.startsWith("10.")
                || hostOnly.startsWith("192.168.")
                || hostOnly.startsWith("172.16.")
                || hostOnly.startsWith("172.17.")
                || hostOnly.startsWith("172.18.")
                || hostOnly.startsWith("172.19.")
                || hostOnly.startsWith("172.2")
                || hostOnly.startsWith("172.30.")
                || hostOnly.startsWith("172.31.");
    }

    private String escapeHtml(String value) {
        return HtmlUtils.htmlEscape(value == null ? "" : value, StandardCharsets.UTF_8.name());
    }
}
