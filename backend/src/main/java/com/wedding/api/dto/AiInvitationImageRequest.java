package com.wedding.api.dto;

import lombok.Data;

@Data
public class AiInvitationImageRequest {
    private String photoUrl;
    private String analysisImageUrl;
    private String imageStyle;
    private String modelAlias;
}
