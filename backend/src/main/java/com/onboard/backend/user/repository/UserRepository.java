package com.onboard.backend.user.repository;

import com.onboard.backend.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends JpaRepository<User, Long>, UserQueryRepository {
    User findByGoogleEmail(String googleEmail);
}