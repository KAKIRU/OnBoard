package com.onboard.backend.common.exception;

public class S3UploadFailedException extends RuntimeException{
    public S3UploadFailedException(String message) {
        super(message);
    }
}
