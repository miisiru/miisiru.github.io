import { currentLcIdx, tempLcData  } from './lc-modal.js';
import { currentRelicIdx, tempRelicData } from './relic-modal.js'
import { state, recalculate, render } from './script.js';
import { PRESET_UNITS, availableCharacters } from './char.js';
import { Unit } from './character.js'

const spdDiv = document.getElementById('spd-inputs');

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
                    <button type="button" class="ui-icon-btn" style="border-color: ${lcBorder}; display: flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 4px; border: 1px solid ${lcBorder}; background: transparent; cursor: pointer;" title="광추 설정" onclick="window.openLightConeModal(${i}, window.PRESET_UNITS[${i}].name)">
                        <img src="./imgs/site_ui/lc_icon.png" style="width: 12px; height: 12px; object-fit: contain;">
                        <span class="lc-selected-name" id="lc-label-${i}" style="color: ${lcColor}; font-size: 11px; white-space: nowrap;">${lcText}</span>
                    </button>

                    <button type="button" class="ui-icon-btn" style="border-color: ${relicBorder}; display: flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 4px; border: 1px solid ${relicBorder}; background: transparent; cursor: pointer;" title="유물 관리" onclick="window.openRelicModal(${i}, window.PRESET_UNITS[${i}].name)">
                        <img src="./imgs/site_ui/relic_icon.png" style="width: 12px; height: 12px; object-fit: contain;">
                        <span class="lc-selected-name" id="relic-label-${i}" style="color: ${relicColor}; font-size: 11px; white-space: nowrap;">${relicText}</span>
                    </button>
                </div>
                
            </div>
            <div style="display: flex; gap: 4px; width: 100%; margin-top: auto;">
                <button type="button" class="main-btn" style="flex: 8; margin: 0; padding: 5px; font-size: 11px; font-weight: bold; background: #1e293b; border: 1px solid #475569;" onclick="window.openDetailModal(${i}, window.PRESET_UNITS[${i}].name)">자세히 보기</button>
                <button type="button" class="main-btn shadow-gear" style="flex: 2; margin: 0; padding: 5px; font-size: 11px; font-weight: bold; background: #1e293b; border: 1px solid #475569; display: flex; align-items: center; justify-content: center;" title="캐릭터 상세 설정" onclick="window.openSettingsModal(${i})">⚙️ 설정</button>
            </div>
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

    // ================= [유물 모달 닫기 & 저장 이벤트 고도화] =================
    const relicModal = document.getElementById('relic-modal');
    const closeRelicBtnTop = document.getElementById('close-relic-btn-top');
    const saveRelicBtnTop = document.getElementById('save-relic-btn-top');

    const closeRelicModal = () => {
        if (relicModal) relicModal.style.display = 'none';
    };

    // 1. 우측 상단 X 버튼 클릭 시 닫기 (저장 안 함)
    if (closeRelicBtnTop) {
        closeRelicBtnTop.addEventListener('click', closeRelicModal);
    }

    // 2. 💡 모달 바깥쪽(어두운 배경) 클릭 시 닫기 (저장 안 함)
    if (relicModal) {
        relicModal.addEventListener('click', (e) => {
            if (e.target === relicModal) {
                closeRelicModal();
            }
        });
    }

    // 3. 상단 저장 버튼 클릭 시 저장 후 닫기
    if (saveRelicBtnTop) {
        saveRelicBtnTop.addEventListener('click', () => {
            state.selectedRelics[currentRelicIdx] = JSON.parse(JSON.stringify(tempRelicData));
            closeRelicModal();
            
            const label = document.getElementById(`relic-label-${currentRelicIdx}`);
            const btn = label ? label.parentElement : null;
            if (label && btn) {
                const mainLen = tempRelicData.main.length;
                const subRolls = tempRelicData.sub.reduce((acc, cur) => acc + cur.count, 0);
                const sets = tempRelicData.sets || { outer2: "", outer4: "", planar2: "" };
                const hasSet = sets.outer2 || sets.outer4 || sets.planar2;
                
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
            
            console.log(`[유물+세트 저장 완료] 인덱스 ${currentRelicIdx}:`, state.selectedRelics[currentRelicIdx]);
        });
    }

    // ================= [광추 모달 닫기 & 저장 이벤트 고도화] =================
    const lcModal = document.getElementById('lc-modal');
    const closeLcBtnTop = document.getElementById('close-lc-btn-top');
    const saveLcBtnTop = document.getElementById('save-lc-btn-top');

    const closeLcModal = () => {
        if (lcModal) lcModal.style.display = 'none';
    };

    // 1. 우측 상단 X 버튼 클릭 시 닫기
    if (closeLcBtnTop) closeLcBtnTop.addEventListener('click', closeLcModal);

    // 2. 모달 바깥(어두운 배경) 클릭 시 닫기
    if (lcModal) {
        lcModal.addEventListener('click', (e) => {
            if (e.target === lcModal) closeLcModal();
        });
    }

    // 3. 저장 버튼 클릭 시 로직
    if (saveLcBtnTop) {
        saveLcBtnTop.addEventListener('click', () => {
            // 기존 ID 스트링과의 하위 호환성을 완벽히 준수하며 원본 스토리지 기록
            state.selectedLightCones[currentLcIdx] = tempLcData.id || null;
            
            // 확장 스펙 필드 동기화 귀속
            state.lightConeDetails[currentLcIdx] = {
                level: tempLcData.level,
                superimposition: tempLcData.superimposition
            };

            closeLcModal();

            // 왼쪽 사이드바 패널 버튼들의 장착 상태 컬러 실시간 변환 피드백 처리
            const label = document.getElementById(`lc-label-${currentLcIdx}`);
            const btn = label ? label.parentElement : null;
            if (label && btn) {
                if (tempLcData.id) {
                    label.textContent = "선택됨";
                    label.style.color = "var(--success)";
                    btn.style.borderColor = "var(--success)";
                } else {
                    label.textContent = "광추 선택";
                    label.style.color = "var(--gold)";
                    btn.style.borderColor = "#475569";
                }
            }

            console.log(`[광추 저장 완료] 인덱스 ${currentLcIdx}:`, state.lightConeDetails[currentLcIdx]);
        });
    }

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

let tempEidolon = 0;
let tempRotationData = { initial: [], repeat: ['B'] };

window.openSettingsModal = function(idx) {
    state.settingsTargetIdx = idx; // 💡 핵심: 현재 조작 중인 캐릭터 인덱스 저장!

    const unitDef = window.PRESET_UNITS[idx];
    document.getElementById('settings-modal-title').textContent = `${unitDef.name} 상세 설정`;
    
    // 💡 기존에 저장된 값이 있으면 불러오고, 없으면 0/빈칸 처리
    tempEidolon = state.eidolons[idx] || 0; 
    document.getElementById('setting-spd-input').value = state.customSpds[idx] || "";
    document.getElementById('setting-technique-checkbox').checked = state.techniques[idx] || true;
    
    // 💡 [추가] 원본 로테이션 데이터를 깊은 복사하여 임시 데이터로 가져옴
    tempRotationData = JSON.parse(JSON.stringify(state.rotations[idx] || { initial: [], repeat: ['B'] }));
    
    renderEidolons(unitDef.unit_id);
    window.renderRotationUI(); // 💡 [추가] 로테이션 뱃지 그리기

    document.getElementById('char-settings-modal').style.display = 'flex';
};

function renderEidolons(unitId) {
    const container = document.getElementById('eidolon-container');
    container.innerHTML = '';
    
    for (let i = 1; i <= 6; i++) {
        const div = document.createElement('div');
        div.className = `eidolon-item ${i <= tempEidolon ? 'active' : ''}`;
        div.style.backgroundImage = `url('./imgs/eidolons/${unitId}/${unitId}_Rank_${i}.png')`;
        
        div.onclick = () => {
            // 성혼 연쇄 토글 로직
            if (i <= tempEidolon) {
                tempEidolon = i - 1; // 활성화된 걸 누르면 그 뒷단계까지 해제
            } else {
                tempEidolon = i;     // 비활성화된 걸 누르면 앞단계까지 연쇄 활성화
            }
            renderEidolons(unitId);
        };
        container.appendChild(div);
    }
}

// 닫기(바깥 배경 및 X 버튼) 및 상단 저장 버튼 UI 인터랙션 리스너 위임
setTimeout(() => {
    const settingsModal = document.getElementById('char-settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings-btn-top');
    const saveSettingsBtn = document.getElementById('save-settings-btn-top'); // 상단 저장 스위치
    
    const closeSettings = () => { if (settingsModal) settingsModal.style.display = 'none'; };
    
    if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', closeSettings);
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', (e) => {
            e.preventDefault(); // 💡 혹시 모를 브라우저 폼 제출 등 기본 동작 차단

            const idx = state.settingsTargetIdx;
            if (idx === null || idx === undefined) return; // 이제 정상 통과됩니다!

            // 1. 입력창의 속도 값을 읽어와서 state 장부에 기록 (비어있으면 null)
            const spdValue = document.getElementById('setting-spd-input').value.trim();
            state.customSpds[idx] = spdValue !== "" ? parseFloat(spdValue) : null;

            // 2. 모달에서 조작하던 임시 성혼 값을 state 장부에 기록
            state.eidolons[idx] = tempEidolon;
            state.rotations[idx] = JSON.parse(JSON.stringify(tempRotationData));
            state.techniques[idx] = document.getElementById('setting-technique-checkbox').checked;
            // 3. 데이터 커밋이 끝났으므로 모달 창 닫기
            closeSettings();
            
            console.log(`[캐릭터 설정 저장 완료] 인덱스 ${idx} -> 속도고정: ${state.customSpds[idx]}, 성혼: ${state.eidolons[idx]}돌`);
        });
    }
    if (settingsModal) settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) closeSettings();
    });
}, 100);

