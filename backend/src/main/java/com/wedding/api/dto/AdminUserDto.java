package com.wedding.api.dto;

import com.wedding.api.entity.User;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminUserDto {
    private String id;
    private String email;
    private String role;
    private LocalDateTime createdAt;

    public static AdminUserDto from(User user) {
        if (user == null) return null;
        return new AdminUserDto(user.getId(), user.getEmail(), user.getRole(), user.getCreatedAt());
    }
}
