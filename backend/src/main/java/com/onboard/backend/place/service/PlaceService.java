package com.onboard.backend.place.service;

import com.onboard.backend.place.dto.RetrievePlaceDetailResponseDTO;
import com.onboard.backend.place.entity.Place;
import com.onboard.backend.place.exception.PlaceNotExistException;
import com.onboard.backend.place.repository.PlaceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PlaceService {

    private final PlaceRepository placeRepository;

    public RetrievePlaceDetailResponseDTO retrievePlaceDetail(Long placeId) {
        Place place = validatePlaceExistence(placeId);
        return RetrievePlaceDetailResponseDTO.builder()
                .placeId(place.getPlaceId())
                .googlePlaceId(place.getGooglePlaceId())
                .placeName(place.getPlaceName())
                .latitude(place.getLatitude())
                .longitude(place.getLongitude())
                .phoneNumber(place.getPhoneNumber())
                .address(place.getAddress())
                .rating(place.getRating())
                .ratingCount(place.getRatingCount())
                .placeUrl(place.getPlaceUrl())
                .imageUrl(place.getImageUrl())
                .siteUrl(place.getSiteUrl())
                .category(place.getCategory())
                .build();
    }

    private Place validatePlaceExistence(Long placeId) {
        return placeRepository.findById(placeId)
                .orElseThrow(() -> new PlaceNotExistException("존재하지 않는 장소입니다. placeId=" + placeId));
    }
}
