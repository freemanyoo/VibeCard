package com.wedding.api.service;

import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class SignupRateLimitService {
    private static final int MAX_ATTEMPTS_PER_IP = 12;
    private static final int MAX_ATTEMPTS_PER_EMAIL = 5;
    private static final int MAX_SEND_CODE_PER_IP = 20;
    private static final int MAX_SEND_CODE_PER_EMAIL = 8;
    private static final long IP_WINDOW_MILLIS = Duration.ofMinutes(10).toMillis();
    private static final long EMAIL_WINDOW_MILLIS = Duration.ofHours(1).toMillis();
    private static final long SEND_CODE_IP_WINDOW_MILLIS = Duration.ofMinutes(10).toMillis();
    private static final long SEND_CODE_EMAIL_WINDOW_MILLIS = Duration.ofHours(1).toMillis();

    private final ConcurrentHashMap<String, Deque<Long>> ipAttempts = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Deque<Long>> emailAttempts = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Deque<Long>> sendCodeIpAttempts = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Deque<Long>> sendCodeEmailAttempts = new ConcurrentHashMap<>();

    public boolean allowAttempt(String clientIp, String email) {
        long now = System.currentTimeMillis();
        String ipKey = normalizeIp(clientIp);
        String emailKey = normalizeEmail(email);
        return checkAndRecord(ipAttempts, ipKey, now, IP_WINDOW_MILLIS, MAX_ATTEMPTS_PER_IP)
            && checkAndRecord(emailAttempts, emailKey, now, EMAIL_WINDOW_MILLIS, MAX_ATTEMPTS_PER_EMAIL);
    }

    public boolean allowSendCode(String clientIp, String email) {
        long now = System.currentTimeMillis();
        String ipKey = normalizeIp(clientIp);
        String emailKey = normalizeEmail(email);
        return checkAndRecord(sendCodeIpAttempts, ipKey, now, SEND_CODE_IP_WINDOW_MILLIS, MAX_SEND_CODE_PER_IP)
            && checkAndRecord(sendCodeEmailAttempts, emailKey, now, SEND_CODE_EMAIL_WINDOW_MILLIS, MAX_SEND_CODE_PER_EMAIL);
    }

    private boolean checkAndRecord(
        ConcurrentHashMap<String, Deque<Long>> store,
        String key,
        long now,
        long windowMillis,
        int maxAttempts
    ) {
        Deque<Long> timestamps = store.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (timestamps) {
            while (!timestamps.isEmpty() && now - timestamps.peekFirst() > windowMillis) {
                timestamps.pollFirst();
            }
            if (timestamps.size() >= maxAttempts) {
                return false;
            }
            timestamps.addLast(now);
            if (timestamps.isEmpty()) {
                store.remove(key);
            }
            return true;
        }
    }

    private String normalizeIp(String clientIp) {
        if (clientIp == null || clientIp.isBlank()) {
            return "unknown";
        }
        return clientIp.trim();
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            return "unknown";
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
