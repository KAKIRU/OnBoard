package com.onboard.backend.notification.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class NotificationResponseDTO {
    private Long notificationId;
    private String message;
    private String userImgUrl;
    private Boolean isRead;
}
