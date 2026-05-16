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

async function fetchStarRailData() {
    const uid = "833180943";
    // 이제 외부 프록시 사이트 대신 내 도메인의 /api/hsr 주소로 바로 요청합니다!
    const url = `/api/anaxa?uid=${uid}`; 
    const resultElement = document.getElementById("result");

    resultElement.innerText = "로딩 중...";
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("데이터 로드 실패");
        
        const data = await response.json();
        
        console.log("스타레일 데이터 로드 성공!");
        console.log("유저 닉네임:", data.detailInfo?.nickname);
        
        resultElement.innerText = JSON.stringify(data, null, 2);
    } catch (error) {
        console.error(error);
        resultElement.innerText = "에러 발생";
    }
}