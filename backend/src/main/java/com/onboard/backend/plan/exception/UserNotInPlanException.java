package com.onboard.backend.plan.exception;

public class UserNotInPlanException extends RuntimeException {
    public UserNotInPlanException(String message) {
        super(message);
    }
}
