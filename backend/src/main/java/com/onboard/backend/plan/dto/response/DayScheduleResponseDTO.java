package com.onboard.backend.plan.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class DayScheduleResponseDTO {
    private Long dayScheduleId;
    private Integer dayOrder;
    private String title;
    private List<DayPlaceResponseDTO> daySchedule;
}
