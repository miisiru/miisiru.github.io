/**
 * script.js - 선데이 행게증 100% 로직 보완 및 엔진 통합
 */
import { Unit, fetchStarRailData, LightCone } from './config.js';
import { PRESET_UNITS, availableCharacters } from './char.js';
import { gameData, subStatData, mainStatData } from './config.js';

window.PRESET_UNITS = PRESET_UNITS;

let state = { 
    unitData: [],      
    actionPlans: {},   
    timeline: [],      
    selectedIdx: null, 
    selectedPhase: null,
    selectedLightCones: PRESET_UNITS.map(u => u.lightcone ? u.lightcone.id : null),
    selectedRelics: PRESET_UNITS.map(u => u.relics ? JSON.parse(JSON.stringify(u.relics)) : { main: [], sub: [] })
};

const spdDiv = document.getElementById('spd-inputs');

const lightCones = gameData && gameData.lightCones 
    ? (Array.isArray(gameData.lightCones) ? gameData.lightCones : Object.values(gameData.lightCones)) 
    : [];

let lcOptions = `<option value="">광추 미선택</option>`;
lightCones.forEach(lc => {
    lcOptions += `<option value="${lc.id}">${lc.name}</option>`;
});

// 1. 전역 availableCharacters 또는 PRESET_UNITS 기반으로 캐릭터 선택창 옵션 빌드
let charOptions = ``;
if (typeof availableCharacters !== 'undefined' && availableCharacters) {
    Object.keys(availableCharacters).forEach(id => {
        charOptions += `<option value="${id}">${availableCharacters[id].name || id}</option>`;
    });
} else {
    // 가드 레레일: 아직 availableCharacters 정의 전일 경우 현재 라인업으로 옵션 제공
    PRESET_UNITS.forEach(u => {
        charOptions += `<option value="${u.unit_id}">${u.name}</option>`;
    });
}

PRESET_UNITS.forEach((u, i) => {
    // 💡 [추가] 초기 로드 시점의 광추 및 유물 데이터 유무 검사
    const initLcId = state.selectedLightCones[i];
    const initRelic = state.selectedRelics[i];
    
    const hasLc = initLcId !== null && initLcId !== undefined && initLcId !== "";
    const hasRelic = initRelic && ((initRelic.main && initRelic.main.length > 0) || (initRelic.sub && initRelic.sub.length > 0));

    // 광추 UI 스타일 매핑
    const lcText = hasLc ? "선택됨" : "광추 선택";
    const lcColor = hasLc ? "var(--success)" : "var(--gold)";
    const lcBorder = hasLc ? "var(--success)" : "#475569";

    // 유물 UI 스타일 매핑
    const relicText = hasRelic ? "설정됨" : "유물 설정";
    const relicColor = hasRelic ? "var(--success)" : "var(--gold)";
    const relicBorder = hasRelic ? "var(--success)" : "#475569";

    spdDiv.innerHTML += `
        <div class="char-setting-card" style="padding: 8px 10px; background: var(--card); border: 1px solid #2d3748; border-radius: 6px; box-sizing: border-box; width: 100%;">
            <div class="char-card-header" style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px; width: 100%;">
                
                <div style="display: flex; align-items: center; gap: 6px; justify-content: flex-start; flex-shrink: 0;">
                    <img id="char-avatar-${i}" src="./imgs/avatarroundicon/${u.unit_id}.png" style="width: 32px; height: 32px; border-radius: 50%; border: 1px solid #475569; object-fit: contain; flex-shrink: 0;" onerror="this.style.opacity='0.5'">
                    
                    <div class="ui-icon-btn" style="border-color: #475569; position: relative; display: flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 4px; border: 1px solid #475569; background: #1e293b;">
                        <img src="./imgs/site_ui/char_icon.png" style="width: 12px; height: 12px; object-fit: contain;">
                        <span style="font-size: 11px; color: var(--text); white-space: nowrap;">변경</span>
                        <select class="char-dropdown" data-index="${i}" style="position:absolute; top:0; left:0; width:100%; height:100%; opacity:0; cursor:pointer;">
                            ${charOptions}
                        </select>
                    </div>
                </div>

                <div style="display: flex; align-items: center; gap: 6px; justify-content: flex-end; flex: 1;">
                    <div class="ui-icon-btn" style="border-color: ${lcBorder}; position: relative; display: flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 4px; border: 1px solid ${lcBorder}; background: transparent;">
                        <img src="./imgs/site_ui/lc_icon.png" style="width: 12px; height: 12px; object-fit: contain;">
                        <span class="lc-selected-name" id="lc-label-${i}" style="color: ${lcColor}; font-size: 11px; white-space: nowrap;">${lcText}</span>
                        <select class="lc-dropdown" data-index="${i}" style="position:absolute; top:0; left:0; width:100%; height:100%; opacity:0; cursor:pointer;">
                            ${lcOptions}
                        </select>
                    </div>

                    <button type="button" class="ui-icon-btn" style="border-color: ${relicBorder}; display: flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 4px; border: 1px solid ${relicBorder}; background: transparent; cursor: pointer;" title="유물 관리" onclick="window.openRelicModal(${i}, window.PRESET_UNITS[${i}].name)">
                        <img src="./imgs/site_ui/relic_icon.png" style="width: 12px; height: 12px; object-fit: contain;">
                        <span class="lc-selected-name" id="relic-label-${i}" style="color: ${relicColor}; font-size: 11px; white-space: nowrap;">${relicText}</span>
                    </button>
                </div>
                
            </div>
            <button type="button" class="main-btn" style="width: 100%; margin: 0; padding: 5px; font-size: 11px; font-weight: bold; background: #1e293b; border: 1px solid #475569;" onclick="window.openDetailModal(${i}, window.PRESET_UNITS[${i}].name)">자세히 보기</button>
        </div>`;
});

