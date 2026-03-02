package com.wedding.api.dto;

import lombok.Data;

@Data
public class AuthRequest {
    private String email;
    private String password;
    private String verificationCode;
}
