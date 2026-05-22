import subStatData from './data/relic_sub_affixes.json' with { type: 'json' };
import mainStatData from './data/relic_main_affixes.json' with { type: 'json' };
import gameData from './data/game_data.json' with { type: 'json' };

import { getBaseRelics, Relics } from './relic.js'

export { subStatData, mainStatData, gameData };

export const EventHook = {
    PREP: 'PREP',
    SETTING: 'SETTING',
    ENTER_COMBAT: 'ENTER_COMBAT',
    BATTLE_START: 'BATTLE_START',
    WAVE_START: 'WAVE_START',
    TURN_START: 'TURN_START',
    ACTION_START: 'ACTION_START',
    ABILITY_START: 'ABILITY_START', // 💡 추가됨
    ATTACK_START: 'ATTACK_START',   // 💡 추가됨
    DMG_START: 'DMG_START',         // 💡 추가됨
    DMG_END: 'DMG_END',             // 💡 추가됨
    ATTACK_END: 'ATTACK_END',       // 💡 추가됨
    ABILITY_END: 'ABILITY_END',     // 💡 추가됨
    ACTION_END: 'ACTION_END',
    TURN_END: 'TURN_END'
};

export class EventListener {
    constructor({ id, name, hook, priority = 0, condition, effect }) {
        this.id = id;               // 특성이나 성혼의 고유 ID
        this.name = name;           // UI에 표시할 이름 (예: "선데이 추가 능력 2")
        this.hook = hook;           // 발동 시점 (예: EventHook.BATTLE_START)
        this.priority = priority;   // 우선순위 (낮을수록 먼저 실행, 예: -80)
        this.condition = condition; // 발동 조건 함수 (true/false 반환)
        this.effect = effect;       // 실제 효과를 내는 함수
    }

    // 조건이 맞을 때만 효과를 실행하는 메서드
    execute(context) {
        if (!this.condition || this.condition(context)) {
            this.effect(context);
        }
    }
}

export class ActionConfig {
    constructor({ name, sp_cost = 0, sp_gain = 0, energy_gain = 0, energy_cost = 0, action_type, skill_type, abilityUse = null, tags=['attack'], faction = 'ENEMY', scope = 'SINGLE' }) {
        this.name = name;
        this.sp_cost = sp_cost;
        this.sp_gain = sp_gain;
        this.energy_gain = energy_gain;
        this.action_type = action_type;
        this.skill_type = skill_type;
        this.energy_cost = energy_cost;

        this.faction = faction
        this.scope = scope;
        
        // 💡 특정 캐릭터만의 고유한 타겟팅 로직이나 특수 기믹을 덮어씌울 수 있도록 콜백 허용
        this.customAbilityUse = abilityUse; 
        this.tags=tags
    }

    // 💡 엔진에서 액션 실행 시 직접 호출할 메서드
    abilityUse(context) {
        // 커스텀 로직(예: 선데이 전스)이 들어있으면 그것을 실행
        if (this.customAbilityUse) {
            return this.customAbilityUse(context);
        }

        // 커스텀이 없는 일반 공격/스킬이면 원래 사용자님이 구상했던 수정치(modification) 로직 실행
        if (this.skill_ability && context.target) {
            // (이 부분은 나중에 타겟팅 시스템이 완성되면 마저 구현하면 됩니다)
            // return context.target.modification(this.skill_ability, this.ability_values);
        }
    }
}

export class UnitKit {
    constructor(basic, skill, ultimate, technique=undefined) {
        this.basic = basic;
        this.skill = skill;
        this.ultimate = ultimate;
        this.technique = technique;
    }
}

export async function fetchStarRailData(uid) {
    // 이제 외부 프록시 사이트 대신 내 도메인의 /api/hsr 주소로 바로 요청합니다!
    const url = `/api/fetch?uid=${uid}`; 
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("데이터 로드 실패");
        
        const data = await response.json();
        
        return data
    } catch (error) {
        console.error(error);
        alert(error)
    }
}

