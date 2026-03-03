package com.wedding.api.controller;

import com.wedding.api.dto.AuthRequest;
import com.wedding.api.dto.AuthResponse;
import com.wedding.api.service.AuthService;
import com.wedding.api.service.RefreshTokenService;
import com.wedding.api.service.EmailVerificationService;
import com.wedding.api.service.SignupRateLimitService;
import com.wedding.api.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final RefreshTokenService refreshTokenService;
    private final EmailVerificationService emailVerificationService;
    private final SignupRateLimitService signupRateLimitService;
    private final JwtTokenProvider jwtTokenProvider;

    @PostMapping("/register/send-code")
    public ResponseEntity<?> sendRegisterCode(@RequestBody AuthRequest req, HttpServletRequest request) {
        if (req == null || req.getEmail() == null || req.getEmail().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "이메일을 입력해 주세요."));
        }
        String clientIp = resolveClientIp(request);
        if (!signupRateLimitService.allowSendCode(clientIp, req.getEmail())) {
            return ResponseEntity.status(429).body(Map.of("error", "인증코드 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요."));
        }
        EmailVerificationService.Result result = emailVerificationService.sendCode(req.getEmail());
        if (!result.success()) {
            return ResponseEntity.badRequest().body(Map.of("error", result.message()));
        }
        return ResponseEntity.ok(Map.of("success", true, "message", result.message()));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody AuthRequest req, HttpServletRequest request) {
        if (req == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "요청 데이터가 올바르지 않습니다."));
        }
        String clientIp = resolveClientIp(request);
        String email = req != null ? req.getEmail() : null;
        if (!signupRateLimitService.allowAttempt(clientIp, email)) {
            return ResponseEntity.status(429).body(Map.of("error", "가입 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요."));
        }
        AuthResponse res = authService.register(req.getEmail(), req.getPassword(), req.getVerificationCode());
        if (!res.isSuccess()) {
            return ResponseEntity.badRequest().body(Map.of("error", res.getError()));
        }
        return ResponseEntity.ok(Map.of("success", true, "message", "회원가입이 완료되었습니다."));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest req) {
        AuthResponse res = authService.login(req.getEmail(), req.getPassword());
        if (!res.isSuccess()) {
            return ResponseEntity.status(401).body(Map.of("error", res.getError()));
        }
        return ResponseEntity.ok(res);
    }

    @PostMapping("/refresh-token")
    public ResponseEntity<?> refreshToken(@RequestBody Map<String, String> body) {
        String requestRefreshToken = body.get("refreshToken");
        if (requestRefreshToken == null || requestRefreshToken.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Refresh Token이 없습니다."));
        }

        return refreshTokenService.findByToken(requestRefreshToken)
                .map(refreshTokenService::verifyExpiration)
                .map(com.wedding.api.entity.RefreshToken::getUser)
                .map(user -> {
                    String accessToken = jwtTokenProvider.generateToken(user.getId(), user.getEmail(), user.getRole());
                    return ResponseEntity.ok(Map.of(
                            "accessToken", accessToken,
                            "refreshToken", requestRefreshToken));
                })
                .orElseThrow(() -> new RuntimeException("Refresh token is not in database!"));
    }

    @PostMapping("/social/google")
    public ResponseEntity<?> socialGoogle(@RequestBody Map<String, String> body) {
        String idToken = body != null ? body.get("idToken") : null;
        AuthResponse res = authService.loginWithGoogleIdToken(idToken);
        if (!res.isSuccess()) {
            return ResponseEntity.status(401).body(Map.of("error", res.getError()));
        }
        return ResponseEntity.ok(res);
    }

    @PostMapping("/social/naver")
    public ResponseEntity<?> socialNaver(@RequestBody Map<String, String> body) {
        String code = body != null ? body.get("code") : null;
        String state = body != null ? body.get("state") : null;
        String redirectUri = body != null ? body.get("redirectUri") : null;
        AuthResponse res = authService.loginWithNaverCode(code, state, redirectUri);
        if (!res.isSuccess()) {
            return ResponseEntity.status(401).body(Map.of("error", res.getError()));
        }
        return ResponseEntity.ok(res);
    }

    @PostMapping("/social/kakao")
    public ResponseEntity<?> socialKakao(@RequestBody Map<String, String> body) {
        String code = body != null ? body.get("code") : null;
        String state = body != null ? body.get("state") : null;
        String redirectUri = body != null ? body.get("redirectUri") : null;
        AuthResponse res = authService.loginWithKakaoCode(code, state, redirectUri);
        if (!res.isSuccess()) {
            return ResponseEntity.status(401).body(Map.of("error", res.getError()));
        }
        return ResponseEntity.ok(res);
    }

    @PostMapping("/promote-admin")
    public ResponseEntity<?> promoteAdmin(@RequestBody Map<String, String> body) {
        String email = body != null ? body.get("email") : null;
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "email 필드를 입력해 주세요."));
        }
        boolean ok = authService.promoteToAdmin(email.trim());
        if (!ok)
            return ResponseEntity.badRequest().body(Map.of("error", "해당 이메일 사용자를 찾을 수 없습니다. 먼저 회원가입해 주세요."));
        return ResponseEntity.ok(Map.of(
                "success", true,
                "email", email,
                "role", "ADMIN",
                "message", "권한 부여 완료. 반드시 로그아웃 후 다시 로그인해 주세요."));
    }

    /** 권한 확인용 (로그인 불필요). promote-admin 후 DB 반영 여부 확인 시 사용 */
    @GetMapping("/check-role")
    public ResponseEntity<?> checkRole(@RequestParam String email) {
        String role = authService.getRoleByEmail(email);
        return ResponseEntity.ok(Map.of("email", email, "found", role != null, "role", role != null ? role : ""));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            return ResponseEntity.status(401).body(Map.of("error", "인증이 필요합니다."));
        }
        String userId = authentication.getName();
        if (userId == null || userId.isBlank()) {
            Object principal = authentication.getPrincipal();
            userId = principal != null ? String.valueOf(principal) : "";
        }
        if (userId.isBlank()) {
            return ResponseEntity.status(401).body(Map.of("error", "인증이 필요합니다."));
        }
        AuthResponse.UserDto user = authService.getMe(userId);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(Map.of("user", user));
    }

    private String resolveClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isBlank()) {
            return xRealIp.trim();
        }
        return request.getRemoteAddr();
    }

    @DeleteMapping("/account")
    public ResponseEntity<?> deleteAccount(
            @org.springframework.security.core.annotation.AuthenticationPrincipal String userId) {
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "인증이 필요합니다."));
        }
        try {
            authService.deleteAccount(userId);
            return ResponseEntity.ok(Map.of("message", "회원 탈퇴가 완료되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
}
