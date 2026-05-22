import { UnitKit, ActionConfig, EventListener, EventHook} from '../config.js';
import { getBaseLCId } from '../lc.js'
import { Unit } from '../character.js'

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
    new ActionConfig({ 
        name: "전투 스킬", 
        sp_cost: 1, 
        energy_gain: 30,
        tags: ['support'],
        abilityUse: (context) => {
            let target = context.simUnits.find(unit => unit.name === "Evanescia");
            
            if (target) {
                // 💡 [변경] 로빈과 똑같이 엔진의 통합 API를 사용하여 즉시 행동(100% 행게증)을 부여합니다.
                // 이 함수가 내부적으로 우선순위(queueId)와 AV 정렬까지 완벽하게 처리합니다.
                context.advanceActionGauge(target.unit_id, 100, "선데이 전투 스킬");
                
                context.log(`[${target.name}] 즉시 행동 지정`, "선데이 전투 스킬");
            }
        }
    }),
    new ActionConfig({ 
        name: "궁", 
        energy_gain: 5, 
        energy_cost: 130,
        tags: ['support'],
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

export const Sunday = new Unit({unit_id: 1313, kit: sundaykit, rotation: {initial: [], repeat: ['S']}});
Sunday.registerListener(sundayBonusAbility2);