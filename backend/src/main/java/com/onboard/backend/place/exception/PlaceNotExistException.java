package com.onboard.backend.place.exception;

public class PlaceNotExistException extends RuntimeException {
    public PlaceNotExistException(String message) {
        super(message);
    }
}
