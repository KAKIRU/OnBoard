package com.onboard.backend.plan.controller;

import com.onboard.backend.common.dto.response.CommonResponse;
import com.onboard.backend.plan.dto.response.PlanScheduleResponseDTO;
import com.onboard.backend.plan.service.DayScheduleService;
import com.onboard.backend.security.dto.JwtUserInfo;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/plan/{planId}/schedule")
public class DayScheduleController {

    private final DayScheduleService dayScheduleService;

    @GetMapping("")
    public CommonResponse<PlanScheduleResponseDTO> getPlanSchedule(@PathVariable Long planId, @AuthenticationPrincipal JwtUserInfo jwtUserInfo) {
        return new CommonResponse<>(dayScheduleService.getPlanSchedule(planId, jwtUserInfo.getUserId()), HttpStatus.OK);
    }
}
