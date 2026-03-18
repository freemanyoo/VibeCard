package com.wedding.api.service;

import com.wedding.api.entity.RefreshToken;
import com.wedding.api.entity.User;
import com.wedding.api.repository.RefreshTokenRepository;
import com.wedding.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    // 14 days expiration for refresh token
    private final long refreshTokenExpirationDays = 14;
    private final RefreshTokenRepository refreshTokenRepository;
    private final UserRepository userRepository;

    public Optional<RefreshToken> findByToken(String token) {
        return refreshTokenRepository.findByToken(token);
    }

    @Transactional
    public RefreshToken createRefreshToken(String userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));

        String newTokenString = UUID.randomUUID().toString();
        LocalDateTime expiry = LocalDateTime.now().plusDays(refreshTokenExpirationDays);

        RefreshToken refreshToken = refreshTokenRepository.findByUser(user)
                .map(existing -> {
                    existing.setToken(newTokenString);
                    existing.setExpiryDate(expiry);
                    return existing;
                })
                .orElseGet(() -> RefreshToken.builder()
                        .user(user)
                        .token(newTokenString)
                        .expiryDate(expiry)
                        .build());

        return refreshTokenRepository.save(refreshToken);
    }

    public RefreshToken verifyExpiration(RefreshToken token) {
        if (token.getExpiryDate().isBefore(LocalDateTime.now())) {
            refreshTokenRepository.delete(token);
            throw new RuntimeException("Refresh token was expired. Please make a new signin request");
        }
        return token;
    }

    @Transactional
    public int deleteByUserId(String userId) {
        return userRepository.findById(userId)
                .map(refreshTokenRepository::deleteByUser)
                .orElse(0);
    }
}
