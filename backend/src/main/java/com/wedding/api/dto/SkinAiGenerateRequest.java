package com.wedding.api.dto;

import lombok.Data;

@Data
public class SkinAiGenerateRequest {
    private String prompt;
    private String template;
    private String model;
    private String localPurpose;
}
