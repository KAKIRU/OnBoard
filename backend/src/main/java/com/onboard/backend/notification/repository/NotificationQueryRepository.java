package com.onboard.backend.notification.repository;

import com.onboard.backend.notification.entity.Notification;

import java.util.List;

public interface NotificationQueryRepository {
    List<Notification> findRecent50ByUserId(Long userId);
}
