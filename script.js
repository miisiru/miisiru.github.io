import { Unit, fetchStarRailData, LightCone } from './config.js';
import { PRESET_UNITS, availableCharacters } from './char.js';
import { gameData, subStatData, mainStatData } from './config.js';

window.PRESET_UNITS = PRESET_UNITS;

export let state = { 
    unitData: [],      
    actionPlans: {},   
    timeline: [],      
    selectedIdx: null, 
    selectedPhase: null,
    selectedLightCones: PRESET_UNITS.map(u => u.lightcone ? u.lightcone.id : null),
    selectedRelics: PRESET_UNITS.map(u => u.relics ? JSON.parse(JSON.stringify(u.relics)) : { main: [], sub: [] }),
    insertedEvents: [],
    selectedSubEventId: null
};

// 기존에 선언되지 않았다면 state 객체 하위에 레벨/중첩 저장소 동적 할당 보장
if (!state.lightConeDetails) {
    state.lightConeDetails = window.PRESET_UNITS.map(u => ({
        level: u.lightcone?.level || 80,
        superimposition: u.lightcone?.superimposition || (gameData.lightCones[u.lightcone?.id]?.rarity === 5 ? 1 : 5)
    }));
}

document.getElementById('uid-load-btn').addEventListener('click', loadUserData);

window.buildInitialTimeline = buildInitialTimeline;
window.selectCard = selectCard;
window.updateCurrentAction = updateCurrentAction;
window.addFollowUpEvent = addFollowUpEvent;

function buildInitialTimeline() {
    state.unitData = PRESET_UNITS.map((p, i) => {
        const assignedLcId = state.selectedLightCones[i];
        const assignedRelics = state.selectedRelics ? state.selectedRelics[i] : null;
        
        const u = new Unit({
            unit_id: p.unit_id,
            kit: p.kit,
            lightcone: new LightCone(assignedLcId),
            relics: assignedRelics
        });
        
        state.actionPlans[u.unit_id] = Array(100).fill("BASIC"); // 넉넉하게 100턴 계획
        return u;
    });

    state.timeline = [];
    recalculate();
}

