package com.wedding.api.dto;

import lombok.Data;
import java.util.List;

@Data
public class InvitationRequest {
    private String id;
    private String slug;
    private String groomName;
    private String brideName;
    private String weddingDate;
    private String venueName;
    private String venueAddress;
    private String mainPhotoUrl;
    private String mainPhotoFit;
    private String mainPhotoPosition;
    private String template;
    private String skinId;
    private String invitationTitle;
    private String invitationMessage;
    private String groomFather;
    private String groomMother;
    private String groomRelation;
    private String groomPhone;
    private String brideFather;
    private String brideMother;
    private String brideRelation;
    private String bridePhone;
    private String groomFatherPhone;
    private String groomMotherPhone;
    private String brideFatherPhone;
    private String brideMotherPhone;
    private String albumPhotos;
    private String config;
    private String youtubeUrl;
    private String bgmUrl;
    private String noticeTitle;
    private String noticeContent;
    private Boolean dDayEnabled;
    private Boolean navigationEnabled;
    private List<BankAccountDto> bankAccounts;

    @Data
    public static class BankAccountDto {
        private String ownerType;
        private String bankName;
        private String accountNumber;
        private String ownerName;
    }
}
