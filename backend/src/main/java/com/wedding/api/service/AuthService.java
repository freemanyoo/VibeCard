package com.wedding.api.service;

import com.wedding.api.dto.AuthResponse;
import com.wedding.api.entity.User;
import com.wedding.api.repository.UserRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wedding.api.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class AuthService {
    private static final int PASSWORD_MIN_LENGTH = 10;
    private static final int PASSWORD_MAX_LENGTH = 72;
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private static final Pattern PASSWORD_LETTER_PATTERN = Pattern.compile(".*[A-Za-z].*");
    private static final Pattern PASSWORD_DIGIT_PATTERN = Pattern.compile(".*\\d.*");
    private static final Pattern PASSWORD_SPECIAL_PATTERN = Pattern.compile(".*[^A-Za-z0-9].*");

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final ObjectMapper objectMapper;
    private final EmailVerificationService emailVerificationService;
    @Value("${security.oauth.google.client-id:}")
    private String googleClientId;
    @Value("${security.oauth.naver.client-id:}")
    private String naverClientId;
    @Value("${security.oauth.naver.client-secret:}")
    private String naverClientSecret;
    @Value("${security.oauth.kakao.rest-api-key:}")
    private String kakaoRestApiKey;
    @Value("${security.oauth.kakao.client-secret:}")
    private String kakaoClientSecret;

    public AuthResponse register(String email, String password, String verificationCode) {
        String normalizedEmail = normalizeEmail(email);
        if (!isValidEmail(normalizedEmail)) {
            return AuthResponse.fail("올바른 이메일 형식을 입력해 주세요.");
        }
        if (!isStrongPassword(password)) {
            return AuthResponse.fail("비밀번호는 10~72자이며 영문, 숫자, 특수문자를 각각 1개 이상 포함해야 합니다.");
        }
        EmailVerificationService.Result verifyResult = emailVerificationService.verifyCode(normalizedEmail, verificationCode);
        if (!verifyResult.success()) {
            return AuthResponse.fail(verifyResult.message());
        }
        User existingUser = userRepository.findByEmail(normalizedEmail).orElse(null);
        if (existingUser != null) {
            if (existingUser.getProvider() != null && !existingUser.getProvider().isBlank()) {
                return AuthResponse.fail("이미 " + providerLabel(existingUser.getProvider()) + "로 가입된 이메일입니다. 소셜 로그인으로 이용해 주세요.");
            }
            return AuthResponse.fail("이미 존재하는 이메일입니다.");
        }

        User user = User.builder()
                .email(normalizedEmail)
                .password(passwordEncoder.encode(password))
                .build();
        userRepository.save(user);
        emailVerificationService.consumeVerifiedCode(normalizedEmail, verificationCode);

        return new AuthResponse(true, null,
                new AuthResponse.UserDto(user.getId(), user.getEmail(), user.getRole()),
                null);
    }

    public AuthResponse login(String email, String password) {
        String normalizedEmail = normalizeEmail(email);
        if (normalizedEmail.isBlank() || password == null || password.isBlank()) {
            return AuthResponse.fail("이메일 또는 비밀번호가 올바르지 않습니다.");
        }
        User user = userRepository.findByEmail(normalizedEmail).orElse(null);
        if (user != null && user.getProvider() != null && !user.getProvider().isBlank()) {
            return AuthResponse.fail("해당 이메일은 " + providerLabel(user.getProvider()) + " 소셜 로그인 전용 계정입니다.");
        }
        if (user == null || !passwordEncoder.matches(password, user.getPassword())) {
            return AuthResponse.fail("이메일 또는 비밀번호가 올바르지 않습니다.");
        }

        String token = jwtTokenProvider.generateToken(user.getId(), user.getEmail(), user.getRole());
        return AuthResponse.ok(token, new AuthResponse.UserDto(user.getId(), user.getEmail(), user.getRole()));
    }

    public AuthResponse loginWithGoogleIdToken(String idToken) {
        GoogleProfile profile = verifyGoogleIdToken(idToken);
        if (profile == null) {
            return AuthResponse.fail("구글 인증에 실패했습니다. 다시 시도해 주세요.");
        }
        if (!profile.emailVerified()) {
            return AuthResponse.fail("이메일 인증이 완료된 구글 계정만 사용할 수 있습니다.");
        }
        return upsertSocialUserAndLogin("google", profile.sub(), profile.email());
    }

    public AuthResponse loginWithNaverCode(String code, String state, String redirectUri) {
        NaverVerifyResult verify = verifyNaverAuthorizationCode(code, state, redirectUri);
        if (!verify.success()) {
            return AuthResponse.fail(verify.error());
        }
        NaverProfile profile = verify.profile();
        if (profile.email() == null || profile.email().isBlank()) {
            return AuthResponse.fail("네이버 계정에서 이메일 제공 동의가 필요합니다.");
        }
        return upsertSocialUserAndLogin("naver", profile.id(), profile.email());
    }

    public AuthResponse loginWithKakaoCode(String code, String state, String redirectUri) {
        KakaoVerifyResult verify = verifyKakaoAuthorizationCode(code, state, redirectUri);
        if (!verify.success()) {
            return AuthResponse.fail(verify.error());
        }
        KakaoProfile profile = verify.profile();
        if (profile.email() == null || profile.email().isBlank()) {
            return AuthResponse.fail("카카오 계정에서 이메일 제공 동의가 필요합니다.");
        }
        return upsertSocialUserAndLogin("kakao", profile.id(), profile.email());
    }

    private AuthResponse upsertSocialUserAndLogin(String provider, String providerId, String email) {
        String normalizedEmail = normalizeEmail(email);
        if (normalizedEmail.isBlank()) {
            return AuthResponse.fail("소셜 계정 이메일 정보가 올바르지 않습니다.");
        }
        User user = userRepository.findByProviderAndProviderId(provider, providerId).orElse(null);
        if (user == null) {
            user = userRepository.findByEmail(normalizedEmail).orElse(null);
            if (user != null) {
                if (user.getProvider() == null || user.getProviderId() == null) {
                    return AuthResponse.fail("이미 이메일로 가입된 계정입니다. 이메일 로그인 후 연동해 주세요.");
                }
                if (!provider.equals(user.getProvider()) || !providerId.equals(user.getProviderId())) {
                    return AuthResponse.fail("이미 다른 소셜 계정으로 가입된 이메일입니다.");
                }
            } else {
                user = User.builder()
                        .email(normalizedEmail)
                        .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                        .provider(provider)
                        .providerId(providerId)
                        .build();
            }
            user = userRepository.save(user);
        }

        String token = jwtTokenProvider.generateToken(user.getId(), user.getEmail(), user.getRole());
        return AuthResponse.ok(token, new AuthResponse.UserDto(user.getId(), user.getEmail(), user.getRole()));
    }

    private GoogleProfile verifyGoogleIdToken(String idToken) {
        if (idToken == null || idToken.isBlank()) return null;
        try {
            String encoded = URLEncoder.encode(idToken, StandardCharsets.UTF_8);
            URI uri = URI.create("https://oauth2.googleapis.com/tokeninfo?id_token=" + encoded);
            HttpRequest req = HttpRequest.newBuilder(uri).GET().build();
            HttpResponse<String> resp = HttpClient.newHttpClient().send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() != 200) return null;
            Map<String, Object> map = objectMapper.readValue(resp.body(), new TypeReference<>() {});
            String sub = stringOrEmpty(map.get("sub"));
            String email = stringOrEmpty(map.get("email"));
            String aud = stringOrEmpty(map.get("aud"));
            String iss = stringOrEmpty(map.get("iss"));
            String expRaw = stringOrEmpty(map.get("exp"));
            boolean emailVerified = "true".equalsIgnoreCase(stringOrEmpty(map.get("email_verified")));
            if (sub.isBlank() || email.isBlank()) return null;
            if (!emailVerified) return null;
            if (!"accounts.google.com".equalsIgnoreCase(iss) && !"https://accounts.google.com".equalsIgnoreCase(iss)) {
                return null;
            }
            if (googleClientId != null && !googleClientId.isBlank() && !googleClientId.equals(aud)) {
                return null;
            }
            if (!expRaw.isBlank()) {
                long exp = Long.parseLong(expRaw);
                if (exp <= Instant.now().getEpochSecond()) {
                    return null;
                }
            }
            return new GoogleProfile(sub, email, emailVerified);
        } catch (Exception ignored) {
            return null;
        }
    }

    private NaverVerifyResult verifyNaverAuthorizationCode(String code, String state, String redirectUri) {
        if (code == null || code.isBlank()) return NaverVerifyResult.fail("네이버 code 값이 없습니다.");
        if (state == null || state.isBlank()) return NaverVerifyResult.fail("네이버 state 값이 없습니다.");
        if (redirectUri == null || redirectUri.isBlank()) return NaverVerifyResult.fail("네이버 redirectUri 값이 없습니다.");
        if (naverClientId == null || naverClientId.isBlank()) return NaverVerifyResult.fail("서버 NAVER_CLIENT_ID 설정이 비어 있습니다.");
        if (naverClientSecret == null || naverClientSecret.isBlank()) return NaverVerifyResult.fail("서버 NAVER_CLIENT_SECRET 설정이 비어 있습니다.");

        try {
            URI tokenUri = URI.create(
                "https://nid.naver.com/oauth2.0/token"
                    + "?grant_type=authorization_code"
                    + "&client_id=" + URLEncoder.encode(naverClientId, StandardCharsets.UTF_8)
                    + "&client_secret=" + URLEncoder.encode(naverClientSecret, StandardCharsets.UTF_8)
                    + "&code=" + URLEncoder.encode(code, StandardCharsets.UTF_8)
                    + "&state=" + URLEncoder.encode(state, StandardCharsets.UTF_8)
                    + "&redirect_uri=" + URLEncoder.encode(redirectUri, StandardCharsets.UTF_8)
            );
            HttpRequest tokenReq = HttpRequest.newBuilder(tokenUri).GET().build();
            HttpResponse<String> tokenResp = HttpClient.newHttpClient().send(tokenReq, HttpResponse.BodyHandlers.ofString());
            if (tokenResp.statusCode() != 200) {
                return NaverVerifyResult.fail("네이버 토큰 교환 실패(" + tokenResp.statusCode() + "): " + tokenResp.body());
            }

            Map<String, Object> tokenMap = objectMapper.readValue(tokenResp.body(), new TypeReference<>() {});
            String accessToken = stringOrEmpty(tokenMap.get("access_token"));
            if (accessToken.isBlank()) return NaverVerifyResult.fail("네이버 access_token이 비어 있습니다.");

            HttpRequest profileReq = HttpRequest.newBuilder(URI.create("https://openapi.naver.com/v1/nid/me"))
                .header("Authorization", "Bearer " + accessToken)
                .GET()
                .build();
            HttpResponse<String> profileResp = HttpClient.newHttpClient().send(profileReq, HttpResponse.BodyHandlers.ofString());
            if (profileResp.statusCode() != 200) {
                return NaverVerifyResult.fail("네이버 사용자 조회 실패(" + profileResp.statusCode() + "): " + profileResp.body());
            }

            Map<String, Object> bodyMap = objectMapper.readValue(profileResp.body(), new TypeReference<>() {});
            String resultCode = stringOrEmpty(bodyMap.get("resultcode"));
            if (!"00".equals(resultCode)) {
                return NaverVerifyResult.fail("네이버 사용자 조회 resultcode 비정상: " + resultCode + ", body=" + profileResp.body());
            }
            Object responseObj = bodyMap.get("response");
            if (!(responseObj instanceof Map<?, ?> responseMapRaw)) {
                return NaverVerifyResult.fail("네이버 사용자 응답 구조가 올바르지 않습니다.");
            }

            String id = stringOrEmpty(responseMapRaw.get("id"));
            String email = stringOrEmpty(responseMapRaw.get("email"));
            if (id.isBlank()) return NaverVerifyResult.fail("네이버 사용자 id가 비어 있습니다.");
            return NaverVerifyResult.ok(new NaverProfile(id, email));
        } catch (Exception e) {
            return NaverVerifyResult.fail("네이버 인증 처리 중 예외: " + e.getMessage());
        }
    }

    private KakaoVerifyResult verifyKakaoAuthorizationCode(String code, String state, String redirectUri) {
        if (code == null || code.isBlank()) return KakaoVerifyResult.fail("카카오 code 값이 없습니다.");
        if (state == null || state.isBlank()) return KakaoVerifyResult.fail("카카오 state 값이 없습니다.");
        if (redirectUri == null || redirectUri.isBlank()) return KakaoVerifyResult.fail("카카오 redirectUri 값이 없습니다.");
        if (kakaoRestApiKey == null || kakaoRestApiKey.isBlank()) {
            return KakaoVerifyResult.fail("서버 KAKAO_REST_API_KEY 설정이 비어 있습니다.");
        }

        try {
            StringBuilder bodyBuilder = new StringBuilder()
                .append("grant_type=authorization_code")
                .append("&client_id=").append(URLEncoder.encode(kakaoRestApiKey, StandardCharsets.UTF_8))
                .append("&redirect_uri=").append(URLEncoder.encode(redirectUri, StandardCharsets.UTF_8))
                .append("&code=").append(URLEncoder.encode(code, StandardCharsets.UTF_8))
                .append("&state=").append(URLEncoder.encode(state, StandardCharsets.UTF_8));
            if (kakaoClientSecret != null && !kakaoClientSecret.isBlank()) {
                bodyBuilder.append("&client_secret=").append(URLEncoder.encode(kakaoClientSecret, StandardCharsets.UTF_8));
            }

            HttpRequest tokenReq = HttpRequest.newBuilder(URI.create("https://kauth.kakao.com/oauth/token"))
                .header("Content-Type", "application/x-www-form-urlencoded;charset=utf-8")
                .POST(HttpRequest.BodyPublishers.ofString(bodyBuilder.toString()))
                .build();
            HttpResponse<String> tokenResp = HttpClient.newHttpClient().send(tokenReq, HttpResponse.BodyHandlers.ofString());
            if (tokenResp.statusCode() != 200) {
                return KakaoVerifyResult.fail("카카오 토큰 교환 실패(" + tokenResp.statusCode() + "): " + tokenResp.body());
            }

            Map<String, Object> tokenMap = objectMapper.readValue(tokenResp.body(), new TypeReference<>() {});
            String accessToken = stringOrEmpty(tokenMap.get("access_token"));
            if (accessToken.isBlank()) return KakaoVerifyResult.fail("카카오 access_token이 비어 있습니다.");

            HttpRequest profileReq = HttpRequest.newBuilder(URI.create("https://kapi.kakao.com/v2/user/me"))
                .header("Authorization", "Bearer " + accessToken)
                .header("Content-Type", "application/x-www-form-urlencoded;charset=utf-8")
                .GET()
                .build();
            HttpResponse<String> profileResp = HttpClient.newHttpClient().send(profileReq, HttpResponse.BodyHandlers.ofString());
            if (profileResp.statusCode() != 200) {
                return KakaoVerifyResult.fail("카카오 사용자 조회 실패(" + profileResp.statusCode() + "): " + profileResp.body());
            }

            Map<String, Object> bodyMap = objectMapper.readValue(profileResp.body(), new TypeReference<>() {});
            String id = stringOrEmpty(bodyMap.get("id"));
            if (id.isBlank()) return KakaoVerifyResult.fail("카카오 사용자 id가 비어 있습니다.");

            String email = "";
            Object accountObj = bodyMap.get("kakao_account");
            if (accountObj instanceof Map<?, ?> accountMapRaw) {
                email = stringOrEmpty(accountMapRaw.get("email"));
            }
            return KakaoVerifyResult.ok(new KakaoProfile(id, email));
        } catch (Exception e) {
            return KakaoVerifyResult.fail("카카오 인증 처리 중 예외: " + e.getMessage());
        }
    }

    private String stringOrEmpty(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private String normalizeEmail(String email) {
        if (email == null) return "";
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private boolean isValidEmail(String email) {
        if (email == null || email.isBlank()) return false;
        return EMAIL_PATTERN.matcher(email).matches();
    }

    private boolean isStrongPassword(String password) {
        if (password == null) return false;
        if (password.length() < PASSWORD_MIN_LENGTH || password.length() > PASSWORD_MAX_LENGTH) return false;
        if (password.chars().anyMatch(Character::isWhitespace)) return false;
        return PASSWORD_LETTER_PATTERN.matcher(password).matches()
            && PASSWORD_DIGIT_PATTERN.matcher(password).matches()
            && PASSWORD_SPECIAL_PATTERN.matcher(password).matches();
    }

    private String providerLabel(String provider) {
        if (provider == null) return "소셜";
        return switch (provider.toLowerCase(Locale.ROOT)) {
            case "google" -> "Google";
            case "naver" -> "Naver";
            case "kakao" -> "Kakao";
            default -> "소셜";
        };
    }

    private record GoogleProfile(String sub, String email, boolean emailVerified) {}
    private record NaverProfile(String id, String email) {}
    private record NaverVerifyResult(boolean success, NaverProfile profile, String error) {
        static NaverVerifyResult ok(NaverProfile profile) {
            return new NaverVerifyResult(true, profile, null);
        }
        static NaverVerifyResult fail(String error) {
            return new NaverVerifyResult(false, null, error);
        }
    }
    private record KakaoProfile(String id, String email) {}
    private record KakaoVerifyResult(boolean success, KakaoProfile profile, String error) {
        static KakaoVerifyResult ok(KakaoProfile profile) {
            return new KakaoVerifyResult(true, profile, null);
        }
        static KakaoVerifyResult fail(String error) {
            return new KakaoVerifyResult(false, null, error);
        }
    }

    public AuthResponse.UserDto getMe(String userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return null;
        return new AuthResponse.UserDto(user.getId(), user.getEmail(), user.getRole());
    }

    @Transactional
    public boolean promoteToAdmin(String email) {
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) return false;
        user.setRole("ADMIN");
        userRepository.saveAndFlush(user);
        return true;
    }

    /** 이메일로 DB에 저장된 role 조회 (권한 확인용) */
    public String getRoleByEmail(String email) {
        return userRepository.findByEmail(email).map(User::getRole).orElse(null);
    }
}
