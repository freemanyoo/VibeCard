package com.wedding.api.dto;

import lombok.Data;

@Data
public class SkinRequest {
    private String name;
    private String slug;
    private String description;
    private String config;
}
