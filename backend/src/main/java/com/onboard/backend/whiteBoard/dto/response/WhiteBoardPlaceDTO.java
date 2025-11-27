package com.onboard.backend.whiteBoard.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class WhiteBoardPlaceDTO {
    private ObjectInfoDTO objectInfo;
    private PlaceInfoDTO place;
}
