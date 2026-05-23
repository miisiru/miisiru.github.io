import { UnitKit, ActionConfig, EventListener, EventHook} from '../config.js';
import { getBaseLCId } from '../lc.js'
import { Unit } from '../character.js'

const evakit = new UnitKit(
    // 1. 일반 공격 (단일)
    new ActionConfig({ 
        name: "평타", 
        type: 'BASIC',
        tags: ['attack', 'BASIC'], // 평타 및 공격 태그
        scalingStat: 'atk',        // 공격력 기반
        multiplier: 1.0,           // 계수 100%
        sp_gain: 1, 
        energy_gain: 20,
        abilityUse: (context) => {
            // 엔진이 타겟(context.targets)을 알아서 잡아줍니다. 데미지만 꽂으세요!
            if (context.targets) {
                context.targets.forEach(target => context.dealDamage(target.unit_id));
            }
        }
    }),

    // 2. 전투 스킬 (확산)
    new ActionConfig({ 
        name: "전스", 
        type: 'S',
        faction: "ENEMY", 
        scope: "BLAST",            // 확산
        tags: ['attack', 'SKILL'], // 전투 스킬 및 공격 태그
        scalingStat: 'atk',
        multiplier: 1.5,           // 계수 150%
        sp_cost: 1, 
        energy_gain: 30, 
        abilityUse: (context) => {
            // BLAST(확산) 스코프이므로 메인 타겟 1명 + 양옆 타겟까지 배열로 들어옵니다.
            if (context.targets) {
                context.targets.forEach(target => context.dealDamage(target.unit_id));
            }
        }
    }),

    // 3. 필살기 (광역 & 다단히트 테스트)
    new ActionConfig({ 
        name: "궁", 
        type: 'ULT',
        faction: "ENEMY", 
        scope: "AOE",              // 광역
        tags: ['attack', 'ULT'],   // 필살기 및 공격 태그
        scalingStat: 'atk',
        multiplier: 3.0,           // 계수 300%
        hitSplit: [0.3, 0.3, 0.4], // 🎯 다단히트 테스트! (30%, 30%, 40%로 3번 나누어 때림)
        energy_gain: 5, 
        energy_cost: 240, 
        abilityUse: (context) => {
            // AOE(광역) 스코프이므로 적 전체가 배열에 담겨 들어옵니다.
            if (context.targets) {
                context.targets.forEach(target => context.dealDamage(target.unit_id));
            }
        }
    })
);

export const Evanescia = new Unit({unit_id: 1505, kit: evakit, rotation: {initial: [], repeat: ['S']}});