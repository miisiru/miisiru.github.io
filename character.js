
import { getLCAbility, getLCStats, getBaseLCId, LightCone } from './lc.js'
import subStatData from './data/relic_sub_affixes.json' with { type: 'json' };
import mainStatData from './data/relic_main_affixes.json' with { type: 'json' };
import gameData from './data/game_data.json' with { type: 'json' };

import { getBaseRelics, Relics, totalRelicStats, getSubStatValue, getMainStatValue } from './relic.js'

export const Side = { ALLY: 'ALLY', ENEMY: 'ENEMY', SUMMON: 'SUMMON', SPECIAL: 'special' };
export const Archetype = { CHARACTER: 'CHARACTER', ENEMY: 'ENEMY', SUMMON: 'SUMMON', MEMOSPRITE: 'MEMOSPRITE', COUNTDOWN: 'COUNTDOWN', TRANSFORMED: 'TRANSFORMED' }
export function action_value_from_spd(spd) {
    return Math.max(1, 10000 / spd);
}

export class Unit {
    constructor({unit_id, name=undefined, max_energy=undefined, kit, lightcone=undefined, relics=undefined, spd=undefined, eidolon=0, rotation={initial: [], repeat: ['B']}, faction=Side.ALLY, archetype=Archetype.CHARACTER, level=80}) {
        this.faction = faction
        this.archetype = archetype
        
        this.unit_id = unit_id;
        this.name = name ?? gameData.characters[this.unit_id].name
        this.level = level

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

        this.displayed_stats = {
            "spd": this.base_stats.spd + this.base_added_stats.spd,
            "hp": this.base_stats.hp + this.base_added_stats.hp,
            "atk": this.base_stats.atk + this.base_added_stats.atk,
            "def": this.base_stats.def + this.base_added_stats.def,
            "cr": this.base_stats.cr + this.base_added_stats.cr,
            "cd": this.base_stats.cd + this.base_added_stats.cd,
            "heal_ratio": this.base_stats.heal_ratio + this.base_added_stats.heal_ratio,
            "ehr": this.base_stats.ehr + this.base_added_stats.ehr,
            "eres": this.base_stats.eres + this.base_added_stats.eres,
            "be": this.base_stats.be + this.base_added_stats.be,
            "err": this.base_stats.err + this.base_added_stats.err,
            "elation": this.base_stats.elation + this.base_added_stats.elation,
            "dmg_boost": { ...this.base_stats.dmg_boost }
        }

        for (const key in this.base_stats.dmg_boost) {
            this.displayed_stats.dmg_boost[key] = (this.displayed_stats.dmg_boost[key] || 0) + this.base_added_stats.dmg_boost[key]
        }

        // 🎯 [수정] 정적 할당 제거 및 기본 속성 초기화
        this.kit = kit;
        this.listeners = [];
        this.rotation = rotation;
        
        // 전투 진입 시점에 체력과 에너지는 고정값으로 시작 (최대치는 실시간 반영)
        this.current_hp = this.displayed_stats.hp; 
        
        // ModifierManager는 엔진(recalculate)에서 주입해주지만, 
        // 오류 방지를 위해 깡통 상태에서도 빈 껍데기를 가질 수 있게 안전장치를 둡니다.
        this.modifiers = { getStat: () => 0 }; 

        this.base_action_value = action_value_from_spd(this.displayed_stats.spd);
        this.current_action_value = this.base_action_value;

        this._cached_speed = this.current_speed;
    }

    get atk() {
        const buffPct = this.modifiers.getStat('atk_boost') || 0;
        const buffFlat = this.modifiers.getStat('atk_flat') || 0;
        return this.displayed_stats.atk + (this.base_stats.atk * buffPct) + buffFlat;
    }

    get def() {
        const buffPct = this.modifiers.getStat('def_boost') || 0;
        const buffFlat = this.modifiers.getStat('def_flat') || 0;
        return this.displayed_stats.def + (this.base_stats.def * buffPct) + buffFlat;
    }

