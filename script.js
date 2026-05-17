/**
 * script.js - 선데이 행게증 100% 로직 보완 및 엔진 통합
 */
import { Unit, fetchStarRailData, LightCone } from './config.js';
import { PRESET_UNITS } from './char.js';
import { gameData, subStatData, mainStatData } from './config.js';


let state = { 
    unitData: [],      
    actionPlans: {},   
    timeline: [],      
    selectedIdx: null, 
    selectedPhase: null,
    selectedLightCones: Array(PRESET_UNITS.length).fill(null),
    selectedRelics: Array(PRESET_UNITS.length).fill(null).map(() => ({ main: [], sub: [] }))
};

const spdDiv = document.getElementById('spd-inputs');

const lightCones = gameData && gameData.lightCones 
    ? (Array.isArray(gameData.lightCones) ? gameData.lightCones : Object.values(gameData.lightCones)) 
    : [];

let lcOptions = `<option value="">광추 미선택</option>`;
lightCones.forEach(lc => {
    lcOptions += `<option value="${lc.id}">${lc.name}</option>`;
});

PRESET_UNITS.forEach((u, i) => {
    spdDiv.innerHTML += `
        <div class="char-setting-card">
            <div class="char-card-header">
                <span class="char-card-title">${u.name}</span>
                <div class="card-icon-group">
                    <div class="ui-icon-btn">
                        <img src="./imgs/site_ui/lc_icon.png" onerror="this.style.opacity='0.5'">
                        <span class="lc-selected-name" id="lc-label-${i}">광추 선택</span>
                        <select class="lc-dropdown" data-index="${i}" class="invisible-select" style="position:absolute; top:0; left:0; width:100%; height:100%; opacity:0; cursor:pointer;">
                            ${lcOptions}
                        </select>
                    </div>
                    <button type="button" class="ui-icon-btn" title="유물 관리" onclick="window.openRelicModal(${i}, '${u.name}')">
                        <img src="./imgs/site_ui/relic_icon.png" onerror="this.style.opacity='0.5'">
                        <span class="lc-selected-name" id="relic-label-${i}">유물 설정</span>
                    </button>
                </div>
            </div>
            <div style="display: flex; gap: 5px;">
                <input type="number" class="spd-in" value="${u.spd}" style="flex:1; background:#0b0f1a; border:1px solid #2d3748; color:var(--text); padding:4px; border-radius:4px; font-size:11px;">
                <input type="number" class="max-e-in" value="${u.max_energy}" style="flex:1; background:#0b0f1a; border:1px solid #2d3748; color:var(--text); padding:4px; border-radius:4px; font-size:11px;">
            </div>
        </div>`;
});

document.querySelectorAll('.lc-dropdown').forEach(dropdown => {
    dropdown.addEventListener('change', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'));
        const id = e.target.value;
        state.selectedLightCones[idx] = id || null;
        
        const label = document.getElementById(`lc-label-${idx}`);
        const parentBtn = dropdown.parentElement;
        
        if (id) {
            // 1. 광추가 선택되었을 때: 글자색과 버튼 테두리 모두 산뜻한 초록색 활성화!
            label.textContent = "선택됨";
            label.style.color = "var(--success)";
            if (parentBtn) {
                parentBtn.style.borderColor = "var(--success)";
            }
        } else {
            // 2. 💡 [진짜 해결] 광추 미선택(해제) 시 원래의 이쁜 주황색 글씨로 정확하게 롤백!
            label.textContent = "광추 선택";
            label.style.color = "var(--gold)"; // 글자색을 원래 주황색(var(--gold))으로 복구!
            if (parentBtn) {
                parentBtn.style.borderColor = "#475569"; // 테두리는 기본 회색 스타일 유지
                parentBtn.style.outline = "none";
            }
        }
        
        // 브라우저 강제 포커스로 인한 주황 테두리 현상 방지를 위해 blur 처리
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
    const spdIn = document.querySelectorAll('.spd-in');
    const maxEIn = document.querySelectorAll('.max-e-in');
    
    state.unitData = PRESET_UNITS.map((p, i) => {
        const assignedLcId = state.selectedLightCones[i];
        const assignedRelics = state.selectedRelics ? state.selectedRelics[i] : null;
        
        const u = new Unit({
            unit_id: p.unit_id,
            spd: parseFloat(spdIn[i].value),
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
let tempRelicData = { main: [], sub: [] };

window.openRelicModal = function(idx, charName) {
    currentRelicIdx = idx;
    tempRelicData = JSON.parse(JSON.stringify(state.selectedRelics[idx]));
    
    document.getElementById('relic-modal-title').textContent = `${charName} - 유물 설정`;
    document.getElementById('relic-modal').style.display = 'flex';
    renderRelicModal();
};

function renderRelicModal() {
    // 1. 주옵션 렌더링
    const mainList = document.getElementById('relic-main-list');
    mainList.innerHTML = '';
    tempRelicData.main.forEach((stat, i) => {
        mainList.innerHTML += `
            <div class="relic-tag">
                <span>${stat}</span>
                <span class="del-btn" onclick="removeMainStat(${i})">×</span>
            </div>`;
    });

    // 2. 부옵션 렌더링 (동일 옵션이더라도 개별 행으로 독립 배치)
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
        if (tempRelicData.main.length >= 4) {
            alert("주옵션은 최대 4개까지만 설정할 수 있습니다.");
            return;
        }
        tempRelicData.main.push(val);
        renderRelicModal();
    });

    // 💥 중복된 옵션이라도 기존 데이터를 덮어쓰지 않고 새로운 행으로 무조건 추가합니다.
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
        state.selectedRelics[currentRelicIdx] = JSON.parse(JSON.stringify(tempRelicData));
        document.getElementById('relic-modal').style.display = 'none';
        
        const label = document.getElementById(`relic-label-${currentRelicIdx}`);
        const btn = label ? label.parentElement : null;
        if (label && btn) {
            const mainLen = tempRelicData.main.length;
            const subRolls = tempRelicData.sub.reduce((acc, cur) => acc + cur.count, 0);
            
            if (mainLen > 0 || subRolls > 0) {
                // 유물이 설정되어 있으면 초록색 표시
                label.textContent = "설정됨";
                label.style.color = "var(--success)";
                btn.style.borderColor = "var(--success)";
            } else {
                // 아무것도 없으면 기본 상태로 원상복구
                label.textContent = "유물 선택";
                label.style.color = "var(--gold)";
                btn.style.borderColor = "#475569";
            }
        }
        console.log(`[유물 저장 완료] 인덱스 ${currentRelicIdx}:`, state.selectedRelics[currentRelicIdx]);
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