package com.onboard.backend.plan.dto.request;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CreateDayPlaceRequestDTO {
    private Long placeId;
    private Integer indexOrder;
}
