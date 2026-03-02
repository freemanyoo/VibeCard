package com.wedding.api.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "storage")
public class StorageProperties {

    private MinioProperties minio = new MinioProperties();

    @Getter
    @Setter
    public static class MinioProperties {
        private MinioTarget fast = new MinioTarget();
        private MinioTarget cold = new MinioTarget();
    }

    @Getter
    @Setter
    public static class MinioTarget {
        private String endpoint;
        private String publicBaseUrl;
        private String accessKey;
        private String secretKey;
        private String bucket;
    }
}
