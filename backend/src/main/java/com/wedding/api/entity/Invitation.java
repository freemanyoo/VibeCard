package com.wedding.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class Invitation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(unique = true, nullable = false)
    private String slug;

    @Column(nullable = false)
    private String groomName;

    @Column(nullable = false)
    private String brideName;

    @Column(nullable = false)
    private LocalDateTime weddingDate;

    @Column(nullable = false)
    private String venueName;

    @Column(nullable = false)
    private String venueAddress;

    private String mainPhotoUrl;

    @Builder.Default
    private String mainPhotoFit = "cover";

    @Builder.Default
    private String mainPhotoPosition = "50% 50%";

    @Builder.Default
    private String template = "modern";

    private String skinId;
    private String invitationTitle;

    @Column(length = 2000)
    @Builder.Default
    private String invitationMessage = "저희 두 사람, 하나가 되는 소중한 날에\n초대합니다. 오셔서 축복해 주세요.";

    private String groomFather;
    private String groomMother;
    @Builder.Default
    private String groomRelation = "장남";
    private String groomPhone;
    private String groomFatherPhone;
    private String groomMotherPhone;

    private String brideFather;
    private String brideMother;
    @Builder.Default
    private String brideRelation = "장녀";
    private String bridePhone;
    private String brideFatherPhone;
    private String brideMotherPhone;

    @Column(length = 5000)
    @Builder.Default
    private String albumPhotos = "[]";

    @Column(length = 5000)
    @Builder.Default
    private String config = "{}";

    @Builder.Default
    private Boolean isPublished = true;

    private String youtubeUrl;
    private String bgmUrl;

    @Builder.Default
    private String noticeTitle = "알림 사항";
    private String noticeContent;

    @Builder.Default
    private Boolean dDayEnabled = true;

    @Builder.Default
    private Boolean navigationEnabled = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private User user;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @OneToMany(mappedBy = "invitation", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<BankAccount> bankAccounts = new ArrayList<>();

    @OneToMany(mappedBy = "invitation", cascade = CascadeType.ALL)
    @Builder.Default
    private List<Guestbook> guestbook = new ArrayList<>();

    @OneToMany(mappedBy = "invitation", cascade = CascadeType.ALL)
    @Builder.Default
    private List<Attendance> attendance = new ArrayList<>();
}
