package com.onboard.backend.plan.exception;

public class DayScheduleNotInThisPlanException extends RuntimeException {
    public DayScheduleNotInThisPlanException(String message) {
        super(message);
    }
}
