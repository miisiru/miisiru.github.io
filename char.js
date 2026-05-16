/**
 * char.js - 캐릭터 및 클래스 데이터 정의
 */
const Faction = { ALLY: 'ALLY', ENEMY: 'ENEMY' };
const ActionType = { BASIC: 'BASIC', SKILL: 'SKILL', ULT: 'ULT' };
const SkillType = { SUPPORT: 'SUPPORT', ATTACK: 'ATTACK' };
const Ability = { ActionGuageModification: 'AG' };

function action_value_from_spd(spd) {
    return Math.max(1, 10000 / spd);
}

class ActionConfig {
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

class UnitKit {
    constructor(basic, skill, ultimate) {
        this.basic = basic;
        this.skill = skill;
        this.ultimate = ultimate;
    }
}

class Unit {
    constructor(unit_id, name, stats, kit) {
        this.unit_id = unit_id;
        this.name = name;
        this.base_stats = { spd: stats[0], max_energy: stats[1] };
        this.max_energy = this.base_stats.max_energy;
        
        // 오류 1: this.base_stats.speed -> this.base_stats.spd (stats[0]은 spd에 들어있습니다)
        this.current_speed = this.base_stats.spd; 
        this.kit = kit;
        
        this.base_action_value = action_value_from_spd(this.current_speed);
        this.current_action_value = this.base_action_value;
    }

    adjust_action_guage(advance_ratio, delay_ratio) {
        let current_guage = this.current_action_value * this.current_speed
        let new_guage = Math.max(0, current_guage - 10000 * (advance_ratio - delay_ratio))
        console.log(current_guage, new_guage)
        this.current_action_value = Math.max(0, new_guage / this.current_speed)
        return this
    }

    modification(ability, ability_values) {
        // 오류 2: ability = Ability... (대입) -> ability === Ability... (비교)
        if(ability === Ability.ActionGuageModification) {
            // 오류 3: ability_values[0] -> ability_values.aa (선데이 킷에서 객체로 전달함)
            return this.adjust_action_guage(ability_values.aa || 0, ability_values.ad || 0);
        }
        return this;
    }
}

const evakit = new UnitKit(
    new ActionConfig({ name: "평타", sp_gain: 1, energy_gain: 20 }),
    new ActionConfig({ name: "전스", sp_cost: 1, energy_gain: 30 }),
    new ActionConfig({ name: "궁", energy_gain: 5, action_type: ActionType.ULT })
);

const sundaykit = new UnitKit(
    new ActionConfig({ name: "평타", sp_gain: 1, energy_gain: 20 }),
    new ActionConfig({ 
        name: "전투 스킬", 
        sp_cost: 1, 
        energy_gain: 30, 
        action_type: ActionType.SKILL, 
        skill_type: SkillType.SUPPORT, 
        ability_values: {aa: 1, ad: 0}, // 여기서 객체 형태로 주었기 때문에 위에서 .aa로 받아야 합니다.
        skill_ability: Ability.ActionGuageModification 
    }),
    new ActionConfig({ name: "궁", energy_gain: 5, action_type: ActionType.ULT })
);

const robinkit = new UnitKit(
    new ActionConfig({ name: "평타", sp_gain: 1, energy_gain: 20 }),
    new ActionConfig({ name: "전스", sp_cost: 1, energy_gain: 30 }),
    new ActionConfig({ name: "궁", energy_gain: 5, action_type: ActionType.ULT })
);

const huokit = new UnitKit(
    new ActionConfig({ name: "평타", sp_gain: 1, energy_gain: 20 }),
    new ActionConfig({ name: "전스", sp_cost: 1, energy_gain: 30 }),
    new ActionConfig({ name: "궁", energy_gain: 5, action_type: ActionType.ULT })
);

const PRESET_UNITS = [
    new Unit(1505, "에바네시아", [135, 60], evakit),
    new Unit(1313, "선데이", [134, 50], sundaykit),
    new Unit(1309, "로빈", [134, 50], robinkit),
    new Unit(1217, "곽향", [134, 50], huokit)
];