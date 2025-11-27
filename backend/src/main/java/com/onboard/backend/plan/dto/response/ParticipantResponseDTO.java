package com.onboard.backend.plan.dto.response;

import com.onboard.backend.user.entity.UserStatus;
import com.onboard.backend.user.entity.UserType;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ParticipantResponseDTO {
    private Long userId;
    private String userName;
    private String googleEmail;
    private String profileImage;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private UserType userType;
    private UserStatus userStatus;
}