    get max_hp() {
        const buffPct = this.modifiers.getStat('hp_boost') || 0;
        const buffFlat = this.modifiers.getStat('hp_flat') || 0;
        return this.displayed_stats.hp + (this.base_stats.hp * buffPct) + buffFlat;
    }

    get current_speed() {
        const buffPct = this.modifiers.getStat('spd_boost') || 0;
        const buffFlat = this.modifiers.getStat('spd_flat') || 0;
        return this.displayed_stats.spd + (this.base_stats.spd * buffPct) + buffFlat;
    }

    get cr() { return this.displayed_stats.cr + (this.modifiers.getStat('cr_boost') || 0); }
    get cd() { return this.displayed_stats.cd + (this.modifiers.getStat('cd_boost') || 0); }
    get heal_ratio() { return this.displayed_stats.heal_ratio + (this.modifiers.getStat('heal_boost') || 0); }
    get ehr() { return this.displayed_stats.ehr + (this.modifiers.getStat('ehr_boost') || 0); }
    get eres() { return this.displayed_stats.eres + (this.modifiers.getStat('eres_boost') || 0); }
    get be() { return this.displayed_stats.be + (this.modifiers.getStat('be_boost') || 0); }
    get err() { return this.displayed_stats.err + (this.modifiers.getStat('err_boost') || 0); }
    get def_ignore() { return this.modifiers.getStat('def_ignore') || 0; }
    get res_pen() { return this.modifiers.getStat('res_pen') || 0; }
    get vul() { return this.modifiers.getStat('weaken') || 0; }

    getDmgBoost(element) {
        const allDmgBoost = this.modifiers.getStat('dmg_boost') || 0;
        const elemDmgBoost = this.modifiers.getStat(`${element}_dmg_boost`) || 0;
        return (this.displayed_stats.dmg_boost[element] || 0) + allDmgBoost + elemDmgBoost;
    }

    registerListener(listener) {
        this.listeners.push(listener)
    }

    /**
     * 행동 게이지 증/감 구현 (Advance Forward & Action Delay)
     * @param {number} advance_ratio - 행게증 비율 (예: 100% = 1.0, 25% = 0.25)
     * @param {number} delay_ratio - 행게감 비율 (예: 20% = 0.2)
     * @param {number} current_time - 현재 시뮬레이터의 전역 시간 (currentEvent.av)
     */
    adjust_action_gauge(advance_ratio, delay_ratio, current_time) {
        // 1. 목표 도착 시간에서 현재 시간을 빼서 '남은 대기 시간(AV)'을 구함
        let remaining_av = Math.max(0, this.current_action_value - current_time);

        // 2. 남은 시간을 기준으로 현재 잔여 게이지 환산 (Current Gauge = AV * Speed)
        let current_gauge = remaining_av * this.current_speed;

        // 3. 게이지 증감 연산 (10000 기준)
        // 행게증은 게이지를 깎고, 행게감은 게이지를 늘립니다.
        let new_gauge = current_gauge - 10000 * (advance_ratio - delay_ratio);

        // 4. 게이지는 0 밑으로 떨어질 수 없음 (0 = 즉시 턴 획득)
        new_gauge = Math.max(0, new_gauge);

        // 5. 새 게이지를 다시 절대 시간(도착 예정 AV)으로 변환하여 타임라인에 꽂아줌
        this.current_action_value = current_time + (new_gauge / this.current_speed);

        return this;
    }

    /**
     * 행동 게이지 강제 세팅 (Set Action Gauge)
     * @param {number} value - 설정할 남은 게이지 값 (보통 0)
     * @param {number} current_time - 현재 시뮬레이터의 전역 시간 (currentEvent.av)
     */
    set_action_gauge(value, current_time) {
        // 강제로 설정할 게이지가 0보다 작을 수 없도록 보정
        let new_gauge = Math.max(0, value);

        // 새 게이지를 바탕으로 타임라인 상의 목표 도착 시간을 재설정
        this.current_action_value = current_time + (new_gauge / this.current_speed);

        return this;
    }

    modifyEnergy(value, modifiedByERR=true) {
        this.energy = Math.min(this.energy + (modifiedByERR ? this.err : 1) * value, this.max_energy);
    }
}
