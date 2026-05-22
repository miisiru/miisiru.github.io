import { UnitKit, ActionConfig, EventListener, EventHook} from '../config.js';
import { getBaseLCId } from '../lc.js'
import { Unit } from '../character.js'

const robinTechnique = new EventListener({
    id: "robin_technique",
    name: "로빈 비술 (취해의 가락)",
    hook: EventHook.WAVE_START, 
    priority: -80, // 스크린샷 고증
    condition: (context) => context.waveCount === 1, 
    effect: (context) => {
        // chargeEnergy 호출 (ERR 적용 기본값 true)
        context.chargeEnergy(context.caster, 5, "로빈 비술");
    }
});

const robinBonusAbility1 = new EventListener({
    id: "robin_bonus_ability_1",
    name: "로빈 추능 1 (행게증)",
    hook: EventHook.BATTLE_START,
    condition: (context) => { return true; },
    effect: (context) => {
        context.advanceActionGauge(context.caster.unit_id, 25, "로빈 추능1");
    }
});


const robinTalent = new EventListener({
    id: "robin_talent",
    name: "로빈 특성 (아군 공격 시 에너지 회복)",
    hook: EventHook.ATTACK_END,
    condition: (context) => { return true; },
    effect: (context) => {
        // 💡 우리가 만든 범용 에너지 함수 호출! (ERR 적용 + 상세 로그 자동 출력)
        context.chargeEnergy(context.caster, 2, "로빈 특성"); 
    }
});

