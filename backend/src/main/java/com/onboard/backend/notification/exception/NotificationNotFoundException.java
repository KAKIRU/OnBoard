// com/ssafy/backend/notification/exception/NotificationNotFoundException.java
package com.onboard.backend.notification.exception;

public class NotificationNotFoundException extends RuntimeException {
    public NotificationNotFoundException(String message) {
        super(message);
    }
}
