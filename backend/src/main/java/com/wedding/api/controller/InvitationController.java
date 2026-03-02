package com.wedding.api.controller;

import com.wedding.api.dto.AiInvitationImageRequest;
import com.wedding.api.dto.AiInvitationImageResponse;
import com.wedding.api.dto.AiInvitationPromptRequest;
import com.wedding.api.dto.InvitationRequest;
import com.wedding.api.entity.Invitation;
import com.wedding.api.service.InvitationService;
import com.wedding.api.service.OpenAiInvitationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/invitations")
@RequiredArgsConstructor
public class InvitationController {

    private final InvitationService invitationService;
    private final OpenAiInvitationService openAiInvitationService;

    @GetMapping("/my")
    public ResponseEntity<?> myInvitations(Authentication auth) {
        String userId = (String) auth.getPrincipal();
        return ResponseEntity.ok(Map.of("invitations", invitationService.getMyInvitations(userId)));
    }

    @GetMapping("/slug/{slug}")
    public ResponseEntity<?> getBySlug(@PathVariable String slug) {
        Invitation inv = invitationService.getBySlug(slug);
        if (inv == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(Map.of("invitation", inv));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable String id, Authentication auth) {
        String userId = (String) auth.getPrincipal();
        Invitation inv = invitationService.getById(id, userId);
        if (inv == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(Map.of("invitation", inv));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id, Authentication auth) {
        String userId = (String) auth.getPrincipal();
        try {
            invitationService.deleteById(id, userId);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/delete")
    public ResponseEntity<?> deleteByPost(@PathVariable String id, Authentication auth) {
        String userId = (String) auth.getPrincipal();
        try {
            invitationService.deleteById(id, userId);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> save(@RequestBody InvitationRequest req, Authentication auth) {
        String userId = (String) auth.getPrincipal();
        try {
            Invitation inv = invitationService.save(req, userId);
            return ResponseEntity.ok(Map.of("success", true, "invitation", inv));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/upload")
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file, Authentication auth) {
        try {
            InvitationService.UploadResult result = invitationService.uploadFile(file);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "url", result.url(),
                    "thumbnailUrl", result.thumbnailUrl()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "업로드 실패"));
        }
    }

    @PostMapping("/ai-generate-from-image")
    public ResponseEntity<?> generateFromImage(@RequestBody AiInvitationImageRequest req, Authentication auth) {
        try {
            String analysisImageUrl = req.getAnalysisImageUrl();
            if (analysisImageUrl == null || analysisImageUrl.isBlank()) {
                analysisImageUrl = req.getPhotoUrl();
            }
            AiInvitationImageResponse result = openAiInvitationService.generateFromReference(analysisImageUrl, req.getImageStyle(), req.getModelAlias());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/ai-generate-from-prompt")
    public ResponseEntity<?> generateFromPrompt(@RequestBody AiInvitationPromptRequest req, Authentication auth) {
        try {
            String analysisImageUrl = req.getAnalysisImageUrl();
            if (analysisImageUrl == null || analysisImageUrl.isBlank()) {
                analysisImageUrl = req.getPhotoUrl();
            }
            AiInvitationImageResponse result = openAiInvitationService.generateFromPrompt(
                req.getPrompt(),
                analysisImageUrl,
                req.getImageStyle(),
                req.getModelAlias()
            );
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/guestbook")
    public ResponseEntity<?> addGuestbook(@PathVariable String id, @RequestBody Map<String, String> body) {
        try {
            var entry = invitationService.addGuestbook(id, body.get("writerName"), body.get("content"));
            return ResponseEntity.ok(Map.of("success", true, "entry", entry));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "방명록 저장에 실패했습니다."));
        }
    }

    @PostMapping("/{id}/attendance")
    public ResponseEntity<?> addAttendance(@PathVariable String id, @RequestBody Map<String, Object> body) {
        try {
            var att = invitationService.addAttendance(id,
                    (String) body.get("name"),
                    (String) body.get("side"),
                    (Boolean) body.get("attending"),
                    body.get("count") != null ? ((Number) body.get("count")).intValue() : 1,
                    (Boolean) body.get("meal"),
                    body.get("mealCount") != null ? ((Number) body.get("mealCount")).intValue() : null,
                    (String) body.get("message"));
            return ResponseEntity.ok(Map.of("success", true, "attendance", att));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "참석 여부 전달에 실패했습니다."));
        }
    }
}
