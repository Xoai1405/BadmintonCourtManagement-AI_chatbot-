
package com.smashflow.backend.common.storage;

import java.io.IOException;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
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
}
