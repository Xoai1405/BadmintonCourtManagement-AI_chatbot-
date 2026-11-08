
package com.smashflow.backend.config;

import java.io.IOException;
import java.time.LocalDateTime;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.smashflow.backend.service.CustomUserDetails;
import com.smashflow.backend.service.JwtService;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);

        try {
            String emailOrPhoneNumber = jwtService.extractEmailOrPhoneNumber(token);

            if (emailOrPhoneNumber != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                UserDetails userDetails = userDetailsService.loadUserByUsername(emailOrPhoneNumber);

                if (!isIssuedBeforePasswordChange(token, userDetails)) {
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userDetails, null, userDetails.getAuthorities());
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }
        } catch (Exception e) {
            // Token sai hoặc hết hạn: không set Authentication, coi như chưa đăng nhập
        }

        filterChain.doFilter(request, response);
    }

    private boolean isIssuedBeforePasswordChange(String token, UserDetails userDetails) {
        if (!(userDetails instanceof CustomUserDetails custom)) {
            return false;
        }
        LocalDateTime changedAt = custom.getPasswordChangedAt();
        if (changedAt == null) {
            return false; // chưa đổi mật khẩu lần nào: mọi token hợp lệ như trước
        }
        return jwtService.extractIssuedAt(token).isBefore(changedAt);
    }
}
