package com.wedding.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailVerificationService {
    private static final long CODE_EXPIRE_MILLIS = Duration.ofMinutes(10).toMillis();
    private static final long RESEND_COOLDOWN_MILLIS = Duration.ofSeconds(60).toMillis();
    private static final int MAX_VERIFY_ATTEMPTS = 10;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String mailFrom;

    private final Map<String, VerificationState> verificationStore = new ConcurrentHashMap<>();

    public Result sendCode(String email) {
        String normalizedEmail = normalizeEmail(email);
        if (normalizedEmail.isBlank()) return Result.fail("이메일을 입력해 주세요.");

        long now = System.currentTimeMillis();
        VerificationState existing = verificationStore.get(normalizedEmail);
        if (existing != null && now - existing.lastSentAt() < RESEND_COOLDOWN_MILLIS) {
            return Result.fail("인증코드를 너무 자주 요청했습니다. 잠시 후 다시 시도해 주세요.");
        }

        String code = generateCode();
        long expiresAt = now + CODE_EXPIRE_MILLIS;
        verificationStore.put(normalizedEmail, new VerificationState(code, expiresAt, now, 0));

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            if (mailFrom != null && !mailFrom.isBlank()) {
                message.setFrom(mailFrom);
            }
            message.setTo(normalizedEmail);
            message.setSubject("[VibeCard] 이메일 인증코드");
            message.setText("인증코드: " + code + "\n\n10분 이내에 입력해 주세요.");
            mailSender.send(message);
            return Result.ok("인증코드를 전송했습니다. 메일함을 확인해 주세요.");
        } catch (Exception e) {
            log.error("Failed to send verification email to {}", normalizedEmail, e);
            return Result.fail("인증 메일 전송에 실패했습니다. 메일 설정을 확인해 주세요.");
        }
    }

    public Result verifyCode(String email, String inputCode) {
        String normalizedEmail = normalizeEmail(email);
        if (normalizedEmail.isBlank()) return Result.fail("이메일을 입력해 주세요.");
        if (inputCode == null || inputCode.isBlank()) return Result.fail("인증코드를 입력해 주세요.");

        VerificationState state = verificationStore.get(normalizedEmail);
        if (state == null) return Result.fail("먼저 인증코드 발송을 요청해 주세요.");

        long now = System.currentTimeMillis();
        if (now > state.expiresAt()) {
            verificationStore.remove(normalizedEmail);
            return Result.fail("인증코드가 만료되었습니다. 다시 요청해 주세요.");
        }
        if (state.attempts() >= MAX_VERIFY_ATTEMPTS) {
            verificationStore.remove(normalizedEmail);
            return Result.fail("인증 시도 횟수를 초과했습니다. 다시 요청해 주세요.");
        }
        if (!state.code().equals(inputCode.trim())) {
            verificationStore.put(
                normalizedEmail,
                new VerificationState(state.code(), state.expiresAt(), state.lastSentAt(), state.attempts() + 1)
            );
            return Result.fail("인증코드가 올바르지 않습니다.");
        }
        return Result.ok("이메일 인증이 완료되었습니다.");
    }

    public void consumeVerifiedCode(String email, String code) {
        String normalizedEmail = normalizeEmail(email);
        if (normalizedEmail.isBlank()) return;
        VerificationState state = verificationStore.get(normalizedEmail);
        if (state == null) return;
        if (state.code().equals(code != null ? code.trim() : "")) {
            verificationStore.remove(normalizedEmail);
        }
    }

    private String normalizeEmail(String email) {
        if (email == null) return "";
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String generateCode() {
        int n = RANDOM.nextInt(1_000_000);
        return String.format("%06d", n);
    }

    public record Result(boolean success, String message) {
        static Result ok(String message) {
            return new Result(true, message);
        }
        static Result fail(String message) {
            return new Result(false, message);
        }
    }

    private record VerificationState(String code, long expiresAt, long lastSentAt, int attempts) {}
}