// 💡 [추가] 현재 tempRotationData를 바탕으로 화면에 태그(뱃지)를 그려주는 함수
window.renderRotationUI = function() {
    ['initial', 'repeat'].forEach(type => {
        const container = document.getElementById(`settings-seq-${type}`);
        if (!container) return;
        
        container.innerHTML = '';
        tempRotationData[type].forEach((act, arrIdx) => {
            const badge = document.createElement('div');
            // 전스는 파란색, 평타는 회색 스타일 적용
            badge.style.cssText = `padding: 2px 6px; font-size: 11px; border-radius: 3px; font-weight: bold; cursor: pointer; transition: 0.2s; 
                ${act === 'S' ? 'color: #bae6fd; background: rgba(2, 132, 199, 0.4); border: 1px solid #0284c7;' 
                              : 'color: #cbd5e1; background: #334155; border: 1px solid #475569;'}`;
            badge.textContent = act === 'S' ? '전스' : '평타';
            badge.title = "클릭하여 삭제";
            
            // 태그 클릭 시 해당 항목 삭제
            badge.onclick = () => {
                tempRotationData[type].splice(arrIdx, 1);
                window.renderRotationUI();
            };
            container.appendChild(badge);
        });
    });
};

// 💡 [추가] 버튼 클릭 시 임시 배열에 'S' 또는 'B' 푸시
window.addTempRotation = function(type, action) {
    tempRotationData[type].push(action);
    window.renderRotationUI();
};

