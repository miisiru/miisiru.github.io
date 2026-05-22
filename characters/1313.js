import { UnitKit, ActionConfig, EventListener, EventHook} from '../config.js';
import { getBaseLCId } from '../lc.js'
import { Unit } from '../character.js'

const sundayUltimate = new ActionConfig({
    name: "필살기",
    energy_cost: 130, 
    energy_gain: 5,
    tags: ['support'],
    faction: 'ALLY',
    scope: 'SINGLE',
    abilityUse: (context) => {
        const target = context.targets[0];
        
        if (target) {
            context.addModifier(target.unit_id, {
                id: 'SUNDAY_GRACE',
                name: '은혜 입은 자',
                type: 'BUFF',
                stats: {}, // 필요한 스탯 버프 수치가 있다면 여기에 추가
                duration: 3,
                tickOn: 'TURN_START',
                tickSource: context.actingUnit.unit_id, // 💡 시전자(선데이)의 유닛 ID를 주입해서 선데이 턴에만 깎이도록 봉인
                sourceId: context.actingUnit.unit_id
            });

            context.log(`[${target.name}]에게 [은혜 입은 자] 상태 부여 (선데이 턴 시작 기준 3턴 지속)`, "선데이 필살기");

            // 목표 최대 에너지의 20% 계산
            let recoverAmt = target.max_energy * 0.20;
            // 40 미만이면 40으로 고정 (Math.max 활용)
            let finalRecover = Math.max(recoverAmt, 40);
            
            // 💡 [핵심] 방금 만든 에너지 매니저 함수를 호출하면 ERR 배율까지 알아서 계산해 줍니다!
            context.chargeEnergy(target, finalRecover, "선데이 필살기", false);
        }
    }
});

const sundaySkill = new ActionConfig({
    name: "전투 스킬",
    sp_cost: 1,         // 💡 엔진 파이프라인이 이 수치를 읽고 먼저 SP를 1 감소시킵니다. (-1 정산)
    energy_gain: 30, 
    tags: ['support'],
    faction: 'ALLY',
    scope: 'SINGLE',
    abilityUse: (context) => {
        let target = context.targets[0];
        
        if (target) {
            // 💡 1) 「화합」 운명의 길 캐릭터 검증 기믹
            const isHarmony = target.path === '화합' || (context.gameData?.characters?.[target.unit_id]?.path === '화합');
            
            if (isHarmony) {
                context.log(`[${target.name}] 대상이 「화합」 운명의 길 캐릭터이므로 즉시 행동 효과가 발동하지 않습니다.`, "선데이 전투 스킬");
            } else {
                // 화합이 아닐 때만 정상적으로 100% 행게증 발동
                context.advanceActionGauge(target.unit_id, 100, "선데이 전투 스킬");
            }

            // 💡 2) [은혜 입은 자] 상태 대상 시전 시 SP 1pt 회복 기믹
            const hasGrace = target.modifiers.list.some(m => m.id === 'SUNDAY_GRACE');
            if (hasGrace) {
                // 💡 절대 사전에 퉁치지 않고, -1 정산이 완료된 context의 spManager를 직접 깨워 +1 연산을 추가 실행합니다.
                context.spManager.modify(1, context.targetLogsArray);
                context.log(`[은혜 입은 자] 상태인 ${target.name}에게 스킬 시전 처리 ➔ SP 1pt 즉시 회복 완료`, "선데이 전투 스킬 효과");
            }
        }
    }
});


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

const sundaykit = new UnitKit(
    new ActionConfig({ name: "평타", sp_gain: 1, energy_gain: 20 }),
    sundaySkill,
    sundayUltimate
);

export const Sunday = new Unit({unit_id: 1313, kit: sundaykit, rotation: {initial: [], repeat: ['S']}});
Sunday.registerListener(sundayBonusAbility2);