function recalculate() {
    const limit = parseFloat(document.getElementById('limit-av').value) || 500;
    let sp = 3;
    let newTimeline = [];
    
    // 1. 시뮬레이션용 유닛 초기화 (원본 데이터 보호)
    let simUnits = state.unitData.map((u, i) => {
        let nu = { ...u }; // 얕은 복사
        nu.energy = nu.max_energy * 0.5; 
        nu.turnCount = 0; 
        nu.partyIndex = i;        
        nu.lastAdvancedAV = -1;   
        nu.current_action_value = nu.base_action_value; 
        return nu;
    });

    // 💡 2. 타임라인 이벤트 큐 생성 (사용자님 아이디어 적용!)
    // 이제 엔진은 캐릭터가 아니라 '이벤트 큐'를 중심으로 돌아갑니다.
    let eventQueue = [];

    // 최초의 정규 턴들을 큐에 장전
    simUnits.forEach(u => {
        eventQueue.push({
            eventType: 'TURN',
            av: u.current_action_value,
            unitId: u.unit_id,
            turnCount: 0,
            lastAdvancedAV: u.lastAdvancedAV,
            partyIndex: u.partyIndex
        });
    });

    // 3. 메인 시뮬레이션 루프 (큐에 이벤트가 있는 동안 무한 반복)
    while (eventQueue.length > 0) {
        
        // [정렬] 큐에 있는 모든 이벤트들을 AV(시간) 순서대로 정렬
        eventQueue.sort((a, b) => {
            if (Math.abs(a.av - b.av) > 1e-9) return a.av - b.av;
            // AV가 같을 경우 행게증 최신화 및 파티 순서 적용
            if (a.lastAdvancedAV !== b.lastAdvancedAV) return b.lastAdvancedAV - a.lastAdvancedAV;
            return a.partyIndex - b.partyIndex;
        });

        // 가장 먼저 일어날 이벤트를 뽑음
        let currentEvent = eventQueue.shift();
        
        if (currentEvent.av > limit) break;
        if (newTimeline.length > 250) break; // 무한 루프 방지용 안전 장치

        let actor = simUnits.find(u => u.unit_id === currentEvent.unitId);
        if (!actor) continue;

        // ==========================================
        // 🎬 큐에서 뽑은 이벤트가 '정규 턴'일 경우 처리
        // ==========================================
        if (currentEvent.eventType === 'TURN') {
            actor.lastAdvancedAV = -1; // 행동 시작 시 행게증 우선권 초기화

            // 정규 턴 계획 읽어오기
            let actionType = state.actionPlans[actor.unit_id][currentEvent.turnCount] || "BASIC";
            let kit = (actionType === "S") ? actor.kit.skill : actor.kit.basic;

            // 💡 1. 턴 노드 구조에 phaseEnterStates (페이즈 진입 시점 기록장) 추가
            let turnNode = {
                id: Math.random(),
                unitId: actor.unit_id,
                name: actor.name,
                av: currentEvent.av,
                type: actionType,
                isTurn: true,
                followUpEvents: { 1: [], 2: [], 3: [], 4: [] },
                phaseEnterStates: {}, // ✨ 각 페이즈 진입 순간의 SP/E 기록
                beforeSp: sp,
                beforeEnergy: actor.energy
            };

            let relatedEvents = state.insertedEvents.filter(ev => ev.baseUnitId === actor.unit_id && ev.baseTurnNth === currentEvent.turnCount);

            const processFollowUp = (ev, phase) => {
                let bSp = sp;
                let bE = 0;
                let aSp = sp;
                let aE = 0;

                if (ev.type === 'Ult') { 
                    let ultActor = simUnits.find(u => u.unit_id === ev.unitId);
                    if (ultActor) {
                        bE = ultActor.energy; // 💡 궁극기 쓰기 직전 실제 에너지 저장

                        let ultKit = ultActor.kit.ultimate || ultActor.kit.ult || { energy_gain: 5, sp_cost: 0, sp_gain: 0, energy_cost: ultActor.max_energy };
                        
                        // 사용자님이 수정한 로직 적용 (안전성을 위해 fallback 값 추가)
                        sp = Math.min(5, Math.max(0, sp + (ultKit.sp_gain || 0) - (ultKit.sp_cost || 0)));
                        ultActor.energy = Math.min(ultActor.max_energy, ultActor.energy + (ultKit.energy_gain || 5) - (ultKit.energy_cost || ultActor.max_energy));
                        
                        aSp = sp;
                        aE = ultActor.energy; // 💡 궁극기 쓴 직후 실제 에너지 저장
                    }
                }
                
                // 💡 UI에서 읽어갈 수 있도록 before/after 값을 객체에 같이 넣어서 푸시합니다!
                turnNode.followUpEvents[phase].push({ 
                    id: ev.id, type: ev.type, targetUnitId: ev.unitId, value: ev.value,
                    beforeSp: bSp, beforeE: bE, afterSp: aSp, afterE: aE
                });
            };

            // ⚡ [Phase 1] 턴 시작 전
            turnNode.phaseEnterStates[1] = { sp: sp, e: actor.energy };
            relatedEvents.filter(ev => ev.phase === 1).forEach(ev => processFollowUp(ev, 1));

            // ⚡ [Phase 2] 액션 직전 (Phase 1 궁극기 결과 반영됨)
            turnNode.phaseEnterStates[2] = { sp: sp, e: actor.energy };
            relatedEvents.filter(ev => ev.phase === 2).forEach(ev => processFollowUp(ev, 2));

            // ==========================================
            // 🎬 메인 행동 (평타/전스) 연산
            // ==========================================
            if (actionType === "S" && actor.name === "Sunday") {
                let target = simUnits.find(u => u.name === "Evanescia");
                if (target) {
                    target.current_action_value = currentEvent.av;
                    target.lastAdvancedAV = currentEvent.av; 
                    let targetEvent = eventQueue.find(e => e.eventType === 'TURN' && e.unitId === target.unit_id);
                    if (targetEvent) {
                        targetEvent.av = target.current_action_value;
                        targetEvent.lastAdvancedAV = target.lastAdvancedAV;
                    }
                }
            }

            sp = Math.min(5, Math.max(0, sp + (kit.sp_gain || 0) - (kit.sp_cost || 0)));
            actor.energy = Math.min(actor.max_energy, actor.energy + (kit.energy_gain || 0) - (kit.energy_cost || 0));

            // ⚡ [Phase 3] 액션 직후 (✨ 메인 행동으로 에너지가 꽉 찬 상태 기록!)
            turnNode.phaseEnterStates[3] = { sp: sp, e: actor.energy };
            relatedEvents.filter(ev => ev.phase === 3).forEach(ev => processFollowUp(ev, 3));

            // ⚡ [Phase 4] 턴 종료 후
            turnNode.phaseEnterStates[4] = { sp: sp, e: actor.energy };
            relatedEvents.filter(ev => ev.phase === 4).forEach(ev => processFollowUp(ev, 4));

            turnNode.afterSp = sp;
            turnNode.afterEnergy = actor.energy;

            // 완성된 행동 노드를 타임라인에 등록
            newTimeline.push(turnNode);

            // 💡 [핵심] 현재 턴이 끝났으므로, 캐릭터의 다음 일정을 계산해 큐(Queue)에 예약합니다.
            actor.turnCount++;
            actor.current_action_value += actor.base_action_value;

            eventQueue.push({
                eventType: 'TURN',
                av: actor.current_action_value,
                unitId: actor.unit_id,
                turnCount: actor.turnCount,
                lastAdvancedAV: actor.lastAdvancedAV,
                partyIndex: actor.partyIndex
            });
        }
    }

    // 큐에서 이미 시간순으로 뽑혀 나왔으므로 재정렬 불필요
    state.timeline = newTimeline; 
    render();
}

