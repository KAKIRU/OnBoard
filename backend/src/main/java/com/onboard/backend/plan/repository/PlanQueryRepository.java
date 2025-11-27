package com.onboard.backend.plan.repository;

import com.onboard.backend.plan.entity.Plan;
import com.onboard.backend.user.entity.User;

import java.util.List;

public interface PlanQueryRepository {
    List<Plan> findPlansByUser(User user);

    // 유저 회원 탈퇴 시 남아 있는 방들 삭제 + LOCK
    Plan lockPlan(Long planId);
}
