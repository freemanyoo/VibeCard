package com.wedding.api.controller;

import com.wedding.api.dto.SkinRequest;
import com.wedding.api.dto.SkinAiGenerateRequest;
import com.wedding.api.entity.Skin;
import com.wedding.api.service.AdminService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/stats")
    public ResponseEntity<?> stats() {
        return ResponseEntity.ok(adminService.getStats());
    }

    @GetMapping("/skins")
    public ResponseEntity<?> getSkins() {
        try {
            List<Skin> skins = adminService.getSkins();
            return ResponseEntity.ok(Map.of("skins", skins));
        } catch (Exception e) {
            log.error("GET /admin/skins failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", e.getMessage() != null ? e.getMessage() : "스킨 목록 조회 실패"));
        }
    }

    @GetMapping("/skins/ai-model-options")
    public ResponseEntity<?> getSkinAiModelOptions() {
        return ResponseEntity.ok(Map.of(
            "local", adminService.getSkinAiLocalModelOptions()
        ));
    }

    @GetMapping("/security/blocked-prompts")
    public ResponseEntity<?> getBlockedPrompts() {
        return ResponseEntity.ok(Map.of("logs", adminService.getBlockedAiPromptLogs()));
    }

    @PostMapping("/skins")
    public ResponseEntity<?> createSkin(@RequestBody SkinRequest req) {
        Skin skin = adminService.createSkin(req);
        return ResponseEntity.ok(Map.of("success", true, "skin", skin));
    }

    @PutMapping("/skins/{id}")
    public ResponseEntity<?> updateSkin(@PathVariable String id, @RequestBody SkinRequest req) {
        adminService.updateSkin(id, req);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @DeleteMapping("/skins/{id}")
    public ResponseEntity<?> deleteSkin(@PathVariable String id) {
        adminService.deleteSkin(id);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/skins/ai-generate")
    public ResponseEntity<?> generateSkinByAi(@RequestBody SkinAiGenerateRequest req) {
        try {
            Map<String, Object> aiResult = adminService.generateSkinConfigByAi(req);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "config", aiResult.getOrDefault("config", Map.of()),
                "meta", aiResult.getOrDefault("meta", Map.of())
            ));
        } catch (IllegalArgumentException e) {
            log.error("POST /admin/skins/ai-generate validation failed: model={}, template={}",
                req != null ? req.getModel() : null,
                req != null ? req.getTemplate() : null,
                e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("POST /admin/skins/ai-generate failed: model={}, template={}",
                req != null ? req.getModel() : null,
                req != null ? req.getTemplate() : null,
                e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /** 모던/클래식 스킨에 기본 테마 색상 일괄 적용 (직접 수정 없이 DB 반영) */
    @PostMapping("/skins/apply-default-colors")
    public ResponseEntity<?> applyDefaultThemeColors() {
        int updated = adminService.applyDefaultThemeColors();
        return ResponseEntity.ok(Map.of("success", true, "updated", updated));
    }

    @DeleteMapping("/users")
    public ResponseEntity<?> deleteUserByEmail(@RequestParam String email) {
        boolean deleted = adminService.deleteUserByEmail(email);
        if (!deleted) {
            return ResponseEntity.badRequest().body(Map.of("error", "해당 이메일 사용자를 찾을 수 없습니다."));
        }
        return ResponseEntity.ok(Map.of("success", true, "email", email, "message", "사용자 삭제 완료"));
    }
}
