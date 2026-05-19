import { Unit, fetchStarRailData, LightCone } from './config.js';
import { PRESET_UNITS, availableCharacters } from './char.js';
import { gameData, subStatData, mainStatData } from './config.js';
import { state } from './script.js';

// 💡 광추 레벨 및 중첩 상태를 관리할 보조 메모리 스냅샷 백킹 스토어 생성
export let currentLcIdx = null;
export let tempLcData = { id: "", level: 80, superimposition: 5 };

// ================= [광추 모달 제어 및 커스텀 프리뷰 엔진] =================

window.openLightConeModal = function(idx, charName) {
    currentLcIdx = idx;
    
    // 현재 캐릭터 슬롯의 실시간 광추 정보 스냅샷 추출
    const currentId = state.selectedLightCones[idx] || "";
    const detail = state.lightConeDetails[idx] || { level: 80, superimposition: 5 };
    
    tempLcData = {
        id: currentId,
        level: detail.level,
        superimposition: detail.superimposition
    };

    document.getElementById('lc-modal-title').textContent = `${charName} - 광추 설정`;
    document.getElementById('lc-modal').style.display = 'flex';
    
    const scrollBox = document.getElementById('lc-modal-scroll');
    if (scrollBox) scrollBox.scrollTop = 0;

    renderLightConeModal();
};

// 광추 드롭다운 변경 핸들러
window.onLcModalDropdownChange = function(newId) {
    tempLcData.id = newId;
    if (newId && gameData.lightCones[newId]) {
        // 5성이면 1중첩, 4성 이하면 5중첩 기본값 세팅 가드 법칙 적용
        const rarity = gameData.lightCones[newId].rarity;
        tempLcData.superimposition = rarity === 5 ? 1 : 5;
    }
    renderLightConeModal();
};

// 레벨 값 변경 핸들러
window.updateLcTempLevel = function(val) {
    let nextLvl = parseInt(tempLcData.level || 80) + val;
    if (nextLvl < 1) nextLvl = 1;
    if (nextLvl > 80) nextLvl = 80;
    tempLcData.level = nextLvl;
    renderLightConeModal(); // 입력창뿐만 아니라 메모리까지 동기화 후 재렌더링
};

window.setLcMaxLevel = function() {
    tempLcData.level = 80;
    renderLightConeModal();
};

window.updateLcTempLevelDirect = function(val) {
    let nextLvl = parseInt(val);
    // 숫자가 아니거나 비워둔 채로 포커스를 잃으면 이전 값(렌더링) 복구
    if (isNaN(nextLvl)) {
        renderLightConeModal(); 
        return;
    }
    // 1~80 사이로 값 강제 교정
    if (nextLvl < 1) nextLvl = 1;
    if (nextLvl > 80) nextLvl = 80;
    
    tempLcData.level = nextLvl;
    renderLightConeModal(); // 최종 교정된 값으로 UI 업데이트
};

// 중첩 값 스위칭 핸들러
window.setLcTempSuper = function(val) {
    tempLcData.superimposition = val;
    renderLightConeModal();
};

