package com.onboard.backend.place.controller;

import com.onboard.backend.common.dto.response.CommonResponse;
import com.onboard.backend.place.dto.RetrievePlaceDetailResponseDTO;
import com.onboard.backend.place.service.PlaceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequiredArgsConstructor
@RequestMapping("/api/v1/place")
public class PlaceController {

    private final PlaceService placeService;

    @GetMapping("/{placeId}")
    public CommonResponse<RetrievePlaceDetailResponseDTO> retrievePlaceDetail(@PathVariable Long placeId) {
        return new CommonResponse<>(placeService.retrievePlaceDetail(placeId),HttpStatus.OK);
    }
}