document.querySelectorAll('.char-dropdown').forEach(dropdown => {
    const idx = parseInt(dropdown.getAttribute('data-index'));
    
    // 현재 세팅된 프리셋 캐릭터의 unit_id를 select의 기본값으로 동기화
    if (PRESET_UNITS[idx]) {
        dropdown.value = PRESET_UNITS[idx].unit_id;
    }

    dropdown.addEventListener('change', (e) => {
        const slotIdx = parseInt(e.target.getAttribute('data-index'));
        const nextCharId = e.target.value;

        if (typeof availableCharacters !== 'undefined' && availableCharacters[nextCharId]) {
            const newUnit = availableCharacters[nextCharId];
            
            // 🎯 1. 캐릭터 본체 데이터 덮어쓰기
            window.PRESET_UNITS[slotIdx] = newUnit;

            // 🎯 2. 광추 연동 업데이트 (데이터 교체 + UI 초록색 점등)
            const newLcId = newUnit.lightcone ? newUnit.lightcone.id : "";
            state.selectedLightCones[slotIdx] = newLcId || null;
            
            const lcLabel = document.getElementById(`lc-label-${slotIdx}`);
            const lcDropdown = document.querySelector(`.lc-dropdown[data-index="${slotIdx}"]`);
            const lcBtn = lcLabel ? lcLabel.parentElement : null;
            
            if (lcDropdown) lcDropdown.value = newLcId; // 드롭다운 내부 값 동기화
            if (newLcId) {
                if(lcLabel) { lcLabel.textContent = "선택됨"; lcLabel.style.color = "var(--success)"; }
                if(lcBtn) lcBtn.style.borderColor = "var(--success)";
            } else {
                if(lcLabel) { lcLabel.textContent = "광추 선택"; lcLabel.style.color = "var(--gold)"; }
                if(lcBtn) lcBtn.style.borderColor = "#475569";
            }

            // 🎯 3. 유물 연동 업데이트 (원본이 오염되지 않게 깊은 복사 처리)
            const newRelics = newUnit.relics ? JSON.parse(JSON.stringify(newUnit.relics)) : { main: [], sub: [] };
            state.selectedRelics[slotIdx] = newRelics;
            
            const hasRelic = newRelics && ((newRelics.main && newRelics.main.length > 0) || (newRelics.sub && newRelics.sub.length > 0));
            const relicLabel = document.getElementById(`relic-label-${slotIdx}`);
            const relicBtn = relicLabel ? relicLabel.parentElement : null;
            
            if (hasRelic) {
                if(relicLabel) { relicLabel.textContent = "설정됨"; relicLabel.style.color = "var(--success)"; }
                if(relicBtn) relicBtn.style.borderColor = "var(--success)";
            } else {
                if(relicLabel) { relicLabel.textContent = "유물 선택"; relicLabel.style.color = "var(--gold)"; }
                if(relicBtn) relicBtn.style.borderColor = "#475569";
            }

        } else {
            console.warn(`[캐릭터 엔진 가드] availableCharacters 변수 내에 ID ${nextCharId} 데이터가 매핑되어 있지 않습니다.`);
        }

        // 🎯 4. UI 아바타 소스 즉각 새로고침 스위칭
        const avatarImg = document.getElementById(`char-avatar-${slotIdx}`);
        if (avatarImg) {
            avatarImg.src = `./imgs/avatarroundicon/${nextCharId}.png`;
        }

        // 잔여 트리거 갱신을 위해 시뮬레이션 타임라인 강제 계산
        if (typeof resetSimulation === 'function') {
            resetSimulation();
        }
        dropdown.blur();
    });
});