// --- UI 및 상세 정보 함수 (기능 유지) ---
function updateCurrentAction(type) {
    if (state.selectedIdx === null) return;
    let action = state.timeline[state.selectedIdx];
    if (action.type === 'Ult') return;

    let unitActions = state.timeline.filter(a => a.unitId === action.unitId && a.type !== 'Ult');
    let nth = unitActions.indexOf(action);

    if (nth !== -1) {
        state.actionPlans[action.unitId][nth] = type;
        recalculate(); 
    }
}

// script.js 내의 selectCard 함수를 이렇게 수정하세요
function selectCard(idx) {
    if (state.selectedIdx === idx) {
        state.selectedIdx = null;
        state.selectedPhase = null; // 접힐 때 페이즈 선택 초기화
    } else {
        state.selectedIdx = idx;
        state.selectedPhase = null; // 새로운 카드 선택 시 이전 페이즈 초기화
    }
    selectPhase(state.selectedPhase);
    render(); 
}

function selectPhase(phaseNum) {
    state.selectedPhase = phaseNum;
    
    const container = document.getElementById('event-form-container');
    const notice = document.getElementById('event-empty-notice');
    const title = document.getElementById('selected-phase-info');
    const targetSelect = document.getElementById('event-target-select');
    
    if (phaseNum === null || state.selectedIdx === null) {
        container.style.display = 'none';
        notice.style.display = 'block';
        return;
    }
    
    container.style.display = 'flex';
    notice.style.display = 'none';
    
    const pNames = ["", "Phase 1 (Turn Start)", "Phase 2 (Action Start)", "Phase 3 (Action End)", "Phase 4 (Turn End)"];
    title.textContent = `설정 중인 시점: ${pNames[phaseNum]}`;
    
    // 대상 유닛 옵션 채우기
    targetSelect.innerHTML = state.unitData.map(u => `<option value="${u.unit_id}">${u.name}</option>`).join('');
    
    toggleEventValueInput();
    render(); // 하이라이팅 적용을 위한 새로고침
}

function toggleEventValueInput() {
    const type = document.getElementById('event-type-select').value;
    const valueBlock = document.getElementById('event-value-block');
    valueBlock.style.display = (type === 'Gauge') ? 'flex' : 'none';
}

