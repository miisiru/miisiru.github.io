import { UnitKit, ActionConfig, ActionType, SkillType, Ability, Unit, LightCone, EventListener, EventHook } from './config.js';
import { getBaseLCId } from './lc.js'

// (선데이 패시브 이벤트 리스너는 그대로 유지)
const sundayBonusAbility2 = new EventListener({
    id: "sunday_bonus_ability_2",
    name: "선데이 추가 능력 2 (전투 시작 시 에너지 회복)",
    hook: EventHook.ENTER_COMBAT,
    priority: -80,
    condition: (context) => { return true; },
    effect: (context) => {
        // 💡 우리가 만든 범용 에너지 함수 호출! (ERR 적용 + 상세 로그 자동 출력)
        context.chargeEnergy(context.caster, 25, "선데이 추가 능력 2"); 
    }
});

const evakit = new UnitKit(
    new ActionConfig({ name: "평타", sp_gain: 1, energy_gain: 20 }),
    new ActionConfig({ name: "전스", sp_cost: 1, energy_gain: 30 }),
    new ActionConfig({ name: "궁", energy_gain: 5, action_type: ActionType.ULT, energy_cost: 240 })
);

// 🎯 1. 선데이 키트: 궁극기 에너지 회복 기믹 추가
const sundaykit = new UnitKit(
    new ActionConfig({ name: "평타", sp_gain: 1, energy_gain: 20 }),
    new ActionConfig({ 
        name: "전투 스킬", 
        sp_cost: 1, 
        energy_gain: 30, 
        action_type: ActionType.SKILL, 
        skill_type: SkillType.SUPPORT, 
        abilityUse: (context) => {
            let target = context.simUnits.find(unit => unit.name === "Evanescia");
            if (target) {
                target.set_action_guage(0, context.currentEvent.av);
                target.lastAdvancedAV = context.currentEvent.av; 
                
                let targetEvent = context.eventQueue.find(e => e.eventType === 'TURN' && e.unitId === target.unit_id);
                if (targetEvent) {
                    targetEvent.av = target.current_action_value;
                    targetEvent.lastAdvancedAV = target.lastAdvancedAV;
                }
                context.log(`[${target.name}] 즉시 행동 지정`, "선데이 전투 스킬");
            }
        }
    }),
    new ActionConfig({ 
        name: "궁", 
        energy_gain: 5, 
        action_type: ActionType.ULT, 
        energy_cost: 130,
        abilityUse: (context) => {
            // 테스트를 위해 에바네시아를 고정 타겟으로 지정
            let target = context.simUnits.find(unit => unit.name === "Evanescia");
            if (target) {
                // 목표 최대 에너지의 20% 계산
                let recoverAmt = target.max_energy * 0.20;
                // 40 미만이면 40으로 고정 (Math.max 활용)
                let finalRecover = Math.max(recoverAmt, 40);
                
                // 💡 [핵심] 방금 만든 에너지 매니저 함수를 호출하면 ERR 배율까지 알아서 계산해 줍니다!
                context.chargeEnergy(target, finalRecover, "선데이 필살기", false);
            }
        }
    })
);

// 🎯 2 & 3. 로빈 키트: 광역 버프(전스) 및 광역 행게 조작(궁) 추가
const robinkit = new UnitKit(
    new ActionConfig({ name: "평타", sp_gain: 1, energy_gain: 20 }),
    new ActionConfig({ 
        name: "전스", 
        sp_cost: 1, 
        energy_gain: 30,
        abilityUse: (context) => {
            context.simUnits.forEach(ally => {
                // 💡 [핵심] 아까 만든 범용 버프 매니저 활용!
                context.addModifier(ally.unit_id, {
                    id: 'robin_skill_dmg_boost',
                    name: '화음 (피해 증가 50%)',
                    type: 'BUFF',
                    stats: { dmg_boost: 0.50 }, // 피해 증가 50%
                    duration: 3,
                    sourceId: context.actingUnit.unit_id,
                    tickOn: 'TURN_START' // 턴 시작 시 차감
                });
            });
            context.log("모든 아군에게 피해 증가 버프 부여 (3턴)", "로빈 전투 스킬");
        }
    }),
    new ActionConfig({ 
        name: "궁", 
        energy_gain: 5, 
        action_type: ActionType.ULT, 
        energy_cost: 160,
        abilityUse: (context) => {
            context.simUnits.forEach(ally => {
                // 💡 자신(로빈)을 제외한 모든 아군을 즉시 행동하게 함
                if (ally.unit_id !== context.actingUnit.unit_id) {
                    // (오타 그대로 유지하셨던 set_action_guage 사용)
                    ally.set_action_guage(0, context.currentEvent.av);
                    ally.lastAdvancedAV = context.currentEvent.av; 
                    
                    let targetEvent = context.eventQueue.find(e => e.eventType === 'TURN' && e.unitId === ally.unit_id);
                    if (targetEvent) {
                        targetEvent.av = ally.current_action_value;
                        targetEvent.lastAdvancedAV = ally.lastAdvancedAV;
                    }
                    context.log(`[${ally.name}] 즉시 행동 지정`, "로빈 필살기");
                }
            });
        }
    })
);

const huokit = new UnitKit(
    new ActionConfig({ name: "평타", sp_gain: 1, energy_gain: 20 }),
    new ActionConfig({ name: "전스", sp_cost: 1, energy_gain: 30 }),
    new ActionConfig({ name: "궁", energy_gain: 5, action_type: ActionType.ULT, energy_cost: 140 })
);

const Evanescia = new Unit({unit_id: 1505, kit: evakit, rotation: {initial: [], repeat: ['S']}});
const Sunday = new Unit({unit_id: 1313, kit: sundaykit, rotation: {initial: [], repeat: ['S']}});
const Robin = new Unit({unit_id: 1309, kit: robinkit, rotation: {initial: [], repeat: ['S']}});
const Huohuo = new Unit({unit_id: 1217, kit: huokit, rotation: {initial: [], repeat: ['B']}})

Sunday.registerListener(sundayBonusAbility2);

export const availableCharacters = {1505: Evanescia, 1313: Sunday, 1309: Robin, 1217: Huohuo}

export const PRESET_UNITS = [
    Evanescia,
    Sunday,
    Robin,
    Huohuo
];