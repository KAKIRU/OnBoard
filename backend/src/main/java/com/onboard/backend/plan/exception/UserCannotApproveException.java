package com.onboard.backend.plan.exception;

public class UserCannotApproveException extends RuntimeException {
    public UserCannotApproveException(String message) {
        super(message);
    }
}