document.querySelectorAll('.lc-dropdown').forEach(dropdown => {
    // 💡 1. [방금 추가한 부분] 페이지 로드 시 프리셋 광추 ID가 있다면 드롭다운의 초기값으로 강제 세팅!
    const initIdx = parseInt(dropdown.getAttribute('data-index'));
    if (state.selectedLightCones[initIdx]) {
        dropdown.value = state.selectedLightCones[initIdx];
    }

    // 💡 2. [기존에 있던 부분] 사용자가 드롭다운 값을 직접 바꿀 때 색상을 바꿔주는 이벤트 리스너
    dropdown.addEventListener('change', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'));
        const id = e.target.value;
        state.selectedLightCones[idx] = id || null;
        
        const label = document.getElementById(`lc-label-${idx}`);
        const parentBtn = dropdown.parentElement;
        
        if (id) {
            label.textContent = "선택됨";
            label.style.color = "var(--success)";
            if (parentBtn) {
                parentBtn.style.borderColor = "var(--success)";
            }
        } else {
            label.textContent = "선택";
            label.style.color = "var(--gold)"; 
            if (parentBtn) {
                parentBtn.style.borderColor = "#475569"; 
                parentBtn.style.outline = "none";
            }
        }
        dropdown.blur();
    });
});

document.getElementById('uid-load-btn').addEventListener('click', loadUserData);

