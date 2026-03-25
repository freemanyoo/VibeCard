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
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.concurrent.CompletableFuture;

@Service
@RequiredArgsConstructor
public class InvitationService {
    private static final ZoneId WEDDING_DATE_ZONE = ZoneId.of("Asia/Seoul");
    private static final int ORIGINAL_MAX_EDGE = 2200;
    private static final float ORIGINAL_JPEG_QUALITY = 0.90f;
    private static final int THUMB_MAX_EDGE = 900;
    private static final float THUMB_JPEG_QUALITY = 0.82f;
    private static final int ANALYSIS_MAX_EDGE = 1400;
    private static final float ANALYSIS_JPEG_QUALITY = 0.78f;

    private final InvitationRepository invitationRepository;
    private final BankAccountRepository bankAccountRepository;
    private final GuestbookRepository guestbookRepository;
    private final AttendanceRepository attendanceRepository;
    private final UserRepository userRepository;
    private final MediaFileRepository mediaFileRepository;
    private final SkinRepository skinRepository;
    private final ObjectStorageService objectStorageService;

    @Value("${upload.dir}")
    private String uploadDir;

    public List<Invitation> getMyInvitations(String userId) {
        return invitationRepository.findByUser_IdOrderByCreatedAtDesc(userId);
    }

    public Invitation getBySlug(String slug) {
        return invitationRepository.findBySlug(slug).orElse(null);
    }

    public Invitation getById(String id, String userId) {
        Invitation inv = invitationRepository.findById(id).orElse(null);
        if (inv == null || inv.getUser() == null || !userId.equals(inv.getUser().getId()))
            return null;
        return inv;
    }

    @Transactional
    public void deleteById(String id, String userId) {
        Invitation inv = invitationRepository.findById(id).orElse(null);
        if (inv == null)
            throw new RuntimeException("청첩장을 찾을 수 없습니다.");
        assertOwnership(inv, userId, "삭제");
        invitationRepository.delete(inv);
    }

