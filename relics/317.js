import { EventListener, EventHook } from '../config.js';

export const planar317 = [
    new EventListener({
        id: "Relic_317_Main",
        name: "장신구 [루샤카] 2세트 (전투 진입 시 버프 부여)",
        hook: EventHook.ENTER_COMBAT,
        priority: -80,
        condition: (context) => true,
        effect: (context) => {
            // 💡 파티 편성의 가장 왼쪽 유닛 = simUnits 배열의 첫 번째 아군
            const leftmostUnit = context.simUnits.find(u => u.side === 'ALLY');
            
            if (leftmostUnit) {
                // 🎯 파티 1번 타겟에게 영구 버프 부여 (duration 생략)
                context.addModifier(leftmostUnit.unit_id, {
                    id: 'Relic_317_Sub',
                    name: '루샤카 (파티 1번 공격력 증가)',
                    type: 'BUFF',
                    stats: { atk_boost: 0.12 },
                    sourceId: context.caster.unit_id
                });
                
                context.log(`파티 1번 자리 [${leftmostUnit.name}]에게 루샤카 2세트 버프 부여 (공격력 +12%)`, "유물 패시브");
            }
        }
    })
];