package com.wedding.api.dto;

import lombok.Data;

@Data
public class AiInvitationPromptRequest {
    private String prompt;
    private String photoUrl;
    private String analysisImageUrl;
    private String imageStyle;
    private String modelAlias;
}
