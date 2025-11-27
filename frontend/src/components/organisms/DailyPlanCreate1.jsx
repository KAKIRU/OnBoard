import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import DailyScheduleBlock from './DailyScheduleBlock';
import BookmarkModal from './BookmarkModal';
import PlanMemoModal from './PlanMemoModal';
import { Button } from '../atoms/Button';
import useDailyPlanStore from '../../store/useDailyPlanStore';
import { useDayMarkersStore } from '../../store/mapStore';
import { useStompDaySchedule } from '@/hooks/useStompDaySchedule';
import { useStompDayPlace } from '@/hooks/useStompDayPlace';
import { getPlaceDetail } from '@/apis/placeDetail';
import { useAuthStore } from '@/store/useAuthStore';
import { useAutoScroll } from '@/hooks/daily-plan/useAutoScroll';

import './DailyPlanCreate1.css';

const wsEndpoint = import.meta.env.VITE_WS_URL || `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`;

const DailyPlanCreate1 = ({ isOpen, onClose, bookmarkedPlaces = [], position, planId }) => {
  const modalRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const lastLoadedPlanIdRef = useRef(null);
  const accessToken = useAuthStore((s) => s.accessToken);
  // Auto scroll hook 분리 적용
  const { startAutoScroll, stopAutoScroll, handleAutoScroll } = useAutoScroll(scrollContainerRef);
  
  // 일정(일차) 최대 개수 제한
  const MAX_DAYS = 30;
  
  // Zustand 스토어에서 상태와 액션들 가져오기
  const {
    // 상태
    dailyPlans,
    showBookmarkModal,
    selectedDayIndex,
    bookmarkModalPosition,
    showMemoModal,
    memoModalData,
    draggedPlaceId,
    draggedFromDay,
    draggedFromIndex,
    isDragging,
    dragOverIndex,
    draggedDayIndex,
    swapTargetDayIndex,
    swapTargetPlaceIndex,
    selectedDayForMap,
    showDayMarkersOnMap,
    
    // 액션
    setPlanId,
    setDailyPlans,
    addDailyPlan,
    removeDailyPlan,
    updateDayTitle,
    reorderDailyPlans,
    swapDailyPlans,
    addPlaceToDay,
    removePlace,
    updatePlaceMemo,
    reorderPlaces,
    swapPlaces,
    // WS place actions (ID 기반)
    insertPlaceByServer,
    updatePlaceMemoById,
    reorderPlacesById,
    movePlaceAcrossDaysById,
    removePlaceById,
    findDayIndexById,
    setDayDragState,
    setPlaceDragState,
    setDragOverIndex,
    clearDragState,
    openBookmarkModal,
    closeBookmarkModal,
    openMemoModal,
    closeMemoModal,
    resetStore,
    setDraggedDayIndex,
    setDraggedPlaceId,
    setDraggedFromDay,
    setSwapTargetDayIndex,
    setSwapTargetPlaceIndex,
    memoModalOpen,
    setMemoModalOpen,
    selectedPlace,
    setSelectedPlace,
    toggleDayMarkersOnMap
  } = useDailyPlanStore();

  // 지도 스토어에서 일차별 마커 액션들 가져오기
  const { setDayMarkers, clearDayMarkers } = useDayMarkersStore();
  

  // DaySchedule 전용 WebSocket (신규)
  const {
    connected: dayWsConnected,
    createDay,
    renameDay,
    moveDayRealtime,
    updateSchedule,
    deleteDay,
  } = useStompDaySchedule({
    planId,
    wsUrl: wsEndpoint,
    accessToken,
    onMessage: (msg) => {
      try {
        const { action, ...payload } = msg || {};
        console.log('[DaySchedule][recv]', action, payload);
        switch (action) {
          case 'RENAME': {
            const { dayScheduleId, title } = payload || {};
            if (dayScheduleId != null && typeof title === 'string') {
              updateDayTitle(dayScheduleId, title);
            }
            break;
          }
          case 'CREATE': {
            // 서버가 브로드캐스트한 새 일차 생성 반영
            const { dayScheduleId, title, dayOrder } = payload || {};
            if (dayScheduleId == null) break;
            // 최대 일차 제한: 초과 시 수신된 CREATE도 무시
            if (Array.isArray(dailyPlans) && dailyPlans.length >= MAX_DAYS) {
              console.warn(`[DaySchedule] CREATE ignored: reached MAX_DAYS (${MAX_DAYS})`);
              break;
            }
            const exists = (dailyPlans || []).some((d) => d.id === dayScheduleId);
            if (exists) break;
            const insertIndex = Math.max(0, (typeof dayOrder === 'number' ? dayOrder - 1 : (dailyPlans?.length || 0)));
            const newDay = { id: dayScheduleId, title: title || `${insertIndex + 1}일차`, places: [] };
            const before = (dailyPlans || []);
            const next = [...before.slice(0, insertIndex), newDay, ...before.slice(insertIndex)];
            setDailyPlans(next);
            break;
          }
          case 'DELETE': {
            const { dayScheduleId } = payload || {};
            if (dayScheduleId == null) break;
            removeDailyPlan(dayScheduleId);
            break;
          }
          case 'UPDATE_SCHEDULE': {
            // 특정 dayScheduleId를 modifiedDayOrder 위치로 이동
            const { dayScheduleId, modifiedDayOrder } = payload || {};
            if (dayScheduleId == null || typeof modifiedDayOrder !== 'number') break;
            const fromIndex = (dailyPlans || []).findIndex((d) => d.id === dayScheduleId);
            const toIndex = Math.max(0, modifiedDayOrder - 1);
            if (fromIndex < 0 || fromIndex === toIndex) break;
            reorderDailyPlans(fromIndex, toIndex);
            break;
          }
          default:
            console.warn('[DaySchedule] unknown action:', action);
        }
      } catch (e) {
        console.warn('[DaySchedule] onMessage handler error', e);
      }
    },
    onSubscribed: () => {
      console.log('[DailyPlanCreate1] daySchedule subscribed');
      // REST 기반 초기 동기화 제거됨
    },
  });

  // DayPlace 전용 WebSocket (신규)
  const {
    connected: placeWsConnected,
    createPlace,
    renameMemo,
    updateInner,
    updateOuter,
    deletePlace,
  } = useStompDayPlace({
    planId,
    wsUrl: wsEndpoint,
    accessToken,
    onMessage: async (msg) => {
      try {
        const { action, ...payload } = msg || {};
        console.log('[DayPlace][recv]', action, payload);
        switch (action) {
          case 'CREATE': {
            const { dayScheduleId, dayPlaceId, placeId, indexOrder } = payload || {};
            if (dayScheduleId == null || dayPlaceId == null) break;
            // 1-based -> 0-based
            const insertIndex = Math.max(0, (indexOrder || 1) - 1);
            // 서버 페이로드에 상세가 포함되면 즉시 사용, 없으면 상세 조회로 폴백
            const hasInlineDetail = typeof payload.placeName === 'string' && payload.latitude != null && payload.longitude != null;
            if (hasInlineDetail) {
              const placeObj = {
                id: dayPlaceId,
                name: payload.placeName,
                displayName: payload.placeName,
                address: payload.address,
                formatted_address: payload.address,
                rating: payload.rating,
                ratingCount: typeof payload.ratingCount === 'number' ? payload.ratingCount : 0,
                imageUrl: payload.imageUrl || '',
                latitude: payload.latitude,
                longitude: payload.longitude,
                primaryCategory: payload.category,
                memo: payload.memo || '',
                placeId: placeId ?? payload.placeId,
                googlePlaceId: payload.googlePlaceId,
              };
              insertPlaceByServer(dayScheduleId, insertIndex, placeObj);
            } else if (placeId != null) {
              try {
                const detail = await getPlaceDetail(placeId);
                const placeObj = {
                  id: dayPlaceId,
                  name: detail.placeName,
                  displayName: detail.placeName,
                  address: detail.address,
                  formatted_address: detail.address,
                  rating: detail.rating,
                  ratingCount: typeof detail.ratingCount === 'number' ? detail.ratingCount : 0,
                  imageUrl: detail.imageUrl || '',
                  latitude: detail.latitude,
                  longitude: detail.longitude,
                  primaryCategory: detail.category,
                  memo: payload?.memo || '',
                  placeId: placeId,
                  googlePlaceId: detail.googlePlaceId,
                };
                insertPlaceByServer(dayScheduleId, insertIndex, placeObj);
              } catch (e) {
                console.warn('place detail fetch failed, skip insert', e);
              }
            }
            break;
          }
          case 'RENAME': {
            const { dayScheduleId, dayPlaceId, memo } = payload || {};
            if (dayScheduleId == null || dayPlaceId == null) break;
            updatePlaceMemoById(dayScheduleId, dayPlaceId, memo || '');
            break;
          }
          case 'UPDATE_INNER': {
            const { dayScheduleId, dayPlaceId, modifiedIndexOrder } = payload || {};
            if (dayScheduleId == null || dayPlaceId == null || modifiedIndexOrder == null) break;
            const toIndex = Math.max(0, modifiedIndexOrder - 1);
            reorderPlacesById(dayScheduleId, dayPlaceId, toIndex);
            break;
          }
          case 'UPDATE_OUTER': {
            const { dayScheduleId, dayPlaceId, modifiedDayScheduleId, modifiedIndexOrder } = payload || {};
            if (dayScheduleId == null || dayPlaceId == null || modifiedDayScheduleId == null || modifiedIndexOrder == null) break;
            const toIndex = Math.max(0, modifiedIndexOrder - 1);
            movePlaceAcrossDaysById(dayPlaceId, dayScheduleId, modifiedDayScheduleId, toIndex);
            break;
          }
          case 'DELETE': {
            const { dayScheduleId, dayPlaceId } = payload || {};
            if (dayScheduleId == null || dayPlaceId == null) break;
            removePlaceById(dayScheduleId, dayPlaceId);
            break;
          }
          default:
            break;
        }
      } catch (e) {
        console.error('[DayPlace][recv] error:', e);
      }
    },
  });

  // 장소/화이트보드 관련 WebSocket 제거됨: DailyPlanCreate1에서는 사용하지 않음

  // planId가 "실제로 변경될 때만" 초기화/로드 수행
  useEffect(() => {
    if (!planId) return;
    if (lastLoadedPlanIdRef.current === planId) {
      // 같은 방이면 재초기화/재로드 금지
      return;
    }
    setPlanId(planId);
    console.log('📋 planId 변경 감지 및 로드:', planId);
    clearDayMarkers();
    // 로컬 캐시 제거됨: 서버/WS 흐름만 사용
    lastLoadedPlanIdRef.current = planId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId, setPlanId])

  // 로컬 캐시 저장 로직 제거됨

  useEffect(() => {
    if (!isOpen) {
      closeBookmarkModal();
      closeMemoModal();
    }
  }, [isOpen, closeBookmarkModal, closeMemoModal]);

  // normalizePlaceData는 이제 스토어에서 제공됨

  // --- Day Drag & Drop 핸들러 ---
  const handleDayDragStart = (e, dayIndex) => {
    console.log('일차 드래그 시작:', dayIndex);
    setDayDragState(dayIndex);
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'day', dayIndex }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDayDragOver = (e, dayIndex) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 마우스 위치에 따른 상단/하단 구분
    if (draggedDayIndex !== null && draggedDayIndex !== dayIndex) {
      const target = e.currentTarget;
      const rect = target.getBoundingClientRect();
      const mouseY = e.clientY;
      const blockCenter = rect.top + rect.height / 2;
      
      // 마우스가 블록 상반부에 있으면 상단 삽입, 하반부에 있으면 하단 삽입
      const isTopHalf = mouseY < blockCenter;
      
      // 드롭 위치 정보를 스토어에 저장
      setSwapTargetDayIndex(dayIndex);
      
      // 상단/하단 정보를 DOM에 데이터 속성으로 추가
      target.setAttribute('data-drop-position', isTopHalf ? 'top' : 'bottom');
      
      console.log(`드래그 오버: 일차 ${dayIndex}, 위치: ${isTopHalf ? '상단' : '하단'}`);
    }
    
    // 자동 스크롤 처리 (hook)
    handleAutoScroll(e);
  };

  const handleDayDrop = (e, dayIndex) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('일차 드롭 이벤트:', { dayIndex });
    
    // 자동 스크롤 중지
    stopAutoScroll();
  
    const handleDayDragLeave = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // 드롭 위치 데이터 속성 정리
      const target = e.currentTarget;
      target.removeAttribute('data-drop-position');
      
      // 자동 스크롤 중지
      stopAutoScroll();
    };
    
    // 먼저 JSON 데이터 확인 (일차 드래그)
    const dragDataString = e.dataTransfer.getData('application/json');
    if (dragDataString) {
      const dragData = JSON.parse(dragDataString);
      console.log('드래그 데이터 (JSON):', dragData);

      if (dragData.type === 'day') {
        // 드롭 위치 기반 목표 인덱스 산정
        const target = e.currentTarget;
        const dropPosition = target.getAttribute('data-drop-position');
        // rawTargetIndex: 원본 리스트 기준 삽입될 위치(하단이면 +1)
        let targetIndex = dayIndex;
        if (dropPosition === 'bottom') targetIndex = dayIndex + 1;

        // 유효성 체크
        if (draggedDayIndex === null || draggedDayIndex === undefined) {
          console.log('일차 드롭 취소: 유효하지 않은 드래그');
          return;
        }

        const fromIndex = draggedDayIndex;
        const maxIndex = Math.max(0, (dailyPlans?.length || 1) - 1);
        // insertIndex 계산: 소스가 타깃보다 앞이면 제거 후 인덱스가 1 줄어듦
        let insertIndex = targetIndex - (fromIndex < targetIndex ? 1 : 0);
        if (insertIndex > maxIndex) insertIndex = maxIndex; // 끝 다음은 끝으로 보정
        if (insertIndex < 0) insertIndex = 0;

        const toIndex = targetIndex;
        console.log('일차 드롭 감지:', { from: fromIndex, toRaw: toIndex, finalInsert: insertIndex, position: dropPosition });
        if (fromIndex === insertIndex) {
          console.log('일차 드롭 취소: 최종 위치 동일');
          return;
        }

        console.log('일차 위치 이동 실행:', { from: fromIndex, toRaw: toIndex, position: dropPosition, finalIndex: insertIndex });

        // 재배치 실행 (로컬)
        const movedDayId = (dailyPlans || [])[fromIndex]?.id;
        const prevOrder = (fromIndex ?? 0) + 1;
        reorderDailyPlans(fromIndex, insertIndex);

        // WS 송신
        try {
          if (movedDayId != null) {
            const finalOrder = (insertIndex ?? 0) + 1;
            updateSchedule({ dayScheduleId: movedDayId, dayOrder: prevOrder, modifiedDayOrder: finalOrder });
            console.log('[WS][send] UPDATE_SCHEDULE', { dayScheduleId: movedDayId, dayOrder: prevOrder, modifiedDayOrder: finalOrder });
          }
        } catch (e) {
          console.warn('updateSchedule send failed', e);
        }

        clearDragState();
        return;
      }
    }
    
    // 화이트보드에서 장소 드래그 처리 (text/plain)
    const placeDataString = e.dataTransfer.getData('text/plain');
    if (placeDataString) {
      try {
        const dragData = JSON.parse(placeDataString);
        console.log('텍스트 드래그 데이터:', dragData);
        
        // 페이지 PlaceBlock 타입인 경우 처리 거부 (드롭 존에서만 처리해야 함)
        if (dragData.type === 'page-place') {
          console.log('⚠️ 페이지 PlaceBlock은 드롭 존에서만 처리 가능 - 일차 드롭 무시');
          return;
        }
        
        // 기존 화이트보드 장소 처리 (타입이 없는 경우) -> WS 전송으로 변경
        if (!dragData.type && (dragData.placeName || dragData.name)) {
          console.log('화이트보드에서 장소 드롭(WS 전송으로 처리):', dragData);
          const targetDayId = dailyPlans?.[dayIndex]?.id;
          if (targetDayId == null) {
            console.warn('❌ 일차 ID 없음 - 추가 취소');
            return;
          }
          // 가능한 식별자 추출 (DB PK 우선, snake_case 포함, googlePlaceId 제외)
          const rawPlaceId = dragData.id ?? dragData.placeId ?? dragData.place_id;
          const placeId = typeof rawPlaceId === 'number' ? rawPlaceId : Number(rawPlaceId);
          if (!placeId || Number.isNaN(placeId)) {
            console.warn('❌ placeId 없음 - 서버 전송 불가');
            return;
          }
          const insertIndex = (dailyPlans?.[dayIndex]?.places?.length || 0); // 끝에 추가
          try { createPlace({ dayScheduleId: targetDayId, placeId, indexOrder: insertIndex + 1 }); } catch (e2) { console.warn('createPlace send failed', e2); }
          return;
        }
        
        console.log('⚠️ 지원되지 않는 텍스트 드래그 데이터:', dragData);
      } catch (error) {
        console.error('장소 데이터 파싱 오류:', error);
      }
    }
    
    console.log('처리 가능한 드래그 데이터가 없음');
  };

  const handleDayDragEnd = (e) => {
    console.log('일차 드래그 종료');
    e.stopPropagation();
    
    // 시각적 피드백 초기화
    e.currentTarget.style.opacity = '1';
    document.querySelectorAll('.daily-plan-block').forEach(block => {
      block.classList.remove('drag-over-day');
      block.style.opacity = '1';
    });
    
    // 자동 스크롤 중단
    stopAutoScroll();
    
    clearDragState();
  };



  const handleDayDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 드롭 위치 데이터 속성 정리
    const target = e.currentTarget;
    target.removeAttribute('data-drop-position');
    
    // 교환 대상 포커스 해제
    setSwapTargetDayIndex(null);
    
    // 드래그 오버 시각적 피드백 제거
    target.classList.remove('drag-over-day');
  };

  // --- Place Drag & Drop 핸들러 ---
  const handlePlaceDragStart = (e, place, dayIndex, placeIndex) => {
    // 이벤트 버블링 방지
    e.stopPropagation();
    
    console.log('장소 드래그 시작:', { place: place.name, dayIndex, placeIndex });
    console.log('드래그 상태 설정 전:', { draggedPlaceId, draggedFromDay, draggedFromIndex });
    
    setPlaceDragState(true, place.id, dayIndex, placeIndex);
    
    console.log('드래그 상태 설정 후:', { 
      isDragging: true, 
      draggedPlaceId: place.id, 
      draggedFromDay: dayIndex, 
      draggedFromIndex: placeIndex 
    });
    
    // dataTransfer 설정 강화
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.dropEffect = 'move';
    
    // 장소 드래그 데이터 설정
    const placeData = {
      type: 'place',
      place: place,
      dayIndex: dayIndex,
      placeIndex: placeIndex
    };
    
    console.log('설정하는 드래그 데이터:', placeData);
    
    // 다양한 형식으로 데이터 설정
    e.dataTransfer.setData('application/json', JSON.stringify(placeData));
    e.dataTransfer.setData('text/plain', JSON.stringify(placeData));
    e.dataTransfer.setData('text/place-drag', JSON.stringify(placeData));
    
    // CSS 클래스로 시각적 피드백 적용
    e.currentTarget.classList.add('dragging');
    
    // 드래그 중 마우스 이동 이벤트 리스너 추가
    document.addEventListener('dragover', handleAutoScroll);
  };

  const handlePlaceDragOver = (e, dayIndex, placeIndex) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('드래그 오버 호출:', { 
      draggedPlaceId, 
      isDragging, 
      targetDay: dayIndex, 
      targetPlace: placeIndex 
    });
    
    // 장소 드래그 중인지 확인
    if (draggedPlaceId) {
      console.log('장소 드래그 오버 상세:', { 
        targetDay: dayIndex, 
        targetPlace: placeIndex, 
        draggedFromDay, 
        draggedFromIndex,
        조건검사: draggedFromDay !== dayIndex || draggedFromIndex !== placeIndex
      });
      
      // 다른 장소 위에 드래그할 때만 포커스 효과 적용
      if (draggedFromDay !== dayIndex || draggedFromIndex !== placeIndex) {
        // 마우스 위치에 따른 상단/하단 구분
        const target = e.currentTarget;
        const rect = target.getBoundingClientRect();
        const mouseY = e.clientY;
        const blockCenter = rect.top + rect.height / 2;
        
        // 마우스가 블록 상반부에 있으면 상단 삽입, 하반부에 있으면 하단 삽입
        const isTopHalf = mouseY < blockCenter;
        
        console.log('포커스 효과 적용:', { placeIndex, position: isTopHalf ? '상단' : '하단' });
        
        setSwapTargetPlaceIndex(placeIndex);
        setDragOverIndex(placeIndex);
        
        // 상단/하단 정보를 DOM에 데이터 속성으로 추가
        target.setAttribute('data-drop-position', isTopHalf ? 'top' : 'bottom');
        target.classList.add('drag-over-place');
      } else {
        console.log('같은 장소로 드래그 - 포커스 효과 없음');
      }
    } else {
      console.log('드래그 중인 장소가 없음');
    }
  };

  const handlePlaceDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 드롭 위치 데이터 속성 정리
    const target = e.currentTarget;
    target.removeAttribute('data-drop-position');
    
    // 교환 대상 포커스 해제
    setSwapTargetPlaceIndex(null);
    
    e.currentTarget.classList.remove('drag-over-place');
    setDragOverIndex(null);
  };

  const handlePlaceDrop = (e, targetDayIndex, targetPlaceIndex) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('=== 장소 드롭 이벤트 시작 ===');
    console.log('드롭 대상:', { targetDayIndex, targetPlaceIndex });
    console.log('현재 드래그 상태:', { draggedPlaceId, draggedFromDay, draggedFromIndex });

    // 다양한 형식으로 드래그 데이터 확인
    let dragDataString = e.dataTransfer.getData('application/json');
    console.log('드래그 데이터 (application/json):', dragDataString);
    
    if (!dragDataString) {
      dragDataString = e.dataTransfer.getData('text/place-drag');
      console.log('드래그 데이터 (text/place-drag):', dragDataString);
    }
    
    if (!dragDataString) {
      dragDataString = e.dataTransfer.getData('text/plain');
      console.log('드래그 데이터 (text/plain):', dragDataString);
    }
    
    if (!dragDataString) {
      console.log('❌ 모든 형식에서 드래그 데이터 없음 - 종료');
      return;
    }

    const dragData = JSON.parse(dragDataString);
    console.log('파싱된 드래그 데이터:', dragData);

    // 1. 북마크에서 드래그한 장소 처리
    if (dragData.type === 'bookmark-place') {
      console.log('📌 북마크 장소 드롭 처리');
      
      // 드롭 위치에 따른 인덱스 조정
      const target = e.currentTarget;
      const dropPosition = target.getAttribute('data-drop-position');
      let insertIndex = targetPlaceIndex;
      
      // 하단에 드롭하는 경우 인덱스를 1 증가
      if (dropPosition === 'bottom') {
        insertIndex = targetPlaceIndex + 1;
      }
      
      console.log('🎯 북마크 장소 삽입:', {
        place: dragData.place.name,
        dayIndex: targetDayIndex,
        insertIndex,
        position: dropPosition
      });
      
      const dayScheduleId = dailyPlans[targetDayIndex]?.id;
      if (dayScheduleId != null) {
        const rawPlaceId = dragData.place.placeId ?? dragData.place.id ?? dragData.place.place_id;
        const placeId = typeof rawPlaceId === 'number' ? rawPlaceId : Number(rawPlaceId);
        if (!placeId || Number.isNaN(placeId)) {
          console.warn('❌ placeId 유효하지 않음 - 생성 취소', { rawPlaceId });
          return;
        }
        try { createPlace({ dayScheduleId, placeId, indexOrder: insertIndex + 1 }); } catch (e2) { console.warn('createPlace send failed', e2); }
      }
      
      // 북마크 모달은 열어둠 (연속 추가를 위해)
      
      return;
    }
    
    // 2. 페이지 PlaceBlock 처리 (WS 전송)
    if (dragData.type === 'page-place' && dragData.place) {
      console.log('🏢 페이지 PlaceBlock 드롭 처리');
      
      // 드롭 위치에 따른 인덱스 조정
      const target = e.currentTarget;
      const dropPosition = target.getAttribute('data-drop-position');
      let insertIndex = targetPlaceIndex;
      
      // 하단에 드롭하는 경우 인덱스를 1 증가
      if (dropPosition === 'bottom') {
        insertIndex = targetPlaceIndex + 1;
      }

      // 페이지 PlaceBlock에서 온 placeId를 우선 사용하고 숫자로 검증하여 전송
      const dayScheduleId = dailyPlans[targetDayIndex]?.id;
      if (dayScheduleId != null) {
        const rawPlaceId = dragData.place.placeId ?? dragData.place.id ?? dragData.place.place_id ?? dragData.place.googlePlaceId;
        const placeId = typeof rawPlaceId === 'number' ? rawPlaceId : Number(rawPlaceId);
        if (!placeId || Number.isNaN(placeId)) {
          console.warn('❌ placeId 유효하지 않음 - 생성 취소', { rawPlaceId, from: 'page-place' });
          return;
        }
        try { createPlace({ dayScheduleId, placeId, indexOrder: insertIndex + 1 }); } catch (e2) { console.warn('createPlace send failed', e2); }
      }
      
      return;
    }

    // 기존 장소 드래그 처리 (WS 전송)
    if (dragData.type !== 'place') {
      console.log('❌ 지원되지 않는 드래그 타입 - 종료');
      return;
    }

    const { dayIndex: sourceDayIndex, placeIndex: sourcePlaceIndex } = dragData;
  
    // 드롭 위치에 따른 1-based 목적지 순서 계산 (안전 클램핑 포함)
    const target = e.currentTarget;
    const dropPosition = target.getAttribute('data-drop-position');
    const toCount = dailyPlans?.[targetDayIndex]?.places?.length || 0;
    
    // 동일 일차 내 인접 드롭은 순서 변화가 없으므로 취소 처리
    // 예: 2번을 3번의 상단(top)으로 드롭하거나, 3번을 2번의 하단(bottom)으로 드롭
    if (sourceDayIndex === targetDayIndex) {
      if (dropPosition === 'top' && targetPlaceIndex === sourcePlaceIndex + 1) {
        console.log('✅ 인접 상단 드롭 - 순서 변화 없음, 취소');
        handlePlaceDragEnd(e);
        return;
      }
      if (dropPosition === 'bottom' && targetPlaceIndex === sourcePlaceIndex - 1) {
        console.log('✅ 인접 하단 드롭 - 순서 변화 없음, 취소');
        handlePlaceDragEnd(e);
        return;
      }
    }

    // 제거 후 기준의 0-based 삽입 인덱스 계산
    let insertIndex0 = (dropPosition === 'bottom') ? (targetPlaceIndex + 1) : targetPlaceIndex;
    const withinSameDay = (dailyPlans?.[sourceDayIndex]?.id === dailyPlans?.[targetDayIndex]?.id);
    if (withinSameDay && sourcePlaceIndex < insertIndex0) insertIndex0 -= 1;

    // 경계 클램프
    const toCountNow = dailyPlans?.[targetDayIndex]?.places?.length || 0;
    const maxLenAfter = withinSameDay ? toCountNow : (toCountNow + 1);
    insertIndex0 = Math.max(0, Math.min(insertIndex0, maxLenAfter - 1));

    // 같은 위치면 취소
    if (withinSameDay && sourcePlaceIndex === insertIndex0) {
      console.log('❌ 같은 위치로 드롭 - 취소');
      handlePlaceDragEnd(e);
      return;
    }

    const modifiedOrder1b = insertIndex0 + 1;

    console.log('🔄 장소 위치 이동 실행 (WS)');
    const fromDayId = dailyPlans[sourceDayIndex]?.id;
    const toDayId = dailyPlans[targetDayIndex]?.id;
    const dayPlaceId = dailyPlans[sourceDayIndex]?.places?.[sourcePlaceIndex]?.id;
    if (fromDayId == null || toDayId == null || dayPlaceId == null) {
      console.warn('skip move: missing ids');
    } else if (fromDayId === toDayId) {
      try { updateInner({ dayScheduleId: fromDayId, dayPlaceId, indexOrder: sourcePlaceIndex + 1, modifiedIndexOrder: modifiedOrder1b }); } catch (e4) { console.warn('updateInner send failed', e4); }
    } else {
      try { updateOuter({ dayScheduleId: fromDayId, dayPlaceId, modifiedDayScheduleId: toDayId, indexOrder: sourcePlaceIndex + 1, modifiedIndexOrder: modifiedOrder1b }); } catch (e5) { console.warn('updateOuter send failed', e5); }
    }

    handlePlaceDragEnd(e);
  };

  const handlePlaceDragEnd = (e) => {
    console.log('장소 드래그 종료');
    e.preventDefault();
    e.stopPropagation();
    
    // CSS 클래스로 시각적 피드백 초기화
    if (e.currentTarget) {
      e.currentTarget.classList.remove('dragging');
    }
    
    // 모든 장소 아이템 스타일 초기화
    document.querySelectorAll('.daily-place-block').forEach(item => {
      item.classList.remove('dragging', 'drag-over-place', 'swap-target');
    });
    
    // 자동 스크롤 중단 및 이벤트 리스너 제거
    stopAutoScroll();
    document.removeEventListener('dragover', handleAutoScroll);
    
    // 드래그 상태 초기화
    clearDragState();
  };

  // --- 모달 관련 핸들러 ---
  const handleAddPlaceClick = (e, dayIndex) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const position = {
      x: rect.left + rect.width / 2,
      y: rect.bottom + 10
    };
    openBookmarkModal(dayIndex, position);
  };

  const handleOpenBookmarkModal = (e, dayIndex) => {
    if (showMemoModal) return;
    const rect = e.currentTarget.getBoundingClientRect();
    openBookmarkModal(dayIndex, { x: rect.right + 10, y: rect.top });
  };

  const addPlaceFromBookmark = (place, insertIndex = -1) => {
    console.log('📝 addPlaceFromBookmark 호출:', { selectedDayIndex, placeName: place.name, insertIndex });
    if (selectedDayIndex === null) return;
    const dayScheduleId = dailyPlans[selectedDayIndex]?.id;
    if (dayScheduleId == null) return;
    const idx = insertIndex === -1 ? (dailyPlans[selectedDayIndex]?.places?.length || 0) : insertIndex;
    const indexOrder = idx + 1; // 1-based
    // 북마크에서 넘어오는 다양한 키를 안전하게 정규화 (숫자 변환 포함)
    const rawPlaceId = place.placeId ?? place.id ?? place.place_id ?? place.googlePlaceId;
    const placeId = typeof rawPlaceId === 'number' ? rawPlaceId : Number(rawPlaceId);
    if (!placeId || Number.isNaN(placeId)) {
      console.warn('❌ placeId 유효하지 않음 - 생성 취소', { rawPlaceId, place });
      return;
    }
    try { createPlace({ dayScheduleId, placeId, indexOrder }); } catch (e) { console.warn('createPlace send failed', e); }
    closeBookmarkModal();
  };

  // === 드롭 존 핸들러들 ===
  const handleDropZoneDragOver = (e, dayIndex, insertIndex) => {
    console.log('🔄 handleDropZoneDragOver 호출:', { dayIndex, insertIndex, target: e.currentTarget.className });
    e.preventDefault();
    e.stopPropagation();
    
    // 기존 DailyPlaceBlock 이동 중에는 드롭 존 포커스 효과를 비활성화
    if (draggedPlaceId) {
      e.dataTransfer.dropEffect = 'none';
      console.log('⏭️ DailyPlaceBlock 이동 중 - 드롭 존 활성화 건너뜀');
      return;
    }

    // 북마크 장소(application/json) 또는 페이지 PlaceBlock(text/plain) 허용
    const hasJsonData = e.dataTransfer.types.includes('application/json');
    const hasTextData = e.dataTransfer.types.includes('text/plain');
    
    if (!hasJsonData && !hasTextData) {
      console.log('❌ 지원되는 드래그 데이터 없음');
      return;
    }
    
    e.dataTransfer.dropEffect = 'copy';
    
    // 드롭 존 시각적 피드백
    e.currentTarget.classList.add('drop-zone-active');
    
    console.log('✅ 드롭 존 활성화:', { dayIndex, insertIndex });
  };

  const handleDropZoneDragLeave = (e) => {
    console.log('🚫 handleDropZoneDragLeave 호출');
    e.preventDefault();
    e.stopPropagation();
    
    // 드롭 존 시각적 피드백 제거
    e.currentTarget.classList.remove('drop-zone-active');
  };

  const handleDropZoneDrop = (e, dayIndex, insertIndex) => {
    console.log('🎯 handleDropZoneDrop 호출:', { dayIndex, insertIndex, target: e.currentTarget.className });
    e.preventDefault();
    e.stopPropagation();
    
    // 드롭 존 시각적 피드백 제거
    e.currentTarget.classList.remove('drop-zone-active');
    
    // 기존 DailyPlaceBlock 이동 중에는 드롭 존 드롭을 무시
    if (draggedPlaceId) {
      console.log('⏭️ DailyPlaceBlock 이동 중 - 드롭 존 드롭 무시');
      return;
    }

    try {
      // 1. 북마크/기존 장소 (application/json) 처리
      let dragDataStr = e.dataTransfer.getData('application/json');
      
      if (dragDataStr) {
        const dragData = JSON.parse(dragDataStr);
        
        // 1-1) 북마크 추가
        if (dragData.type === 'bookmark-place' && dragData.place) {
          console.log('📌 북마크 장소 드롭:', {
            place: dragData.place.name,
            dayIndex,
            insertIndex
          });
          
          // WS 전송으로 생성
      const dayScheduleId = dailyPlans[dayIndex]?.id;
      const rawPlaceId = dragData.place.placeId ?? dragData.place.id ?? dragData.place.place_id;
      const placeId = typeof rawPlaceId === 'number' ? rawPlaceId : Number(rawPlaceId);
      if (dayScheduleId != null && placeId && !Number.isNaN(placeId)) {
        try { createPlace({ dayScheduleId, placeId, indexOrder: (insertIndex ?? 0) + 1 }); } catch (e1) { console.warn('createPlace send failed', e1); }
      } else {
        console.warn('❌ dayScheduleId/placeId 누락 - 생성 취소');
      }
          // 북마크 모달은 열어둠 (연속 추가를 위해)
          return;
        }
        
        // 1-2) 기존 장소 이동 (same/other day 모두 처리)
        if (dragData.type === 'place') {
          const { dayIndex: sourceDayIndex, placeIndex: sourcePlaceIndex } = dragData;
          const fromDayId = dailyPlans?.[sourceDayIndex]?.id;
          const toDayId = dailyPlans?.[dayIndex]?.id;
          const dayPlaceId = dailyPlans?.[sourceDayIndex]?.places?.[sourcePlaceIndex]?.id;
          if (fromDayId == null || toDayId == null || dayPlaceId == null) {
            console.warn('drop-zone move skip: missing ids');
            return;
          }
          const toCount = dailyPlans?.[dayIndex]?.places?.length || 0;
          const withinSameDay = fromDayId === toDayId;
          // 드롭 존 insertIndex는 0..toCount, 1-based는 +1
          let modifiedOrder1b = (insertIndex ?? 0) + 1;
          const maxOrder = withinSameDay ? toCount : (toCount + 1);
          modifiedOrder1b = Math.max(1, Math.min(modifiedOrder1b, maxOrder));
          const finalTargetIdx0b = Math.max(0, modifiedOrder1b - 1);
          // 동일 일차에서 동일 위치면 취소
          if (withinSameDay && sourcePlaceIndex === finalTargetIdx0b) {
            console.log('drop-zone same position within day - cancel');
            return;
          }
          try {
            if (withinSameDay) {
              updateInner({ dayScheduleId: fromDayId, dayPlaceId, indexOrder: sourcePlaceIndex + 1, modifiedIndexOrder: modifiedOrder1b });
            } else {
              updateOuter({ dayScheduleId: fromDayId, dayPlaceId, modifiedDayScheduleId: toDayId, indexOrder: sourcePlaceIndex + 1, modifiedIndexOrder: modifiedOrder1b });
            }
          } catch (errMove) {
            console.warn('place move via drop-zone failed', errMove);
          }
          return;
        }
      }
      
      // 2. 페이지 PlaceBlock (text/plain) 처리
      dragDataStr = e.dataTransfer.getData('text/plain');
      
      if (dragDataStr) {
        const dragData = JSON.parse(dragDataStr);
        
        // 페이지 PlaceBlock 타입 확인
        if (dragData.type === 'page-place' && dragData.place) {
          console.log('🏢 페이지 PlaceBlock 드롭:', {
            place: dragData.place.placeName || dragData.place.name,
            dayIndex,
            insertIndex
          });
          
          // PlaceBlock 데이터를 DailyPlaceBlock 형식으로 변환
          const placeData = dragData.place;
          const normalizedPlace = {
            id: placeData.id,
            placeId: placeData.placeId ?? placeData.place_id ?? undefined,
            name: placeData.placeName || placeData.name,
            address: placeData.address,
            rating: placeData.rating,
            ratingCount: placeData.ratingCount,
            imageUrl: placeData.googleImg && placeData.googleImg[0],
            latitude: placeData.latitude || placeData.lat,
            longitude: placeData.longitude || placeData.lng,
            primaryCategory: placeData.primaryCategory,
            originalData: placeData
          };
          // WS 전송으로 생성
      const dayScheduleId = dailyPlans[dayIndex]?.id;
      if (dayScheduleId != null) {
            const rawPlaceId = normalizedPlace.placeId ?? normalizedPlace.id ?? normalizedPlace.place_id;
            const placeId = typeof rawPlaceId === 'number' ? rawPlaceId : Number(rawPlaceId);
            if (!placeId || Number.isNaN(placeId)) {
              console.warn('❌ placeId 유효하지 않음 - 생성 취소', { rawPlaceId });
              return;
            }
            try { createPlace({ dayScheduleId, placeId, indexOrder: (insertIndex ?? 0) + 1 }); } catch (e2) { console.warn('createPlace send failed', e2); }
      } else {
        console.warn('❌ dayScheduleId 없음 - 생성 취소');
      }
          return;
        }
      }
      
      console.log('❌ 지원되는 드래그 데이터가 없음');
    } catch (error) {
      console.error('❌ 드롭 존 드롭 오류:', error);
    }
  };

  const handleOpenMemoModal = (place, dayTitle, position) => {
    closeBookmarkModal();
    openMemoModal(place, dayTitle, place.memo || '', position);
  };

  const handleMemoSave = (memo) => {
    const { place, dayTitle } = memoModalData;
    const dayIndex = dailyPlans.findIndex(day => day.title === dayTitle);
    const placeIndex = dailyPlans[dayIndex]?.places.findIndex(p => p.id === place.id);
    if (dayIndex !== -1 && placeIndex !== -1) {
      const dayScheduleId = dailyPlans[dayIndex]?.id;
      const dayPlaceId = dailyPlans[dayIndex]?.places?.[placeIndex]?.id;
      if (dayScheduleId != null && dayPlaceId != null) {
        try { renameMemo({ dayScheduleId, dayPlaceId, memo }); } catch (e) { console.warn('renameMemo send failed', e); }
      }
    }
    closeMemoModal();
  };

  // === 지도 마커 핸들러 ===
  const handleDayClick = (dayIndex) => {
    console.log('🗺️ 일차 클릭 - 지도 마커 토글:', { dayIndex, selectedDayForMap, showDayMarkersOnMap });
    
    // 일차 선택 상태 토글
    toggleDayMarkersOnMap(dayIndex);
    
    // 선택된 일차의 장소 정보 가져오기
    const selectedDay = dailyPlans[dayIndex];
    
    if (selectedDay && selectedDay.places && selectedDay.places.length > 0) {
      console.log('📍 표시할 장소들:', selectedDay.places.map(place => ({
        name: place.name,
        latitude: place.latitude,
        longitude: place.longitude,
        primaryCategory: place.primaryCategory
      })));
      
      // 같은 일차를 다시 클릭하면 마커 숨기기
      if (selectedDayForMap === dayIndex && showDayMarkersOnMap) {
        console.log('🙈 같은 일차 재클릭 - 마커 숨김');
        clearDayMarkers();
      } else {
        console.log('🗺️ 지도에 일차 마커 표시');
        // 지도에 일차별 마커 표시
        setDayMarkers(selectedDay.places, dayIndex);
      }
    } else {
      console.log('😕 해당 일차에 장소가 없음');
      // 장소가 없으면 마커 숨김
      clearDayMarkers();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="daily-plan-modal"
      style={position ? { top: `${position.y}px`, left: `${position.x}px`, transform: 'none' } : {}}
    >
      <div className="daily-plan-content" ref={modalRef}>
        <div className="daily-plan-header">
          <h2>일정짜기</h2>
          <button onClick={onClose} className="close-button">✕</button>
        </div>
        
        <div className="daily-plan-body" ref={scrollContainerRef}>
          {dailyPlans.map((day, dayIndex) => (
          <DailyScheduleBlock
            key={day.id}
            day={day}
            dayIndex={dayIndex}
            isDragging={draggedDayIndex === dayIndex}
            isSwapTarget={swapTargetDayIndex === dayIndex}
            draggable={true}
            onDragStart={(e) => handleDayDragStart(e, dayIndex)}
            onDragOver={handleDayDragOver}
            onDrop={(e) => handleDayDrop(e, dayIndex)}
            onDragEnd={handleDayDragEnd}
            onDragLeave={handleDayDragLeave}
            onUpdateTitle={(dayId, newTitle) => {
              // 로컬 업데이트
              updateDayTitle(dayId, newTitle);
              // WS 전송 (신규 채널)
              try { renameDay({ dayScheduleId: dayId, title: newTitle }); } catch (e) { console.warn('renameDay send failed', e); }
            }}
            onRemoveDay={(dayId) => {
              // 로컬 제거
              removeDailyPlan(dayId);
              // WS 전송 (신규 채널)
              try { deleteDay({ dayScheduleId: dayId }); } catch (e) { console.warn('deleteDay send failed', e); }
            }}
            onAddPlaceClick={handleAddPlaceClick}
            onDayClick={handleDayClick}
            places={day.places || []}
            onRemovePlace={(dayIndex, placeIndex) => {
              const dayScheduleId = dailyPlans[dayIndex]?.id;
              const dayPlaceId = dailyPlans[dayIndex]?.places?.[placeIndex]?.id;
              if (dayScheduleId == null || dayPlaceId == null) return;
              try { deletePlace({ dayScheduleId, dayPlaceId }); } catch (e) { console.warn('deletePlace send failed', e); }
            }}
            onUpdatePlaceMemo={(dayIndex, placeIndex, memo) => {
              const dayScheduleId = dailyPlans[dayIndex]?.id;
              const dayPlaceId = dailyPlans[dayIndex]?.places?.[placeIndex]?.id;
              if (dayScheduleId == null || dayPlaceId == null) return;
              try { renameMemo({ dayScheduleId, dayPlaceId, memo }); } catch (e) { console.warn('renameMemo send failed', e); }
            }}
            onOpenMemoModal={handleOpenMemoModal}
            dragState={{
              isDragging,
              draggedPlaceId,
              dragOverIndex,
              draggedFromDay,
              swapTargetPlaceIndex
            }}
            onPlaceDragStart={handlePlaceDragStart}
            onPlaceDragOver={handlePlaceDragOver}
            onPlaceDragLeave={handlePlaceDragLeave}
            onPlaceDrop={handlePlaceDrop}
            onPlaceDragEnd={handlePlaceDragEnd}
            // 드롭 존 핸들러들
            onDropZoneDragOver={handleDropZoneDragOver}
            onDropZoneDragLeave={handleDropZoneDragLeave}
            onDropZoneDrop={handleDropZoneDrop}
          />
        ))}
          
          <Button 
            className="add-day-button"
            disabled={Array.isArray(dailyPlans) && dailyPlans.length >= MAX_DAYS}
            title={Array.isArray(dailyPlans) && dailyPlans.length >= MAX_DAYS ? `최대 ${MAX_DAYS}일까지만 추가할 수 있어요` : undefined}
            onClick={() => {
              const count = Array.isArray(dailyPlans) ? dailyPlans.length : 0;
              if (count >= MAX_DAYS) {
                alert(`일정은 최대 ${MAX_DAYS}일까지만 생성할 수 있습니다.`);
                return;
              }
              // 중복 생성 방지: 로컬 즉시 추가 대신 WS 브로드캐스트만 신뢰
              const order = count + 1;
              const title = `Day ${order}`;
              try { createDay({ title, dayOrder: order }); } catch (e) { console.warn('createDay send failed', e); }
            }}
          >
            + 일정 추가
          </Button>
        </div>
      </div>
      
             {showBookmarkModal && (
         <BookmarkModal
           isOpen={showBookmarkModal}
           onClose={closeBookmarkModal}
           bookmarkedPlaces={bookmarkedPlaces}
           onPlaceSelect={addPlaceFromBookmark}
           position={bookmarkModalPosition}
           planId={planId}
         />
       )}

      {showMemoModal && (
        <PlanMemoModal
          isOpen={showMemoModal}
          onClose={closeMemoModal}
          memo={memoModalData.memo}
          onSave={handleMemoSave}
          placeName={memoModalData.place?.name}
          dayTitle={memoModalData.dayTitle}
          position={memoModalData.position}
        />
      )}
    </div>,
    document.body
  );
};

export default DailyPlanCreate1;
