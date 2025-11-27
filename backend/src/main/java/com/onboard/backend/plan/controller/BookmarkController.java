package com.onboard.backend.plan.controller;

import com.onboard.backend.common.dto.response.CommonResponse;
import com.onboard.backend.plan.dto.response.GetBookmarkListResponseDTO;
import com.onboard.backend.plan.service.BookmarkService;
import com.onboard.backend.security.dto.JwtUserInfo;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/plan/{planId}/bookmark")
public class BookmarkController {
    private final BookmarkService bookmarkService;

    @GetMapping("")
    public CommonResponse<GetBookmarkListResponseDTO> getBookmarkList(@PathVariable Long planId, @AuthenticationPrincipal JwtUserInfo jwtUserInfo) {
        return new CommonResponse<>(bookmarkService.getBookmarkList(planId, jwtUserInfo.getUserId()), HttpStatus.OK);
    }
}
