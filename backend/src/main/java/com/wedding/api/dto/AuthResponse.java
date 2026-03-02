package com.wedding.api.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AuthResponse {
    private boolean success;
    private String token;
    private UserDto user;
    private String error;

    public static AuthResponse ok(String token, UserDto user) {
        return new AuthResponse(true, token, user, null);
    }

    public static AuthResponse fail(String error) {
        return new AuthResponse(false, null, null, error);
    }

    @Data
    @AllArgsConstructor
    public static class UserDto {
        private String id;
        private String email;
        private String role;
    }
}
