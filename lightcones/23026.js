import { EventListener, EventHook } from '../config.js';

export const lc23026 = [
    // 🎯 [MAIN] 이벤트 리스너: 아군 공격 시작 감지
    new EventListener({
        id: "LC_23026_MAIN_ATTACK",
        name: "광추 [야화] (노래 획득 감지)",
        hook: EventHook.ATTACK_START, // 원작 데이터 명세 고증
        priority: 10,
        condition: (context) => (context.actingUnit.faction === 'ALLY'),
        effect: (context) => {
            const wearer = context.caster;
            
            // 1. 기존 버프 찾기
            const existing = wearer.modifiers.list.find(m => m.id === 'LC_23026_SUB');
            const currentStack = existing ? existing.stack : 0;
            
            if (currentStack < 5) {
                const nextStack = currentStack + 1;
                
                // 2. 버프 갱신 (stack 속성 활용)
                context.addModifier(wearer.unit_id, {
                    id: 'LC_23026_SUB',
                    name: `노래 (${nextStack}스택)`,
                    type: 'BUFF',
                    stack: nextStack, // 🎯 이제 버프 안에 스택을 저장합니다!
                    stats: { err_boost: 0.03 * nextStack },
                    sourceId: wearer.unit_id
                });
                
                context.log(`노래 스택 갱신: ${nextStack}스택 (에너지 회복 효율 +${(3 * nextStack)}%)`, "광추 패시브");
            }
        }
    }),

    // 🎯 [MAIN] 이벤트 리스너: 본인 스킬 시전 감지 (궁극기 분기)
    new EventListener({
        id: "LC_23026_MAIN_ULT",
        name: "광추 [야화] (카덴차 발동 감지)",
        hook: EventHook.ABILITY_START,
        priority: 5,
        // 조건: 시전자가 장착자 본인이고, 발동한 스킬이 궁극기(ULT)일 때
        condition: (context) => context.actingUnit.unit_id === context.caster.unit_id && context.actionType === 'ULT',
        effect: (context) => {
            const wearer = context.caster;
            
            // 1) 기존에 쌓여있던 🎯 [SUB] 버프 해제 및 스택 초기화
            wearer.lc23026_stacks = 0;
            wearer.modifiers.remove('LC_23026_SUB', context.targetLogsArray);

            // 2) 🎯 [SUB2] 본인 버프 부여 (지속 1턴, 본인 턴 시작 시 차감)
            context.addModifier(wearer.unit_id, {
                id: 'LC_23026_SUB2',
                name: '카덴차 (본인 공격력/피증)',
                type: 'BUFF',
                stats: { atk_boost: 0.48, dmg_boost: 0.24 },
                duration: 1, 
                sourceId: wearer.unit_id,
                tickOn: 'TURN_START',
                
                // 🔥 [원작 고증 핵심 기믹] SUB2가 수명을 다해 remove될 때 발동할 연쇄 자폭 시퀀스
                onRemove: (logsArray) => {
                    context.simUnits.forEach(ally => {
                        // 모든 아군에게서 🎯 [SUB3] 무한 버프를 확정 압수
                        ally.modifiers.remove('LC_23026_SUB3', logsArray);
                    });
                    // 컨텍스트의 기존 로그 연동을 위해 수동 로그 추가
                    if (logsArray) {
                        logsArray.push({ sourceName: "광추 패시브", message: "LC_23026_SUB2 만료에 따른 모든 아군의 LC_23026_SUB3 연쇄 제거 완료" });
                    }
                }
            });

            // 3) 🎯 [SUB3] 모든 아군에게 광역 피해 증가 버프 부여 (duration 생략 = 무한 지속)
            context.simUnits.forEach(ally => {
                context.addModifier(ally.unit_id, {
                    id: 'LC_23026_SUB3',
                    name: '카덴차 (아군 피증)',
                    type: 'BUFF',
                    stats: { dmg_boost: 0.24 },
                    sourceId: wearer.unit_id
                });
            });

            context.log("필살기 발동: [노래] 스택 전량 소모 $\rightarrow$ [카덴차] 모드 진입 (본인 공+48%/피증+24%, 아군 피증+24%)", "광추 패시브");
        }
    })
];