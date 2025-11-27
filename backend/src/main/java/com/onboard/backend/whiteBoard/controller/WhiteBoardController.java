package com.onboard.backend.whiteBoard.controller;

import com.onboard.backend.common.dto.response.CommonResponse;
import com.onboard.backend.security.dto.JwtUserInfo;

import com.onboard.backend.whiteBoard.dto.response.RetrieveWhiteBoardObjectsResponseDTO;
import com.onboard.backend.whiteBoard.service.WhiteBoardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

@Controller
@RequiredArgsConstructor
@RequestMapping("/api/v1/plan/{planId}/whiteBoardObject")
@PreAuthorize("isAuthenticated()")
public class WhiteBoardController {
    private final WhiteBoardService whiteBoardService;

    @GetMapping
    public CommonResponse<RetrieveWhiteBoardObjectsResponseDTO> retrieveWhiteBoardObjects(@PathVariable Long planId,@AuthenticationPrincipal JwtUserInfo jwtUserInfo){
        return new CommonResponse<>(whiteBoardService.retrieveWhiteBoardObjects(planId,jwtUserInfo.getUserId()), HttpStatus.OK);
    }

}
