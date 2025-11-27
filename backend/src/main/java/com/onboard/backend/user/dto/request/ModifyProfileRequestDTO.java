package com.onboard.backend.user.dto.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ModifyProfileRequestDTO {
    private String name;
    private boolean imageModified;
}
