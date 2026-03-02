package com.wedding.api.service;

import com.wedding.api.dto.InvitationRequest;
import com.wedding.api.entity.*;
import com.wedding.api.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
public class InvitationService {
    private static final int ORIGINAL_MAX_EDGE = 2200;
    private static final float ORIGINAL_JPEG_QUALITY = 0.90f;
    private static final int THUMB_MAX_EDGE = 900;
    private static final float THUMB_JPEG_QUALITY = 0.82f;

    private final InvitationRepository invitationRepository;
    private final BankAccountRepository bankAccountRepository;
    private final GuestbookRepository guestbookRepository;
    private final AttendanceRepository attendanceRepository;
    private final UserRepository userRepository;

    @Value("${upload.dir}")
    private String uploadDir;

    public List<Invitation> getMyInvitations(String userId) {
        return invitationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public Invitation getBySlug(String slug) {
        return invitationRepository.findBySlug(slug).orElse(null);
    }

    public Invitation getById(String id, String userId) {
        Invitation inv = invitationRepository.findById(id).orElse(null);
        if (inv == null || !inv.getUser().getId().equals(userId)) return null;
        return inv;
    }

    @Transactional
    public void deleteById(String id, String userId) {
        Invitation inv = invitationRepository.findById(id).orElse(null);
        if (inv == null) throw new RuntimeException("청첩장을 찾을 수 없습니다.");
        if (inv.getUser() == null || !userId.equals(inv.getUser().getId())) {
            throw new RuntimeException("삭제 권한이 없습니다.");
        }
        invitationRepository.delete(inv);
    }

    @Transactional
    public Invitation save(InvitationRequest req, String userId) {
        Invitation inv;
        if (req.getId() != null && !req.getId().isEmpty()) {
            inv = invitationRepository.findById(req.getId()).orElse(null);
            if (inv == null) throw new RuntimeException("청첩장을 찾을 수 없습니다.");
        } else {
            inv = new Invitation();
            User user = userRepository.findById(userId).orElseThrow();
            inv.setUser(user);
            inv.setCreatedAt(LocalDateTime.now());
        }

        String normalizedSlug = normalizeSlug(req.getSlug());
        if (normalizedSlug == null || normalizedSlug.isBlank()) {
            throw new RuntimeException("청첩장 주소를 입력해 주세요.");
        }
        ensureUniqueSlug(normalizedSlug, inv.getId());
        inv.setSlug(normalizedSlug);
        inv.setGroomName(req.getGroomName());
        inv.setBrideName(req.getBrideName());
        inv.setWeddingDate(LocalDateTime.parse(req.getWeddingDate(), DateTimeFormatter.ISO_DATE_TIME));
        inv.setVenueName(req.getVenueName());
        inv.setVenueAddress(req.getVenueAddress());
        inv.setMainPhotoUrl(req.getMainPhotoUrl());
        inv.setMainPhotoFit(req.getMainPhotoFit() != null ? req.getMainPhotoFit() : "cover");
        inv.setMainPhotoPosition(req.getMainPhotoPosition() != null ? req.getMainPhotoPosition() : "50% 50%");
        inv.setTemplate(req.getTemplate() != null ? req.getTemplate() : "modern");
        if (req.getSkinId() != null) inv.setSkinId(req.getSkinId());
        inv.setInvitationTitle(req.getInvitationTitle());
        inv.setInvitationMessage(req.getInvitationMessage());
        inv.setGroomFather(req.getGroomFather());
        inv.setGroomMother(req.getGroomMother());
        inv.setGroomRelation(req.getGroomRelation());
        inv.setGroomPhone(req.getGroomPhone());
        inv.setBrideFather(req.getBrideFather());
        inv.setBrideMother(req.getBrideMother());
        inv.setBrideRelation(req.getBrideRelation());
        inv.setBridePhone(req.getBridePhone());
        inv.setGroomFatherPhone(req.getGroomFatherPhone());
        inv.setGroomMotherPhone(req.getGroomMotherPhone());
        inv.setBrideFatherPhone(req.getBrideFatherPhone());
        inv.setBrideMotherPhone(req.getBrideMotherPhone());
        inv.setAlbumPhotos(req.getAlbumPhotos());
        inv.setConfig(req.getConfig() != null ? req.getConfig() : "{}");
        inv.setYoutubeUrl(req.getYoutubeUrl());
        inv.setBgmUrl(req.getBgmUrl());
        inv.setNoticeTitle(req.getNoticeTitle());
        inv.setNoticeContent(req.getNoticeContent());
        inv.setDDayEnabled(req.getDDayEnabled() != null ? req.getDDayEnabled() : true);
        inv.setNavigationEnabled(req.getNavigationEnabled() != null ? req.getNavigationEnabled() : true);

        if (req.getBankAccounts() != null) {
            inv.getBankAccounts().clear();
            for (var dto : req.getBankAccounts()) {
                BankAccount ba = BankAccount.builder()
                        .ownerType(dto.getOwnerType())
                        .bankName(dto.getBankName())
                        .accountNumber(dto.getAccountNumber())
                        .ownerName(dto.getOwnerName())
                        .invitation(inv)
                        .build();
                inv.getBankAccounts().add(ba);
            }
        }

        try {
            return invitationRepository.save(inv);
        } catch (DataIntegrityViolationException e) {
            throw new RuntimeException("이미 사용 중인 청첩장 주소입니다. 다른 주소를 입력해 주세요.");
        }
    }

    private String normalizeSlug(String slug) {
        if (slug == null) return "";
        return slug.trim().toLowerCase(Locale.ROOT);
    }

    private void ensureUniqueSlug(String slug, String currentInvitationId) {
        Invitation existing = invitationRepository.findBySlug(slug).orElse(null);
        if (existing == null) return;
        if (currentInvitationId != null && currentInvitationId.equals(existing.getId())) return;
        throw new RuntimeException("이미 사용 중인 청첩장 주소입니다. 다른 주소를 입력해 주세요.");
    }

    public UploadResult uploadFile(MultipartFile file) throws IOException {
        Path uploadPath = Paths.get(uploadDir).toAbsolutePath();
        Files.createDirectories(uploadPath);

        String ext = "";
        String originalName = file.getOriginalFilename();
        if (originalName != null && originalName.contains(".")) {
            ext = originalName.substring(originalName.lastIndexOf(".") + 1).toLowerCase(Locale.ROOT);
        }
        byte[] bytes = file.getBytes();
        BufferedImage src = ImageIO.read(new ByteArrayInputStream(bytes));
        boolean isImage = src != null;

        String outputExt = normalizeOutputExt(ext, isImage);
        String fileName = UUID.randomUUID() + "." + outputExt;
        Path originalPath = uploadPath.resolve(fileName);

        if (!isImage) {
            Files.write(originalPath, bytes, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
            return new UploadResult("/uploads/" + fileName, null);
        }

        BufferedImage optimized = scaleImage(src, ORIGINAL_MAX_EDGE);
        writeImageByExt(optimized, originalPath, outputExt);

        String thumbnailUrl = createThumbnailIfImage(optimized, fileName, uploadPath);
        return new UploadResult("/uploads/" + fileName, thumbnailUrl);
    }

    public record UploadResult(String url, String thumbnailUrl) {}

    private String createThumbnailIfImage(BufferedImage src, String fileName, Path uploadPath) {
        try {
            int srcW = src.getWidth();
            int srcH = src.getHeight();
            if (srcW <= 0 || srcH <= 0) return null;

            double ratio = Math.min((double) THUMB_MAX_EDGE / srcW, (double) THUMB_MAX_EDGE / srcH);
            int dstW = Math.max(1, (int) Math.round(srcW * Math.min(1.0, ratio)));
            int dstH = Math.max(1, (int) Math.round(srcH * Math.min(1.0, ratio)));

            BufferedImage thumb = new BufferedImage(dstW, dstH, BufferedImage.TYPE_INT_RGB);
            Graphics2D g = thumb.createGraphics();
            try {
                g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
                g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
                g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
                g.setColor(Color.WHITE);
                g.fillRect(0, 0, dstW, dstH);
                g.drawImage(src, 0, 0, dstW, dstH, null);
            } finally {
                g.dispose();
            }

            String baseName = fileName.contains(".") ? fileName.substring(0, fileName.lastIndexOf('.')) : fileName;
            String thumbFileName = baseName + "-thumb.jpg";
            Path thumbPath = uploadPath.resolve(thumbFileName);
            writeJpeg(thumb, thumbPath);
            return "/uploads/" + thumbFileName;
        } catch (Exception ignored) {
            return null;
        }
    }

    private void writeJpeg(BufferedImage image, Path outputPath) throws IOException {
        Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName("jpg");
        if (!writers.hasNext()) throw new IOException("JPEG writer not found");

        ImageWriter writer = writers.next();
        try (OutputStream os = Files.newOutputStream(outputPath);
             ImageOutputStream ios = ImageIO.createImageOutputStream(os)) {
            writer.setOutput(ios);
            ImageWriteParam param = writer.getDefaultWriteParam();
            if (param.canWriteCompressed()) {
                param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
                param.setCompressionQuality(THUMB_JPEG_QUALITY);
            }
            writer.write(null, new IIOImage(image, null, null), param);
        } finally {
            writer.dispose();
        }
    }

    private BufferedImage scaleImage(BufferedImage src, int maxEdge) {
        int srcW = src.getWidth();
        int srcH = src.getHeight();
        if (srcW <= 0 || srcH <= 0) return src;

        double ratio = Math.min((double) maxEdge / srcW, (double) maxEdge / srcH);
        double scale = Math.min(1.0, ratio);
        int dstW = Math.max(1, (int) Math.round(srcW * scale));
        int dstH = Math.max(1, (int) Math.round(srcH * scale));
        if (dstW == srcW && dstH == srcH) return src;

        int type = src.getColorModel().hasAlpha() ? BufferedImage.TYPE_INT_ARGB : BufferedImage.TYPE_INT_RGB;
        BufferedImage dst = new BufferedImage(dstW, dstH, type);
        Graphics2D g = dst.createGraphics();
        try {
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            if (!src.getColorModel().hasAlpha()) {
                g.setColor(Color.WHITE);
                g.fillRect(0, 0, dstW, dstH);
            }
            g.drawImage(src, 0, 0, dstW, dstH, null);
        } finally {
            g.dispose();
        }
        return dst;
    }

    private String normalizeOutputExt(String ext, boolean isImage) {
        if (!isImage) return ext == null || ext.isBlank() ? "bin" : ext;
        if ("jpg".equals(ext) || "jpeg".equals(ext)) return "jpg";
        if ("png".equals(ext)) return "png";
        return "jpg";
    }

    private void writeImageByExt(BufferedImage image, Path outputPath, String ext) throws IOException {
        if ("jpg".equals(ext) || "jpeg".equals(ext)) {
            BufferedImage rgb = new BufferedImage(image.getWidth(), image.getHeight(), BufferedImage.TYPE_INT_RGB);
            Graphics2D g = rgb.createGraphics();
            try {
                g.setColor(Color.WHITE);
                g.fillRect(0, 0, rgb.getWidth(), rgb.getHeight());
                g.drawImage(image, 0, 0, null);
            } finally {
                g.dispose();
            }
            writeJpeg(rgb, outputPath, ORIGINAL_JPEG_QUALITY);
            return;
        }
        ImageIO.write(image, ext, outputPath.toFile());
    }

    private void writeJpeg(BufferedImage image, Path outputPath, float quality) throws IOException {
        Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName("jpg");
        if (!writers.hasNext()) throw new IOException("JPEG writer not found");

        ImageWriter writer = writers.next();
        try (OutputStream os = Files.newOutputStream(outputPath);
             ImageOutputStream ios = ImageIO.createImageOutputStream(os)) {
            writer.setOutput(ios);
            ImageWriteParam param = writer.getDefaultWriteParam();
            if (param.canWriteCompressed()) {
                param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
                param.setCompressionQuality(quality);
            }
            writer.write(null, new IIOImage(image, null, null), param);
        } finally {
            writer.dispose();
        }
    }

    public Guestbook addGuestbook(String invitationId, String writerName, String content) {
        Invitation inv = invitationRepository.findById(invitationId).orElseThrow();
        Guestbook gb = Guestbook.builder()
                .writerName(writerName)
                .content(content)
                .invitation(inv)
                .build();
        return guestbookRepository.save(gb);
    }

    public Attendance addAttendance(String invitationId, String name, String side,
                                     Boolean attending, Integer count, Boolean meal, Integer mealCount, String message) {
        Invitation inv = invitationRepository.findById(invitationId).orElseThrow();
        boolean isAttending = Boolean.TRUE.equals(attending);
        int normalizedCount = isAttending ? Math.max(1, count != null ? count : 1) : 0;
        boolean isMeal = isAttending && Boolean.TRUE.equals(meal);
        int normalizedMealCount = isMeal ? Math.max(0, Math.min(normalizedCount, mealCount != null ? mealCount : normalizedCount)) : 0;
        Attendance att = Attendance.builder()
                .name(name)
                .side(side)
                .attending(isAttending)
                .count(normalizedCount)
                .meal(isMeal)
                .mealCount(normalizedMealCount)
                .message(message)
                .invitation(inv)
                .build();
        return attendanceRepository.save(att);
    }
}
