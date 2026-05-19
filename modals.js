import { currentLcIdx, tempLcData  } from './lc-modal.js';
import { currentRelicIdx, tempRelicData } from './relic-modal.js'

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
            
            if (typeof resetSimulation === 'function') {
                resetSimulation();
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

            // 시뮬레이터 연산 엔진 전면 즉시 재시동 트리거
            if (typeof resetSimulation === 'function') {
                resetSimulation();
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
