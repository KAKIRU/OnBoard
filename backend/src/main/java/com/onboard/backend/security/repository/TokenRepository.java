package com.onboard.backend.security.repository;

import com.onboard.backend.security.entity.Token;
import com.onboard.backend.security.entity.TokenType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;

public interface TokenRepository extends JpaRepository<Token, Long> {
    boolean existsByTokenTypeAndTokenString(TokenType tokenType, String tokenString);

    void deleteAllByExpireDateBefore(LocalDateTime expireDateBefore);

    void deleteByTokenString(String tokenString);
}
