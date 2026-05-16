/**
 * script.js - 선데이 행게증 100% 로직 보완 및 엔진 통합
 */
import { Unit, fetchStarRailData } from './config.js';
import { PRESET_UNITS } from './char.js';


let state = { 
    unitData: [],      
    actionPlans: {},   
    timeline: [],      
    selectedIdx: null, 
    selectedPhase: null 
};

// 1. 초기화 및 유닛 로드
const spdDiv = document.getElementById('spd-inputs');
PRESET_UNITS.forEach((u, i) => {
    spdDiv.innerHTML += `
        <div style="margin-bottom:8px;">
            <label style="font-weight:bold;">${u.name}</label>
            <div style="display:flex; gap:5px; margin-top:2px;">
                <input type="number" class="spd-in" value="${u.base_stats.spd}">
                <input type="number" class="max-e-in" value="${u.base_stats.max_energy}">
            </div>
        </div>`;
});

document.getElementById('uid-load-btn').addEventListener('click', loadUserData);

function buildInitialTimeline() {
    const spdIn = document.querySelectorAll('.spd-in');
    const maxEIn = document.querySelectorAll('.max-e-in');
    
    state.unitData = PRESET_UNITS.map((p, i) => {
        const u = new Unit(p.unit_id, p.name, [parseFloat(spdIn[i].value), parseFloat(maxEIn[i].value)], p.kit);
        state.actionPlans[u.unit_id] = Array(30).fill("B"); // 넉넉하게 30턴 계획
        return u;
    });

    state.timeline = [];
    recalculate();
}

function recalculate() {
    const limit = parseFloat(document.getElementById('limit-av').value) || 500;
    let sp = 3;
    let currentAV = 0;
    let newTimeline = [];
    
    // 1. 시뮬레이션용 유닛 초기화 (AV 가산점 제거, 순수 AV 사용)
    let simUnits = state.unitData.map((u, i) => {
        let nu = new Unit(u.unit_id, u.name, [u.base_stats.spd, u.base_stats.max_energy], u.kit);
        nu.energy = 0; 
        nu.turnCount = 0; 
        nu.partyIndex = i;        // 파티 순서 (동일 AV 시 2순위)
        nu.lastAdvancedAV = -1;   // 행게증 받은 시점 (동일 AV 시 1순위)
        nu.current_action_value = nu.base_action_value; 
        return nu;
    });

    let existingUlts = state.timeline.filter(a => a.type === 'Ult');

    // 2. 메인 시뮬레이션 루프
    while (true) {
        // 정교한 3단계 정렬 (AV 숫자는 절대 건드리지 않음)
        simUnits.sort((a, b) => {
            // [1단계] AV 비교
            if (Math.abs(a.current_action_value - b.current_action_value) > 1e-9) {
                return a.current_action_value - b.current_action_value;
            }
            // [2단계] AV가 같다면, 더 최근에 행게증을 받은 유닛이 무조건 우선
            if (a.lastAdvancedAV !== b.lastAdvancedAV) {
                return b.lastAdvancedAV - a.lastAdvancedAV; // 최신 시점(큰 값)이 우선
            }
            // [3단계] 위 조건도 같다면 파티 등록 순서
            return a.partyIndex - b.partyIndex;
        });

        let actor = simUnits[0];
        
        if (actor.current_action_value > limit) break;
        currentAV = actor.current_action_value;

        // 행동 시작 시 행게증 우선권 사용 완료 처리
        actor.lastAdvancedAV = -1;

        let actionType = state.actionPlans[actor.unit_id][actor.turnCount] || "B";
        let kit = (actionType === "S") ? actor.kit.skill : actor.kit.basic;

        let record = {
            id: Math.random(),
            unitId: actor.unit_id,
            name: actor.name,
            av: currentAV,
            type: actionType,
            beforeSp: sp,
            beforeEnergy: actor.energy
        };

        // --- 행동 게이지 조작 (선데이 전스) ---
        if (actionType === "S" && actor.name === "선데이") {
            let target = simUnits.find(u => u.name === "에바네시아");
            if (target) {
                // AV 수치를 선데이와 "완벽히 동일하게" 복사
                target.current_action_value = currentAV;
                // 현재 시점을 기록하여 다음 sort 시 최우선권을 갖게 함
                target.lastAdvancedAV = currentAV; 
            }
        }

        // 자원 정산
        sp = Math.min(5, Math.max(0, sp + kit.sp_gain - kit.sp_cost));
        actor.energy = Math.min(actor.max_energy, actor.energy + kit.energy_gain);
        
        record.afterSp = sp;
        record.afterEnergy = actor.energy;
        newTimeline.push(record);

        // 유닛 상태 업데이트
        actor.turnCount++;
        actor.current_action_value += actor.base_action_value;

        if (newTimeline.length > 250) break; 
    }

    // 필살기 난입 및 최종 정렬/렌더링
    existingUlts.forEach(ult => newTimeline.push(ult));
    state.timeline = newTimeline.sort((a, b) => a.av - b.av);
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
    if (!item.followUpEvents) {
        item.followUpEvents = { 1: [], 2: [], 3: [], 4: [] };
    }
    
    const type = document.getElementById('event-type-select').value;
    const targetUnitId = parseInt(document.getElementById('event-target-select').value);
    const value = parseFloat(document.getElementById('event-value-input').value || 0);
    
    item.followUpEvents[state.selectedPhase].push({
        type: type,
        targetUnitId: targetUnitId,
        value: type === 'Gauge' ? value : 0
    });
    
    render();
}