window.buildInitialTimeline = buildInitialTimeline;
window.selectCard = selectCard;
window.updateCurrentAction = updateCurrentAction;
window.addFollowUpEvent = addFollowUpEvent;
window.openUltPanel = openUltPanel;
window.confirmUltInsert = confirmUltInsert;

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
        
        state.actionPlans[u.unit_id] = Array(100).fill("B"); // 넉넉하게 100턴 계획
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
        let nu = u
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
        if (actionType === "S" && actor.name === "Sunday") {
            let target = simUnits.find(u => u.name === "Evanescia");
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
        const imagePath = `imgs/avatarshopicon/${item.unitId}.png`;

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

    console.log("================ [성공] 스타레일 캐릭터 리스트 ================");
    console.log(avatarList);
    console.log("=========================================================");

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
            
            console.log(`[매칭 성공] ${presetUnit.name} -> SPD: ${finalSpd}, MaxEnergy: ${finalMaxE}`);
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

// 3. 직접 입력 모달 이벤트 바인딩
setTimeout(() => {
    const modal = document.getElementById('json-modal');
    const openBtn = document.getElementById('open-json-btn');
    const closeBtn = document.getElementById('close-json-btn');
    const submitBtn = document.getElementById('submit-json-btn');
    const textarea = document.getElementById('json-textarea');

    if (openBtn) {
        openBtn.addEventListener('click', () => {
            textarea.value = '';
            modal.style.display = 'flex';
        });
        
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        submitBtn.addEventListener('click', () => {
            const textValue = textarea.value.trim();
            if (!textValue) {
                alert('텍스트를 입력해주세요.');
                return;
            }
            
            try {
                const parsed = JSON.parse(textValue);
                const success = applyParsedData(parsed);
                if (success) {
                    modal.style.display = 'none';
                }
            } catch (e) {
                console.error(e);
                alert('올바른 JSON 형식이 아닙니다. 텍스트 내용을 확인해 주세요.');
            }
        });
    }
}, 100);

// script.js 최하단에 추가된 코드
window.selectPhase = selectPhase;
window.removeFollowUpEvent = removeFollowUpEvent;
window.addFollowUpEvent = addFollowUpEvent;
window.confirmUltInsert = confirmUltInsert;
window.openUltPanel = openUltPanel;
window.updateCurrentAction = updateCurrentAction;

// ================= [유물 모달 전용 로직 - 중복 허용 및 배열 기반 고도화] =================
let currentRelicIdx = null;
let tempRelicData = { main: [], sub: [], sets: { outer2: "", outer4: "", planar2: "" } };

// 💡 1. 커스텀 드롭다운 클릭 제어용 전역 함수
window.toggleCustomSelect = function(type) {
    // 다른 열려있는 드롭다운들은 닫아줍니다.
    document.querySelectorAll('.custom-select-options').forEach(el => {
        if(el.id !== `options-${type}`) el.style.display = 'none';
    });
    // 클릭한 드롭다운 열기/닫기
    const optBox = document.getElementById(`options-${type}`);
    if (optBox) {
        optBox.style.display = optBox.style.display === 'none' ? 'block' : 'none';
    }
};

// 💡 2. 옵션 선택 시 임시 데이터 갱신 후 모달 렌더링(리프레시)
window.selectCustomOption = function(type, id) {
    if (!tempRelicData.sets) tempRelicData.sets = { outer2: "", outer4: "", planar2: "" };
    tempRelicData.sets[type] = id || "";
    renderRelicModal(); // 재렌더링하면 바뀐 데이터로 UI가 즉시 갱신되며 드롭다운도 자연스레 닫힙니다.
};

// 💡 3. 모달 바깥 영역 클릭 시 드롭다운 접기
document.addEventListener('click', (e) => {
    if (!e.target.closest('.custom-select-wrapper')) {
        document.querySelectorAll('.custom-select-options').forEach(el => el.style.display = 'none');
    }
});

window.openRelicModal = function(idx, charName) {
    currentRelicIdx = idx;
    tempRelicData = JSON.parse(JSON.stringify(state.selectedRelics[idx]));
    
    if (!tempRelicData.sets) {
        tempRelicData.sets = { outer2: "", outer4: "", planar2: "" };
    }
    
    document.getElementById('relic-modal-title').textContent = `${charName} - 유물 설정`;
    document.getElementById('relic-modal').style.display = 'flex';
    renderRelicModal();
};

// 💡 4. 커스텀 드롭다운 HTML 생성 빌더 함수 (이미지 자동 파싱)
function buildCustomDropdown(type, defaultLabel, optionsArr, currentSelectedId, isPlanar) {
    const selectedOpt = optionsArr.find(o => o.id == currentSelectedId);
    const headerText = selectedOpt ? selectedOpt.name : defaultLabel;
    const typeId = isPlanar ? 5 : 1; // 장신구는 5, 유물은 1
    
    const headerImg = selectedOpt 
        ? `<img src="./imgs/relicfigures/IconRelic_${selectedOpt.id}_${typeId}.png" style="width: 22px; height: 22px; object-fit: contain; flex-shrink: 0;">` 
        : `<div style="width: 22px; height: 22px; flex-shrink: 0;"></div>`;

    let html = `
    <div class="custom-select-wrapper" style="position: relative; width: 100%; user-select: none;">
        <div onclick="window.toggleCustomSelect('${type}')" style="display: flex; align-items: center; gap: 8px; background: #0b0f1a; border: 1px solid #3b4f76; padding: 6px 10px; border-radius: 4px; cursor: pointer; height: 36px; box-sizing: border-box;">
            ${headerImg}
            <span style="font-size: 11px; flex: 1; min-width: 0; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: ${selectedOpt ? 'var(--text)' : '#64748b'};" title="${headerText}">
                ${headerText}
            </span>
            <span style="font-size: 10px; color: #64748b; flex-shrink: 0; margin-left: auto;">▼</span>
        </div>
        
        <div class="custom-select-options" id="options-${type}" style="display: none; position: absolute; top: 100%; left: 0; width: 100%; max-height: 180px; overflow-y: auto; background: #182030; border: 1px solid #3b4f76; border-radius: 4px; z-index: 100; margin-top: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.8);">
            
            <div class="custom-option" onclick="window.selectCustomOption('${type}', '')" style="display: flex; align-items: center; gap: 8px; padding: 6px 10px; cursor: pointer; height: 32px; box-sizing: border-box;">
                <div style="width: 22px; height: 22px; flex-shrink: 0;"></div>
                <span style="font-size: 11px; color: #94a3b8; flex: 1; min-width: 0; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${defaultLabel}</span>
            </div>
    `;

    // 실제 데이터 옵션들 렌더링
    optionsArr.forEach(opt => {
        const isSelected = opt.id == currentSelectedId;
        const bg = isSelected ? '#2d3748' : 'transparent';
        html += `
            <div class="custom-option" onclick="window.selectCustomOption('${type}', '${opt.id}')" style="display: flex; align-items: center; gap: 8px; padding: 6px 10px; cursor: pointer; background: ${bg}; border-bottom: 1px solid #26324d; height: 32px; box-sizing: border-box;">
                <img src="./imgs/relicfigures/IconRelic_${opt.id}_${typeId}.png" style="width: 22px; height: 22px; object-fit: contain; flex-shrink: 0;" onerror="this.style.opacity=0">
                <span style="font-size: 11px; flex: 1; min-width: 0; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: ${isSelected ? 'var(--gold)' : 'var(--text)'};" title="${opt.name}">
                    ${opt.name}
                </span>
            </div>
        `;
    });

    html += `</div></div>`;
    return html;
}

function renderRelicModal() {
    let outerRelics = [];
    let planarRelics = [];

    if (gameData && gameData.relics) {
        Object.values(gameData.relics).forEach(relic => {
            const idStr = relic.id.toString();
            if (idStr.startsWith('1')) outerRelics.push(relic);
            else if (idStr.startsWith('3')) planarRelics.push(relic);
        });
    }

    const currentSets = tempRelicData.sets || { outer2: "", outer4: "", planar2: "" };

    const mainList = document.getElementById('relic-main-list');
    if (mainList && mainList.parentElement) {
        let setContainer = document.getElementById('relic-set-container');
        if (!setContainer) {
            setContainer = document.createElement('div');
            setContainer.id = 'relic-set-container';
            setContainer.style.cssText = "background: #182030; border: 1px solid #26324d; border-radius: 6px; padding: 12px; margin-bottom: 15px; width: 100%; box-sizing: border-box;";
            mainList.parentElement.insertBefore(setContainer, mainList.parentElement.firstChild);
        }

        // 🎯 [핵심 변경] 상단 2분할, 하단 전체 사용 레이아웃 적용
        setContainer.innerHTML = `
            <div style="font-size: 11px; font-weight: bold; color: #94a3b8; margin-bottom: 10px; letter-spacing: 0.05em;">세트 효과 설정</div>
            
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 10px;">
                ${buildCustomDropdown('outer2', '유물 2세트 (없음)', outerRelics, currentSets.outer2, false)}
                ${buildCustomDropdown('outer4', '유물 4세트 (없음)', outerRelics, currentSets.outer4, false)}
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr; gap: 10px;">
                ${buildCustomDropdown('planar2', '장신구 2세트 (없음)', planarRelics, currentSets.planar2, true)}
            </div>
        `;
    }

    // --- 주옵션 렌더링 ---
    mainList.innerHTML = '';
    tempRelicData.main.forEach((stat, i) => {
        mainList.innerHTML += `
            <div class="relic-tag">
                <span>${stat}</span>
                <span class="del-btn" onclick="removeMainStat(${i})">×</span>
            </div>`;
    });

    // --- 부옵션 렌더링 ---
    const subList = document.getElementById('relic-sub-list');
    subList.innerHTML = '';
    tempRelicData.sub.forEach((item, sIdx) => {
        subList.innerHTML += `
            <div class="sub-stat-item">
                <div style="font-weight:bold;">${item.name}</div>
                <div class="sub-stat-controls">
                    <select class="quality-select" onchange="updateSubQuality(${sIdx}, this.value)">
                        <option value="low" ${item.quality === 'low' ? 'selected' : ''}>하옵</option>
                        <option value="mid" ${item.quality === 'mid' ? 'selected' : ''}>중옵</option>
                        <option value="high" ${item.quality === 'high' ? 'selected' : ''}>상옵</option>
                    </select>
                    <button class="roll-btn" onclick="updateSubCount(${sIdx}, -1)">-</button>
                    <span style="min-width: 20px; text-align: center; color: var(--success); font-weight: bold;">${item.count}</span>
                    <button class="roll-btn" onclick="updateSubCount(${sIdx}, 1)">+</button>
                    <span class="del-btn" style="margin-left: 5px;" onclick="removeSubStat(${sIdx})">×</span>
                </div>
            </div>`;
    });
}

// 모달 내부 이벤트 핸들러 및 리스너 위임
setTimeout(() => {
    document.getElementById('add-main-stat-btn').addEventListener('click', () => {
        const val = document.getElementById('relic-main-select').value;
        if (tempRelicData.main.length >= 6) {
            alert("주옵션은 최대 6개까지만 설정할 수 있습니다.");
            return;
        }
        tempRelicData.main.push(val);
        renderRelicModal();
    });

    document.getElementById('add-sub-stat-btn').addEventListener('click', () => {
        const val = document.getElementById('relic-sub-select').value;
        tempRelicData.sub.push({
            name: val,
            count: 1,
            quality: 'mid'
        });
        renderRelicModal();
    });

    document.getElementById('close-relic-btn').addEventListener('click', () => {
        document.getElementById('relic-modal').style.display = 'none';
    });

    document.getElementById('save-relic-btn').addEventListener('click', () => {
        // 💡 실시간 반영 구조 덕분에 tempRelicData 스냅샷을 뜨면 세트 정보도 고스란히 저장됩니다.
        state.selectedRelics[currentRelicIdx] = JSON.parse(JSON.stringify(tempRelicData));
        document.getElementById('relic-modal').style.display = 'none';
        
        const label = document.getElementById(`relic-label-${currentRelicIdx}`);
        const btn = label ? label.parentElement : null;
        if (label && btn) {
            const mainLen = tempRelicData.main.length;
            const subRolls = tempRelicData.sub.reduce((acc, cur) => acc + cur.count, 0);
            const sets = tempRelicData.sets || { outer2: "", outer4: "", planar2: "" };
            const hasSet = sets.outer2 || sets.outer4 || sets.planar2;
            
            // 주옵, 부옵 롤 수치뿐 아니라 세트 효과가 단 하나라도 켜져 있으면 초록색 불 점등
            if (mainLen > 0 || subRolls > 0 || hasSet) {
                label.textContent = "설정됨";
                label.style.color = "var(--success)";
                btn.style.borderColor = "var(--success)";
            } else {
                label.textContent = "유물 선택";
                label.style.color = "var(--gold)";
                btn.style.borderColor = "#475569";
            }
        }
        
        // 유물 정보 갱신에 맞춰 대시보드 스탯 연산을 전면 재가동하기 위해 리셋 시뮬레이션 호출
        if (typeof resetSimulation === 'function') {
            resetSimulation();
        }
        console.log(`[유물+세트 저장 완료] 인덱스 ${currentRelicIdx}:`, state.selectedRelics[currentRelicIdx]);
    });
}, 100);

// 고유 인덱스 기반 데이터 조작 유틸 함수
window.removeMainStat = (idx) => { tempRelicData.main.splice(idx, 1); renderRelicModal(); };
window.removeSubStat = (sIdx) => { tempRelicData.sub.splice(sIdx, 1); renderRelicModal(); };
window.updateSubCount = (sIdx, delta) => {
    tempRelicData.sub[sIdx].count += delta;
    if (tempRelicData.sub[sIdx].count <= 0) {
        tempRelicData.sub.splice(sIdx, 1);
    }
    renderRelicModal();
};
window.updateSubQuality = (sIdx, quality) => {
    tempRelicData.sub[sIdx].quality = quality;
};

// ================= [자세히 보기 쇼케이스 모달 전용 로직] =================
window.openDetailModal = function(idx, charName) {
    const unit = PRESET_UNITS[idx];
    if (!unit) return;

    const charId = unit.unit_id;
    // 장착 중인 광추 ID가 있으면 사용, 없으면 캐릭터 기본 베이스 매핑 활용
    const lcId = state.selectedLightCones[idx] || (unit.lightcone ? unit.lightcone.id : 23058);

    // 1. 에셋 리소스 이미지 다이렉트 바인딩 규칙 적용
    document.getElementById('detail-char-img').src = `./imgs/avatarshopicon/${charId}.png`;
    document.getElementById('detail-lc-img').src = `./imgs/lightconemaxfigures/${lcId}.png`;
    
    // 속성(Element) 및 운명의길(Path) 더미 데이터 매핑 (UI 레이아웃 시각화용)
    const curElement = unit.element;
    const curLCPath = unit.lightcone.path
    const curPath = unit.path;
    const romes = ["", "I", "II", "III", "IV", "V"];

    document.getElementById('detail-element-icon').src = `./imgs/iconattributemiddle/iconattribute${curElement}.png`;
    document.getElementById('detail-path-icon').src = `./imgs/paths/${curPath}.png`;
    document.getElementById('detail-lc-path-icon').src = `./imgs/paths/${curLCPath}.png`;
    document.getElementById('detail-char-name').textContent = charName;
    document.getElementById('detail-lc-superimposition').textContent = `중첩 ${romes[unit.lightcone.superimpostion]}`

    // 2. 성급 스타 레이아웃 그리기 (StarBig.png 활용)
    const starContainer = document.getElementById('detail-stars');
    starContainer.innerHTML = '';
    for(let s=0; s<unit.rarity; s++) {
        starContainer.innerHTML += `<img src="./imgs/decopic/StarBig.png" style="width:14px; height:14px; object-fit:contain;">`;
    }

    // 3. 광추 이름 매핑 추출
    if (gameData && gameData.lightCones && gameData.lightCones[lcId]) {
        document.getElementById('detail-lc-name').textContent = gameData.lightCones[lcId].name;
    } else {
        document.getElementById('detail-lc-name').textContent = "기본 장착 광추";
    }

    // 4. 9대 스탯 보드 정보 구성 (기본 수치 + 초록색 유물 가산치 분할 렌더링)
    const statSpecs = [
        { label: "HP", icon: "IconMaxHP.png", base: unit.base_hp, add: 450, isPercent: false },
        { label: "공격력", icon: "IconAttack.png", base: unit.base_atk, add: 1120, isPercent: false },
        { label: "방어력", icon: "IconDefence.png", base: unit.base_def, add: 120, isPercent: false },
        { label: "속도", icon: "IconSpeed.png", base: unit.base_spd, add: 34, isPercent: false },
        { label: "치명타 확률", icon: "IconCriticalChance.png", base: unit.base_cr, add: 0.642, isPercent: true },
        { label: "치명타 피해", icon: "IconCriticalDamage.png", base: unit.base_cd, add: 1.485, isPercent: true },
        { label: "효과 명중", icon: "IconStatusProbability.png", base: unit.base_ehr, add: 0.240, isPercent: true },
        { label: "효과 저항", icon: "IconStatusResistance.png", base: unit.base_eres, add: 0.100, isPercent: true },
        { label: "격파 특수효과", icon: "IconBreakup.png", base: unit.base_be, add: 0.480, isPercent: true },
        { label: "에너지 회복 효율", icon: "IconEnergyRecovery.png", base: unit.base_err, add: 0.480, isPercent: true },
        { label: `${curElement} 피해 증가`, icon: `Icon${curElement}AddedRatio.png`, base: unit.base_dmg_boost[curElement], add: 0.0, isPercent: true }
    ];

    if(unit.path === "Elation") {
        statSpecs.push({label: "환락도", icon: "IconJoy.png", base: unit.base_elation, add: 0, isPercent: true})
    }

    const gridContainer = document.getElementById('detail-stats-grid');
    gridContainer.innerHTML = '';
    
    statSpecs.forEach((s, sIdx) => {
        // 데이터 가공 수치 미리 계산
        let baseStr = "";
        let addStr = "";
        let totalStr = "";

        if (s.isPercent) {
            baseStr = (s.base * 100).toFixed(1) + "%";
            addStr = s.add > 0 ? "+" + (s.add * 100).toFixed(1) + "%" : "";
            totalStr = ((s.base + s.add) * 100).toFixed(1) + "%";
        } else {
            baseStr = Math.floor(s.base).toLocaleString();
            addStr = s.add > 0 ? "+" + Math.floor(s.add).toLocaleString() : "";
            totalStr = Math.floor(s.base + s.add).toLocaleString();
        }

        // HTML 동적 주입 (기본 상태는 합쳐진 하얀색 수치 노출)
        // 클릭 이벤트를 심어서 내부 수치를 실시간 스위칭합니다.
        gridContainer.innerHTML += `
            <div class="detail-stat-box" 
                 data-mode="total" 
                 style="background: #171e2f; border: 1px solid #222b3e; padding: 10px 14px; border-radius: 6px; display: flex; align-items: center; justify-content: space-between; gap: 10px; cursor: pointer; user-select: none;"
                 onclick="window.toggleStatDisplay(this, '${totalStr}', '${baseStr}', '${addStr}')">
                
                <div style="display: flex; align-items: center; gap: 8px; white-space: nowrap; flex-shrink: 0;">
                    <img src="./imgs/staticon/${s.icon}" style="width: 18px; height: 18px; object-fit: contain;" onerror="this.style.opacity='0.4'">
                    <span style="font-size: 13px; color: #94a3b8;">${s.label}</span>
                </div>
                
                <div class="stat-value-container" style="white-space: nowrap; font-size: 13px; font-weight: bold; font-family: monospace; text-align: right;">
                    <span style="color: #ffffff;">${totalStr}</span>
                </div>
            </div>`;
    });

    const modalContentBox = document.querySelector('#detail-modal > div'); 
    if (modalContentBox) {
        modalContentBox.scrollTop = 0;
    }

    document.getElementById('detail-modal').style.display = 'flex';
};

window.toggleStatDisplay = function(element, totalStr, baseStr, addStr) {
    const valueContainer = element.querySelector('.stat-value-container');
    const currentMode = element.getAttribute('data-mode');

    if (currentMode === 'total') {
        // ➔ 분리 모드로 전환 (기본스탯 화이트 + 추가스탯 그린)
        element.setAttribute('data-mode', 'split');
        valueContainer.innerHTML = `
            <span style="color: #ffffff;">${baseStr}</span>
            ${addStr ? `<span style="color: var(--success); margin-left: 6px; font-size: 11px;">${addStr}</span>` : ''}
        `;
    } else {
        // ➔ 통합 모드로 복구 (합산 화이트 단일 노출)
        element.setAttribute('data-mode', 'total');
        valueContainer.innerHTML = `
            <span style="color: #ffffff;">${totalStr}</span>
        `;
    }
};

// 닫기 단방향 이벤트 바인딩
// ================= [모달 닫기 이벤트 고도화] =================
setTimeout(() => {
    const detailModal = document.getElementById('detail-modal');
    const closeBtnBottom = document.getElementById('close-detail-btn'); // 기존 하단 버튼
    const closeBtnTop = document.getElementById('close-detail-btn-top'); // 신규 상단 X 버튼
    
    const closeModal = () => {
        if (detailModal) detailModal.style.display = 'none';
    };

    // 버튼 클릭 시 닫기
    if (closeBtnBottom) closeBtnBottom.addEventListener('click', closeModal);
    if (closeBtnTop) closeBtnTop.addEventListener('click', closeModal);

    // 💡 핵심: 모달 바깥쪽(어두운 배경) 클릭 시 닫기
    if (detailModal) {
        detailModal.addEventListener('click', (e) => {
            // 클릭한 요소(e.target)가 모달 내부 컨텐츠가 아니라, 모달을 감싸는 겉 배경일 때만 동작
            if (e.target === detailModal) {
                closeModal();
            }
        });
    }
}, 100);

window.openDetailModal = window.openDetailModal;

setTimeout(() => {
    const toggleBtn = document.getElementById('sidebar-toggle');
    const settingsPanel = document.getElementById('settings-panel');
    
    if (toggleBtn && settingsPanel) {
        toggleBtn.addEventListener('click', () => {
            // collapsed 클래스를 넣었다 뺐다 하며 패널을 접고 폅니다.
            settingsPanel.classList.toggle('collapsed');
        });
    }
}, 100);

buildInitialTimeline()