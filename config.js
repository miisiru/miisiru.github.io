import subStatData from './data/relic_sub_affixes.json' with { type: 'json' };
import mainStatData from './data/relic_main_affixes.json' with { type: 'json' };
import gameData from './data/game_data.json' with { type: 'json' };

import { getBaseLCId } from './lc.js'
import { getBaseRelics, Relics } from './relic.js'

export { subStatData, mainStatData, gameData };

/**
 * char.js - 캐릭터 및 클래스 데이터 정의
 */
export const Faction = { ALLY: 'ALLY', ENEMY: 'ENEMY' };
export const ActionType = { BASIC: 'BASIC', SKILL: 'SKILL', ULT: 'ULT' };
export const SkillType = { SUPPORT: 'SUPPORT', ATTACK: 'ATTACK' };
export const Ability = { ActionGuageModification: 'AG' };

export function getMainStatValue(StatName, level, rarity=5) {
    const statMap = {
        "HPDelta": 1,
        "ATKDelta": 2,
        "HPAddedRatio": 3,
        "AttackAddedRatio": 3,
        "DefenceAddedRatio": 3,
        "CriticalChanceBase": 3,
        "CriticalDamageBase": 3,
        "HealRatioBase": 3,
        "StatusProbabilityBase": 3,
        "SpeedDelta": 4,
        "PhysicalAddedRatio": 5,
        "BreakDamageAddedRatioBase": 6,
        "SPRatioBase": 6,
        "PhysicalAddedRatio": 5,
        "FireAddedRatio": 5,
        "IceAddedRatio": 5,
        "ThunderAddedRatio": 5,
        "WindAddedRatio": 5,
        "QuantumAddedRatio": 5,
        "ImaginaryAddedRatio": 5,
    }
        // 1. 이미지의 '56'번에 해당하는 데이터 객체 접근
    const statData = mainStatData[rarity * 10 + statMap[StatName]];

    // 2. affixes 객체 내부의 값들(1, 2, 3, 4, 5...)을 배열로 뽑아내기
    // Object.values(statData.affixes)를 하면 [{affix_id: "1", property:...}, {...}] 형태의 배열이 됩니다.
    const affixList = statData?.affixes ? Object.values(statData.affixes) : [];

    // 3. 배열에서 property가 StatName과 일치하는 요소 찾기
    const matchedAffix = affixList.find(affix => affix.property === StatName);

    // 4. 안전하게 base와 step 추출하기
    if (matchedAffix) {
        const { base, step } = matchedAffix;
        return base+step*level
    } else { return 0 }
}

export function getSubStatValue(StatName, quality, rarity=5) {
    const rarityData = subStatData[rarity];
    
    // 2. affixes 객체 안의 값들 (1, 2, 3...)을 순수한 배열로 변환
    const affixList = rarityData?.affixes ? Object.values(rarityData.affixes) : [];
    
    // 3. 배열에서 property가 StatName과 일치하는 요소 찾기
    const matchedAffix = affixList.find(affix => affix.property === StatName);
    
    // 4. 일치하는 데이터를 찾았다면 base와 step을 객체로 묶어서 반환
    if (matchedAffix) {
        const { base, step } = matchedAffix;
        const qualityMultiplier = {
            "low": 0,
            "mid": 1,
            "high": 2
        }
        return base+step*(qualityMultiplier[quality] ?? 0)
    } else { return 0 }
}

export function totalRelicStats(relics, statName) {
    let totals = 0;
    
    if (!relics) return totals;

    // 1. 주옵션 정산
    if (relics.main && Array.isArray(relics.main)) {
        relics.main.forEach(mainStat => {
            // 인수로 요청받은 statName과 일치할 때만 계산
            if (mainStat === statName) {
                const statValue = getMainStatValue(mainStat, 15, 5);
                if (statValue > 0) {
                    totals += statValue;
                }
            }
        });
    }

    // 2. 부옵션 정산
    if (relics.sub && Array.isArray(relics.sub)) {
        relics.sub.forEach(subItem => {
            // 인수로 요청받은 statName과 일치할 때만 계산
            if (subItem.name === statName) {
                const rollCount = subItem.count || 0;
                const quality = subItem.quality || 'mid';
                
                // 이전에 만든 함수를 활용해 1회당 수치를 안전하게 가져옵니다.
                const singleValue = getSubStatValue(subItem.name, quality, 5);
                
                totals += singleValue * rollCount;
            }
        });
    }
    
    return totals;
}

export function action_value_from_spd(spd) {
    return Math.max(1, 10000 / spd);
}

export class ActionConfig {
    constructor({ name, sp_cost = 0, sp_gain = 0, energy_gain = 0, action_type = ActionType.BASIC, skill_type = SkillType.ATTACK, skill_ability = undefined, ability_values = {aa: 0, ad: 0}}) {
        this.name = name;
        this.sp_cost = sp_cost;
        this.sp_gain = sp_gain;
        this.energy_gain = energy_gain;
        this.action_type = action_type;
        this.skill_type = skill_type;
        this.skill_ability = skill_ability;
        this.ability_values = ability_values;
    }