function addFollowUpEvent() {
    if (state.selectedIdx === null || state.selectedPhase === null) return;
    
    const item = state.timeline[state.selectedIdx];
    const type = document.getElementById('event-type-select').value;
    const targetUnitId = parseInt(document.getElementById('event-target-select').value);
    const value = parseFloat(document.getElementById('event-value-input').value || 0);
    const targetUnit = state.unitData.find(u => u.unit_id === targetUnitId);

    // 현재 선택된 턴이 해당 캐릭터의 몇 번째 턴인지 찾기
    let nth = state.timeline.filter(a => a.unitId === item.unitId && a.isTurn).indexOf(item);

    // 💡 화면이 아니라 '장부(insertedEvents)'에 정식으로 예약합니다!
    state.insertedEvents.push({
        id: Math.random(), // 고유 ID 부여
        baseUnitId: item.unitId,
        baseTurnNth: nth,
        phase: state.selectedPhase,
        unitId: targetUnitId,
        name: targetUnit ? targetUnit.name : 'Unknown',
        type: type,
        value: type === 'Gauge' ? value : 0
    });

    // 선택된 카드 유지용 백업
    const backupUnitId = item.unitId;
    const backupAV = item.av;

    // 💡 여기서 엔진을 돌려 에너지를 확실히 깎고 타임라인을 새로 만듭니다.
    recalculate(); 

    // 타임라인이 새로 짜였으므로 포커스를 다시 찾아줍니다.
    const newIdx = state.timeline.findIndex(t => t.unitId === backupUnitId && t.av === backupAV && t.isTurn);
    if (newIdx !== -1) state.selectedIdx = newIdx;
    
    // (render는 recalculate 내부에서 호출되므로 생략)
}

function removeFollowUpEvent(cardIdx, phaseNum, eventIdx) {
    const item = state.timeline[cardIdx];
    if (item && item.followUpEvents && item.followUpEvents[phaseNum]) {
        const targetEv = item.followUpEvents[phaseNum][eventIdx];
        
        // 장부에서 해당 ID를 찾아 파기합니다.
        const targetIndex = state.insertedEvents.findIndex(e => e.id === targetEv.id);
        if (targetIndex !== -1) {
            state.insertedEvents.splice(targetIndex, 1);
        }

        // 선택된 카드 유지용 백업
        const backupUnitId = item.unitId;
        const backupAV = item.av;

        // 엔진을 다시 돌리면 취소된 내용이 반영(에너지 복구)됩니다.
        recalculate();

        const newIdx = state.timeline.findIndex(t => t.unitId === backupUnitId && t.av === backupAV && t.isTurn);
        if (newIdx !== -1) state.selectedIdx = newIdx;
    }
}

function updateDetail() {
    const action = state.timeline[state.selectedIdx];
    const unit = state.unitData.find(u => u.unit_id === action.unitId);
    const kit = (action.type === 'S') ? unit.kit.skill : (action.type === 'Ult' ? unit.kit.ultimate : unit.kit.basic);

    document.getElementById('focus-name').textContent = action.name + " - " + kit.name;
    document.getElementById('energy-text-val').textContent = `${Math.floor(action.afterEnergy || 0)}/${unit.max_energy}`;
    document.getElementById('energy-fill').style.width = `${((action.afterEnergy || 0) / unit.max_energy) * 100}%`;

    const setP = (id, s, e) => {
        const el = document.getElementById(id);
        if (el) el.querySelector('.p-effect').innerHTML = `SP: <strong>${s}</strong> | Energy: <strong>${Math.floor(e || 0)}</strong>`;
    };

    const isEvent = action.isTurn === false;
    document.getElementById('p-turn-start').style.display = isEvent ? 'none' : 'block';
    document.getElementById('p-turn-end').style.display = isEvent ? 'none' : 'block';

    document.querySelectorAll('.phase-item').forEach(p => p.classList.remove('highlight'));

    // 💡 뭉뚱그린 결과(before/after) 대신, 각 페이즈 진입 시점의 정확한 자원을 출력
    if (action.phaseEnterStates) {
        setP('p-turn-start', action.phaseEnterStates[1].sp, action.phaseEnterStates[1].e);
        setP('p-action-start', action.phaseEnterStates[2].sp, action.phaseEnterStates[2].e);
        setP('p-action-end', action.phaseEnterStates[3].sp, action.phaseEnterStates[3].e);
        setP('p-turn-end', action.phaseEnterStates[4].sp, action.phaseEnterStates[4].e);
    } else {
        // 혹시라도 예전 데이터 구조가 남아있을 경우를 대비한 백업 로직
        setP('p-turn-start', action.beforeSp, action.beforeEnergy);
        setP('p-action-start', action.beforeSp, action.beforeEnergy);
        setP('p-action-end', action.afterSp, action.afterEnergy);
        setP('p-turn-end', action.afterSp, action.afterEnergy);
    }

    if (action.type === 'Ult') {
        document.getElementById('p-action-start').classList.add('highlight');
        document.getElementById('p-action-end').classList.add('highlight');
    } else {
        document.querySelectorAll('.phase-item').forEach(p => p.classList.add('highlight'));
    }

    document.getElementById('p-turn-start').style.display = (action.isTurn === false) ? 'none' : '';
}

