package com.onboard.backend.user.exception;

public class RefreshTokenInvalidException extends RuntimeException {
    public RefreshTokenInvalidException(String message) {
        super(message);
    }
}
