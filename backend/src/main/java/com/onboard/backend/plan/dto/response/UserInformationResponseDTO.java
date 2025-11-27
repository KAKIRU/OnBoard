package com.onboard.backend.plan.dto.response;

import com.onboard.backend.user.entity.UserStatus;
import com.onboard.backend.user.entity.UserType;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class UserInformationResponseDTO {
    private UserStatus userStatus;
    private UserType userType;
}