// 💡 [추가] C(Clear) 버튼 클릭 시 임시 배열 싹 비우기
window.clearTempRotation = function(type) {
    tempRotationData[type] = [];
    window.renderRotationUI();
};

window.openBuffModal = function(unitId) {
    const overlay = document.getElementById('buff-modal-overlay');
    const body = document.getElementById('buff-modal-body');
    if (!overlay || !body) return;

    let buffs = [];

    // 💡 버튼에서 인수를 여러 개 넘길 필요 없이, 글로벌 state에서 현재 선택된 카드와 페이즈를 직접 읽어옵니다!
    const currentIdx = state.selectedIdx;
    const currentPhase = state.selectedPhase || 1;

    if (currentIdx !== null && state.timeline[currentIdx]) {
        const action = state.timeline[currentIdx];
        
        // 💡 핵심: 스냅샷 데이터를 가져올 때, 원본 참조가 꼬이지 않게 완전히 분리된 복사본을 가져옵니다.
        if (action.phaseEnterStates && action.phaseEnterStates[currentPhase] && action.phaseEnterStates[currentPhase].buffs) {
            buffs = JSON.parse(JSON.stringify(action.phaseEnterStates[currentPhase].buffs));
        } else {
            // 스냅샷이 없다면 라이브 데이터를 참조
            const unit = state.unitData.find(u => String(u.unit_id) === String(unitId));
            if (unit && unit.modifiers) {
                buffs = JSON.parse(JSON.stringify(unit.modifiers.list));
            }
        }
    }

    // 버프가 하나도 없을 때의 렌더링
    if (buffs.length === 0) {
        body.innerHTML = `<div style="text-align: center; color: #94a3b8; padding: 30px 10px; font-size: 14px;">현재 적용된 버프/디버프가 없습니다.</div>`;
    } else {
        // 실제 버프 데이터 순회하며 HTML 조립
        let html = '';
        buffs.forEach(buff => {
            const isDebuff = buff.type === 'DEBUFF';
            const borderColor = isDebuff ? '#ef4444' : '#34d399'; // 디버프는 빨강, 버프는 초록
            const titleColor = isDebuff ? '#ef4444' : '#34d399';
            
            // 남은 턴 수 표기 방어 로직
            const durationText = (buff.duration === Infinity || buff.duration === undefined) ? '무한 지속' : `${buff.duration}턴 남음`;

            // 설명이 명시되어 있지 않으면 스탯 증감치라도 보여주도록 임시 텍스트 생성
            let descText = buff.desc || "";
            if (!descText && buff.stats) {
                descText = Object.entries(buff.stats).map(([k, v]) => `${k}: ${v}`).join(', ');
            }
            if (!descText) descText = '특수 상태 부여 효과입니다.';

            html += `
            <div style="background: rgba(30, 41, 59, 0.7); border-left: 3px solid ${borderColor}; border-radius: 4px; padding: 12px; margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                    <span style="font-weight: bold; color: ${titleColor}; font-size: 14px;">[${buff.name || buff.id}]</span>
                    <span style="font-size: 12px; color: #94a3b8;">⏳ ${durationText}</span>
                </div>
                <div style="font-size: 12px; color: #cbd5e1; line-height: 1.5;">
                    ${descText}
                </div>
            </div>
            `;
        });
        body.innerHTML = html;
    }

    // 모달 띄우기
    overlay.style.display = 'flex';
};

