import { EventListener, EventHook } from '../config.js';

export const relic121 = [
    new EventListener({
        id: "Relic_121_Main",
        name: "장신구 [사제] 2세트 (스킬/궁 타겟 버프 부여)",
        hook: EventHook.ABILITY_START,
        priority: 0,
        // 액션 타입이 스킬이거나 궁극기일 때만 발동
        condition: (context) => ['S', 'ULT'].includes(context.actionType) && context.actingUnit.unit_id === context.caster.unit_id,
        effect: (context) => {
            if (!context.target) return;

            // 1. 기존 사제 버프 찾기 (스택 확인)
            const existing = context.target.modifiers.list.find(m => m.id === 'Relic_121_Sub');
            
            // 2. 스택 계산 (없으면 1, 있으면 +1 하되 최대 2)
            const newStack = existing ? Math.min(existing.stack + 1, 2) : 1;
            
            // 3. [야화 광추 패턴 적용] 스택 기반 스탯 계산 및 갱신
            context.addModifier(context.target.unit_id, {
                id: 'Relic_121_Sub',
                name: `사제 (치명타 피해 ${newStack * 18}%)`,
                type: 'BUFF',
                duration: 2,
                stack: newStack, // 💡 스택 정보를 버프 인스턴스에 저장
                stats: { crit_dmg_boost: newStack * 0.18 }, // 💡 스택별 스탯 계산
                sourceId: context.caster.unit_id
            });
            
            context.log(`${context.target.name}에게 [사제] 버프 부여/갱신 (스택: ${newStack}, 치피 +${newStack * 18}%)`, "유물 패시브");
        }
    })
];