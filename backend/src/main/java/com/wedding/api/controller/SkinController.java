package com.wedding.api.controller;

import com.wedding.api.entity.Skin;
import com.wedding.api.repository.SkinRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/skins")
@RequiredArgsConstructor
public class SkinController {

    private final SkinRepository skinRepository;

    /** 공개 API: 로그인 없이 활성 스킨 목록 조회 (메인·편집기용) */
    @GetMapping
    public ResponseEntity<?> list() {
        List<Skin> skins = skinRepository.findByIsActiveTrueOrderByCreatedAtDesc();
        return ResponseEntity.ok(Map.of("skins", skins));
    }
}
