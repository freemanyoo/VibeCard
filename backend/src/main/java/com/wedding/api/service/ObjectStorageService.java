package com.wedding.api.service;

import com.wedding.api.config.StorageProperties;
import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.EnumMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ObjectStorageService {

    private final StorageProperties storageProperties;
    private final Map<StorageTier, MinioClient> cachedClients = new EnumMap<>(StorageTier.class);

    public boolean isEnabled() {
        return isConfigured(StorageTier.FAST) || isConfigured(StorageTier.COLD);
    }

    public boolean isConfigured(StorageTier tier) {
        StorageProperties.MinioTarget target = getTarget(tier);
        return hasText(target.getEndpoint())
                && hasText(target.getAccessKey())
                && hasText(target.getSecretKey())
                && hasText(target.getBucket());
    }

    public StoredObject store(String objectKey, byte[] bytes, String contentType, StorageTier tier) {
        return store(objectKey, new ByteArrayInputStream(bytes), bytes.length, contentType, tier);
    }

    public StoredObject store(String objectKey, InputStream inputStream, long size, String contentType, StorageTier tier) {
        StorageProperties.MinioTarget target = getRequiredTarget(tier);
        MinioClient client = getClient(tier, target);
        ensureBucketExists(client, target.getBucket());

        try {
            client.putObject(
                    PutObjectArgs.builder()
                            .bucket(target.getBucket())
                            .object(normalizeObjectKey(objectKey))
                            .stream(inputStream, size, -1)
                            .contentType(contentType)
                            .build()
            );
        } catch (Exception e) {
            throw new IllegalStateException("MinIO upload failed for tier " + tier, e);
        }

        String normalizedKey = normalizeObjectKey(objectKey);
        return new StoredObject(
                target.getBucket(),
                normalizedKey,
                buildPublicUrl(target, normalizedKey),
                tier
        );
    }

    private synchronized MinioClient getClient(StorageTier tier, StorageProperties.MinioTarget target) {
        MinioClient client = cachedClients.get(tier);
        if (client != null) {
            return client;
        }

        MinioClient created = MinioClient.builder()
                .endpoint(target.getEndpoint())
                .credentials(target.getAccessKey(), target.getSecretKey())
                .build();
        cachedClients.put(tier, created);
        return created;
    }

    private void ensureBucketExists(MinioClient client, String bucket) {
        try {
            boolean exists = client.bucketExists(
                    BucketExistsArgs.builder()
                            .bucket(bucket)
                            .build()
            );
            if (!exists) {
                client.makeBucket(
                        MakeBucketArgs.builder()
                                .bucket(bucket)
                                .build()
                );
            }
        } catch (Exception e) {
            throw new IllegalStateException("Failed to prepare MinIO bucket: " + bucket, e);
        }
    }

    private StorageProperties.MinioTarget getRequiredTarget(StorageTier tier) {
        StorageProperties.MinioTarget target = getTarget(tier);
        if (!hasText(target.getEndpoint())
                || !hasText(target.getAccessKey())
                || !hasText(target.getSecretKey())
                || !hasText(target.getBucket())) {
            throw new IllegalStateException("MinIO is not configured for tier " + tier);
        }
        return target;
    }

    private StorageProperties.MinioTarget getTarget(StorageTier tier) {
        return tier == StorageTier.COLD
                ? storageProperties.getMinio().getCold()
                : storageProperties.getMinio().getFast();
    }

    private String buildPublicUrl(StorageProperties.MinioTarget target, String objectKey) {
        String base = hasText(target.getPublicBaseUrl()) ? target.getPublicBaseUrl() : target.getEndpoint();
        return trimTrailingSlash(base) + "/" + target.getBucket() + "/" + objectKey;
    }

    private String normalizeObjectKey(String objectKey) {
        if (objectKey == null) {
            throw new IllegalArgumentException("objectKey must not be null");
        }
        String normalized = objectKey.trim();
        while (normalized.startsWith("/")) {
            normalized = normalized.substring(1);
        }
        if (normalized.isEmpty()) {
            throw new IllegalArgumentException("objectKey must not be blank");
        }
        return normalized;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String trimTrailingSlash(String value) {
        String normalized = value == null ? "" : value.trim();
        while (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }

    public enum StorageTier {
        FAST,
        COLD
    }

    @Getter
    public static class StoredObject {
        private final String bucket;
        private final String objectKey;
        private final String url;
        private final StorageTier tier;

        public StoredObject(String bucket, String objectKey, String url, StorageTier tier) {
            this.bucket = bucket;
            this.objectKey = objectKey;
            this.url = url;
            this.tier = tier;
        }
    }
}
