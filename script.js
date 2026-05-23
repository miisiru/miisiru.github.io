import { fetchStarRailData, EventHook, EventListener, SkillPointManager, chargeUnitEnergy, Modifier, ModifierManager, resolveTargets } from './config.js';
import { PRESET_UNITS, availableCharacters } from './char.js';
import { gameData, subStatData, mainStatData } from './config.js';
import { LightCone } from './lc.js'
import { Unit } from './character.js'
import * as Relics from './relics/index.js';
import * as Enemies from './enemies/index.js';

function getRelicAbilities(relicsData) {
    if (!relicsData || !relicsData.sets) return [];
    
    let listeners = [];
    
    // 🎯 깔끔해진 딕셔너리 매핑
    const idMap = {
        '317_planar2': Relics.planar317,
        '121_outer4': Relics.relic121
    };

    const setTypes = ['outer2', 'outer4', 'planar2'];
    const isMixedSet = relicsData.sets.outer2 !== relicsData.sets.outer4;

    setTypes.forEach(type => {
        const targetTypeKey = (type === 'outer4' && isMixedSet) ? 'outer2' : type;
        const setId = String(relicsData.sets[targetTypeKey]);
        
        if (setId && setId !== '0' && setId !== 'undefined') {
            const key = `${setId}_${type}`;
            
            if (idMap[key]) {
                // 배열 형태이므로 스프레드 연산자(...)로 풀어 넣기
                listeners.push(...idMap[key]);
            }
        }
    });

    return listeners;
}

window.PRESET_UNITS = PRESET_UNITS;

export let state = { 
    unitData: [],      
    actionPlans: {},   
    actionTargets: {},
    timeline: [],      
    selectedIdx: null, 
    selectedPhase: null,
    selectedLightCones: PRESET_UNITS.map(u => u.lightcone ? u.lightcone.id : null),
    selectedRelics: PRESET_UNITS.map(u => u.relics ? JSON.parse(JSON.stringify(u.relics)) : { main: [], sub: [] }),
    insertedEvents: [],
    selectedSubEventId: null,
    customSpds: PRESET_UNITS.map(() => null),
    eidolons: PRESET_UNITS.map(() => 0),
    rotations: PRESET_UNITS.map(u => u.rotation ? u.rotation : { initial: [], repeat: ['B'] }),
    techniques: PRESET_UNITS.map(() => true)
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
        const assignedCustomSpds = state.customSpds[i]
        const assignedEidolon = state.eidolons[i]
        
        const u = new Unit({
            unit_id: p.unit_id,
            kit: p.kit,
            lightcone: new LightCone(assignedLcId),
            relics: assignedRelics,
            eidolon: assignedEidolon,
            spd: assignedCustomSpds ?? undefined
        });

        u.registerListener(new EventListener({
            id: "system_initial_energy",
            name: "Set Battlestart Energy",
            hook: EventHook.PREP,
            priority: -100, // 가장 먼저 정산되도록 낮은 우선순위 부여
            effect: (context) => {
                context.caster.energy = context.caster.max_energy * 0.5;
                context.log(`초기 에너지 50% 세팅 (${context.caster.energy.toFixed(2)})`);
            }
        }));

        if (p.listeners && Array.isArray(p.listeners)) {
            p.listeners.forEach(l => u.registerListener(l));
        }

        if (state.techniques[i] && p.kit.technique) {
            u.registerListener(p.kit.technique);
        }

        if (p.lightcone && Array.isArray(p.lightcone.ability)) {
            p.lightcone.ability.forEach(l => u.registerListener(l));
        }

        if (assignedRelics) {
            const relicListeners = getRelicAbilities(assignedRelics);
            relicListeners.forEach(l => u.registerListener(l));
        }

        let plan = [...state.rotations[i].initial];
        let repeatSeq = [...state.rotations[i].repeat];
        
        if (repeatSeq.length === 0) repeatSeq = ['B']; // 무한루프 방지용 안전가드
        
        while (plan.length < 100) {
            plan.push(...repeatSeq);
        }
        state.actionPlans[u.unit_id] = plan.slice(0, 100);

        state.actionTargets[u.unit_id] = new Array(100).fill(null);
        
        return u;
    });

    if (!state.unitData.find(u => u.unit_id === 1004020)) {
        let enemyObj = Enemies.enemy1004020;
        state.unitData.push(enemyObj);
        
        // 💡 적군은 사용자 UI 장부가 필요 없지만, 렌더링 엔진이 뻗지 않도록 껍데기 배열을 채워줍니다.
        state.actionPlans[enemyObj.unit_id] = new Array(100).fill("BASIC");
        state.actionTargets[enemyObj.unit_id] = new Array(100).fill(null);
    }

    state.timeline = [];

    state.insertedEvents = []; 
    state.selectedSubEventId = null;

    recalculate();
}

