import { fetchStarRailData } from './config.js';
import { PRESET_UNITS, availableCharacters } from './char.js';
import { gameData, subStatData, mainStatData } from './config.js';
import { state } from './script.js';

// ================= [유물 모달 전용 로직 - 중복 허용 및 배열 기반 고도화] =================
export let currentRelicIdx = null;
export let tempRelicData = { main: [], sub: [], sets: { outer2: "", outer4: "", planar2: "" } };

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
    
    // 🎯 1. 모달을 화면에 먼저 띄웁니다.
    document.getElementById('relic-modal').style.display = 'flex';
    
    // 🎯 2. 화면에 나타난 직후, 오른쪽 스크롤 박스를 찾아 맨 위로 초기화합니다.
    const scrollBox = document.getElementById('relic-modal-scroll');
    if (scrollBox) {
        scrollBox.scrollTop = 0;
    }

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
            // 💡 패딩과 여백을 주/부옵션 상자와 완전히 동일하게 맞춤
            setContainer.style.cssText = "background: #182030; border: 1px solid #26324d; border-radius: 8px; padding: 16px; width: 100%; box-sizing: border-box;";
            
            // 💥 [핵심 원인 해결] 주옵션 상자 내부가 아니라, 그 밖의 스크롤 몸체(relic-modal-scroll)에 나란히 삽입!
            mainList.parentElement.parentElement.insertBefore(setContainer, mainList.parentElement);
        }

        // 디자인 일체화를 위해 제목 폰트 크기(13px) 및 색상 통일
        setContainer.innerHTML = `
            <div style="font-size: 13px; font-weight: bold; color: #cbd5e1; margin-bottom: 12px;">세트 효과 설정</div>
            
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