package com.onboard.backend.plan.repository;

import com.onboard.backend.plan.entity.DayPlace;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DayPlaceRepository extends JpaRepository<DayPlace, Long>, DayPlaceQueryRepository {
}