// 💡 [추가] 전투 스킬 포인트(SP) 상태를 정밀 제어하는 매니저
export class SkillPointManager {
constructor(initial = 3, max = 5, min = 0) {
    this.current = initial;
    this.max = max;
    this.min = min;
}

modify(amount, contextLogs = null) {
    const before = this.current;
    this.current = Math.min(this.max, Math.max(this.min, this.current + amount));
    
    if (contextLogs && before !== this.current) {
        const diff = this.current - before;
        contextLogs.push({ 
            sourceName: "SP 변동", 
            message: `SP: ${before} ➔ ${this.current} (${diff > 0 ? '+' : ''}${diff})` 
        });
    }
    return this.current;
}

// 향후 스파클 등 최대 SP 확장 기믹 지원용
setMaxSP(newMax) {
    this.max = newMax;
}
}

// 💡 [추가] 에너지 충전 시스템 파이프라인 (ERR 효율 계산 통합)
export function chargeUnitEnergy(unit, baseAmount, reason, context = null, applyErr = true) {
    // 💡 applyErr가 true일 때만 ERR을 곱하고, false면 기초 회복량을 그대로 사용
    const errRate = applyErr ? (unit.err || 1.0) : 1.0; 
    const actualGain = baseAmount * errRate;
    
    const beforeEnergy = unit.energy || 0;
    unit.energy = Math.min(unit.max_energy, beforeEnergy + actualGain);
    const afterEnergy = unit.energy;

    if (context && context.targetLogsArray) {
        let msg = `${unit.name} [${reason}]: +${actualGain.toFixed(2)} 충전 `;
        msg += `(${beforeEnergy.toFixed(2)} ➔ ${afterEnergy.toFixed(2)})`;
        if (applyErr) {
            msg += ` (기초 ${baseAmount} * ERR ${(errRate * 100).toFixed(1)}%)`;
        } else {
            msg += ` (고정값)`;
        }
        
        context.targetLogsArray.push({
            sourceName: "에너지 회복",
            message: msg
        });
    }
}

export class Modifier {
    constructor(config) {
        this.id = config.id || Math.random().toString(36).substring(2, 11);
        this.name = config.name;
        this.type = config.type || 'BUFF';
        this.stats = config.stats || {};
        this.duration = config.duration || 1;
        this.sourceId = config.sourceId || 'SYSTEM';
        this.tickOn = config.tickOn || 'TURN_END';
        this.tickSource = config.tickSource || 'self'; 
        this.stack = config.stack || 1;
        
        this.requireTurnStart = config.requireTurnStart !== false; 
        this.hasSeenTurnStart = false; 

        if (typeof config.onRemove === 'function') {
            this.onRemove = config.onRemove;
        }
    }
}

export class ModifierManager {
    constructor(unit) {
        this.unit = unit;
        this.list = [];
    }

    add(modifierConfig, contextLogs = null) {
        let duration = modifierConfig.duration;
        if (duration === undefined || duration === null) {
            duration = Infinity;
        }

        const existing = this.list.find(m => m.id === modifierConfig.id);
        if (existing) {
            existing.duration = Math.max(existing.duration, duration);
            existing.hasSeenTurnStart = false; // 갱신 시 버프 연장 혜택 초기화
            
            if (contextLogs) {
                const logDuration = existing.duration === Infinity ? "무한" : `${existing.duration}턴`;
                contextLogs.push({ sourceName: "상태 갱신", message: `[${existing.name}] 지속 시간 갱신 (${logDuration})` });
            }
        } else {
            const newMod = new Modifier({
                ...modifierConfig,
                duration: duration
            });
            this.list.push(newMod);

            if (contextLogs) {
                const logDuration = duration === Infinity ? "무한" : `${duration}턴`;
                contextLogs.push({ sourceName: "상태 부여", message: `[${modifierConfig.name}] 부여됨 (${logDuration})` });
            }
        }
    }

    remove(id, contextLogs = null) {
        const index = this.list.findIndex(m => m.id === id);
        if (index !== -1) {
            const removed = this.list.splice(index, 1)[0];
            if (contextLogs) {
                contextLogs.push({ sourceName: "상태 종료", message: `[${removed.name}] 해제됨 ❌` });
            }
            if (typeof removed.onRemove === 'function') {
                removed.onRemove(contextLogs);
            }
        }
    }