    abilityUse(target) {
        if (!this.skill_ability || !target) return;
        return target.modification(this.skill_ability, this.ability_values);
    }
}

export class LightCone {
    constructor(id, superimposition=undefined) {
        this.id = id
        this.name = gameData.lightCones[id].name
        this.rarity = gameData.lightCones[id].rarity
        this.base_hp = gameData.lightCones[id].stats.HP
        this.base_atk = gameData.lightCones[id].stats.ATK
        this.base_def = gameData.lightCones[id].stats.DEF
        this.superimpostion = superimposition ?? (this.rarity === 5 ? 1 : 5);
        this.superimposition_values = gameData.lightCones[id].superimpositions
    }
}

export class UnitKit {
    constructor(basic, skill, ultimate) {
        this.basic = basic;
        this.skill = skill;
        this.ultimate = ultimate;
    }
}

export class Unit {
    constructor({unit_id, name=undefined, max_energy=undefined, kit, lightcone=undefined, relics=undefined}) {
        this.unit_id = unit_id;
        this.name = name ?? gameData.characters[this.unit_id].name
        this.max_energy = max_energy ?? gameData.characters[this.unit_id].max_sp
        this.element = gameData.characters[this.unit_id].element
        
        this.lightcone = lightcone ?? new LightCone(getBaseLCId(this.unit_id));
        this.relics = relics ?? getBaseRelics(this.unit_id)

        this.relicStats = {
            "HP": totalRelicStats(this.relics, "HPDelta"),
            "ATK": totalRelicStats(this.relics, "AttackDelta"),
            "DEF": totalRelicStats(this.relics, "DefenceDelta"),
            "HP%": totalRelicStats(this.relics, "HPAddedRatio"),
            "ATK%": totalRelicStats(this.relics, "AttackAddedRatio"),
            "DEF%": totalRelicStats(this.relics, "DefenceAddedRatio"),
            "CR": totalRelicStats(this.relics, "CriticalChanceBase"),
            "CD": totalRelicStats(this.relics, "CriticalDamageBase"),
            "OutgoingHealingBoost": totalRelicStats(this.relics, "HealRatioBase"),
            "EHR": totalRelicStats(this.relics, "StatusProbabilityBase"),
            "SPD": totalRelicStats(this.relics, "SpeedDelta"),
            "BE": totalRelicStats(this.relics, "BreakDamageAddedRatioBase"),
            "EffectRES": totalRelicStats(this.relics, "StatusResistanceBase"),
            "PhysicalDMGBoost": totalRelicStats(this.relics, "PhysicalAddedRatio"),
            "FireDMGBoost": totalRelicStats(this.relics, "FireAddedRatio"),
            "IceDMGBoost": totalRelicStats(this.relics, "IceAddedRatio"),
            "ThunderDMGBoost": totalRelicStats(this.relics, "ThunderAddedRatio"),
            "WindDMGBoost": totalRelicStats(this.relics, "WindAddedRatio"),
            "QuantumDMGBoost": totalRelicStats(this.relics, "QuantumAddedRatio"),
            "ImaginaryDMGBoost": totalRelicStats(this.relics, "ImaginaryAddedRatio"),
        }

        this.base_spd = gameData.characters[this.unit_id].stats.SPD
        this.base_hp = gameData.characters[this.unit_id].stats.HP + gameData.lightCones[this.lightcone.id].stats.HP
        this.base_atk = gameData.characters[this.unit_id].stats.ATK + gameData.lightCones[this.lightcone.id].stats.ATK
        this.base_def = gameData.characters[this.unit_id].stats.DEF + gameData.lightCones[this.lightcone.id].stats.DEF

        this.spd = this.base_spd + this.relicStats.SPD

        this.current_speed = this.spd; 
        this.kit = kit;
        
        this.base_action_value = action_value_from_spd(this.current_speed);
        this.current_action_value = this.base_action_value;

        console.log(this.base_spd, this.base_hp, this.base_atk, this.base_def, this.spd, this.relicStats)
    }

    adjust_action_guage(advance_ratio, delay_ratio) {
        let current_guage = this.current_action_value * this.current_speed;
        let new_guage = Math.max(0, current_guage - 10000 * (advance_ratio - delay_ratio));
        console.log(current_guage, new_guage);
        this.current_action_value = Math.max(0, new_guage / this.current_speed);
        return this;
    }

    modification(ability, ability_values) {
        if(ability === Ability.ActionGuageModification) {
            return this.adjust_action_guage(ability_values.aa || 0, ability_values.ad || 0);
        }
        return this;
    }
}

export async function fetchStarRailData(uid) {
    // 이제 외부 프록시 사이트 대신 내 도메인의 /api/hsr 주소로 바로 요청합니다!
    const url = `/api/anaxa?uid=${uid}`; 
    
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