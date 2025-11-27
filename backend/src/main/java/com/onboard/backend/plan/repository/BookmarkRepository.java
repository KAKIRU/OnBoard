package com.onboard.backend.plan.repository;

import com.onboard.backend.plan.entity.Bookmark;
import com.onboard.backend.place.entity.Place;
import com.onboard.backend.plan.entity.Plan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BookmarkRepository extends JpaRepository<Bookmark,Long>, BookmarkQueryRepository {
    // createBookmark에서 Bookmark 되어 있는지 체크
    boolean existsByPlanAndPlace(Plan plan, Place place);
}