export function renderLightConeModal() {
    const scrollBox = document.getElementById('lc-modal-scroll');
    if (!scrollBox) return;

    // 1. 광추 선택 대상을 위한 드롭다운 옵션 빌드
    let optionsHtml = `<option value="">광추 선택 (장착 해제)</option>`;
    if (gameData && gameData.lightCones) {
        Object.values(gameData.lightCones).forEach(lc => {
            const isSel = tempLcData.id == lc.id ? 'selected' : '';
            optionsHtml += `<option value="${lc.id}" ${isSel}>${lc.name}</option>`;
        });
    }

    // 2. 현재 선택된 광추 데이터 기반 정보 프리뷰 카드 슬롯 빌드
    let previewCardHtml = `
        <div style="background: #182030; border: 1px dashed #26324d; border-radius: 8px; padding: 20px; text-align: center; color: #64748b; font-size: 13px;">
            선택된 광추가 없습니다. 목록에서 광추를 장착해 주세요.
        </div>`;

    if (tempLcData.id && gameData.lightCones[tempLcData.id]) {
        const lcInfo = gameData.lightCones[tempLcData.id];
        // 인게임 이미지 주소 변환 규칙 동기화
        const imgUrl = `./imgs/lightconemaxfigures/${tempLcData.id}.png`;
        
        previewCardHtml = `
            <div style="background: #182030; border: 1px solid #26324d; border-radius: 8px; padding: 16px; display: flex; gap: 18px; align-items: center;">
                <div style="width: 55px; height: 72px; background: #090d16; border: 1px solid #3b4f76; overflow: hidden; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <img src="${imgUrl}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.opacity=0">
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 15px; font-weight: bold; color: var(--gold); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 4px;">${lcInfo.name}</div>
                    <div style="font-size: 11px; color: #94a3b8; margin-bottom: 8px;">운명의 길: <span style="color:#fff;">${lcInfo.path}</span> / 희귀도: <span style="color:#fff;">${lcInfo.rarity}성</span></div>
                    
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; background: #0b0f1a; padding: 6px 10px; border-radius: 4px; border: 1px solid #232d42;">
                        <div style="display: flex; align-items: center; gap: 4px; font-size: 11px; color: #94a3b8;">
                            <img src="./imgs/staticon/IconMaxHP.png" style="width: 12px; height: 12px; object-fit: contain; flex-shrink: 0;">
                            <span>HP</span>
                            <b style="color:#f3f4f6;">${lcInfo.stats?.HP || 0}</b>
                        </div>
                        <div style="display: flex; align-items: center; gap: 4px; font-size: 11px; color: #94a3b8;">
                            <img src="./imgs/staticon/IconAttack.png" style="width: 12px; height: 12px; object-fit: contain; flex-shrink: 0;">
                            <span>ATK</span>
                            <b style="color:#f3f4f6;">${lcInfo.stats?.ATK || 0}</b>
                        </div>
                        <div style="display: flex; align-items: center; gap: 4px; font-size: 11px; color: #94a3b8;">
                            <img src="./imgs/staticon/IconDefence.png" style="width: 12px; height: 12px; object-fit: contain; flex-shrink: 0;">
                            <span>DEF</span>
                            <b style="color:#f3f4f6;">${lcInfo.stats?.DEF || 0}</b>
                        </div>
                    </div>
                </div>
            </div>`;
    }

    // 3. 중첩(I~V) 라디오 버튼 그룹 컴포넌트 동적 빌드
    let superButtons = '';
    const RomanList = ["I", "II", "III", "IV", "V"];
    for (let i = 1; i <= 5; i++) {
        const isAct = tempLcData.superimposition === i;
        const btnBg = isAct ? 'var(--gold)' : '#0b0f1a';
        const btnColor = isAct ? '#0e1322' : '#94a3b8';
        const btnBorder = isAct ? 'var(--gold)' : '#3b4f76';
        superButtons += `
            <button onclick="window.setLcTempSuper(${i})" style="flex: 1; background: ${btnBg}; color: ${btnColor}; border: 1px solid ${btnBorder}; padding: 6px 0; border-radius: 4px; font-size: 12px; font-weight: bold; cursor: pointer; transition: all 0.15s;">
                ${RomanList[i-1]}
            </button>`;
    }

    // 최종 종합 가상 돔 이식
    scrollBox.innerHTML = `
        <div style="background: #182030; padding: 16px; border-radius: 8px; border: 1px solid #26324d;">
            <h4 style="margin: 0 0 12px 0; color: #cbd5e1; font-size: 13px; font-weight: bold;">광추 장착 변경</h4>
            <select onchange="window.onLcModalDropdownChange(this.value)" style="width: 100%; background: #0b0f1a; border: 1px solid #3b4f76; color: var(--text); padding: 7px; border-radius: 4px; font-size: 12px; outline: none; cursor: pointer;">
                ${optionsHtml}
            </select>
        </div>

        ${previewCardHtml}

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;">
            
            <div style="background: #182030; padding: 16px; border-radius: 8px; border: 1px solid #26324d; display: flex; flex-direction: column; justify-content: center;">
                <h4 style="margin: 0 0 10px 0; color: #cbd5e1; font-size: 13px; font-weight: bold;">광추 레벨 설정</h4>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <button type="button" onclick="window.updateLcTempLevel(-1)" class="roll-btn" style="width:30px; height:30px; flex-shrink:0;">-</button>
                    <input id="lc-temp-level-input" type="number" value="${tempLcData.level}" min="1" max="80" 
    onchange="window.updateLcTempLevelDirect(this.value)" 
    style="flex: 1; background: #0b0f1a; border: 1px solid #3b4f76; color: var(--success); font-weight: bold; text-align: center; padding: 5px; border-radius: 4px; font-size: 13px; outline: none;">

                    <button type="button" onclick="window.updateLcTempLevel(1)" class="roll-btn" style="width:30px; height:30px; flex-shrink:0;">+</button>
                    <button type="button" onclick="window.setLcMaxLevel()" style="background: #334155; border: none; color: #fff; padding: 6px 10px; border-radius: 4px; font-size: 11px; font-weight: bold; cursor: pointer; flex-shrink:0;">Max</button>
                </div>
            </div>

            <div style="background: #182030; padding: 16px; border-radius: 8px; border: 1px solid #26324d;">
                <h4 style="margin: 0 0 10px 0; color: #cbd5e1; font-size: 13px; font-weight: bold;">중첩 단계 설정</h4>
                <div style="display: flex; gap: 5px; width: 100%;">
                    ${superButtons}
                </div>
            </div>

        </div>
    `;
}