const robinkit = new UnitKit(
    new ActionConfig({ name: "평타", sp_gain: 1, energy_gain: 20 }),
    new ActionConfig({ 
        name: "전스", 
        sp_cost: 1, 
        energy_gain: 30,
        tags: ['support'],
        abilityUse: (context) => {
            context.chargeEnergy(context.actingUnit, 5, "추능3", true);
            context.log("에너지 5pt 회복", "로빈 전투 스킬");

            // 💡 반복문 삭제! 오직 시전자(로빈) 본인의 unit_id에만 버프를 부여합니다.
            context.addModifier(context.actingUnit.unit_id, {
                id: 'robin_skill_aria',
                name: '깃털의 아리아',
                type: 'BUFF',
                stats: { dmg_boost: 0.50 }, // 가하는 피해 50% 증가
                duration: 3,
                sourceId: context.actingUnit.unit_id,
                tickOn: 'TURN_START' // 본인 턴 시작 시 차감
            });
            
            context.log("자신에게 [깃털의 아리아] 버프 부여 (3턴)", "로빈 전투 스킬");
        }
    }),
    new ActionConfig({ 
        name: "궁", 
        energy_gain: 5, 
        energy_cost: 160,
        tags: ['support'], // 💡 지원 스킬이므로 공격 판정 제외
        abilityUse: (context) => {
            const robinId = context.actingUnit.unit_id;

            context.simUnits.forEach(ally => {
                if (ally.unit_id !== robinId) {
                    // 💡 엔진 통제 API 호출 단 한 줄이면 끝! 정렬과 우선순위는 엔진이 알아서 완벽하게 처리합니다.
                    context.advanceActionGauge(ally.unit_id, 100, "로빈 필살기");
                }
            });

            // 2. 자신에게 [협주] 상태 부여 (피격은 가능하지만 턴은 안 옴)
            context.addModifier(robinId, {
                id: 'robin_concerto',
                name: '협주',
                type: 'STATE', // 버프가 아닌 특수 상태로 분류
                duration: -1,  // 무한 지속 (카운트다운이 직접 해제함)
                sourceId: robinId
            });
            context.log("자신에게 [협주] 상태 부여 (행동 불가)", "로빈 필살기");

            // 3. 로빈 행동 락 (Action Value를 999999로 밀어버려서 타임라인에서 일시적으로 치워버림)
            context.actingUnit.current_action_value = 999999;
            let robinTurn = context.eventQueue.find(e => e.eventType === 'TURN' && e.unitId === robinId);
            if (robinTurn) robinTurn.av = 999999;

            // =========================================================
            // 4. [핵심] 카운트다운 객체 생성 및 타임라인 난입 (바이블 고증)
            // =========================================================
            const countdownId = 11309; // 고유 ID 부여
            
            // 카운트다운의 턴이 도달했을 때 실행될 "자폭 및 로빈 해방" 스크립트
            const countdownAction = new ActionConfig({
                name: "협주 종료",
                tags: ['system'],
                abilityUse: (cdContext) => {
                    let robin = cdContext.simUnits.find(u => u.unit_id === robinId);
                    if (robin) {
                        // 협주 상태 해제
                        robin.modifiers.remove('robin_concerto', cdContext.targetLogsArray);
                        
                        // 로빈 100% 행동 게이지 증가 (현재 카운트다운이 터진 시간으로 복귀)
                        robin.current_action_value = cdContext.currentEvent.av;
                        robin.lastAdvancedAV = cdContext.currentEvent.av;
                        
                        let rEvent = cdContext.eventQueue.find(e => e.eventType === 'TURN' && e.unitId === robinId);
                        if (rEvent) {
                            rEvent.av = robin.current_action_value;
                            rEvent.lastAdvancedAV = robin.lastAdvancedAV;
                        }
                        cdContext.log("[협주] 상태 종료 및 로빈 즉시 행동", "협주 카운트다운");
                    }
                    
                    // 용도를 다한 카운트다운 객체는 유닛 목록에서 제거 (자폭)
                    let cdIndex = cdContext.simUnits.findIndex(u => u.unit_id === countdownId);
                    if (cdIndex !== -1) cdContext.simUnits.splice(cdIndex, 1);
                    
                    // 큐에 남은 잔여 턴 스케줄도 삭제
                    cdContext.eventQueue = cdContext.eventQueue.filter(e => e.unitId !== countdownId);
                }
            });

            // 임시 키트 조립
            const countdownKit = new UnitKit(countdownAction, countdownAction, countdownAction); 

            // 카운트다운 Unit 인스턴스 생성
            let countdownUnit = new Unit({
                unit_id: 1309, // 👈 9991309 대신 일단 1309를 넣어 config.js의 DB 조회를 무사통과시킵니다.
                name: "Countdown",
                kit: countdownKit,
                spd: 90
            });
            // 💡 2. 무사히 생성된 직후, 카운트다운 고유 정보로 완벽하게 덮어씌웁니다.
            countdownUnit.unit_id = countdownId; 
            countdownUnit.name = "협주 카운트다운";
            countdownUnit.archetype = "COUNTDOWN"; 
            countdownUnit.partyIndex = 5; 
            
            // 💡 3. script.js 중간에 난입하는 녀석이므로, 초기화 변수들을 수동으로 채워줍니다.
            countdownUnit.base_action_value = 10000 / 90;
            countdownUnit.current_action_value = context.currentEvent.av + countdownUnit.base_action_value; 
            countdownUnit.lastAdvancedAV = -1;
            countdownUnit.turnCount = 0;
            countdownUnit.energy = 0;
            
            // 💡 4. [핵심] 엔진이 턴 시작/종료 시 검사하는 modifiers를 가짜로(Mock) 달아주어 에러를 방지합니다.
            countdownUnit.modifiers = {
                list: [],
                add: () => {}, remove: () => {}, tick: () => {}, getStat: () => 0
            };

            // 시뮬레이터에 객체 주입
            context.simUnits.push(countdownUnit);
            
            // 타임라인 대기열에 새 턴 추가
            context.eventQueue.push({
                eventType: 'TURN',
                av: countdownUnit.current_action_value,
                unitId: countdownId,
                turnCount: 0,
                lastAdvancedAV: -1,
                partyIndex: countdownUnit.partyIndex,
                queueId: context.currentEvent.queueId + 1000 // 우선순위 밀림 방지
            });

            context.log(`행동 서열에 [협주 카운트다운] 추가 (고정 속도 90, +${countdownUnit.base_action_value.toFixed(2)}AV)`, "로빈 필살기");
        }
    }),
    robinTechnique
);

export const Robin = new Unit({unit_id: 1309, kit: robinkit, rotation: {initial: [], repeat: ['S']}});

Robin.registerListener(robinTalent)
Robin.registerListener(robinBonusAbility1)