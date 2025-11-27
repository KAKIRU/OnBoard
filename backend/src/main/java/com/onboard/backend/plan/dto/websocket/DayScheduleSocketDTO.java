package com.onboard.backend.plan.dto.websocket;

import com.onboard.backend.plan.dto.request.CreateDayScheduleRequestDTO;
import com.onboard.backend.plan.dto.request.RenameDayScheduleRequestDTO;
import com.onboard.backend.plan.dto.request.UpdateSchedulePositionRequestDTO;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DayScheduleSocketDTO {
    private String action;

    private Long dayScheduleId;

    private Integer dayOrder;
    private Integer modifiedDayOrder;

    private String title;

    public CreateDayScheduleRequestDTO toCreateDayScheduleRequestDTO() {
        return CreateDayScheduleRequestDTO.builder()
                .title(title)
                .build();
    }

    public RenameDayScheduleRequestDTO toRenameDayScheduleRequestDTO() {
        return RenameDayScheduleRequestDTO.builder()
                .title(title)
                .build();
    }

    public UpdateSchedulePositionRequestDTO toUpdateSchedulePositionRequestDTO() {
        return UpdateSchedulePositionRequestDTO.builder()
                .dayOrder(dayOrder)
                .modifiedDayOrder(modifiedDayOrder)
                .build();
    }
}
