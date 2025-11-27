package com.onboard.backend.user.dto.request;

import lombok.Data;

@Data
public class LogoutRequestDTO {
    private String accessToken;
    private String refreshToken;
}