function render() {
    const list = document.getElementById('timeline-list');
    list.innerHTML = '';
    
    state.timeline.forEach((item, idx) => {
        if (!item.followUpEvents) item.followUpEvents = { 1: [], 2: [], 3: [], 4: [] };

        const unit = state.unitData.find(u => u.unit_id === item.unitId);
        const actionConfig = (item.type === 'S') ? unit.kit.skill : (item.type === 'Ult' ? unit.kit.ultimate : unit.kit.basic);
        const isSelected = state.selectedIdx === idx;
        const imagePath = `imgs/avatarshopicon/${item.unitId}.png`;

        const wrapper = document.createElement('div');
        wrapper.className = 'action-card-wrapper';

        // 💡 [핵심] 궁극기를 단독 액션 카드처럼 위장시켜 그려주는 헬퍼 함수
        const createStandaloneUltCard = (ev) => {
            const targetUnit = state.unitData.find(u => u.unit_id === ev.targetUnitId);
            const imgPath = `imgs/avatarshopicon/${targetUnit.unit_id}.png`;
            const ultDiv = document.createElement('div');
            // CSS에서 기존 테두리를 강제하지 않도록 style로 덮어씁니다.
            ultDiv.className = 'action-card';
            ultDiv.style.cssText = 'border: 2px solid #0284c7; background: rgba(14, 116, 144, 0.35); box-shadow: 0 0 8px rgba(3, 105, 161, 0.3);';
            
            ultDiv.innerHTML = `
                <div class="card-main-header">
                    <div class="av-container" style="border-right: none;" data-tooltip="${item.av}">
                        <div class="av-display" style="color: #7dd3fc;">${item.av.toFixed(2)}</div>
                    </div>
                    <div class="card-unit-info">
                        <div class="card-action-name" style="color: #38bdf8; font-weight: bold;">[궁극기] ${targetUnit.name}</div>
                    </div>
                </div>
                <div class="card-bg-image" style="background-image: url('${imgPath}'); opacity: 0.85;"></div>
            `;
            ultDiv.onclick = () => selectCard(idx); 
            return ultDiv;
        };

        // [축소 시] Phase 1, 2 이벤트를 부모 카드 '위'에 렌더링
        if (!isSelected) {
            [1, 2].forEach(pNum => {
                item.followUpEvents[pNum].forEach(ev => {
                    if (ev.type === 'Ult') {
                        wrapper.appendChild(createStandaloneUltCard(ev)); // 깔끔한 액션 카드로 등장!
                    } else {
                        const targetUnit = state.unitData.find(u => u.unit_id === ev.targetUnitId);
                        const badge = document.createElement('div');
                        badge.className = 'mini-event-badge above';
                        badge.textContent = `[행게조작] ${targetUnit.name} (${ev.value > 0 ? '+' : ''}${ev.value}%)`;
                        wrapper.appendChild(badge);
                    }
                });
            });
        }

        // --- 부모 턴 메인 카드 빌드 ---
        const div = document.createElement('div');
        div.className = `action-card ${isSelected ? 'active' : ''}`;
        
        let cardHtml = `
            <div class="card-main-header">
                <div class="av-container" data-tooltip="${item.av}">
                    <div class="av-display">${item.av.toFixed(2)}</div>
                </div>
                <div class="card-unit-info">
                    <div class="card-action-name">${actionConfig.name}</div>
                </div>
            </div>
        `;

        // [조건 1] 확장 상태일 때 각 페이즈 및 페이즈 사이에 인라인 리스트로 드로잉
        if (isSelected) {
            const bSp = item.beforeSp;
            const bE = Math.floor(item.beforeEnergy || 0);
            const aSp = item.afterSp;
            const aE = Math.floor(item.afterEnergy || 0);

            cardHtml += `<div class="card-phases-area">`;

            [1, 2, 3, 4].forEach(pNum => {
                const isPSelected = state.selectedPhase === pNum;
                const pNames = ["", "Turn Start", "Action Start", "Action End", "Turn End"];
                
                // 💡 1. 뭉뚱그린 결과(afterEnergy) 대신, 해당 페이즈에 '진입할 당시'의 자원을 출력합니다!
                const pState = item.phaseEnterStates ? item.phaseEnterStates[pNum] : { sp: bSp, e: bE }; 
                const pEff = `SP: ${pState.sp} | E: ${Math.floor(pState.e)}`;

                cardHtml += `
                    <div class="card-phase-item ${isPSelected ? 'phase-active' : ''}" onclick="event.stopPropagation(); window.selectPhase(${pNum})">
                        <span class="card-phase-num">${pNum}</span>
                        <span class="card-phase-name">${pNames[pNum]}</span>
                        <span class="card-phase-effect">${pEff}</span>
                    </div>
                `;

                // 해당 페이즈 아래 추가된 Follow-up 목록 바인딩
                item.followUpEvents[pNum].forEach((ev, evIdx) => {
                    const targetUnit = state.unitData.find(u => u.unit_id === ev.targetUnitId);
                    const isEvUlt = ev.type === 'Ult';
                    
                    const subEventId = ev.id || `${item.id}_${pNum}_${evIdx}`;
                    // 💡 2. 숫자/문자열 타입 불일치 버그 해결: String()으로 감싸줍니다.
                    const isSubSelected = state.selectedSubEventId === String(subEventId);

                    let desc = isEvUlt ? `[궁극기] ${targetUnit.name}` : `[행게조작] ${targetUnit.name} (${ev.value > 0 ? '+' : ''}${ev.value}%)`;
                    
                    const evStyle = isEvUlt ? `border-left: 3px solid #38bdf8; background: rgba(14, 116, 144, 0.35); cursor: pointer; position:relative; ${isSubSelected ? 'border-bottom: 1px dashed rgba(56, 189, 248, 0.5);' : ''}` : '';
                    const tagColor = isEvUlt ? 'color: #38bdf8;' : '';
                    const descColor = isEvUlt ? 'color: #7dd3fc; font-weight: bold;' : '';

                    // 1. 이벤트 본문 카드 (클릭 시 자식 페이즈 토글)
                    cardHtml += `
                        <div class="card-followup-item-expanded" style="${evStyle}" 
                             onclick="event.stopPropagation(); window.toggleSubEvent('${subEventId}');">
                            <span class="followup-tag" style="${tagColor}">↳ ${isEvUlt ? 'ULT' : 'Event'}</span>
                            <span class="followup-desc" style="${descColor}">${desc}</span>
                            <span class="followup-del-btn" onclick="event.stopPropagation(); window.removeFollowUpEvent(${idx}, ${pNum}, ${evIdx})">×</span>
                        </div>
                    `;

                    // 2. 💡 [핵심] 궁극기 카드가 클릭되어 활성화(True) 상태라면 하위에 서브 페이즈(Action Start/End) 주입
                    if (isEvUlt && isSubSelected) {
                        cardHtml += `
                            <div class="sub-phase-area" style="background: rgba(15, 23, 42, 0.25); margin: 4px 0 6px 16px; padding: 4px 0 4px 12px; border-left: 2px solid #0284c7; border-radius: 0 4px 4px 0;" onclick="event.stopPropagation();">
                                <div class="card-phase-item" style="padding: 4px 8px; font-size: 11px; opacity: 0.9; background: transparent; border: none; display: flex; gap: 6px;">
                                    <span class="card-phase-name" style="color: #38bdf8; font-weight: bold;">Action Start</span>
                                    <span class="card-phase-effect" style="color: #94a3b8; margin-left: auto;">SP: ${ev.beforeSp} | E: ${Math.floor(ev.beforeE || 0)}</span>
                                </div>
                                <div class="card-action-tag-inline" style="font-size: 11px; margin: 2px 0 2px 8px; color: #bae6fd; background: rgba(3, 105, 161, 0.4); border-left: 2px solid #0284c7; padding-left: 6px;">
                                    ${targetUnit.name} 필살기 진행
                                </div>
                                <div class="card-phase-item" style="padding: 4px 8px; font-size: 11px; opacity: 0.9; background: transparent; border: none; display: flex; gap: 6px;">
                                    <span class="card-phase-name" style="color: #38bdf8; font-weight: bold;">Action End</span>
                                    <span class="card-phase-effect" style="color: #94a3b8; margin-left: auto;">SP: ${ev.afterSp} | E: ${Math.floor(ev.afterE || 0)}</span>
                                </div>
                            </div>
                        `;
                    }
                });

                if (pNum === 2) {
                    cardHtml += `<div class="card-action-tag-inline">${actionConfig.name} 진행</div>`;
                }
            });

            cardHtml += `</div>`;
        }

        cardHtml += `<div class="card-bg-image" style="background-image: url('${imagePath}');"></div>`;
        div.innerHTML = cardHtml;
        div.onclick = () => selectCard(idx);
        
        wrapper.appendChild(div);

        // [조건 2] 간소화 상태일 때 Phase 3, 4 이벤트를 메인 카드 '아래'에 렌더링
        if (!isSelected) {
            [3, 4].forEach(pNum => {
                item.followUpEvents[pNum].forEach(ev => {
                    if (ev.type === 'Ult') {
                        wrapper.appendChild(createStandaloneUltCard(ev)); // 깔끔한 액션 카드로 등장!
                    } else {
                        const targetUnit = state.unitData.find(u => u.unit_id === ev.targetUnitId);
                        const badge = document.createElement('div');
                        badge.className = 'mini-event-badge below';
                        badge.textContent = `[행게조작] ${targetUnit.name} (${ev.value > 0 ? '+' : ''}${ev.value}%)`;
                        wrapper.appendChild(badge);
                    }
                });
            });
        }

        list.appendChild(wrapper);
    });
    
    // 포커스 카드 동기화 유지
    if (state.selectedIdx !== null) {
        const action = state.timeline[state.selectedIdx];
        const unit = state.unitData.find(u => u.unit_id === action.unitId);
        const kit = (action.type === 'S') ? unit.kit.skill : (action.type === 'Ult' ? unit.kit.ultimate : unit.kit.basic);

        document.getElementById('focus-name').textContent = action.name + " - " + kit.name;
        document.getElementById('energy-text-val').textContent = `${Math.floor(action.afterEnergy || 0)}/${unit.max_energy}`;
        document.getElementById('energy-fill').style.width = `${((action.afterEnergy || 0) / unit.max_energy) * 100}%`;
    }
}

