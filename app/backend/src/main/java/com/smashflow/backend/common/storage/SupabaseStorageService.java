
package com.smashflow.backend.common.storage;

import java.io.IOException;
import java.net.URI;
import java.util.UUID;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.multipart.MultipartFile;

@Service
public class SupabaseStorageService {

    private final RestClient restClient;
    private final String supabaseUrl;
    private final String secretKey;
    private final String bucket;

    public SupabaseStorageService(
            RestClient.Builder restClientBuilder,
            @Value("${supabase.url}") String supabaseUrl,
            @Value("${supabase.secret-key}") String secretKey,
            @Value("${supabase.storage.bucket}") String bucket) {

        this.restClient = restClientBuilder.build();
        this.supabaseUrl = supabaseUrl.replaceAll("/+$", "");
        this.secretKey = secretKey;
        this.bucket = bucket;
    }

    public String uploadCourtImage(Long courtId, MultipartFile file) {

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File ảnh không được để trống");
        }

        String contentType = file.getContentType();

        if (contentType == null ||
                !MediaType.parseMediaType(contentType).getType().equals("image")) {
            throw new IllegalArgumentException("File phải có định dạng ảnh");
        }

        String extension = StringUtils.getFilenameExtension(
                file.getOriginalFilename());

        if (extension == null ||
                !extension.matches("(?i)jpg|jpeg|png|webp")) {
            throw new IllegalArgumentException("Chỉ hỗ trợ JPG, JPEG, PNG, WEBP");
        }

        String fileName = UUID.randomUUID() + "." + extension.toLowerCase();

        String objectPath = "courts/" + courtId + "/" + fileName;

        String uploadUrl = supabaseUrl
                + "/storage/v1/object/"
                + bucket + "/" + objectPath;

        try {
            restClient.post()
                    .uri(uploadUrl)
                    .header("apikey", secretKey)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + secretKey)
                    .header("x-upsert", "false")
                    .contentType(MediaType.parseMediaType(contentType))
                    .body(file.getBytes())
                    .retrieve()
                    .toBodilessEntity();

        } catch (IOException e) {
            throw new IllegalStateException("Không thể đọc file ảnh", e);

        } catch (RestClientResponseException e) {
            throw new IllegalStateException(
                    "Upload ảnh lên Supabase thất bại: "
                            + e.getStatusCode(),
                    e);
        }

        return supabaseUrl
                + "/storage/v1/object/public/"
                + bucket + "/" + objectPath;
    }

    public void deleteCourtImage(Long courtId, String imageUrl) {

        if (imageUrl == null || imageUrl.isBlank()) {
            return;
        }

        String publicPrefix = "/storage/v1/object/public/" + bucket + "/";

        URI uri = URI.create(imageUrl);

        String rawPath = uri.getRawPath();

        if (rawPath == null || !rawPath.startsWith(publicPrefix)) {
            throw new IllegalArgumentException(
                    "URL ảnh không thuộc Supabase bucket hiện tại");
        }

        String objectPath = rawPath.substring(publicPrefix.length());

        if (!objectPath.startsWith("courts/" + courtId + "/")) {
            throw new IllegalArgumentException(
                    "Ảnh không thuộc sân cần thao tác");
        }

        String deleteUrl = supabaseUrl
                + "/storage/v1/object/"
                + bucket;

        restClient.method(HttpMethod.DELETE)
                .uri(deleteUrl)
                .header("apikey", secretKey)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + secretKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("prefixes", List.of(objectPath)))
                .retrieve()
                .toBodilessEntity();
    }

}