window.closeBuffModal = function() {
    const overlay = document.getElementById('buff-modal-overlay');
    if (overlay) overlay.style.display = 'none';
};
// ==========================================
// 💾 Save & Load 시스템 (로컬 스토리지 연동)
// ==========================================

// 저장된 목록 가져오기
function getSavedSimulations() {
    return JSON.parse(localStorage.getItem('hsr_sim_saves') || '{}');
}

// Select 박스 목록 갱신
window.updateSaveSelect = function() {
    const saves = getSavedSimulations();
    const select = document.getElementById('save-slot-select');
    if (!select) return;
    
    select.innerHTML = '<option value="">저장된 사이클 선택...</option>';
    Object.keys(saves).forEach(saveName => {
        const opt = document.createElement('option');
        opt.value = saveName;
        opt.textContent = saveName;
        select.appendChild(opt);
    });
};

// 📊 저장 버튼 클릭 시: 모달 열기 및 데미지 리포트 렌더링
window.openSaveModal = function() {
    // 1. 최신 상태 반영을 위해 엔진 한 번 돌리기
    recalculate();

    const report = state.damageReport || { total: 0, byCharacter: {} };
    const container = document.getElementById('damage-report-container');
    
    let html = `<div style="text-align: center; margin-bottom: 12px;">
                    <div style="font-size: 12px; color: #94a3b8;">총 가한 피해량</div>
                    <div style="font-size: 24px; font-weight: bold; color: #fbbf24; text-shadow: 0 0 10px rgba(251,191,36,0.3);">
                        ${report.total.toLocaleString()}
                    </div>
                </div>`;
    
    // 캐릭터별 딜량 퍼센테이지 바 생성
    Object.entries(report.byCharacter).sort((a, b) => b[1] - a[1]).forEach(([name, dmg]) => {
        const pct = report.total > 0 ? ((dmg / report.total) * 100).toFixed(1) : 0;
        html += `
        <div style="margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; font-size: 12px; color: #cbd5e1; margin-bottom: 4px;">
                <span>${name}</span>
                <span>${dmg.toLocaleString()} (${pct}%)</span>
            </div>
            <div style="width: 100%; background: #334155; border-radius: 4px; height: 6px; overflow: hidden;">
                <div style="width: ${pct}%; height: 100%; background: #3b82f6;"></div>
            </div>
        </div>`;
    });

    if (report.total === 0) {
        html += `<div style="text-align:center; color:#94a3b8; font-size:12px;">이번 사이클에 가한 피해가 없습니다.</div>`;
    }

    container.innerHTML = html;
    document.getElementById('save-modal-overlay').style.display = 'flex';
};

