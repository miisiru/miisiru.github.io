import { Unit, fetchStarRailData, LightCone } from './config.js';
import { PRESET_UNITS, availableCharacters } from './char.js';
import { gameData, subStatData, mainStatData } from './config.js';
import { state } from './script.js';

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

    const lcDetail = state.lightConeDetails[idx] || { level: 80, superimposition: 5 };
    const RomanList = ["I", "II", "III", "IV", "V"];

    const detailLvlSpan = document.getElementById('detail-lc-level');
    const detailSuperSpan = document.getElementById('detail-lc-superimposition');

    if (detailLvlSpan) detailLvlSpan.textContent = lcDetail.level;
    if (detailSuperSpan) {
        detailSuperSpan.textContent = "중첩 " + (RomanList[lcDetail.superimposition - 1] || "V");
    }

    document.getElementById('detail-element-icon').src = `./imgs/iconattributemiddle/IconAttribute${curElement}.png`;
    document.getElementById('detail-path-icon').src = `./imgs/paths/${curPath}.png`;
    document.getElementById('detail-lc-path-icon').src = `./imgs/paths/${curLCPath}.png`;
    document.getElementById('detail-char-name').textContent = charName;
    document.getElementById('detail-lc-superimposition').textContent = `중첩 ${romes[unit.lightcone.superimposition]}`

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

    const relicSetSlot = document.getElementById('detail-relic-sets');
    if (relicSetSlot) {
        relicSetSlot.innerHTML = ''; // 이전 유닛의 데이터 초기화

        // 현재 슬롯의 실시간 유물 세트 데이터 참조
        const currentRelics = state.selectedRelics[idx] || { main: [], sub: [], sets: {} };
        const sets = currentRelics.sets || { outer2: "", outer4: "", planar2: "" };
        
        let outerHtml = "";
        let planarHtml = "";
        
        const o2 = sets.outer2;
        const o4 = sets.outer4;
        const p2 = sets.planar2;

        // 헬퍼 함수: gameData.relics가 배열인지 사전인지 판별해 데이터 안전하게 추출
        const getRelicData = (id) => {
            if (!gameData || !gameData.relics || !id) return null;
            return Array.isArray(gameData.relics) 
                ? gameData.relics.find(r => String(r.id) === String(id))
                : gameData.relics[id];
        };

        // 1️⃣ 터널 유물 세트 조건 분기 판별
        if (o2 && o4 && o2 === o4) {
            // 💥 [단독 4세트 장착]: 2셋과 4셋이 일치할 때
            const setData = getRelicData(o2);
            const setName = setData ? setData.name : "알 수 없는 유물";
            outerHtml = `
                <div style="background: #182030; border: 1px solid #26324d; border-radius: 8px; padding: 10px 14px; display: flex; gap: 12px; align-items: center; flex: 1;">
                    <img src="./imgs/relicfigures/IconRelic_${o2}_1.png" style="width: 28px; height: 28px; object-fit: contain;" onerror="this.style.opacity=0">
                    <div>
                        <div style="font-size: 10px; color: #64748b; font-weight: bold;">유물 2세트 / 4세트</div>
                        <div style="font-size: 13px; font-weight: bold; color: var(--text);">${setName}</div>
                    </div>
                </div>`;
        } else if (o2 || o4) {
            // 💥 [2+2 혼합 세트 장착]: 2셋과 4셋이 서로 다르거나 하나만 활성화된 상태
            const labelText = (o2 && o4) ? "유물 2세트 / 2세트" : "유물 2세트";
            let subItems = "";
            
            [o2, o4].forEach(id => {
                if (id) {
                    const setData = getRelicData(id);
                    const setName = setData ? setData.name : "알 수 없는 유물";
                    subItems += `
                        <div style="display: flex; gap: 8px; align-items: center; flex: 1; min-width: 0;">
                            <img src="./imgs/relicfigures/IconRelic_${id}_1.png" style="width: 24px; height: 24px; object-fit: contain;" onerror="this.style.opacity=0">
                            <span style="font-size: 12px; font-weight: bold; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${setName}</span>
                        </div>`;
                }
            });

            outerHtml = `
                <div style="background: #182030; border: 1px solid #26324d; border-radius: 8px; padding: 10px 14px; display: flex; flex-direction: column; gap: 6px; flex: 1;">
                    <div style="font-size: 10px; color: #64748b; font-weight: bold;">${labelText}</div>
                    <div style="display: flex; gap: 12px; width: 100%;">${subItems}</div>
                </div>`;
        }

        // 2️⃣ 차원 장신구 세트 판별 (장신구 고유 번호 5 바인딩)
        if (p2) {
            const setData = getRelicData(p2);
            const setName = setData ? setData.name : "알 수 없는 장신구";
            planarHtml = `
                <div style="background: #182030; border: 1px solid #26324d; border-radius: 8px; padding: 10px 14px; display: flex; gap: 12px; align-items: center; flex: 1;">
                    <img src="./imgs/relicfigures/IconRelic_${p2}_5.png" style="width: 28px; height: 28px; object-fit: contain;" onerror="this.style.opacity=0">
                    <div>
                        <div style="font-size: 10px; color: #64748b; font-weight: bold;">장신구 2세트</div>
                        <div style="font-size: 13px; font-weight: bold; color: var(--text);">${setName}</div>
                    </div>
                </div>`;
        }

        // 3️⃣ 수집된 컴포넌트들을 가로 분할 그리드로 화면 배치 구성
        if (!outerHtml && !planarHtml) {
            relicSetSlot.innerHTML = `
                <div style="background: #182030; border: 1px dashed #26324d; border-radius: 8px; padding: 12px; text-align: center; font-size: 12px; color: #64748b;">
                    장착 활성화된 유물 세트 효과가 없습니다.
                </div>`;
        } else {
            relicSetSlot.innerHTML = `
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; width: 100%;">
                    ${outerHtml}
                    ${planarHtml}
                </div>`;
        }
    }

    // 4. 9대 스탯 보드 정보 구성 (기본 수치 + 초록색 유물 가산치 분할 렌더링)
    const statSpecs = [
        { label: "HP", icon: "IconMaxHP.png", base: unit.base_stats.hp, add: unit.base_added_stats.hp, isPercent: false },
        { label: "공격력", icon: "IconAttack.png", base: unit.base_stats.atk, add: unit.base_added_stats.atk, isPercent: false },
        { label: "방어력", icon: "IconDefence.png", base: unit.base_stats.def, add: unit.base_added_stats.def, isPercent: false },
        { label: "속도", icon: "IconSpeed.png", base: unit.base_stats.spd, add: unit.base_added_stats.spd, isPercent: false },
        { label: "치명타 확률", icon: "IconCriticalChance.png", base: unit.base_stats.cr, add: unit.base_added_stats.cr, isPercent: true },
        { label: "치명타 피해", icon: "IconCriticalDamage.png", base: unit.base_stats.cd, add: unit.base_added_stats.cd, isPercent: true },
        { label: "효과 명중", icon: "IconStatusProbability.png", base: unit.base_stats.ehr, add: unit.base_added_stats.ehr, isPercent: true },
        { label: "효과 저항", icon: "IconStatusResistance.png", base: unit.base_stats.eres, add: unit.base_added_stats.eres, isPercent: true },
        { label: "격파 특수효과", icon: "IconBreakUp.png", base: unit.base_stats.be, add: unit.base_added_stats.be, isPercent: true },
        { label: "치유랑 증가", icon: "IconHealRatio.png", base: unit.base_stats.heal_ratio, add: unit.base_added_stats.heal_ratio, isPercent: true },
        { label: "에너지 회복 효율", icon: "IconEnergyRecovery.png", base: unit.base_stats.err, add: unit.base_added_stats.err, isPercent: true },
        { label: `${curElement} 피해 증가`, icon: `Icon${curElement}AddedRatio.png`, base: unit.base_stats.dmg_boost[curElement], add: unit.base_added_stats.dmg_boost[curElement], isPercent: true }
    ];

    if(unit.path === "Elation") {
        statSpecs.push({label: "환락도", icon: "IconJoy.png", base: unit.base_stats.elation, add: unit.base_added_stats.elation, isPercent: true})
    }

    const gridContainer = document.getElementById('detail-stats-grid');
    gridContainer.innerHTML = '';
    
    statSpecs.forEach((s, sIdx) => {
        // 데이터 가공 수치 미리 계산
        let baseStr = "";
        let addStr = "";
        let totalStr = "";

        if (s.isPercent) {
            // 💡 퍼센트 스탯: 소수점 둘째 자리까지 내림 (버림) 처리 후 % 부착
            baseStr = (Math.floor(s.base * 10000) / 100).toFixed(2) + "%";
            addStr = s.add > 0 ? "+" + (Math.floor(s.add * 10000) / 100).toFixed(2) + "%" : "";
            totalStr = (Math.floor((s.base + s.add) * 10000) / 100).toFixed(2) + "%";
        } else {
            // 💡 일반 스탯 (속도 등): 소수점 둘째 자리까지 내림 처리 후 천 단위 쉼표 표기
            const baseVal = Math.floor(s.base * 100) / 100;
            const addVal = Math.floor(s.add * 100) / 100;
            const totalVal = Math.floor((s.base + s.add) * 100) / 100;

            // .toLocaleString() 옵션을 주어 무조건 소수점 둘째 자리까지 고정 출력 및 콤마 표기
            baseStr = baseVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            addStr = s.add > 0 ? "+" + addVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
            totalStr = totalVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
                
                <div class="stat-value-container" style="white-space: nowrap; font-size: 13px; font-weight: bold; text-align: right;">
                    <span style="color: #ffffff;">${totalStr}</span>
                </div>
            </div>`;
    });

    const eidolonList = document.getElementById('detail-eidolon-list');
    if (eidolonList) {
        eidolonList.innerHTML = '';
        const currentEidolon = state.eidolons[idx] || 0; // 저장된 해당 캐릭터의 성혼 레벨
        const unitId = window.PRESET_UNITS[idx].unit_id; // 캐릭터 ID

        for (let i = 1; i <= 6; i++) {
            const div = document.createElement('div');
            
            // 💡 기존 세팅 모달에서 쓰던 클래스 재활용 (회색 처리 / 활성화 색상 자동 적용)
            div.className = `eidolon-item ${i <= currentEidolon ? 'active' : ''}`;
            div.style.backgroundImage = `url('./imgs/eidolons/${unitId}/${unitId}_Rank_${i}.png')`;
            
            // 💡 뷰어 전용 스타일 오버라이드 (클릭 금지 및 마우스 호버 크기 확장 방지)
            div.style.cursor = 'default';
            div.style.pointerEvents = 'none'; // 호버 이벤트(transform) 완벽 차단
            div.style.width = '36px'; // 박스에 맞게 크기 살짝 축소
            div.style.height = '36px';

            eidolonList.appendChild(div);
        }
    }

    document.getElementById('detail-modal').style.display = 'flex';
    const scrollBox = document.getElementById('detail-modal-scroll');
    if (scrollBox) {
        scrollBox.scrollTop = 0;
    }
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
