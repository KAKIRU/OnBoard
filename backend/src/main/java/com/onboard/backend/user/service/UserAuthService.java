package com.onboard.backend.user.service;

import com.onboard.backend.common.util.S3Util;
import com.onboard.backend.security.dto.TokenDTO;
import com.onboard.backend.security.entity.TokenType;
import com.onboard.backend.security.util.JwtUtil;
import com.onboard.backend.user.dto.GoogleUserInfoDTO;
import com.onboard.backend.user.dto.request.LoginRequestDTO;
import com.onboard.backend.user.dto.request.LogoutRequestDTO;
import com.onboard.backend.user.dto.response.AccessTokenResponseDTO;
import com.onboard.backend.user.dto.response.LoginResponseDTO;
import com.onboard.backend.user.entity.User;
import com.onboard.backend.user.exception.RefreshTokenInvalidException;
import com.onboard.backend.user.repository.UserRepository;
import com.onboard.backend.user.util.GoogleOauthUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserAuthService {

    private final GoogleOauthUtil googleOauth;
    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final S3Util s3Util;

    private static final String PLACEHOLDER_PROFILE_IMAGE = "placeholder.png";

    @Transactional
    public LoginResponseDTO login(LoginRequestDTO loginRequestDTO) {

        GoogleUserInfoDTO googleUserInfo = googleOauth.getGoogleUserInfo(loginRequestDTO.getOauthToken());

        User user = userRepository.findByGoogleEmail(googleUserInfo.getEmail());
        if(user == null) {
            user = new User();
            user.setGoogleEmail(googleUserInfo.getEmail());
            user.setUserName(googleUserInfo.getName());
            user.setProfileImage(PLACEHOLDER_PROFILE_IMAGE);
            userRepository.save(user);
        }

        TokenDTO accessToken = jwtUtil.generateAccessToken(user);
        TokenDTO refreshToken = jwtUtil.generateRefreshToken(user.getUserId());


        return LoginResponseDTO.builder()
                .userId(user.getUserId())
                .googleEmail(user.getGoogleEmail())
                .profileImage(user.getProfileImage() != null
                        ? s3Util.getUrl(user.getProfileImage())
                        : null)
                .userName(user.getUserName())
                .accessToken(accessToken.getTokenString())
                .accessTokenExpireDate(accessToken.getExpireDate())
                .refreshToken(refreshToken.getTokenString())
                .refreshTokenExpireDate(refreshToken.getExpireDate())
                .build();
    }

    @Transactional
    public boolean logout(LogoutRequestDTO logoutRequestDTO) {
        jwtUtil.deleteFromWhiteList(logoutRequestDTO.getAccessToken());
        jwtUtil.deleteFromWhiteList(logoutRequestDTO.getRefreshToken());
        return true;
    }

    @Transactional
    public AccessTokenResponseDTO reissueAccessToken(String refreshToken) {
        // 리프레시 토큰이 null이거나 유효하지 않은 경우 예외 처리
        if(refreshToken == null || !jwtUtil.validateToken(refreshToken, TokenType.REFRESH)){
            throw new RefreshTokenInvalidException("리프레시 토큰이 유효하지 않습니다.");
        }

        Long userId = jwtUtil.getUserId(refreshToken);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RefreshTokenInvalidException("사용자를 찾을 수 없습니다."));
        TokenDTO newAccessToken = jwtUtil.generateAccessToken(user);
        return new AccessTokenResponseDTO(
                newAccessToken.getTokenString(),
                newAccessToken.getExpireDate()
        );
    }
}