// 💾 실제 저장 실행
window.executeSaveSimulation = function() {
    const saveName = document.getElementById('save-name-input').value.trim();
    if (!saveName) return alert('저장할 이름을 입력해주세요!');

    const saves = getSavedSimulations();
    
    // 🎯 [순환 참조 완벽 방어] 이미 방문한 객체인지 기록하여 루프 탈출
    const getCircularReplacer = () => {
        const seen = new WeakSet();
        return (key, value) => {
            if (typeof value === "object" && value !== null) {
                if (seen.has(value)) return undefined; 
                seen.add(value);
            }
            return value;
        };
    };

    const saveData = {
        timestamp: new Date().toISOString(),
        totalDamage: state.damageReport ? state.damageReport.total : 0,
        unitData: JSON.parse(JSON.stringify(state.unitData, getCircularReplacer())),
        actionPlans: JSON.parse(JSON.stringify(state.actionPlans, getCircularReplacer())),
        actionTargets: JSON.parse(JSON.stringify(state.actionTargets, getCircularReplacer())),
        insertedEvents: JSON.parse(JSON.stringify(state.insertedEvents, getCircularReplacer()))
    };

    saves[saveName] = saveData;
    localStorage.setItem('hsr_sim_saves', JSON.stringify(saves));
    
    updateSaveSelect();
    document.getElementById('save-modal-overlay').style.display = 'none';
    alert(`[${saveName}] 사이클이 성공적으로 저장되었습니다!`);
};

// 📂 불러오기 실행
window.loadSimulation = function() {
    const saveName = document.getElementById('save-slot-select').value;
    if (!saveName) return alert('불러올 사이클을 선택해주세요.');

    const saves = getSavedSimulations();
    const data = saves[saveName];
    if (!data) return alert('데이터를 찾을 수 없습니다.');

    if (!confirm(`[${saveName}] 사이클을 불러오시겠습니까?\n현재 작업 중인 내용은 덮어씌워집니다.`)) return;

    // 덮어씌우기 전에 현재 메모리에 살아있는(함수가 멀쩡한) 유닛 원본 백업
    const originalUnits = state.unitData; 

    state.unitData = data.unitData.map(obj => {
        // 1. 원본 유닛을 찾아서 뼈대(Unit인지 Enemy인지)를 정확하게 가져옵니다.
        const original = originalUnits.find(u => String(u.unit_id) === String(obj.unit_id));
        let restoredUnit;
        if (original) {
            restoredUnit = Object.create(Object.getPrototypeOf(original));
        } else {
            // 혹시 원본이 날아갔을 경우를 대비한 안전망
            restoredUnit = Object.create(Unit.prototype); 
        }
        
        // 2. 🎯 [Getter 충돌 방지 로직] 스마트하게 속성만 골라내서 복사합니다.
        for (let key in obj) {
            if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
            
            // 프로토타입 체인을 타고 올라가며 Getter/Setter 여부를 철저하게 검사합니다.
            let isAccessor = false;
            let proto = Object.getPrototypeOf(restoredUnit);
            while (proto) {
                let desc = Object.getOwnPropertyDescriptor(proto, key);
                if (desc && (desc.get || desc.set)) {
                    isAccessor = true;
                    break;
                }
                proto = Object.getPrototypeOf(proto);
            }
            
            // Getter가 아니라 순수 데이터일 때만 값을 덮어씌웁니다! (max_hp 등 충돌 방지)
            if (!isAccessor) {
                restoredUnit[key] = obj[key];
            }
        }
        
        // 3. JSON으로 저장하면서 끊어졌던 순환 참조 및 날아간 함수(kit) 복구
        if (original) {
            if (original.kit) restoredUnit.kit = original.kit;
            if (original.listeners) restoredUnit.listeners = original.listeners;
        }

        // 💡 ModifierManager도 객체이므로 안의 unit 속성을 다시 자신과 연결해 줍니다.
        if (restoredUnit.modifiers && typeof restoredUnit.modifiers === 'object') {
            restoredUnit.modifiers.unit = restoredUnit;
        }
        
        return restoredUnit;
    });
    
    state.actionPlans = data.actionPlans || {};
    state.actionTargets = data.actionTargets || {};
    state.insertedEvents = data.insertedEvents || [];
    
    state.selectedIdx = null;
    
    recalculate();
    render();
    alert('불러오기 완료!');
};

// 🗑️ 삭제 실행
window.deleteSimulation = function() {
    const saveName = document.getElementById('save-slot-select').value;
    if (!saveName) return alert('삭제할 사이클을 선택해주세요.');
    
    if (!confirm(`정말 [${saveName}] 사이클을 삭제하시겠습니까?`)) return;

    const saves = getSavedSimulations();
    delete saves[saveName];
    localStorage.setItem('hsr_sim_saves', JSON.stringify(saves));
    
    updateSaveSelect();
    alert('삭제되었습니다.');
};

// 페이지 로드 시 목록 초기화
document.addEventListener('DOMContentLoaded', () => {
    updateSaveSelect();
});