    // 💡 [핵심] 현재 누구의 턴인지(actingUnitId)를 인수로 받습니다.
    // 인수를 아예 안 넣으면 자동으로 장착자 본인의 ID를 넣으므로 기존 코드에 전혀 에러가 나지 않습니다.
    tick(tickEvent, actingUnitId = this.unit.unit_id, contextLogs = null) {
        for (let i = this.list.length - 1; i >= 0; i--) {
            const mod = this.list[i];
            
            if (mod.duration === Infinity) continue;

            // 💡 [신규] 차감 주체(tickSource) 검증
            // tickSource가 'self'라면 장착자 본인(this.unit.unit_id)의 턴인지 확인합니다.
            // 특정 ID(선데이 등)가 지정되었다면, 이번 턴의 주인(actingUnitId)이 그 사람일 때만 작동합니다.
            const expectedTickSource = mod.tickSource === 'self' ? this.unit.unit_id : mod.tickSource;
            
            // 차감 주체가 아니라면 이번 틱 연산은 완전히 무시합니다! (남의 턴에는 안 깎임)
            if (expectedTickSource !== actingUnitId) continue;

            if (tickEvent === 'TURN_START') {
                mod.hasSeenTurnStart = true;
            }

            if (mod.tickOn === tickEvent) {
                if (tickEvent === 'TURN_END' && mod.requireTurnStart && !mod.hasSeenTurnStart) {
                    if (contextLogs) {
                        contextLogs.push({ sourceName: "상태 유지", message: `[${mod.name}] 이번 턴 내에 획득/갱신되어 기간 유지 🛡️` });
                    }
                    continue; 
                }

                mod.duration -= 1;
                
                if (mod.duration > 0 && contextLogs) {
                    contextLogs.push({ sourceName: "상태 차감", message: `[${mod.name}] 남은 턴: ${mod.duration} ⏳` });
                }
                
                if (mod.duration <= 0) {
                    this.remove(mod.id, contextLogs);
                } else {
                    if (tickEvent === 'TURN_END') {
                        mod.hasSeenTurnStart = false;
                    }
                }
            }
        }
    }

    getStat(statKey) {
        return this.list.reduce((sum, mod) => sum + (mod.stats[statKey] || 0), 0);
    }
}

export function resolveTargets(simUnits, actor, mainTargetId, faction, scope) {
    let targets = [];
    
    // 1. 피아 식별 (현재는 적군 시스템이 없으므로 임시로 파티원 전체를 아군 풀로 취급)
    // 향후 적군 객체가 생기면 u.faction === 'ALLY' / 'ENEMY' 로 구분하여 validPool을 짭니다.
    let validPool = simUnits.filter(u => u.unit_id !== 1309 || u.archetype !== 'COUNTDOWN'); // 카운트다운 같은 시스템 유닛 제외

    // 2. 범위(Scope)에 따른 타겟 배열 완성
    if (scope === 'SELF') {
        targets = [actor];
    } 
    else if (scope === 'AOE') {
        targets = [...validPool]; // 해당 진영 전체
    } 
    else if (scope === 'SINGLE') {
        const target = validPool.find(u => String(u.unit_id) === String(mainTargetId));
        if (target) targets = [target];
    } 
    else if (scope === 'BLAST') {
        // 확산 기믹: 메인 타겟을 찾은 뒤, validPool 배열에서의 인덱스를 기준으로 좌/우 유닛을 찾음
        const tIndex = validPool.findIndex(u => String(u.unit_id) === String(mainTargetId));
        if (tIndex !== -1) {
            if (tIndex > 0) targets.push(validPool[tIndex - 1]); // 좌측 타겟
            targets.push(validPool[tIndex]);                     // 메인 타겟
            if (tIndex < validPool.length - 1) targets.push(validPool[tIndex + 1]); // 우측 타겟
        }
    }

    return targets;
}