// script.js 맨 하단 관련 코드를 이 코드로 교체하세요

// 1. 실제 스타레일 원본 데이터 구조(detailInfo.avatarDetailList) 반영 로직
function applyParsedData(rawData) {
    // detailInfo 또는 avatarDetailList 구조 체크
    let avatarList = null;
    if (rawData && rawData.detailInfo && rawData.detailInfo.avatarDetailList) {
        avatarList = rawData.detailInfo.avatarDetailList;
    } else if (rawData && rawData.avatarDetailList) {
        avatarList = rawData.avatarDetailList;
    } else if (rawData && rawData.avatar_list) {
        avatarList = rawData.avatar_list;
    }

    if (!avatarList || !Array.isArray(avatarList)) {
        console.error("[오류] 유효한 캐릭터 데이터(avatarDetailList)를 찾을 수 없습니다.");
        alert("유효한 스타레일 데이터 구조가 아닙니다. detailInfo 내용을 확인해 주세요.");
        return false;
    }

    const spdInputs = document.querySelectorAll('.spd-in');
    const maxEInputs = document.querySelectorAll('.max-e-in');

    PRESET_UNITS.forEach((presetUnit, index) => {
        // 프리셋 캐릭터 이름(avatarId나 영문/국문 name 매칭)
        // 원본 데이터 구조상 avatar.name 또는 게임데이터와 매칭을 시도합니다.
        const matchedAvatar = avatarList.find(avatar => avatar.name === presetUnit.name || avatar._name === presetUnit.name);
        
        if (matchedAvatar) {
            let finalSpd = presetUnit.base_stats.spd;
            let finalMaxE = presetUnit.base_stats.max_energy;

            // 1) 속도(SPD) 가져오기: 원본 데이터의 properties나 조립된 값을 활용
            if (matchedAvatar.properties) {
                finalSpd = matchedAvatar.properties.spd || finalSpd;
                finalMaxE = matchedAvatar.properties.max_energy || finalMaxE;
            } 
            // 2) 만약 Enka/Myna 프로퍼티 구조일 경우 (기본값 Base + 추가값 Add)
            else if (matchedAvatar.avatarProperties) {
                // 원본의 유효 속도 속성(보통 1000001이 SPD 등)을 파싱하거나 보정된 값을 사용합니다.
                // 여기서는 안전하게 제공된 상위 프로퍼티나 기존 프리셋 스탯을 백업으로 둡니다.
                if (matchedAvatar.avatarProperties.spd) finalSpd = matchedAvatar.avatarProperties.spd;
            }

            // 입력창에 수치 반영
            if (spdInputs[index]) spdInputs[index].value = parseFloat(finalSpd).toFixed(1);
            if (maxEInputs[index]) maxEInputs[index].value = Math.round(finalMaxE);

            // 💡 [추가] 외부 데이터 로드 시 캐릭터가 장착 중인 광추 자동 동기화
            let lcId = matchedAvatar.equipment?.id || matchedAvatar.lightCone?.id || matchedAvatar.light_cone?.id;
            const lcDropdowns = document.querySelectorAll('.lc-dropdown');
            
            if (lcId && lcDropdowns[index]) {
                lcDropdowns[index].value = lcId;
                state.selectedLightCones[index] = lcId;
                const label = document.getElementById(`lc-label-${index}`);
                if (label) {
                    label.textContent = "선택됨";
                    label.style.color = "var(--success)";
                    label.parentElement.style.borderColor = "var(--success)";
                }
            }
        } else {
            console.warn(`[매칭 실패] avatarDetailList 내에 ${presetUnit.name} 캐릭터가 없어 기본값을 유지합니다.`);
        }
    });

    alert(`캐릭터 데이터 반영이 완료되었습니다.\n'Reset Simulation' 버튼을 누르면 새 스탯으로 타임라인이 재계산됩니다.`);
    return true;
}

// 2. 기존 UID 불러오기 함수도 새 로직을 타도록 연동
async function loadUserData() {
    const uidInput = document.getElementById('uid-input');
    const uid = uidInput.value ? uidInput.value.trim() : "";
    
    if (!uid) {
        alert("UID를 입력해주세요.");
        return;
    }
    
    console.log(`[시뮬레이터] UID ${uid}로 데이터를 요청합니다...`);
    const rawData = await fetchStarRailData(uid);
    if (rawData) {
        applyParsedData(rawData);
    } else {
        alert("데이터를 불러오는데 실패했거나 유효하지 않은 UID입니다.");
    }
}

window.toggleSubEvent = function(subEventId) {
    // 클릭한 ID가 이미 열려있으면 닫기(null), 아니면 열기
    state.selectedSubEventId = (state.selectedSubEventId === subEventId) ? null : subEventId;
    render(); // 상태 변경 후 화면 다시 그리기
};
window.selectPhase = selectPhase;
window.removeFollowUpEvent = removeFollowUpEvent;
window.addFollowUpEvent = addFollowUpEvent;
window.updateCurrentAction = updateCurrentAction;

buildInitialTimeline()