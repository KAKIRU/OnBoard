package com.onboard.backend.user.repository;

import com.onboard.backend.user.entity.User;

import java.util.Optional;

public interface UserQueryRepository {
    // deleteUser(회원탈퇴) 할 때 동시성 문제 방지
    Optional<User> lockUser(Long userId);
}