    @Transactional
    public Invitation save(InvitationRequest req, String userId) {
        Invitation inv;
        if (req.getId() != null && !req.getId().isEmpty()) {
            inv = invitationRepository.findById(req.getId()).orElse(null);
            if (inv == null)
                throw new RuntimeException("청첩장을 찾을 수 없습니다.");
            assertOwnership(inv, userId, "수정");
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
        inv.setWeddingDate(parseWeddingDate(req.getWeddingDate()));
        inv.setVenueName(req.getVenueName());
        inv.setVenueAddress(req.getVenueAddress());
        inv.setMainPhotoUrl(req.getMainPhotoUrl());
        inv.setMainPhotoFit(req.getMainPhotoFit() != null ? req.getMainPhotoFit() : "cover");
        inv.setMainPhotoPosition(req.getMainPhotoPosition() != null ? req.getMainPhotoPosition() : "50% 50%");
        inv.setTemplate(req.getTemplate() != null ? req.getTemplate() : "modern");
        String requestedSkinId = req.getSkinId() != null ? req.getSkinId().trim() : "";
        if (requestedSkinId.isBlank()) {
            inv.setSkinId(null);
            inv.setSkin(null);
        } else {
            Skin skin = skinRepository.findById(requestedSkinId)
                    .orElseThrow(() -> new RuntimeException("선택한 스킨을 찾을 수 없습니다."));
            inv.setSkinId(skin.getId());
            inv.setSkin(skin);
        }
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

    private LocalDateTime parseWeddingDate(String value) {
        String raw = value != null ? value.trim() : "";
        if (raw.isBlank()) {
            throw new RuntimeException("예식 일시를 입력해 주세요.");
        }
        try {
            return OffsetDateTime.parse(raw, DateTimeFormatter.ISO_DATE_TIME)
                    .atZoneSameInstant(WEDDING_DATE_ZONE)
                    .toLocalDateTime();
        } catch (DateTimeParseException ignored) {
        }
        try {
            return LocalDateTime.parse(raw, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        } catch (DateTimeParseException ignored) {
        }
        try {
            return LocalDateTime.parse(raw, DateTimeFormatter.ISO_DATE_TIME);
        } catch (DateTimeParseException ignored) {
        }
        throw new RuntimeException("예식 일시 형식이 올바르지 않습니다.");
    }

    private void assertOwnership(Invitation inv, String userId, String action) {
        if (inv.getUser() == null || userId == null || !userId.equals(inv.getUser().getId())) {
            throw new SecurityException(action + " 권한이 없습니다.");
        }
    }

    private String normalizeSlug(String slug) {
        if (slug == null)
            return "";
        return slug.trim().toLowerCase(Locale.ROOT);
    }

    private void ensureUniqueSlug(String slug, String currentInvitationId) {
        Invitation existing = invitationRepository.findBySlug(slug).orElse(null);
        if (existing == null)
            return;
        if (currentInvitationId != null && currentInvitationId.equals(existing.getId()))
            return;
        throw new RuntimeException("이미 사용 중인 청첩장 주소입니다. 다른 주소를 입력해 주세요.");
    }

    public UploadResult uploadFile(MultipartFile file, String userId) throws IOException {
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
        String contentType = resolveContentType(file.getContentType(), outputExt, isImage);

        if (objectStorageService.isEnabled()) {
            return uploadToObjectStorage(userId, bytes, src, isImage, outputExt, fileName, contentType);
        }

        return uploadToLocalStorage(userId, bytes, src, isImage, outputExt, fileName, contentType);
    }

    private UploadResult uploadToLocalStorage(String userId, byte[] bytes, BufferedImage src, boolean isImage,
            String outputExt, String fileName, String contentType) throws IOException {
        Path uploadPath = Paths.get(uploadDir).toAbsolutePath();
        Files.createDirectories(uploadPath);
        Path originalPath = uploadPath.resolve(fileName);

        if (!isImage) {
            Files.write(originalPath, bytes, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
            StoredAsset originalAsset = new StoredAsset(null, fileName, "/uploads/" + fileName);
            MediaFile mediaFile = saveMediaFile(userId, contentType, bytes.length, null, originalAsset, null, null,
                    "LOCAL");
            return new UploadResult(originalAsset.url(), null, null, mediaFile.getId());
        }

        BufferedImage optimized = scaleImage(src, ORIGINAL_MAX_EDGE);

        // Run scaling and saving tasks in parallel for local storage
        CompletableFuture<StoredAsset> originalTask = CompletableFuture.supplyAsync(() -> {
            try {
                writeImageByExt(optimized, originalPath, outputExt);
                return new StoredAsset(null, fileName, "/uploads/" + fileName);
            } catch (IOException e) {
                throw new RuntimeException(e);
            }
        });

        CompletableFuture<StoredAsset> thumbnailTask = CompletableFuture.supplyAsync(() -> {
            String url = createThumbnailIfImage(optimized, fileName, uploadPath);
            if (url != null) {
                String baseName = fileName.substring(0, fileName.lastIndexOf('.'));
                return new StoredAsset(null, baseName + "-thumb.jpg", url);
            }
            return null;
        });

        CompletableFuture<StoredAsset> analysisTask = CompletableFuture.supplyAsync(() -> {
            String url = createAnalysisIfImage(optimized, fileName, uploadPath);
            if (url != null) {
                String baseName = fileName.substring(0, fileName.lastIndexOf('.'));
                return new StoredAsset(null, baseName + "-analysis.jpg", url);
            }
            return null;
        });

        CompletableFuture.allOf(originalTask, thumbnailTask, analysisTask).join();

        StoredAsset originalAsset = originalTask.join();
        StoredAsset thumbnailAsset = thumbnailTask.join();
        StoredAsset analysisAsset = analysisTask.join();

        MediaFile mediaFile = saveMediaFile(userId, contentType, bytes.length, optimized, originalAsset, thumbnailAsset,
                analysisAsset, "LOCAL");
        return new UploadResult(originalAsset.url(), thumbnailAsset != null ? thumbnailAsset.url() : null,
                analysisAsset != null ? analysisAsset.url() : null, mediaFile.getId());
    }

    private UploadResult uploadToObjectStorage(String userId, byte[] bytes, BufferedImage src, boolean isImage,
            String outputExt, String fileName, String contentType) throws IOException {
        if (!isImage) {
            String objectKey = buildObjectKey("invitations/original", fileName);
            ObjectStorageService.StoredObject stored = objectStorageService.store(
                    objectKey,
                    bytes,
                    contentType,
                    ObjectStorageService.StorageTier.COLD);
            StoredAsset originalAsset = toStoredAsset(stored);
            MediaFile mediaFile = saveMediaFile(userId, contentType, bytes.length, null, originalAsset, null, null,
                    "MINIO");
            return new UploadResult(stored.getUrl(), null, null, mediaFile.getId());
        }

        BufferedImage optimized = scaleImage(src, ORIGINAL_MAX_EDGE);
        String baseName = fileName.substring(0, fileName.lastIndexOf('.'));

        // Run scaling, encoding and MinIO storage tasks in parallel
        CompletableFuture<StoredAsset> originalTask = CompletableFuture.supplyAsync(() -> {
            try {
                return toStoredAsset(objectStorageService.store(
                        buildObjectKey("invitations/original", fileName),
                        encodeImageByExt(optimized, outputExt),
                        contentType,
                        ObjectStorageService.StorageTier.COLD));
            } catch (IOException e) {
                throw new RuntimeException(e);
            }
        });

        CompletableFuture<StoredAsset> thumbnailTask = CompletableFuture.supplyAsync(() -> {
            byte[] thumbBytes = createThumbnailBytes(optimized);
            if (thumbBytes != null) {
                return toStoredAsset(objectStorageService.store(
                        buildObjectKey("invitations/thumb", baseName + "-thumb.jpg"),
                        thumbBytes,
                        "image/jpeg",
                        ObjectStorageService.StorageTier.FAST));
            }
            return null;
        });

        CompletableFuture<StoredAsset> analysisTask = CompletableFuture.supplyAsync(() -> {
            byte[] analysisBytes = createAnalysisBytes(optimized);
            if (analysisBytes != null) {
                return toStoredAsset(objectStorageService.store(
                        buildObjectKey("invitations/analysis", baseName + "-analysis.jpg"),
                        analysisBytes,
                        "image/jpeg",
                        ObjectStorageService.StorageTier.FAST));
            }
            return null;
        });

        // Wait for all three tasks to complete
        CompletableFuture.allOf(originalTask, thumbnailTask, analysisTask).join();

        StoredAsset originalAsset = originalTask.join();
        StoredAsset thumbnailAsset = thumbnailTask.join();
        StoredAsset analysisAsset = analysisTask.join();

        MediaFile mediaFile = saveMediaFile(userId, contentType, bytes.length, optimized, originalAsset, thumbnailAsset,
                analysisAsset, "MINIO");
        return new UploadResult(originalAsset.url(), thumbnailAsset != null ? thumbnailAsset.url() : null,
                analysisAsset != null ? analysisAsset.url() : null, mediaFile.getId());
    }

    public record UploadResult(String url, String thumbnailUrl, String analysisImageUrl, String mediaFileId) {
    }

    private String createThumbnailIfImage(BufferedImage src, String fileName, Path uploadPath) {
        byte[] thumbBytes = createThumbnailBytes(src);
        if (thumbBytes == null) {
            return null;
        }
        try {
            String baseName = fileName.contains(".") ? fileName.substring(0, fileName.lastIndexOf('.')) : fileName;
            String thumbFileName = baseName + "-thumb.jpg";
            Path thumbPath = uploadPath.resolve(thumbFileName);
            Files.write(thumbPath, thumbBytes, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
            return "/uploads/" + thumbFileName;
        } catch (Exception ignored) {
            return null;
        }
    }

    private String createAnalysisIfImage(BufferedImage src, String fileName, Path uploadPath) {
        byte[] analysisBytes = createAnalysisBytes(src);
        if (analysisBytes == null) {
            return null;
        }
        try {
            String baseName = fileName.contains(".") ? fileName.substring(0, fileName.lastIndexOf('.')) : fileName;
            String analysisFileName = baseName + "-analysis.jpg";
            Path analysisPath = uploadPath.resolve(analysisFileName);
            Files.write(analysisPath, analysisBytes, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
            return "/uploads/" + analysisFileName;
        } catch (Exception ignored) {
            return null;
        }
    }

    private byte[] createThumbnailBytes(BufferedImage src) {
        return createDerivedJpeg(src, THUMB_MAX_EDGE, THUMB_JPEG_QUALITY);
    }

    private byte[] createAnalysisBytes(BufferedImage src) {
        return createDerivedJpeg(src, ANALYSIS_MAX_EDGE, ANALYSIS_JPEG_QUALITY);
    }

    private byte[] createDerivedJpeg(BufferedImage src, int maxEdge, float quality) {
        try {
            int srcW = src.getWidth();
            int srcH = src.getHeight();
            if (srcW <= 0 || srcH <= 0)
                return null;

            double ratio = Math.min((double) maxEdge / srcW, (double) maxEdge / srcH);
            int dstW = Math.max(1, (int) Math.round(srcW * Math.min(1.0, ratio)));
            int dstH = Math.max(1, (int) Math.round(srcH * Math.min(1.0, ratio)));

            BufferedImage output = new BufferedImage(dstW, dstH, BufferedImage.TYPE_INT_RGB);
            Graphics2D g = output.createGraphics();
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

            return encodeJpeg(output, quality);
        } catch (Exception ignored) {
            return null;
        }
    }

    private void writeJpeg(BufferedImage image, Path outputPath) throws IOException {
        Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName("jpg");
        if (!writers.hasNext())
            throw new IOException("JPEG writer not found");

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
        if (srcW <= 0 || srcH <= 0)
            return src;

        double ratio = Math.min((double) maxEdge / srcW, (double) maxEdge / srcH);
        double scale = Math.min(1.0, ratio);
        int dstW = Math.max(1, (int) Math.round(srcW * scale));
        int dstH = Math.max(1, (int) Math.round(srcH * scale));
        if (dstW == srcW && dstH == srcH)
            return src;

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
        if (!isImage)
            return ext == null || ext.isBlank() ? "bin" : ext;
        if ("jpg".equals(ext) || "jpeg".equals(ext))
            return "jpg";
        if ("png".equals(ext))
            return "png";
        return "jpg";
    }

    private void writeImageByExt(BufferedImage image, Path outputPath, String ext) throws IOException {
        if ("jpg".equals(ext) || "jpeg".equals(ext)) {
            BufferedImage rgb = toRgbImage(image);
            writeJpeg(rgb, outputPath, ORIGINAL_JPEG_QUALITY);
            return;
        }
        ImageIO.write(image, ext, outputPath.toFile());
    }

    private byte[] encodeImageByExt(BufferedImage image, String ext) throws IOException {
        if ("jpg".equals(ext) || "jpeg".equals(ext)) {
            return encodeJpeg(toRgbImage(image), ORIGINAL_JPEG_QUALITY);
        }

        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            if (!ImageIO.write(image, ext, outputStream)) {
                throw new IOException("Image writer not found for ext: " + ext);
            }
            return outputStream.toByteArray();
        }
    }

    private byte[] encodeJpeg(BufferedImage image, float quality) throws IOException {
        Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName("jpg");
        if (!writers.hasNext())
            throw new IOException("JPEG writer not found");

        ImageWriter writer = writers.next();
        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
                ImageOutputStream ios = ImageIO.createImageOutputStream(outputStream)) {
            writer.setOutput(ios);
            ImageWriteParam param = writer.getDefaultWriteParam();
            if (param.canWriteCompressed()) {
                param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
                param.setCompressionQuality(quality);
            }
            writer.write(null, new IIOImage(image, null, null), param);
            ios.flush();
            return outputStream.toByteArray();
        } finally {
            writer.dispose();
        }
    }

    private BufferedImage toRgbImage(BufferedImage image) {
        BufferedImage rgb = new BufferedImage(image.getWidth(), image.getHeight(), BufferedImage.TYPE_INT_RGB);
        Graphics2D g = rgb.createGraphics();
        try {
            g.setColor(Color.WHITE);
            g.fillRect(0, 0, rgb.getWidth(), rgb.getHeight());
            g.drawImage(image, 0, 0, null);
        } finally {
            g.dispose();
        }
        return rgb;
    }

    private String buildObjectKey(String prefix, String fileName) {
        LocalDateTime now = LocalDateTime.now();
        return prefix + "/"
                + now.getYear() + "/"
                + String.format(Locale.ROOT, "%02d", now.getMonthValue()) + "/"
                + fileName;
    }

    private String resolveContentType(String contentType, String ext, boolean isImage) {
        if (contentType != null && !contentType.isBlank()) {
            return contentType;
        }
        if (!isImage) {
            return "application/octet-stream";
        }
        return "png".equals(ext) ? "image/png" : "image/jpeg";
    }

    private MediaFile saveMediaFile(String userId, String mimeType, long fileSize, BufferedImage image,
            StoredAsset originalAsset,
            StoredAsset thumbnailAsset, StoredAsset analysisAsset, String storageMode) {
        User user = userRepository.findById(userId).orElseThrow();
        MediaFile mediaFile = MediaFile.builder()
                .userId(userId)
                .user(user)
                .storageMode(storageMode)
                .originalBucket(originalAsset.bucket())
                .originalObjectKey(originalAsset.objectKey())
                .originalUrl(originalAsset.url())
                .thumbBucket(thumbnailAsset != null ? thumbnailAsset.bucket() : null)
                .thumbObjectKey(thumbnailAsset != null ? thumbnailAsset.objectKey() : null)
                .thumbUrl(thumbnailAsset != null ? thumbnailAsset.url() : null)
                .analysisBucket(analysisAsset != null ? analysisAsset.bucket() : null)
                .analysisObjectKey(analysisAsset != null ? analysisAsset.objectKey() : null)
                .analysisUrl(analysisAsset != null ? analysisAsset.url() : null)
                .mimeType(mimeType)
                .width(image != null ? image.getWidth() : null)
                .height(image != null ? image.getHeight() : null)
                .fileSize(fileSize)
                .build();
        return mediaFileRepository.save(mediaFile);
    }

    private StoredAsset toStoredAsset(ObjectStorageService.StoredObject storedObject) {
        return new StoredAsset(storedObject.getBucket(), storedObject.getObjectKey(), storedObject.getUrl());
    }

    private record StoredAsset(String bucket, String objectKey, String url) {
    }

    private void writeJpeg(BufferedImage image, Path outputPath, float quality) throws IOException {
        Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName("jpg");
        if (!writers.hasNext())
            throw new IOException("JPEG writer not found");

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
        int normalizedMealCount = isMeal
                ? Math.max(0, Math.min(normalizedCount, mealCount != null ? mealCount : normalizedCount))
                : 0;
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
