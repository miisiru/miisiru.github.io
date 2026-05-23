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

const huohuoTrace3 = new EventListener({
    id: "huohuo_trace_3",
    name: "곽향 추가 능력 3",
    hook: EventHook.HEAL_DONE, // 누군가 힐을 받았을 때
    priority: 0,
    condition: (context) => {
        // 방금 발생한 힐의 출처가 곽향의 '특성 (양명)'인지 확인
        return context.healSource === "특성 (양명)";
    },
    effect: (context) => {
        // 치유가 발생할 때마다 곽향 본인에게 에너지 1 회복
        context.chargeEnergy(context.caster, 1, "추가 능력 3 (겁쟁이 구원)");
    }
});

const huohuoTalentTurn = new EventListener({
    id: "huohuo_talent_turn",
    name: "곽향 특성 (턴 시작 힐)",
    hook: EventHook.TURN_START,
    priority: 0,
    condition: (context) => {
        return context.caster.modifiers.list.some(m => m.id === 'huohuo_yangmyung') && context.actingUnit.faction === 'ALLY';
    },
    effect: (context) => triggerYangmingHeal(context)
});

const huohuoTalentUlt = new EventListener({
    id: "huohuo_talent_ult",
    name: "곽향 특성 (궁극기 발동 힐)",
    hook: EventHook.ABILITY_START,
    priority: 0,
    condition: (context) => {
        return context.actionType === 'ULT' && context.caster.modifiers.list.some(m => m.id === 'huohuo_yangmyung') && context.actingUnit.faction === 'ALLY';
    },
    effect: (context) => triggerYangmingHeal(context)
});

function triggerYangmingHeal(context) {
    const huohuo = context.caster;
    const triggerUnit = context.actingUnit;
    const healAmt = (huohuo.max_hp * 0.045) + 120; // 4.5% + 120

    // 1. 체력 비율이 가장 낮은 아군 찾기
    const allies = context.simUnits.filter(u => u.faction === 'ALLY');
    const lowestHpUnit = allies.reduce((prev, curr) => (prev.current_hp / prev.max_hp) < (curr.current_hp / curr.max_hp) ? prev : curr);

    // 2. 발동자와 최저 체력 아군에게 힐 (Set을 통해 동일 인물일 경우 중복 힐 1회로 압축)
    const targetsToHeal = [triggerUnit, lowestHpUnit];
    targetsToHeal.forEach(target => {
        context.heal(target, healAmt, "특성 (양명)"); 
    });

    // 3. 체력 50% 이하인 다른 아군들 추가 힐
    // 이미 힐을 받은 대상도 50% 이하라면 또 힐을 받음 (중복 제외 로직 삭제)
    allies.forEach(ally => {
        if ((ally.current_hp / ally.max_hp) <= 0.5) {
            context.heal(ally, healAmt, "특성 (양명)");
        }
    });
}

const huokit = new UnitKit(
    new ActionConfig({ name: "평타", sp_gain: 1, energy_gain: 20, tags: ['attack'] }),
    new ActionConfig({ 
        name: "전스", 
        sp_cost: 1, 
        energy_gain: 30,
        tags: ['support'],
        faction: 'ALLY',
        scope: 'BLAST',
        abilityUse: (context) => {
            const huohuo = context.actingUnit;
            const mainTarget = context.targets[0]; // 타겟 해석기가 넘겨준 첫 번째 배열 값이 메인 타겟

            // 2. 메인 타겟 힐 (24% + 640)
            const mainHealAmt = (huohuo.max_hp * 0.24) + 640;
            context.heal(mainTarget, mainHealAmt, "곽향 전투 스킬");

            // 3. 인접 타겟 힐 (19.2% + 512)
            const adjHealAmt = (huohuo.max_hp * 0.192) + 512;
            for (let i = 1; i < context.targets.length; i++) {
                context.heal(context.targets[i], adjHealAmt, "곽향 전투 스킬 (인접)");
            }

            // 4. 자신에게 양명 3턴 갱신
            context.addModifier(huohuo.unit_id, {
                id: 'huohuo_yangmyung',
                name: '양명',
                type: 'BUFF',
                duration: 3,
                sourceId: huohuo.unit_id,
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
        faction: 'ALLY',
        scope: 'AOE',
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
            context.targets.forEach(target => {
                if (target.unit_id !== huohuoId) {
                    // 에너지 최대치의 20% 회복 (ERR 미적용 고정치이므로 false 전달)
                    let recoverAmt = target.max_energy * 0.20;
                    context.chargeEnergy(target, recoverAmt, "곽향 필살기", false);
                    
                    // 공격력 40% 버프 2턴 부여
                    context.addModifier(target.unit_id, {
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
Huohuo.registerListener(huohuoTrace3); // 💡 신규 등록
Huohuo.registerListener(huohuoTalentTurn);
Huohuo.registerListener(huohuoTalentUlt);