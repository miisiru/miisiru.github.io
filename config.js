import subStatData from './data/relic_sub_affixes.json' with { type: 'json' };
import mainStatData from './data/relic_main_affixes.json' with { type: 'json' };
import gameData from './data/game_data.json' with { type: 'json' };

import { getBaseLCId, getLCStats } from './lc.js'
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
        "AttackDelta": 2,
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
                const statValue = getMainStatValue(mainStat, 15);
                totals += statValue;
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

    if (relics.sets) {
        const setTypes = ['outer2', 'outer4', 'planar2'];
        
        // 💡 1. 유물 2세트와 4세트 드롭다운이 다르게 설정되어 있는지 체크
        const isMixedSet = relics.sets.outer2 !== relics.sets.outer4;

        // 💡 2. 섞어 입었다면 outer4도 4세트 효과(1)가 아니라 해당 유물의 2세트 효과(0)를 바라봅니다.
        const valueIndexMap = {
            outer2: 0,
            outer4: isMixedSet ? 0 : 1,
            planar2: 0
        };

        setTypes.forEach(type => {
            // 🎯 [요청사항 반영] 섞어 입은 상태에서 현재 순회 중인 타입이 'outer4'라면, 
            // ID 자체도 outer4 드롭다운 값이 아닌 outer2 드롭다운 값을 사용해 데이터를 가져옵니다.
            const targetTypeKey = (type === 'outer4' && isMixedSet) ? 'outer2' : type;
            const setId = String(relics.sets[targetTypeKey]);
            
            if (setId && setId !== '0' && setId !== 'undefined' && setId !== 'null' && setId !== '') {
                // gameData.relics가 배열일 때와 객체 사전 형태일 때를 모두 지원하는 안전장치
                const setData = Array.isArray(gameData.relics) 
                    ? gameData.relics.find(r => String(r.id) === setId)
                    : gameData.relics[setId];
                
                if (setData) {
                    const targetIndex = valueIndexMap[type];
                    
                    // 💡 3. 유물 속성명 대조 규칙 바인딩
                    // 섞어 입었을 때는 둘 다 2세트 효과 상태이므로 setData.outer2와 스탯명을 대조합니다.
                    const checkProperty = (type === 'outer4' && isMixedSet) ? 'outer2' : type;

                    if (setData[checkProperty] === statName) {
                        const setVal = setData.values?.[targetIndex] ?? 0;
                        totals += setVal;
                    }
                }
            }
        });
    }
    
    return totals;
}

export function action_value_from_spd(spd) {
    return Math.max(1, 10000 / spd);
}

export class ActionConfig {
    constructor({ name, sp_cost = 0, sp_gain = 0, energy_gain = 0, energy_cost = 0, action_type = ActionType.BASIC, skill_type = SkillType.ATTACK, skill_ability = undefined, ability_values = {aa: 0, ad: 0}}) {
        this.name = name;
        this.sp_cost = sp_cost;
        this.sp_gain = sp_gain;
        this.energy_gain = energy_gain;
        this.action_type = action_type;
        this.skill_type = skill_type;
        this.skill_ability = skill_ability;
        this.ability_values = ability_values;
        this.energy_cost = energy_cost;
    }

    abilityUse(target) {
        if (!this.skill_ability || !target) return;
        return target.modification(this.skill_ability, this.ability_values);
    }
}

