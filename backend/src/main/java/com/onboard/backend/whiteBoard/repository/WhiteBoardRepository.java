package com.onboard.backend.whiteBoard.repository;


import com.onboard.backend.plan.entity.Plan;
import com.onboard.backend.whiteBoard.entity.WhiteBoardObject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WhiteBoardRepository extends JpaRepository<WhiteBoardObject, Long> {
    @Query("SELECT w FROM WhiteBoardObject w LEFT JOIN FETCH w.place WHERE w.plan = :plan")
    List<WhiteBoardObject> findByPlanWithPlace(@Param("plan") Plan plan);

    WhiteBoardObject findByWhiteBoardObjectId(Long whiteBoardObjectId);
}
