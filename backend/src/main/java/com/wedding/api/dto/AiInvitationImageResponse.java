package com.wedding.api.dto;

import lombok.Builder;
import lombok.Data;

import java.util.Map;

@Data
@Builder
public class AiInvitationImageResponse {
    private boolean success;
    private String analysisSummary;
    private String colorStrategy;
    private String congratulatoryMessage;
    private Map<String, Object> configPatch;
}
