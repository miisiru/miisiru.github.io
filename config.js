import subStatData from './data/relic_sub_affixes.json' with { type: 'json' };
import mainStatData from './data/relic_main_affixes.json' with { type: 'json' };
import gameData from './data/game_data.json' with { type: 'json' };

export { subStatData, mainStatData, gameData };

/**
 * char.js - 캐릭터 및 클래스 데이터 정의
 */
export const Faction = { ALLY: 'ALLY', ENEMY: 'ENEMY' };
export const ActionType = { BASIC: 'BASIC', SKILL: 'SKILL', ULT: 'ULT' };
export const SkillType = { SUPPORT: 'SUPPORT', ATTACK: 'ATTACK' };
export const Ability = { ActionGuageModification: 'AG' };

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
    constructor({unit_id, name=undefined, spd, max_energy=undefined, kit, lightcone, relics = []}) {
        this.unit_id = unit_id;
        this.name = name ?? gameData.characters[this.unit_id].name
        this.max_energy = max_energy ?? gameData.characters[this.unit_id].max_sp
        
        this.spd = spd
        
        // 2. 광추 및 유물 데이터 복구
        this.lightcone = lightcone;
        this.relics = relics;
        
        this.current_speed = this.spd; 
        this.kit = kit;
        
        this.base_action_value = action_value_from_spd(this.current_speed);
        this.current_action_value = this.base_action_value;

        this.base_spd = gameData.characters[this.unit_id].stats.SPD
        this.base_hp = gameData.characters[this.unit_id].stats.HP + gameData.lightCones[this.lightcone.id].stats.HP
        this.base_atk = gameData.characters[this.unit_id].stats.ATK + gameData.lightCones[this.lightcone.id].stats.ATK
        this.base_def = gameData.characters[this.unit_id].stats.DEF + gameData.lightCones[this.lightcone.id].stats.DEF
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