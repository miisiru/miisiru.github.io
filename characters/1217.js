import { UnitKit, ActionConfig, EventListener, EventHook} from '../config.js';
import { getBaseLCId } from '../lc.js'
import { Unit } from '../character.js'

// 🎯 곽향 추가 능력 1: 전투 시작 시 에너지 30pt 및 양명 2턴
const huohuoTrace1 = new EventListener({
    id: "huohuo_trace_1",
    name: "곽향 추가 능력 1",
    hook: EventHook.ENTER_COMBAT, // 전투 진입 시점
    priority: -80,
    effect: (context) => {
        context.chargeEnergy(context.caster, 30, "나서지 못하는 마음");
        
        context.addModifier(context.caster.unit_id, {
            id: 'huohuo_yangmyung',
            name: '양명',
            type: 'BUFF',
            duration: 2, // 추가 능력으로 얻는 건 2턴
            sourceId: context.caster.unit_id,
            tickOn: 'TURN_START' // 곽향 본인 턴 시작 시 1 감소
        });
    }
});

// 🎯 곽향 특성 (턴 시작 감지): 누군가 턴을 시작할 때, 양명이 있다면 에너지 2 회복
const huohuoTalentTurn = new EventListener({
    id: "huohuo_talent_turn",
    name: "곽향 특성 (턴 시작)",
    hook: EventHook.TURN_START,
    priority: 0,
    condition: (context) => {
        // 💡 곽향 본인(caster)이 '양명' 상태인지 검사
        return context.caster.modifiers.list.some(m => m.id === 'huohuo_yangmyung');
    },
    effect: (context) => {
        // 💡 턴을 맞이한 아군(actingUnit)에게 에너지 2pt 부여
        context.chargeEnergy(context.caster, 2, "특성 (양명)");
    }
});

// 🎯 곽향 특성 (궁극기 감지): 누군가 스킬/궁을 쓸 때, 양명이 있다면 에너지 2 회복
const huohuoTalentUlt = new EventListener({
    id: "huohuo_talent_ult",
    name: "곽향 특성 (궁극기 발동)",
    hook: EventHook.ABILITY_START,
    priority: 0,
    condition: (context) => {
        // 💡 방금 발동한 능력이 궁극기(ULT)이고, 곽향에게 양명이 있는지 검사
        return context.actionType === 'ULT' && context.caster.modifiers.list.some(m => m.id === 'huohuo_yangmyung');
    },
    effect: (context) => {
        // 💡 궁극기를 쓴 아군(actingUnit)에게 에너지 2pt 부여
        context.chargeEnergy(context.caster, 2, "특성 (양명)");
    }
});


const huokit = new UnitKit(
    new ActionConfig({ name: "평타", sp_gain: 1, energy_gain: 20, tags: ['attack'] }),
    new ActionConfig({ 
        name: "전스", 
        sp_cost: 1, 
        energy_gain: 30,
        tags: ['support'],
        abilityUse: (context) => {
            // 전스 사용 시 곽향 본인에게 양명 3턴 갱신
            context.addModifier(context.actingUnit.unit_id, {
                id: 'huohuo_yangmyung',
                name: '양명',
                type: 'BUFF',
                duration: 3,
                sourceId: context.actingUnit.unit_id,
                tickOn: 'TURN_START'
            });
            context.log("자신에게 [양명] 상태 부여 (3턴)", "곽향 전투 스킬");
        }
    }),
    new ActionConfig({ 
        name: "궁", 
        energy_gain: 5, 
        energy_cost: 140,
        tags: ['support'], // 💡 지원형 궁극기이므로 피증/방깎 타격 프로세스 스킵
        abilityUse: (context) => {
            const huohuoId = context.actingUnit.unit_id;

            // 1. 궁극기 사용 시 곽향 본인에게 양명 3턴 갱신
            context.addModifier(huohuoId, {
                id: 'huohuo_yangmyung',
                name: '양명',
                type: 'BUFF',
                duration: 3,
                sourceId: huohuoId,
                tickOn: 'TURN_START'
            });

            // 2. 동료 전체 주유 및 버프
            context.simUnits.forEach(ally => {
                if (ally.unit_id !== huohuoId) {
                    // 에너지 최대치의 20% 회복 (ERR 미적용 고정치이므로 false 전달)
                    let recoverAmt = ally.max_energy * 0.20;
                    context.chargeEnergy(ally, recoverAmt, "곽향 필살기", false);
                    
                    // 공격력 40% 버프 2턴 부여
                    context.addModifier(ally.unit_id, {
                        id: 'huohuo_ult_atk_boost',
                        name: '신귀 사역 (공격력 증가)',
                        type: 'BUFF',
                        stats: { atk_boost: 0.40 },
                        duration: 2,
                        sourceId: huohuoId,
                        tickOn: 'TURN_END'
                    });
                }
            });
            context.log("동료 에너지 20% 회복 및 공격력 40% 증가 (2턴)", "곽향 필살기");
        }
    })
);

export const Huohuo = new Unit({unit_id: 1217, kit: huokit, rotation: {initial: [], repeat: ['B']}})

Huohuo.registerListener(huohuoTrace1);
Huohuo.registerListener(huohuoTalentTurn);
Huohuo.registerListener(huohuoTalentUlt);