function removeFollowUpEvent(cardIdx, phaseNum, eventIdx) {
    const item = state.timeline[cardIdx];
    if (item && item.followUpEvents && item.followUpEvents[phaseNum]) {
        item.followUpEvents[phaseNum].splice(eventIdx, 1);
        render();
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
        el.querySelector('.p-effect').innerHTML = `SP: <strong>${s}</strong> | Energy: <strong>${Math.floor(e || 0)}</strong>`;
    };

    setP('p-turn-start', action.beforeSp, action.beforeEnergy);
    setP('p-action-start', action.beforeSp, action.beforeEnergy);
    setP('p-action-end', action.afterSp, action.afterEnergy);
    setP('p-turn-end', action.afterSp, action.afterEnergy);

    document.querySelectorAll('.phase-item').forEach(p => p.classList.remove('highlight'));
    if (action.type === 'Ult') {
        document.getElementById('p-action-start').classList.add('highlight');
        document.getElementById('p-action-end').classList.add('highlight');
    } else {
        document.querySelectorAll('.phase-item').forEach(p => p.classList.add('highlight'));
    }
}

function render() {
    const list = document.getElementById('timeline-list');
    list.innerHTML = '';
    
    state.timeline.forEach((item, idx) => {
        if (!item.followUpEvents) {
            item.followUpEvents = { 1: [], 2: [], 3: [], 4: [] };
        }

        const unit = state.unitData.find(u => u.unit_id === item.unitId);
        const actionConfig = (item.type === 'S') ? unit.kit.skill : (item.type === 'Ult' ? unit.kit.ultimate : unit.kit.basic);
        const isSelected = state.selectedIdx === idx;
        const imagePath = `imgs/character_preview/${item.unitId}.png`;

        // 상하단 정렬을 지탱해 줄 묶음형 래퍼 컨테이너 생성
        const wrapper = document.createElement('div');
        wrapper.className = 'action-card-wrapper';

        // [조건 2] 간소화 상태일 때 Phase 1, 2 이벤트를 메인 카드 '위'에 렌더링
        if (!isSelected) {
            [1, 2].forEach(pNum => {
                item.followUpEvents[pNum].forEach(ev => {
                    const targetUnit = state.unitData.find(u => u.unit_id === ev.targetUnitId);
                    let desc = ev.type === 'Ult' ? `[궁극기] ${targetUnit.name}` : `[행게조작] ${targetUnit.name} (${ev.value > 0 ? '+' : ''}${ev.value}%)`;
                    const badge = document.createElement('div');
                    badge.className = 'mini-event-badge above';
                    badge.textContent = desc;
                    wrapper.appendChild(badge);
                });
            });
        }

        // 메인 카드 빌드
        const div = document.createElement('div');
        div.className = `action-card ${isSelected ? 'active' : ''} ${item.type === 'Ult' ? 'ult-card' : ''}`;
        
        let cardHtml = `
            <div class="card-main-header">
                <div class="av-container" data-tooltip="${item.av}">
                    <div class="av-display">
                        ${item.av.toFixed(2)}
                    </div>
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
                const pEff = pNum <= 2 ? `SP: ${bSp} | E: ${bE}` : `SP: ${aSp} | E: ${aE}`;

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
                    let desc = ev.type === 'Ult' ? `[궁극기] ${targetUnit.name}` : `[행게조작] ${targetUnit.name} (${ev.value > 0 ? '+' : ''}${ev.value}%)`;
                    cardHtml += `
                        <div class="card-followup-item-expanded" onclick="event.stopPropagation();">
                            <span class="followup-tag">↳ Event</span>
                            <span class="followup-desc">${desc}</span>
                            <span class="followup-del-btn" onclick="window.removeFollowUpEvent(${idx}, ${pNum}, ${evIdx})">×</span>
                        </div>
                    `;
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
                    const targetUnit = state.unitData.find(u => u.unit_id === ev.targetUnitId);
                    let desc = ev.type === 'Ult' ? `[궁극기] ${targetUnit.name}` : `[행게조작] ${targetUnit.name} (${ev.value > 0 ? '+' : ''}${ev.value}%)`;
                    const badge = document.createElement('div');
                    badge.className = 'mini-event-badge below';
                    badge.textContent = desc;
                    wrapper.appendChild(badge);
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

function openUltPanel(phaseNum) {
    if (state.selectedIdx === null || state.timeline[state.selectedIdx].type === 'Ult') return;
    state.selectedPhase = phaseNum;
    const panel = document.getElementById('ult-insert-panel');
    const title = document.getElementById('insert-title');
    const select = document.getElementById('ult-unit-select');
    panel.style.display = 'block';
    const names = ["", "Phase 1 (턴 시작 전)", "Phase 2 (액션 직전)", "Phase 3 (액션 직후)", "Phase 4 (턴 종료 후)"];
    title.textContent = `난입 시점: ${names[phaseNum]}`;
    select.innerHTML = state.unitData.map(u => `<option value="${u.unit_id}">${u.name}</option>`).join('');
}

function confirmUltInsert() {
    const base = state.timeline[state.selectedIdx];
    const uId = parseInt(document.getElementById('ult-unit-select').value);
    const unit = state.unitData.find(u => u.unit_id === uId);
    let offset = 0;
    switch(state.selectedPhase) {
        case 1: offset = -0.0003; break;
        case 2: offset = -0.0001; break;
        case 3: offset = 0.0001; break;
        case 4: offset = 0.0003; break;
    }
    const newUlt = { id: Math.random(), unitId: unit.unit_id, name: unit.name, av: base.av + offset, type: 'Ult' };
    state.timeline.push(newUlt);
    recalculate();
    document.getElementById('ult-insert-panel').style.display = 'none';
    state.selectedIdx = state.timeline.findIndex(t => t.id === newUlt.id);
}

// [추가] UID 데이터 호출 및 콘솔 출력 연동 함수
async function loadUserData() {
    const uidInput = document.getElementById('uid-input');
    const uid = uidInput.value ? uidInput.value.trim() : "";
    
    if (!uid) {
        alert("UID를 입력해주세요.");
        return;
    }
    
    console.log(`[시뮬레이터] UID ${uid}로 데이터를 요청합니다...`);
    
    // config.js에 이미 작성되어 있는 함수를 그대로 호출
    const rawData = await fetchStarRailData(uid);
    
    if (rawData) {
        console.log("================ [성공] 스타레일 원본 데이터 ================");
        console.log(rawData);
        console.log("=========================================================");
        alert("데이터를 성공적으로 불러왔습니다. 개발자 도구 콘솔창(F12)을 확인해주세요.");
    }
}

// script.js 최하단에 추가된 코드
window.selectPhase = selectPhase;
window.removeFollowUpEvent = removeFollowUpEvent;
window.addFollowUpEvent = addFollowUpEvent;
window.confirmUltInsert = confirmUltInsert;
window.openUltPanel = openUltPanel;
window.updateCurrentAction = updateCurrentAction;

buildInitialTimeline();