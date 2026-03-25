package com.wedding.api.service;

import com.wedding.api.dto.InvitationRequest;
import com.wedding.api.entity.Invitation;
import com.wedding.api.entity.User;
import com.wedding.api.repository.AttendanceRepository;
import com.wedding.api.repository.BankAccountRepository;
import com.wedding.api.repository.GuestbookRepository;
import com.wedding.api.repository.InvitationRepository;
import com.wedding.api.repository.MediaFileRepository;
import com.wedding.api.repository.SkinRepository;
import com.wedding.api.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InvitationServiceTest {

    @Mock
    private InvitationRepository invitationRepository;
    @Mock
    private BankAccountRepository bankAccountRepository;
    @Mock
    private GuestbookRepository guestbookRepository;
    @Mock
    private AttendanceRepository attendanceRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private MediaFileRepository mediaFileRepository;
    @Mock
    private SkinRepository skinRepository;
    @Mock
    private ObjectStorageService objectStorageService;

    @InjectMocks
    private InvitationService invitationService;

    @Test
    void saveRejectsUpdateFromDifferentOwner() {
        User owner = User.builder().id("owner-1").email("owner@test.com").password("pw").build();
        Invitation existing = Invitation.builder()
                .id("inv-1")
                .slug("owner-inv")
                .groomName("groom")
                .brideName("bride")
                .weddingDate(LocalDateTime.parse("2026-05-01T12:00:00"))
                .venueName("venue")
                .venueAddress("address")
                .user(owner)
                .build();
        InvitationRequest request = baseRequest();
        request.setId("inv-1");
        request.setSlug("owner-inv");

        when(invitationRepository.findById("inv-1")).thenReturn(Optional.of(existing));

        SecurityException error = assertThrows(SecurityException.class,
                () -> invitationService.save(request, "other-user"));

        assertEquals("수정 권한이 없습니다.", error.getMessage());
        verify(invitationRepository, never()).save(existing);
    }

    @Test
    void saveAllowsUpdateForOwner() {
        User owner = User.builder().id("owner-1").email("owner@test.com").password("pw").build();
        Invitation existing = Invitation.builder()
                .id("inv-1")
                .slug("owner-inv")
                .groomName("before-groom")
                .brideName("before-bride")
                .weddingDate(LocalDateTime.parse("2026-05-01T12:00:00"))
                .venueName("venue")
                .venueAddress("address")
                .user(owner)
                .build();
        InvitationRequest request = baseRequest();
        request.setId("inv-1");
        request.setSlug("owner-inv");
        request.setGroomName("updated-groom");

        when(invitationRepository.findById("inv-1")).thenReturn(Optional.of(existing));
        when(invitationRepository.findBySlug("owner-inv")).thenReturn(Optional.of(existing));
        when(invitationRepository.save(existing)).thenReturn(existing);

        Invitation saved = invitationService.save(request, "owner-1");

        assertEquals("updated-groom", saved.getGroomName());
        verify(invitationRepository).save(existing);
    }

    @Test
    void savePreservesLocalWeddingDateWithoutTimezoneShift() {
        User owner = User.builder().id("owner-1").email("owner@test.com").password("pw").build();
        Invitation existing = Invitation.builder()
                .id("inv-1")
                .slug("owner-inv")
                .groomName("before-groom")
                .brideName("before-bride")
                .weddingDate(LocalDateTime.parse("2026-05-01T12:00:00"))
                .venueName("venue")
                .venueAddress("address")
                .user(owner)
                .build();
        InvitationRequest request = baseRequest();
        request.setId("inv-1");
        request.setSlug("owner-inv");
        request.setWeddingDate("2026-05-01T12:00");

        when(invitationRepository.findById("inv-1")).thenReturn(Optional.of(existing));
        when(invitationRepository.findBySlug("owner-inv")).thenReturn(Optional.of(existing));
        when(invitationRepository.save(existing)).thenReturn(existing);

        Invitation saved = invitationService.save(request, "owner-1");

        assertEquals(LocalDateTime.parse("2026-05-01T12:00:00"), saved.getWeddingDate());
    }

    @Test
    void saveConvertsLegacyUtcWeddingDateToSeoulLocalTime() {
        User owner = User.builder().id("owner-1").email("owner@test.com").password("pw").build();
        Invitation existing = Invitation.builder()
                .id("inv-1")
                .slug("owner-inv")
                .groomName("before-groom")
                .brideName("before-bride")
                .weddingDate(LocalDateTime.parse("2026-05-01T12:00:00"))
                .venueName("venue")
                .venueAddress("address")
                .user(owner)
                .build();
        InvitationRequest request = baseRequest();
        request.setId("inv-1");
        request.setSlug("owner-inv");
        request.setWeddingDate("2026-05-01T03:00:00.000Z");

        when(invitationRepository.findById("inv-1")).thenReturn(Optional.of(existing));
        when(invitationRepository.findBySlug("owner-inv")).thenReturn(Optional.of(existing));
        when(invitationRepository.save(existing)).thenReturn(existing);

        Invitation saved = invitationService.save(request, "owner-1");

        assertEquals(LocalDateTime.parse("2026-05-01T12:00:00"), saved.getWeddingDate());
    }

    private InvitationRequest baseRequest() {
        InvitationRequest request = new InvitationRequest();
        request.setSlug("owner-inv");
        request.setGroomName("groom");
        request.setBrideName("bride");
        request.setWeddingDate("2026-05-01T12:00:00");
        request.setVenueName("venue");
        request.setVenueAddress("address");
        request.setMainPhotoFit("cover");
        request.setMainPhotoPosition("50% 50%");
        request.setTemplate("modern");
        request.setInvitationTitle("title");
        request.setInvitationMessage("message");
        request.setAlbumPhotos("[]");
        request.setConfig("{}");
        request.setNoticeTitle("알림 사항");
        request.setDDayEnabled(true);
        request.setNavigationEnabled(true);
        return request;
    }
}