function recalculate() {
    const limit = parseFloat(document.getElementById('limit-av').value) || 1000;
    const spManager = new SkillPointManager(3, 5, 0);
    let newTimeline = [];
    let currentEvent = null;

    let queueGlobalCounter = 0;
    let currentWave = 1;
    
    // 1. 시뮬레이션용 유닛 초기화 (원본 데이터 보호)
    let simUnits = state.unitData.map((u, i) => {
        let nu = Object.assign(Object.create(Object.getPrototypeOf(u)), u)
        nu.energy = 0; 
        nu.turnCount = 0; 
        nu.partyIndex = i;        
        nu.lastAdvancedAV = -1;   
        nu.current_action_value = nu.base_action_value; 
        nu.modifiers = new ModifierManager(nu);
        return nu;
    });

    // 💡 2. 타임라인 이벤트 큐 생성 (사용자님 아이디어 적용!)
    // 이제 엔진은 캐릭터가 아니라 '이벤트 큐'를 중심으로 돌아갑니다.
    let eventQueue = [];

    eventQueue.push({ eventType: 'GLOBAL_PREP', av: 0, title: '전투 준비', partyIndex: -5, queueId: queueGlobalCounter++ });
    eventQueue.push({ eventType: 'GLOBAL_SETTING', av: 0, title: '전투 세팅', partyIndex: -4, queueId: queueGlobalCounter++ });
    eventQueue.push({ eventType: 'GLOBAL_ENTER', av: 0, title: '전투 진입', partyIndex: -3, queueId: queueGlobalCounter++ });
    eventQueue.push({ eventType: 'GLOBAL_START', av: 0, title: '전투 시작', partyIndex: -2, queueId: queueGlobalCounter++ });
    eventQueue.push({ eventType: 'GLOBAL_WAVE_START', av: 0, title: '웨이브 시작', partyIndex: -1, queueId: queueGlobalCounter++ });

    // 최초의 정규 턴들을 큐에 장전
    simUnits.forEach(u => {
        eventQueue.push({
            eventType: 'TURN',
            av: u.current_action_value,
            unitId: u.unit_id,
            turnCount: 0,
            lastAdvancedAV: u.lastAdvancedAV,
            partyIndex: u.partyIndex,
            queueId: queueGlobalCounter++ // 💡 먼저 들어온 슬롯이 앞 순번을 가짐
        });
    });

    const broadcastEvent = (hook, baseContext) => {
        let activeListeners = [];
        simUnits.forEach(unit => {
            if (!unit.listeners) return;
            unit.listeners.filter(l => l.hook === hook).forEach(l => {
                activeListeners.push({ listener: l, caster: unit });
            });
        });

        // Priority 오름차순 정렬 (숫자가 낮을수록 먼저 발동)
        activeListeners.sort((a, b) => a.listener.priority - b.listener.priority);
        
        activeListeners.forEach(item => {
            let context = { 
                ...baseContext, 
                caster: item.caster,
                // 💡 [핵심] 리스너가 context.log()를 호출하면, 현재 장부에 "누가 무엇을 했는지" 기록됩니다.
                log: (msg) => {
                    if (baseContext.targetLogsArray) {
                        baseContext.targetLogsArray.push({ sourceName: item.listener.name, message: msg });
                    }
                }
            };
            item.listener.execute(context);
        });
    };

    // 💡 [추가] 리스너가 엔진의 상태(특히 SP)를 직접 조작할 수 있도록 묶어주는 Context 객체
    // 💡 [추가] 리스너가 엔진의 상태를 조작하는 Context 객체
    const createContext = (actingUnit, logsArray, extras = {}) => {
        let baseContext = {
            get sp() { return spManager.current; }, 
            set sp(val) { spManager.current = Math.min(spManager.max, Math.max(spManager.min, val)); }, 
            spManager: spManager, 
            
            chargeEnergy: (target, baseAmt, reason, applyErr = true) => chargeUnitEnergy(target, baseAmt, reason, baseContext, applyErr),
            
            addModifier: (targetId, config) => {
                const target = simUnits.find(u => u.unit_id === targetId);
                if (target) {
                    target.modifiers.add(config, baseContext.targetLogsArray);
                }
            },

            // ✨ [아키텍처 확장] 행게 조작을 엔진이 직접 통제하는 전용 API
            advanceActionGauge: (targetId, percent, sourceName) => {
                const target = simUnits.find(u => u.unit_id === targetId);
                if (!target) return;

                let originalAV = target.current_action_value; 
                
                target.adjust_action_guage(percent / 100, 0, currentEvent.av);
                target.lastAdvancedAV = currentEvent.av;
                
                // 🔥 [핵심]: 대기열에 있든 무대(현재 턴)에 있든, '당겨지기 직전 AV'를 기반으로 한 우선순위 번호표를 몸에 새깁니다!
                target.tempQueueId = currentEvent.queueId + (originalAV / 10000);

                const targetEvent = eventQueue.find(e => e.eventType === 'TURN' && e.unitId === targetId);
                if (targetEvent) {
                    targetEvent.av = target.current_action_value;
                    targetEvent.lastAdvancedAV = target.lastAdvancedAV;
                    targetEvent.queueId = target.tempQueueId; // 대기열에 있다면 즉시 번호표 교체
                }

                baseContext.log(`[${target.name}] 행동 게이지 ${percent}% 증가`, sourceName);
            },

            heal: (targetIdOrObj, baseAmt, sourceName) => {
                // 1. 타겟 객체 확보 (ID 문자열이 들어오든, 객체 자체가 들어오든 유연하게 처리)
                let target = typeof targetIdOrObj === 'object' ? targetIdOrObj : simUnits.find(u => String(u.unit_id) === String(targetIdOrObj));
                if (!target) return;

                // (안전 장치) 캐릭터 초기화 시 HP가 설정되지 않았을 경우를 대비한 기본값
                if (typeof target.max_hp === 'undefined') target.max_hp = 3000;
                if (typeof target.current_hp === 'undefined') target.current_hp = target.max_hp;

                let oldHp = target.current_hp;
                
                // 💡 확장 포인트: 나중에 HEAL_START 이벤트를 구현하면 여기서 '치유량 보너스' 합산 가능
                let finalHealAmt = baseAmt; 

                // 2. 실제 체력 회복 (최대 체력 초과 방지)
                target.current_hp = Math.min(target.max_hp, oldHp + finalHealAmt);
                let actualHeal = target.current_hp - oldHp;

                // 3. 엔진 장부에 로그 기록
                baseContext.log(`[${target.name}] HP ${finalHealAmt.toFixed(1)} 회복 (현재: ${target.current_hp.toFixed(1)}/${target.max_hp.toFixed(1)})`, sourceName);

                // 4. 🎬 힐 완료 이벤트 방송 (곽향 추가 능력 3 등 트리거)
                // 힐러, 힐 대상, 힐 출처 등의 정보를 담은 새로운 전용 컨텍스트를 만들어 방송합니다.
                let healContext = {
                    ...baseContext,
                    healTarget: target,
                    healAmount: actualHeal,
                    healSource: sourceName
                };
                broadcastEvent(EventHook.HEAL_DONE, healContext);
            },

            simUnits: simUnits,
            eventQueue: eventQueue,
            actingUnit: actingUnit, 
            currentEvent: currentEvent,
            targetLogsArray: logsArray,
            waveCount: currentWave,
            ...extras
        };

        baseContext.log = (msg, sourceName = "행동") => {
            if (baseContext.targetLogsArray) {
                baseContext.targetLogsArray.push({ sourceName: sourceName, message: msg });
            }
        };

        return baseContext;
    };
    // 3. 메인 시뮬레이션 루프 (큐에 이벤트가 있는 동안 무한 반복)
    while (eventQueue.length > 0) {
        
        // [정렬] 큐에 있는 모든 이벤트들을 AV(시간) 순서대로 정렬
        eventQueue.sort((a, b) => {
            if (Math.abs(a.av - b.av) > 1e-9) return a.av - b.av;
            
            // 행게증/행게감 조작이 직접 개입한 특수 우선권 비교
            if (a.lastAdvancedAV !== b.lastAdvancedAV) return b.lastAdvancedAV - a.lastAdvancedAV;
            
            // 💡 [핵심] AV가 같으면? 먼저 대기열에 등록되어 기다리던 이벤트(queueId가 작은 것)가 무조건 앞선다!
            return a.queueId - b.queueId; 
        });

        // 가장 먼저 일어날 이벤트를 뽑음
        currentEvent = eventQueue.shift();
        
        if (currentEvent.av > limit) break;
        if (newTimeline.length > 250) break; // 무한 루프 방지용 안전 장치

        // 💡 [변경] 글로벌 이벤트 독립 노드 연산 및 종속 이벤트 자원/시간선 처리
        if (currentEvent.eventType.startsWith('GLOBAL_')) {
            let evType = currentEvent.eventType.replace('GLOBAL_', ''); 
            let eventNode = {
                id: Math.random(),
                unitId: 'SYSTEM',
                name: '시스템',
                title: currentEvent.title,
                av: currentEvent.av,
                type: evType,
                isTurn: false,
                followUpEvents: { 1: [], 2: [], 3: [], 4: [] },
                listenerLogs: []
            };

            let relatedEvents = state.insertedEvents.filter(ev => 
                ev.baseUnitId === 'SYSTEM' && 
                ev.baseTurnNth === evType
            );

            relatedEvents.forEach(ev => {
                let targetUnit = simUnits.find(u => u.unit_id === ev.unitId);
                
                if (targetUnit && ev.type === 'Gauge') {
                    let originalAV = targetUnit.current_action_value; // 💡 기존 AV 기억
                    targetUnit.current_action_value = Math.max(0, targetUnit.current_action_value - targetUnit.base_action_value * (ev.value / 100));
                    targetUnit.lastAdvancedAV = currentEvent.av;

                    let turnEv = eventQueue.find(e => e.eventType === 'TURN' && e.unitId === targetUnit.unit_id && e.turnCount === 0);
                    if (turnEv) {
                        turnEv.av = targetUnit.current_action_value;
                        turnEv.lastAdvancedAV = targetUnit.lastAdvancedAV;
                        // 💡 미세 소수점 조정으로 원래 앞서있던 유닛의 queueId를 작게 유지!
                        turnEv.queueId = currentEvent.queueId + (originalAV / 10000); 
                    }
                }

                // ✨ 궁극기 연산 자원 정산
                let bSp = spManager.current;
                let bE = targetUnit ? targetUnit.energy : 0;
                let aSp = spManager.current;
                let aE = 0;

                if (ev.type === 'Ult' && targetUnit) {
                    let ultKit = targetUnit.kit.ultimate;
                    targetUnit.modifyEnergy(-1 * ultKit.energy_cost, false);
                    let currentContext = createContext(targetUnit, eventNode.listenerLogs);
                    chargeUnitEnergy(targetUnit, ultKit.energy_gain, "필살기", currentContext);
                    aSp = spManager.current;
                    aE = targetUnit.energy;
                }

                eventNode.followUpEvents[1].push({ 
                    id: ev.id, type: ev.type, targetUnitId: ev.unitId, value: ev.value,
                    beforeSp: bSp, beforeE: bE, afterSp: aSp, afterE: aE
                });
            });

            if (currentEvent.eventType === 'GLOBAL_PREP') broadcastEvent(EventHook.PREP, createContext(null, eventNode.listenerLogs));
            if (currentEvent.eventType === 'GLOBAL_SETTING') broadcastEvent(EventHook.SETTING, createContext(null, eventNode.listenerLogs));
            if (currentEvent.eventType === 'GLOBAL_ENTER') broadcastEvent(EventHook.ENTER_COMBAT, createContext(null, eventNode.listenerLogs));
            if (currentEvent.eventType === 'GLOBAL_START') broadcastEvent(EventHook.BATTLE_START, createContext(null, eventNode.listenerLogs));
            if (currentEvent.eventType === 'GLOBAL_WAVE_START') broadcastEvent(EventHook.WAVE_START, createContext(null, eventNode.listenerLogs));

            // 💡 [해결] 중복 생성되던 pendingUltCards를 지우고, 깔끔하게 시스템 카드 1장만 타임라인에 삽입합니다.
            newTimeline.push(eventNode);
            continue; 
        }

        let actor = simUnits.find(u => u.unit_id === currentEvent.unitId);
        if (!actor) continue;

        // ==========================================
        // 🎬 큐에서 뽑은 이벤트가 '정규 턴'일 경우 처리
        // ==========================================
        if (currentEvent.eventType === 'TURN') {
            actor.lastAdvancedAV = -1; // 행동 시작 시 행게증 우선권 초기화

            let isCountdown = actor.archetype === 'COUNTDOWN';
            let isEnemy = actor.archetype === 'ENEMY'; // 🎯 [신규] 적군 판별

            let actionType = "BASIC";
            let mainKit = null;
            let targetUnit = null

            if (isCountdown) {
                // 카운트다운은 사용자 actionPlans 장부가 없으므로 강제로 전용 스크립트 지정
                actionType = "COUNTDOWN";
                mainKit = actor.kit.basic; 
            } else if (isEnemy) {
                // 🎯 [신규] 적군 행동 로직 (패턴 사전에서 스킬을 꺼내옵니다)
                let ability = actor.getNextAbility();
                actionType = ability.type; // 'SINGLE', 'BLAST' 등
                
                // 💡 엔진이 아군 스킬처럼 읽을 수 있게 1회용 껍데기 키트(Kit) 생성
                mainKit = {
                    name: ability.name,
                    tags: ['attack'], 
                    faction: 'ALLY',   // 적군의 타겟 풀은 아군(ALLY)
                    scope: ability.type,
                    abilityUse: (context) => {
                        context.log(`[${actor.name}]의 ${ability.name} 발동! (계수: ${ability.multiplier})`, "적 패턴 공격");
                    }
                };
                targetUnit = null; // 적의 메인 타겟은 추후 별도 타겟팅 로직에서 지정
            }
            else {
                // 일반 캐릭터는 사용자가 설정한 평/전/궁 계획표를 따름
                let planArray = state.actionPlans[actor.unit_id] || [];
                actionType = planArray[currentEvent.turnCount] || "BASIC";
                mainKit = (actionType === "S") ? actor.kit.skill : actor.kit.basic;

                let targetArray = state.actionTargets[actor.unit_id] || [];
                let savedTargetId = targetArray[currentEvent.turnCount] || null;
                targetUnit = savedTargetId ? simUnits.find(u => String(u.unit_id) === String(savedTargetId)) : null;
            }

            let turnNode = {
                id: Math.random(),
                unitId: actor.unit_id,
                name: actor.name,
                av: currentEvent.av,
                type: actionType,
                isTurn: true,
                isCountdown: isCountdown, // UI 렌더러에 힌트 제공
                actionName: mainKit.name, // UI가 kit를 추적하다가 뻗지 않도록 이름 캐싱
                isExtraTurn: currentEvent.isExtraTurn || false,
                followUpEvents: { 1: [], 2: [], 3: [], 4: [] },
                phaseEnterStates: {},
                beforeSp: spManager.current,
                beforeEnergy: actor.energy,
                listenerLogs: { 1: [], 2: [], 3: [], 4: [] }
            };
            let relatedEvents = state.insertedEvents.filter(ev => ev.baseUnitId === actor.unit_id && ev.baseTurnNth === currentEvent.turnCount);

            // 💡 1. 턴을 해체하여 일렬로 늘어놓을 "파이프라인" 배열 생성
            let pipeline = [];

            // 헬퍼 함수: 특정 페이즈에 예약된 외부 이벤트를 파이프라인에 삽입
            const injectEvents = (phaseNum) => {
                relatedEvents.filter(ev => ev.phase === phaseNum).forEach(ev => {
                    if (ev.type === 'Ult') {
                        let ultActor = simUnits.find(u => u.unit_id === ev.unitId);
                        
                        // 🎯 [신규] 장부에 기록된 skillTargetId로 타겟 유닛을 찾습니다!
                        let skillTarget = simUnits.find(u => String(u.unit_id) === String(ev.skillTargetId));

                        if (ultActor) {
                            let ultKit = ultActor.kit.ultimate;
                            // 🎯 targetUnit 속성에 skillTarget을 담아서 파이프라인으로 보냅니다!
                            pipeline.push({ type: 'ACTION', actor: ultActor, targetUnit: skillTarget, kit: ultKit, isMain: false, eventRef: ev, phase: phaseNum });
                        }
                    } else {
                        // 행게 조작 등 기타 시스템 이벤트
                        pipeline.push({ type: 'EVENT', eventRef: ev, phase: phaseNum });
                    }
                });
            };

            // 💡 2. 레고 조립 (Turn Start -> Action Start -> Main Action -> Action End -> Turn End)
            pipeline.push({ type: 'CHECKPOINT', phase: 1 });
            injectEvents(1);

            pipeline.push({ type: 'CHECKPOINT', phase: 2 });
            injectEvents(2);

            // ✨ 핵심: 정규 턴 행동 역시 똑같은 '공통 행동(ACTION)' 규격으로 포장합니다.
            pipeline.push({ type: 'ACTION', actor: actor, targetUnit: targetUnit, kit: mainKit, isMain: true });
            pipeline.push({ type: 'GAUGE_RESET' });
            pipeline.push({ type: 'CHECKPOINT', phase: 3 });
            injectEvents(3);
            
            pipeline.push({ type: 'CHECKPOINT', phase: 4 });
            injectEvents(4);

            // 💡 3. 파이프라인 순차 실행 (정규턴/궁극기 구분 없이 공통 ACTION 연산 하나로 통합!)
            pipeline.forEach(block => {
                if (block.type === 'CHECKPOINT') {
                    turnNode.phaseEnterStates[block.phase] = { sp: spManager.current, e: actor.energy };
                    // 💡 [수정] 추가 턴(Extra Turn)이 아닐 때만 턴 시작/종료 정산을 돌립니다.
                    if (block.phase === 1 && !turnNode.isExtraTurn) {
                        simUnits.forEach(u => u.modifiers.tick('TURN_START', actor.unit_id, turnNode.listenerLogs[1]));
                        broadcastEvent(EventHook.TURN_START, createContext(actor, turnNode.listenerLogs[1]));
                    }
                    if (block.phase === 4 && !turnNode.isExtraTurn) {
                        simUnits.forEach(u => u.modifiers.tick('TURN_END', actor.unit_id, turnNode.listenerLogs[4]));
                        broadcastEvent(EventHook.TURN_END, createContext(actor, turnNode.listenerLogs[4]));
                    }
                }
                else if (block.type === 'GAUGE_RESET') {
                    // 🔥 추가 턴(Extra Turn)이 아닐 경우에만 턴 카운트를 올리고 다음 행동 게이지를 채웁니다.
                    // 이제 이 시점 이후(Phase 3, 4)에 들어오는 행게증/감은 '새로 충전된 다음 턴의 AV'를 상대로 계산됩니다!
                    if (!turnNode.isExtraTurn) {
                        actor.turnCount++;
                        actor.current_action_value += actor.base_action_value;
                    }
                }
                else if (block.type === 'ACTION') {
                    let currentActor = block.actor;
                    let actionTags = block.kit.tags ? [...block.kit.tags] : [];

                    let currentPhase = block.phase || 2; 
                    let currentLogs = block.isMain ? turnNode.listenerLogs[currentPhase] : [];

                    let faction = block.kit.faction || 'ENEMY';
                    let scope = block.kit.scope || 'SINGLE';
                    
                    // 💡 [신규] UI에서 넘어온 메인 타겟 ID 추출
                    let mainTargetId = block.targetUnit ? block.targetUnit.unit_id : null;

                    // 🎯 [핵심] 해석기를 돌려 '실제 타격받을 대상 배열'을 완성합니다!
                    let resolvedTargets = resolveTargets(simUnits, currentActor, mainTargetId, faction, scope);

                    let currentContext = createContext(currentActor, currentLogs, {
                        kit: block.kit, 
                        isMain: block.isMain, 
                        actionType: block.isMain ? actionType : 'ULT',
                        tags: actionTags,
                        target: block.targetUnit, // 기존 호환성을 위해 단일 타겟도 남겨둠
                        targets: resolvedTargets  // 🎯 완성된 배열을 드디어 엔진 Context에 주입!
                    });
                    // ==========================================
                    // 🎬 10단계 세분화 파이프라인 방송 시작
                    // ==========================================
                    let bSp = spManager.current;
                    let bE = currentActor.energy;

                    // 1. ACTION_START (행동 시작)
                    broadcastEvent(EventHook.ACTION_START, currentContext);

                    // 💡 자원 정산 (스킬을 선언했으므로 비용을 지불하고 에너지를 얻음)
                    const spDelta = (block.kit.sp_gain || 0) - (block.kit.sp_cost || 0);
                    if (spDelta !== 0) spManager.modify(spDelta, currentLogs);
                    
                    if (block.kit.energy_cost) {
                        currentActor.modifyEnergy(-1 * block.kit.energy_cost, false);
                    }
                    if (block.kit.energy_gain) {
                        const reasonTag = block.isMain ? (actionType === "S" ? "전투 스킬" : "일반 공격") : "필살기";
                        chargeUnitEnergy(currentActor, block.kit.energy_gain, reasonTag, currentContext);
                    }

                    // 2. ABILITY_START (능력 사용 시작)
                    broadcastEvent(EventHook.ABILITY_START, currentContext);

                    // 태그에 'attack'이 포함되어 있으면 타격 및 데미지 프로세스 진입
                    const isAttack = actionTags.includes('attack');

                    if (isAttack) {
                        // 3. ATTACK_START (공격 시작)
                        broadcastEvent(EventHook.ATTACK_START, currentContext);
                        
                        // 4. DMG_START (데미지 계산 시작 직전 - 방깎/피증 등 적용 타이밍)
                        broadcastEvent(EventHook.DMG_START, currentContext);
                    }

                    // 5. 실제 캐릭터 스킬 로직 발동 (abilityUse)
                    if (block.kit.abilityUse) {
                        block.kit.abilityUse(currentContext);
                    }

                    if (isAttack) {
                        // 6. DMG_END (데미지 계산 종료)
                        broadcastEvent(EventHook.DMG_END, currentContext);
                        
                        // 7. ATTACK_END (공격 종료 - 피흡 등 적용 타이밍)
                        broadcastEvent(EventHook.ATTACK_END, currentContext);
                    }

                    // 8. ABILITY_END (능력 사용 종료)
                    broadcastEvent(EventHook.ABILITY_END, currentContext);

                    // 9. ACTION_END (행동 최종 종료)
                    broadcastEvent(EventHook.ACTION_END, currentContext);
                    // ==========================================

                    let aSp = spManager.current;
                    let aE = currentActor.energy;

                    if (!block.isMain) {
                        turnNode.followUpEvents[currentPhase].push({ 
                            id: block.eventRef.id, type: 'Ult', targetUnitId: currentActor.unit_id, value: block.eventRef.value,
                            beforeSp: bSp, beforeE: bE, afterSp: aSp, afterE: aE,
                            logs: currentLogs 
                        });
                    }
                }
                else if (block.type === 'EVENT') {
                    // 기타 행게 조작 등의 시스템 이벤트 통과 기록
                    turnNode.followUpEvents[block.phase].push({ 
                        id: block.eventRef.id, type: block.eventRef.type, targetUnitId: block.eventRef.unitId, value: block.eventRef.value,
                        beforeSp: spManager.current, beforeE: 0, afterSp: spManager.current, afterE: 0
                    });
                }
            });

            turnNode.afterSp = spManager.current;
            turnNode.afterEnergy = actor.energy;

            // 완성된 행동 노드를 타임라인에 등록
            newTimeline.push(turnNode);

            let isAlive = simUnits.some(u => u.unit_id === actor.unit_id);
            
            if (isAlive) {
                // 큐에 갱신된 턴을 장전
                eventQueue.push({
                    eventType: 'TURN',
                    av: actor.current_action_value,
                    unitId: actor.unit_id,
                    turnCount: actor.turnCount,
                    lastAdvancedAV: actor.lastAdvancedAV,
                    partyIndex: actor.partyIndex,
                    // 🔥 [핵심]: 무대 위에서 로빈 궁을 맞아 발급받은 '특수 번호표'가 있다면 그걸 내밀고, 없으면 글로벌 카운터를 씁니다.
                    queueId: (actor.tempQueueId !== undefined) ? actor.tempQueueId : queueGlobalCounter++ 
                });
                
                // 💡 사용한 임시 번호표 폐기
                actor.tempQueueId = undefined;
            }
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

    let actor = state.unitData.find(u => u.unit_id === action.unitId);
    if (actor && actor.archetype === 'ENEMY') return;

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
    const skillTargetSelect = document.getElementById('event-skill-target-select'); // 💡 새로 추가한 드롭다운 찾기
    
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
    skillTargetSelect.innerHTML = `<option value="">(자동/타겟 없음)</option>` + state.unitData.map(u => `<option value="${u.unit_id}">${u.name}</option>`).join('');
    
    toggleEventValueInput();
    render(); // 하이라이팅 적용을 위한 새로고침
}

window.toggleEventValueInput = function() {
    const type = document.getElementById('event-type-select').value;
    document.getElementById('event-value-block').style.display = (type === 'Gauge') ? 'flex' : 'none';
    document.getElementById('event-skill-target-block').style.display = (type === 'Ult') ? 'flex' : 'none';
}

function addFollowUpEvent() {
    if (state.selectedIdx === null || state.selectedPhase === null) return;
    
    const item = state.timeline[state.selectedIdx];
    const type = document.getElementById('event-type-select').value;

    const targetUnitIdStr = document.getElementById('event-target-select').value;
    
    // 🎯 [신규] 스킬 타겟 드롭다운 값 읽어오기
    const skillTargetSelect = document.getElementById('event-skill-target-select');
    const skillTargetIdStr = skillTargetSelect ? skillTargetSelect.value : null;

    const value = parseFloat(document.getElementById('event-value-input').value || 0);
    const targetUnit = state.unitData.find(u => String(u.unit_id) === targetUnitIdStr);

    let nth = item.unitId === 'SYSTEM' ? item.type : state.timeline.filter(a => a.unitId === item.unitId && a.isTurn).indexOf(item);

    // 💡 화면이 아니라 '장부(insertedEvents)'에 정식으로 예약합니다!
    state.insertedEvents.push({
        id: Math.random(), // 고유 ID 부여
        baseUnitId: item.unitId,
        baseTurnNth: nth,
        phase: state.selectedPhase,
        unitId: targetUnit ? targetUnit.unit_id : targetUnitIdStr,
        skillTargetId: skillTargetIdStr,
        name: targetUnit ? targetUnit.name : 'Unknown',
        type: type,
        value: type === 'Gauge' ? value : 0
    });

    // 선택된 카드 유지용 백업
    const backupUnitId = item.unitId;
    const backupAV = item.av;
    const backupType = item.type;

    // 💡 여기서 엔진을 돌려 에너지를 확실히 깎고 타임라인을 새로 만듭니다.
    recalculate(); 

    // 타임라인이 새로 짜였으므로 포커스를 다시 찾아줍니다.
    const newIdx = state.timeline.findIndex(t => 
        t.unitId === backupUnitId && 
        t.av === backupAV && 
        (backupUnitId === 'SYSTEM' ? t.type === backupType : t.isTurn)
    );
    if (newIdx !== -1) state.selectedIdx = newIdx;
    
    // (render는 recalculate 내부에서 호출되므로 생략)
}

function removeFollowUpEvent(cardIdx, phaseNum, eventIdx) {
    const item = state.timeline[cardIdx];
    if (item && item.followUpEvents && item.followUpEvents[phaseNum]) {
        const targetEv = item.followUpEvents[phaseNum][eventIdx];
        
        const targetIndex = state.insertedEvents.findIndex(e => e.id === targetEv.id);
        if (targetIndex !== -1) {
            state.insertedEvents.splice(targetIndex, 1);
        }

        const backupUnitId = item.unitId;
        const backupAV = item.av;
        const backupType = item.type;

        recalculate();

        const newIdx = state.timeline.findIndex(t => 
            t.unitId === backupUnitId && 
            t.av === backupAV && 
            (backupUnitId === 'SYSTEM' ? t.type === backupType : t.isTurn)
        );
        if (newIdx !== -1) state.selectedIdx = newIdx;
    }
}

function updateDetail() {
    if (state.selectedIdx === null) return;
    const action = state.timeline[state.selectedIdx];
    const isGlobal = action.unitId === 'SYSTEM';

    const focusTargetSelect = document.getElementById('focus-target-select');
    if (focusTargetSelect && !isGlobal && action.type !== 'Ult') {
        // 1. 유닛 옵션 채우기
        focusTargetSelect.innerHTML = `<option value="">(자동 설정)</option>` + 
                                      state.unitData.map(u => `<option value="${u.unit_id}">${u.name}</option>`).join('');

        // 2. 현재 턴이 장부(actionTargets)에 타겟이 저장되어 있다면 그 값으로 세팅
        let unitActions = state.timeline.filter(a => a.unitId === action.unitId && a.type !== 'Ult');
        let nth = unitActions.indexOf(action);
        
        if (nth !== -1 && state.actionTargets && state.actionTargets[action.unitId]) {
            focusTargetSelect.value = state.actionTargets[action.unitId][nth] || "";
        } else {
            focusTargetSelect.value = "";
        }
    }

    if (isGlobal) {
        document.getElementById('focus-name').textContent = "시스템 - " + action.title;
        document.getElementById('energy-text-val').textContent = `-/-`;
        document.getElementById('energy-fill').style.width = `0%`;
        
        document.getElementById('p-turn-start').style.display = 'none';
        document.getElementById('p-turn-end').style.display = 'none';
        return;
    }
    const unit = state.unitData.find(u => u.unit_id === action.unitId);
    const kit = (action.type === 'S') ? unit.kit.skill : (action.type === 'Ult' ? unit.kit.ultimate : unit.kit.basic);

    // 💡 메인 프로그레스 바 텍스트 소수점 보정
    document.getElementById('focus-name').textContent = action.name + " - " + kit.name;
    document.getElementById('energy-text-val').textContent = `${(action.afterEnergy || 0).toFixed(2)}/${unit.max_energy.toFixed(2)}`;
    document.getElementById('energy-fill').style.width = `${((action.afterEnergy || 0) / unit.max_energy) * 100}%`;

    // 💡 마이크로 페이즈 진입 자원 상태 텍스트 소수점 보정
    const setP = (id, s, e) => {
        const el = document.getElementById(id);
        if (el) el.querySelector('.p-effect').innerHTML = `SP: <strong>${s}</strong> | Energy: <strong>${e.toFixed(2)}</strong>`;
    };

    const isEvent = action.isTurn === false;
    document.getElementById('p-turn-start').style.display = isEvent ? 'none' : 'block';
    document.getElementById('p-turn-end').style.display = isEvent ? 'none' : 'block';

    document.querySelectorAll('.phase-item').forEach(p => p.classList.remove('highlight'));

    if (action.phaseEnterStates) {
        setP('p-turn-start', action.phaseEnterStates[1].sp, action.phaseEnterStates[1].e);
        setP('p-action-start', action.phaseEnterStates[2].sp, action.phaseEnterStates[2].e);
        setP('p-action-end', action.phaseEnterStates[3].sp, action.phaseEnterStates[3].e);
        setP('p-turn-end', action.phaseEnterStates[4].sp, action.phaseEnterStates[4].e);
    } else {
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
    const buildLogHtml = (logs, marginLeft) => {
        if (!logs || logs.length === 0) return '';
        const wrapperStyle = `margin: 4px 0 4px ${marginLeft}; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(16, 185, 129, 0.3); border-left: 3px solid #10b981; border-radius: 4px; color: #6ee7b7; font-size: 11px; box-shadow: 0 4px 6px rgba(0,0,0,0.6); backdrop-filter: blur(3px); text-shadow: 0 1px 3px rgba(0,0,0,1);`;
        
        if (logs.length === 1) {
            return `<div class="card-action-tag-inline" style="${wrapperStyle} padding: 5px 10px;">✨ [${logs[0].sourceName}] ${logs[0].message}</div>`;
        } else {
            // 💡 [핵심] details 태그에 onclick="event.stopPropagation()"을 추가합니다!
            let html = `<details class="log-details" style="${wrapperStyle}" onclick="event.stopPropagation()">`;
            html += `<summary style="cursor: pointer; padding: 5px 10px; outline: none; font-weight: bold; user-select: none; display: flex; justify-content: space-between; align-items: center;">
                        <span>✨ 연쇄 발동 로그 (${logs.length}개)</span>
                        <span class="toggle-arrow" style="font-size:9px; opacity:0.8;">▼</span>
                     </summary>`;
            html += `<div style="padding: 0 10px 8px 10px; display: flex; flex-direction: column; gap: 6px;">`;
            logs.forEach(log => {
                html += `<div style="border-top: 1px dashed rgba(16, 185, 129, 0.3); padding-top: 6px;">[${log.sourceName}] ${log.message}</div>`;
            });
            html += `</div></details>`;
            return html;
        }
    };

    const list = document.getElementById('timeline-list');
    list.innerHTML = '';
    
    state.timeline.forEach((item, idx) => {
        if (!item.followUpEvents) item.followUpEvents = { 1: [], 2: [], 3: [], 4: [] };

        const isGlobal = item.unitId === 'SYSTEM';
        const unit = (isGlobal || item.isCountdown) ? null : state.unitData.find(u => u.unit_id === item.unitId);
        const actionConfig = { name: isGlobal ? item.title : item.actionName };
        const isSelected = state.selectedIdx === idx;
        let imagePath = `imgs/avatarshopicon/1001.png`;
        if (!isGlobal && unit) {
            imagePath = unit.archetype === 'ENEMY' 
                ? `imgs/enemies/${item.unitId}.png` 
                : `imgs/avatarshopicon/${item.unitId}.png`;
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'action-card-wrapper';

        // 💡 [핵심] 궁극기를 단독 액션 카드처럼 위장시켜 그려주는 헬퍼 함수
        // 💡 [핵심] 궁극기를 단독 액션 카드처럼 위장시켜 그려주는 헬퍼 함수 (클릭 핸들러 교체)
        const createStandaloneUltCard = (ev, pNum, evIdx) => {
            const targetUnit = state.unitData.find(u => u.unit_id === ev.targetUnitId);
            const imgPath = `imgs/avatarshopicon/${targetUnit.unit_id}.png`;
            const ultDiv = document.createElement('div');
            ultDiv.className = 'action-card';
            ultDiv.style.cssText = 'border: 2px solid #0284c7; background: rgba(14, 116, 144, 0.35); box-shadow: 0 0 8px rgba(3, 105, 161, 0.3); cursor: pointer;';
            
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
            
            const subEventId = ev.id || `${item.id}_${pNum}_${evIdx}`;
            
            ultDiv.onclick = (e) => {
                e.stopPropagation();
                if (state.selectedIdx !== idx) {
                    // 💡 [해결] 부모가 닫혀있다면? 부모부터 열고 -> 해당 페이즈 선택 -> 하위 이벤트까지 원스톱으로 펼침!
                    state.selectedIdx = idx;
                    window.selectPhase(pNum); 
                    state.selectedSubEventId = String(subEventId);
                } else {
                    // 이미 부모가 열려있다면 기존처럼 하위 이벤트만 토글
                    state.selectedSubEventId = state.selectedSubEventId === String(subEventId) ? null : String(subEventId);
                }
                render();
            }; 
            return ultDiv;
        };

        // [축소 시] Phase 1, 2 이벤트를 부모 카드 '위'에 렌더링
        if (!isSelected) {
            [1, 2].forEach(pNum => {
                // 💡 [해결] 전투 시작(START)의 이벤트는 카드 '아래'로 보내기 위해 여기서 그리는 것을 스킵합니다!
                if (isGlobal && item.type === 'WAVE_START' && pNum === 1) return; 

                item.followUpEvents[pNum].forEach((ev, evIdx) => {
                    if (ev.type === 'Ult') {
                        wrapper.appendChild(createStandaloneUltCard(ev, pNum, evIdx)); 
                    } else {
                        const targetUnit = state.unitData.find(u => u.unit_id === ev.targetUnitId);
                        const badge = document.createElement('div');
                        badge.className = 'mini-event-badge above';
                        badge.textContent = `[행게조작] ${targetUnit.name} (${ev.value > 0 ? '+' : ''}${ev.value}%)`;
                        // 💡 뱃지를 눌러도 부모 카드가 열리도록 편의성 추가
                        badge.onclick = (e) => { e.stopPropagation(); window.selectCard(idx); };
                        wrapper.appendChild(badge);
                    }
                });
            });
        }

        // --- 부모 턴 메인 카드 빌드 ---
        const div = document.createElement('div');
        div.className = `action-card ${isSelected ? 'active' : ''} ${isGlobal ? 'system-card' : ''}`;
        
        if (isGlobal) {
            div.style.cssText = 'border: 2px solid #475569; background: rgba(30, 41, 59, 0.45); box-shadow: none;';
        }
        else if (unit && unit.archetype === 'ENEMY') {
            div.style.borderLeft = '4px solid #ef4444'; // HSR 스타일의 붉은색 포인트
        }
        
        let cardHtml = `
            <div class="card-main-header">
                <div class="av-container" data-tooltip="${item.av}">
                    <div class="av-display" style="${isGlobal ? 'color: #94a3b8;' : ''}">${item.av.toFixed(2)}</div>
                </div>
                <div class="card-unit-info">
                    <div class="card-action-name" style="${isGlobal ? 'color: #cbd5e1; font-weight: normal;' : ''}">${actionConfig.name}</div>
                </div>
            </div>
        `;

        // [조건 1] 확장 상태일 때 각 페이즈 및 페이즈 사이에 인라인 리스트로 드로잉
        // [조건 1] 확장 상태일 때 각 페이즈 및 페이즈 사이에 인라인 리스트로 드로잉
        if (isSelected) {
            if (isGlobal) {
                cardHtml += `<div class="card-phases-area">`;
                
                // 💡 [추가] 글로벌 노드 펼쳤을 때 패시브 로그 출력
                if (item.listenerLogs) {
                    cardHtml += buildLogHtml(item.listenerLogs, "0px");
                }

                if (item.type === 'WAVE_START') {
                    // (기존 전투 시작 시점 정산 렌더링 코드는 그대로 유지...)
                    const isPSelected = state.selectedPhase === 1;
                    cardHtml += `<div class="card-phases-area">`;
                    cardHtml += `
                        <div class="card-phase-item ${isPSelected ? 'phase-active' : ''}" onclick="event.stopPropagation(); window.selectPhase(1)">
                            <span class="card-phase-num">▶</span>
                            <span class="card-phase-name">웨이브 시작 시작 시점 정산</span>
                            <span class="card-phase-effect">행적 효과 발동</span>
                        </div>
                    `;

                    item.followUpEvents[1].forEach((ev, evIdx) => {
                        const targetUnit = state.unitData.find(u => u.unit_id === ev.targetUnitId);
                        const subEventId = ev.id || `${item.id}_1_${evIdx}`;
                        const isEvUlt = ev.type === 'Ult';
                        const isSubSelected = state.selectedSubEventId === String(subEventId); // 💡 타입 동기화 보장
                        
                        let desc = isEvUlt ? `[궁극기] ${targetUnit.name}` : `[행게조작] ${targetUnit.name} (${ev.value > 0 ? '+' : ''}${ev.value}%)`;
                        const evStyle = isEvUlt ? `border-left: 3px solid #38bdf8; background: rgba(14, 116, 144, 0.35); cursor: pointer; position:relative; ${isSubSelected ? 'border-bottom: 1px dashed rgba(56, 189, 248, 0.5);' : ''}` : '';
                        const tagColor = isEvUlt ? 'color: #38bdf8;' : 'color: #94a3b8;';
                        const descColor = isEvUlt ? 'color: #7dd3fc; font-weight: bold;' : 'color: #cbd5e1;';

                        cardHtml += `
                            <div class="card-followup-item-expanded" style="${evStyle}" 
                                 onclick="event.stopPropagation(); window.toggleSubEvent('${subEventId}');">
                                <span class="followup-tag" style="${tagColor}">↳ ${isEvUlt ? 'ULT' : 'Event'}</span>
                                <span class="followup-desc" style="${descColor}">${desc}</span>
                                <span class="followup-del-btn" onclick="event.stopPropagation(); window.removeFollowUpEvent(${idx}, 1, ${evIdx})">×</span>
                            </div>
                        `;

                        // ✨ 💡 독립 카드 상태에서 클릭 시 인라인 하위 페이즈(Action Start/End) 표출 완벽 이식!
                        // 독립 궁극기 서브 페이즈 인라인 렌더링 수치 보정
                        if (isEvUlt && isSubSelected) {
                            cardHtml += `
                                <div class="sub-phase-area" style="background: rgba(15, 23, 42, 0.25); margin: 4px 0 6px 16px; padding: 4px 0 4px 12px; border-left: 2px solid #0284c7; border-radius: 0 4px 4px 0;" onclick="event.stopPropagation();">
                                    <div class="card-phase-item" style="padding: 4px 8px; font-size: 11px; opacity: 0.9; background: transparent; border: none; display: flex; gap: 6px;">
                                        <span class="card-phase-name" style="color: #38bdf8; font-weight: bold;">Action Start</span>
                                        <span class="card-phase-effect" style="color: #94a3b8; margin-left: auto;">SP: ${ev.beforeSp} | E: ${ev.beforeE.toFixed(2)}</span>
                                    </div>
                                    <div class="card-action-tag-inline" style="font-size: 11px; margin: 2px 0 2px 8px; color: #bae6fd; background: rgba(3, 105, 161, 0.4); border-left: 2px solid #0284c7; padding-left: 6px;">
                                        ${targetUnit.name} 필살기 진행
                                    </div>
                                    <div class="card-phase-item" style="padding: 4px 8px; font-size: 11px; opacity: 0.9; background: transparent; border: none; display: flex; gap: 6px;">
                                        <span class="card-phase-name" style="color: #38bdf8; font-weight: bold;">Action End</span>
                                        <span class="card-phase-effect" style="color: #94a3b8; margin-left: auto;">SP: ${ev.afterSp} | E: ${ev.afterE.toFixed(2)}</span>
                                    </div>
                                </div>
                            `;
                        }
                    });
                    cardHtml += `</div>`;
                } else {
                    cardHtml += `<div class="card-phases-area" style="padding: 12px; color: #94a3b8; font-size: 11px; text-align: center;">전투 진입 전 단계를 처리하는 독립적인 시스템 이벤트입니다.</div>`;
                }
            } else {
                // (기존 정규 캐릭터 턴 1~4 페이즈 렌더링 코드 그대로 유지...)
                const bSp = item.beforeSp;
                const bE = Math.floor(item.beforeEnergy || 0);
                const aSp = item.afterSp;
                const aE = Math.floor(item.afterEnergy || 0);

                cardHtml += `<div class="card-phases-area">`;
                [1, 2, 3, 4].forEach(pNum => {
                    const isPSelected = state.selectedPhase === pNum;
                    const pNames = ["", "Turn Start", "Action Start", "Action End", "Turn End"];
                    const pState = item.phaseEnterStates ? item.phaseEnterStates[pNum] : { sp: bSp, e: bE }; 
                    const pEff = `SP: ${pState.sp} | E: ${pState.e.toFixed(2)}`; // 💡 .toFixed(2) 보정

                    cardHtml += `
                        <div class="card-phase-item ${isPSelected ? 'phase-active' : ''}" onclick="event.stopPropagation(); window.selectPhase(${pNum})">
                            <span class="card-phase-num">${pNum}</span>
                            <span class="card-phase-name">${pNames[pNum]}</span>
                            <span class="card-phase-effect">${pEff}</span>
                        </div>
                    `;

                    if (pNum === 2) {
                        cardHtml += `<div class="card-action-tag-inline">${actionConfig.name} 진행</div>`;
                    }

                    if (item.listenerLogs && item.listenerLogs[pNum]) {
                        cardHtml += buildLogHtml(item.listenerLogs[pNum], "16px");
                    }

                    item.followUpEvents[pNum].forEach((ev, evIdx) => {
                        const targetUnit = state.unitData.find(u => u.unit_id === ev.targetUnitId);
                        const isEvUlt = ev.type === 'Ult';
                        const subEventId = ev.id || `${item.id}_${pNum}_${evIdx}`;
                        const isSubSelected = state.selectedSubEventId === String(subEventId);

                        let desc = isEvUlt ? `[궁극기] ${targetUnit.name}` : `[행게조작] ${targetUnit.name} (${ev.value > 0 ? '+' : ''}${ev.value}%)`;
                        const evStyle = isEvUlt ? `border-left: 3px solid #38bdf8; background: rgba(14, 116, 144, 0.35); cursor: pointer; position:relative; ${isSubSelected ? 'border-bottom: 1px dashed rgba(56, 189, 248, 0.5);' : ''}` : '';
                        const tagColor = isEvUlt ? 'color: #38bdf8;' : 'color: #94a3b8;';
                        const descColor = isEvUlt ? 'color: #7dd3fc; font-weight: bold;' : 'color: #cbd5e1;';

                        cardHtml += `
                            <div class="card-followup-item-expanded" style="${evStyle}" onclick="event.stopPropagation(); window.toggleSubEvent('${subEventId}');">
                                <span class="followup-tag" style="${tagColor}">↳ ${isEvUlt ? 'ULT' : 'Event'}</span>
                                <span class="followup-desc" style="${descColor}">${desc}</span>
                                <span class="followup-del-btn" onclick="event.stopPropagation(); window.removeFollowUpEvent(${idx}, ${pNum}, ${evIdx})">×</span>
                            </div>
                        `;

                        // 독립 궁극기 서브 페이즈 인라인 렌더링 수치 보정
                        if (isEvUlt && isSubSelected) {
                            cardHtml += `
                                <div class="sub-phase-area" style="background: rgba(15, 23, 42, 0.25); margin: 4px 0 6px 16px; padding: 4px 0 4px 12px; border-left: 2px solid #0284c7; border-radius: 0 4px 4px 0;" onclick="event.stopPropagation();">
                                    <div class="card-phase-item" style="padding: 4px 8px; font-size: 11px; opacity: 0.9; background: transparent; border: none; display: flex; gap: 6px;">
                                        <span class="card-phase-name" style="color: #38bdf8; font-weight: bold;">Action Start</span>
                                        <span class="card-phase-effect" style="color: #94a3b8; margin-left: auto;">SP: ${ev.beforeSp} | E: ${ev.beforeE.toFixed(2)}</span>
                                    </div>
                                    <div class="card-action-tag-inline" style="font-size: 11px; margin: 2px 0 2px 8px; color: #bae6fd; background: rgba(3, 105, 161, 0.4); border-left: 2px solid #0284c7; padding-left: 6px;">
                                        ${targetUnit.name} 필살기 진행
                                    </div>
                                    `;
                                    
                                    // 💡 [핵심] Action Start와 Action End 사이에 궁극기 로그를 여기서 그려줍니다!
                                    if (ev.logs) {
                                        cardHtml += buildLogHtml(ev.logs, "20px");
                                    }

                                    // 그 다음 Action End가 오도록 원래 코드 이어짐
                                    cardHtml += `
                                    <div class="card-phase-item" style="padding: 4px 8px; font-size: 11px; opacity: 0.9; background: transparent; border: none; display: flex; gap: 6px;">
                                        <span class="card-phase-name" style="color: #38bdf8; font-weight: bold;">Action End</span>
                                        <span class="card-phase-effect" style="color: #94a3b8; margin-left: auto;">SP: ${ev.afterSp} | E: ${ev.afterE.toFixed(2)}</span>
                                    </div>
                                </div>
                            `;
                        }
                    });
                });
                cardHtml += `</div>`;
            }
        }

        if (!isGlobal) {
            cardHtml += `<div class="card-bg-image" style="background-image: url('${imagePath}');"></div>`;
        }
        div.innerHTML = cardHtml;
        div.onclick = () => selectCard(idx);
        
        wrapper.appendChild(div);

        // [축소 시] Phase 3, 4 이벤트를 부모 카드 '아래'에 렌더링
        if (!isSelected) {
            // 💡 [해결] 위에서 스킵했던 전투 시작(START) 노드의 Phase 1을 Phase 3, 4 묶음과 합쳐서 무조건 카드 '아래'에 배치합니다!
            let bottomPhases = (isGlobal && item.type === 'WAVE_START') ? [1, 3, 4] : [3, 4];

            bottomPhases.forEach(pNum => {
                item.followUpEvents[pNum].forEach((ev, evIdx) => {
                    if (ev.type === 'Ult') {
                        wrapper.appendChild(createStandaloneUltCard(ev, pNum, evIdx)); 
                    } else {
                        const targetUnit = state.unitData.find(u => u.unit_id === ev.targetUnitId);
                        const badge = document.createElement('div');
                        badge.className = 'mini-event-badge below';
                        badge.textContent = `[행게조작] ${targetUnit.name} (${ev.value > 0 ? '+' : ''}${ev.value}%)`;
                        badge.onclick = (e) => { e.stopPropagation(); window.selectCard(idx); };
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
        const isGlobal = action.unitId === 'SYSTEM';
        
        const focusTargetBlock = document.getElementById('focus-target-block');
        const focusTargetSelect = document.getElementById('focus-target-select');

        if (focusTargetSelect && focusTargetBlock) {
            // 시스템 노드, 궁극기, 카운트다운일 때는 타겟 변경창 숨기기
            if (isGlobal || action.type === 'Ult' || action.isCountdown) {
                focusTargetBlock.style.display = 'none';
            } else {
                focusTargetBlock.style.display = 'flex';
                
                // 1. 유닛 목록 동적으로 채워넣기
                focusTargetSelect.innerHTML = `<option value="">(자동 설정)</option>` + 
                                              state.unitData.map(u => `<option value="${u.unit_id}">${u.name}</option>`).join('');

                // 2. 장부(actionTargets)에서 현재 턴에 저장된 타겟이 있으면 불러오기
                let unitActions = state.timeline.filter(a => a.unitId === action.unitId && a.type !== 'Ult');
                let nth = unitActions.indexOf(action);
                
                if (nth !== -1 && state.actionTargets && state.actionTargets[action.unitId]) {
                    focusTargetSelect.value = state.actionTargets[action.unitId][nth] || "";
                } else {
                    focusTargetSelect.value = "";
                }
            }
        }

        if (isGlobal) {
            document.getElementById('focus-name').textContent = "시스템 - " + action.title;
            document.getElementById('energy-text-val').textContent = `-/-`;
            document.getElementById('energy-fill').style.width = `0%`;
        } else {
            const unit = state.unitData.find(u => u.unit_id === action.unitId);

            if (unit.archetype === 'ENEMY' || action.isCountdown) {
                document.getElementById('focus-name').textContent = action.name + " - " + action.actionName;
                document.getElementById('energy-text-val').textContent = `-/-`;
                document.getElementById('energy-fill').style.width = `0%`;
            } else {
                const kit = (action.type === 'S') ? unit.kit.skill : (action.type === 'Ult' ? unit.kit.ultimate : unit.kit.basic);
                document.getElementById('focus-name').textContent = action.name + " - " + kit.name;
                document.getElementById('energy-text-val').textContent = `${(action.afterEnergy || 0).toFixed(2)}/${unit.max_energy.toFixed(2)}`;
                document.getElementById('energy-fill').style.width = `${((action.afterEnergy || 0) / unit.max_energy) * 100}%`;
            }
        }
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

window.updateCurrentTarget = function(targetId) {
    if (state.selectedIdx === null) return;
    let action = state.timeline[state.selectedIdx];
    if (action.type === 'Ult' || action.unitId === 'SYSTEM') return;

    let unitActions = state.timeline.filter(a => a.unitId === action.unitId && a.type !== 'Ult');
    let nth = unitActions.indexOf(action);

    if (nth !== -1) {
        state.actionTargets[action.unitId][nth] = targetId === "" ? null : targetId;
        recalculate(); 
    }
}

buildInitialTimeline()