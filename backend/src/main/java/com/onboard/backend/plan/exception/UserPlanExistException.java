package com.onboard.backend.plan.exception;

public class UserPlanExistException extends RuntimeException {
    public UserPlanExistException(String message) {
        super(message);
    }
}