export class LightCone {
    constructor(id, superimposition=undefined, level=80) {
        this.id = id
        this.name = gameData.lightCones[id].name
        this.rarity = gameData.lightCones[id].rarity
        this.base_hp = gameData.lightCones[id].stats.HP
        this.base_atk = gameData.lightCones[id].stats.ATK
        this.base_def = gameData.lightCones[id].stats.DEF
        this.path = gameData.lightCones[id].path
        this.superimposition = superimposition ?? (this.rarity === 5 ? 1 : 5);
        this.superimposition_values = gameData.lightCones[id].superimpositions
        this.level = level
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
    constructor({unit_id, name=undefined, max_energy=undefined, kit, lightcone=undefined, relics=undefined, spd=undefined, eidolon=0}) {
        this.unit_id = unit_id;
        this.name = name ?? gameData.characters[this.unit_id].name
        this.max_energy = max_energy ?? gameData.characters[this.unit_id].max_sp
        this.element = gameData.characters[this.unit_id].element
        this.rarity = gameData.characters[this.unit_id].rarity
        this.path = gameData.characters[this.unit_id].path
        this.energy = this.max_energy * 0.5
        this.turn_count = 0
        this.eidolon = eidolon
        
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
            "HealRatio": totalRelicStats(this.relics, "HealRatioBase"),
            "EHR": totalRelicStats(this.relics, "StatusProbabilityBase"),
            "SPD": totalRelicStats(this.relics, "SpeedDelta"),
            "BE": totalRelicStats(this.relics, "BreakDamageAddedRatioBase"),
            "EffectRES": totalRelicStats(this.relics, "StatusResistanceBase"),
            "ERR": totalRelicStats(this.relics, "SPRatioBase"),
            "PhysicalDMGBoost": totalRelicStats(this.relics, "PhysicalAddedRatio"),
            "FireDMGBoost": totalRelicStats(this.relics, "FireAddedRatio"),
            "IceDMGBoost": totalRelicStats(this.relics, "IceAddedRatio"),
            "ThunderDMGBoost": totalRelicStats(this.relics, "ThunderAddedRatio"),
            "WindDMGBoost": totalRelicStats(this.relics, "WindAddedRatio"),
            "QuantumDMGBoost": totalRelicStats(this.relics, "QuantumAddedRatio"),
            "ImaginaryDMGBoost": totalRelicStats(this.relics, "ImaginaryAddedRatio"),
            "Elation%": totalRelicStats(this.relics, "Elation%"),
            "SPD%": totalRelicStats(this.relics, "SPD%")
        }

        this.lcStats = {
            "HP": (getLCStats(this.lightcone) ?? 0)["HPDelta"] ?? 0,
            "ATK": (getLCStats(this.lightcone) ?? 0)["AttackDelta"] ?? 0,
            "DEF": (getLCStats(this.lightcone) ?? 0)["DefenceDelta"] ?? 0,
            "HP%": (getLCStats(this.lightcone) ?? 0)["HPAddedRatio"] ?? 0,
            "ATK%": (getLCStats(this.lightcone) ?? 0)["AttackAddedRatio"] ?? 0,
            "DEF%": (getLCStats(this.lightcone) ?? 0)["DefenceAddedRatio"] ?? 0,
            "CR": (getLCStats(this.lightcone) ?? 0)["CriticalChanceBase"] ?? 0,
            "CD": (getLCStats(this.lightcone) ?? 0)["CriticalDamageBase"] ?? 0,
            "HealRatio": (getLCStats(this.lightcone) ?? 0)["HealRatioBase"] ?? 0,
            "EHR": (getLCStats(this.lightcone) ?? 0)["StatusProbabilityBase"] ?? 0,
            "SPD": (getLCStats(this.lightcone)?? 0)["SpeedDelta"] ?? 0,
            "BE": (getLCStats(this.lightcone) ?? 0)["BreakDamageAddedRatioBase"] ?? 0,
            "EffectRES": (getLCStats(this.lightcone) ?? 0)["StatusResistanceBase"] ?? 0,
            "ERR": (getLCStats(this.lightcone) ?? 0)["SPRatioBase"] ?? 0,
            "Elation%": (getLCStats(this.lightcone) ?? 0)["Elation%"] ?? 0,
            "SPD%": (getLCStats(this.lightcone) ?? 0)["SPD%"] ?? 0
        }

        this.base_stats = {
            "hp": gameData.characters[this.unit_id].stats.HP + gameData.lightCones[this.lightcone.id].stats.HP,
            "atk": gameData.characters[this.unit_id].stats.ATK + gameData.lightCones[this.lightcone.id].stats.ATK,
            "def": gameData.characters[this.unit_id].stats.DEF + gameData.lightCones[this.lightcone.id].stats.DEF,
            "spd": gameData.characters[this.unit_id].stats.SPD,
            "cr": 0.05 + (gameData.characters[this.unit_id].traces["CRIT Rate"] ?? 0),
            "cd": 0.5 + (gameData.characters[this.unit_id].traces["CRIT DMG"] ?? 0),
            "ehr": 0 + (gameData.characters[this.unit_id].traces["Effect Hit Rate"] ?? 0),
            "eres": 0 + (gameData.characters[this.unit_id].traces["Effect RES"] ?? 0),
            "be": 0 + (gameData.characters[this.unit_id].traces["Break Effect"] ?? 0),
            "err": 1,
            "heal_ratio": 0,
            "elation": 0 + (gameData.characters[this.unit_id].traces["Elation"] ?? 0),
            "dmg_boost": {
                "Physical": 0 + (gameData.characters[this.unit_id].traces["Physical DMG Boost"] ?? 0),
                "Ice": 0 + (gameData.characters[this.unit_id].traces["Ice"] ?? 0),
                "Imaginary": 0 + (gameData.characters[this.unit_id].traces["Imaginary"] ?? 0),
                "Lightning": 0 + (gameData.characters[this.unit_id].traces["Lightning DMG Boost"] ?? 0),
                "Quantum": 0 + (gameData.characters[this.unit_id].traces["Quantum DMG Boost"] ?? 0),
                "Wind": 0 + (gameData.characters[this.unit_id].traces["Wind DMG Boost"] ?? 0),
                "Fire": 0 + (gameData.characters[this.unit_id].traces["Fire DMG Boost"] ?? 0)
            }
        }

        //relics, traces and lcs
        this.base_added_stats = {
            "hp": this.relicStats["HP"] + this.base_stats.hp * (this.relicStats["HP%"] + (gameData.characters[this.unit_id].traces["HP%"] ?? 0)) + this.lcStats["HP"],
            "atk": this.relicStats["ATK"] + this.base_stats.atk * (this.relicStats["ATK%"] + (gameData.characters[this.unit_id].traces["ATK%"] ?? 0)) + this.lcStats["ATK"],
            "def": this.relicStats["DEF"] + this.base_stats.def * (this.relicStats["DEF%"] + (gameData.characters[this.unit_id].traces["DEF%"] ?? 0)) + this.lcStats["DEF"],
            "cr": this.relicStats["CR"] + this.lcStats["CR"],
            "cd": this.relicStats["CD"] + this.lcStats["CD"],
            "heal_ratio": this.relicStats["HealRatio"] + this.lcStats["HealRatio"],
            "ehr": this.relicStats["EHR"] + this.lcStats["EHR"],
            "eres": this.relicStats["EffectRES"] + this.lcStats["EffectRES"],
            "be": this.relicStats["BE"] + this.lcStats["BE"],
            "err": this.relicStats["ERR"] + this.lcStats["ERR"],
            "elation": this.relicStats["Elation%"] + this.lcStats["Elation%"],
            "dmg_boost": {
                "Physical": this.relicStats["PhysicalDMGBoost"],
                "Fire": this.relicStats["FireDMGBoost"],
                "Ice": this.relicStats["IceDMGBoost"],
                "Lightning": this.relicStats["ThunderDMGBoost"],
                "Wind": this.relicStats["WindDMGBoost"],
                "Quantum": this.relicStats["QuantumDMGBoost"],
                "Imaginary": this.relicStats["ImaginaryDMGBoost"],
            },
            "spd": this.relicStats["SPD"] + this.base_stats.spd * this.relicStats["SPD%"] + this.lcStats["SPD"] + (gameData.characters[this.unit_id].traces["SPD"] ?? 0)
        }

        this.spd = spd ?? this.base_stats.spd + this.base_added_stats.spd
        this.max_hp = this.base_stats.hp + this.base_added_stats.hp
        this.atk = this.base_stats.atk + this.base_added_stats.atk
        this.def = this.base_stats.def + this.base_added_stats.def
        this.cr = this.base_stats.cr + this.base_added_stats.cr
        this.cd = this.base_stats.cd + this.base_added_stats.cd
        this.heal_ratio = this.base_stats.heal_ratio + this.base_added_stats.heal_ratio
        this.ehr = this.base_stats.ehr + this.base_added_stats.ehr
        this.eres = this.base_stats.eres + this.base_added_stats.eres
        this.be = this.base_stats.be + this.base_added_stats.be
        this.err = this.base_stats.err + this.base_added_stats.err
        this.elation = this.base_stats.elation + this.base_added_stats.elation
        this.dmg_boost = { ...this.base_stats.dmg_boost }
        for (const key in this.base_stats.dmg_boost ) {
            this.dmg_boost[key] = (this.dmg_boost[key] || 0) + this.base_added_stats.dmg_boost[key]
        }

        this.current_speed = this.spd; 
        this.kit = kit;
        
        this.base_action_value = action_value_from_spd(this.current_speed);
        this.current_action_value = this.base_action_value;
    }

    adjust_action_guage(advance_ratio, delay_ratio) {
        let current_guage = this.current_action_value * this.current_speed;
        let new_guage = Math.max(0, current_guage - 10000 * (advance_ratio - delay_ratio));
        this.current_action_value = Math.max(0, new_guage / this.current_speed);
        return this;
    }

    modification(ability, ability_values) {
        if(ability === Ability.ActionGuageModification) {
            return this.adjust_action_guage(ability_values.aa || 0, ability_values.ad || 0);
        }
        return this;
    }

    modifyEnergy(value, modifiedByERR=true) {
        this.energy = Math.min(this.energy + (modifiedByERR ? 1 : value) * value, this.max_energy);
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