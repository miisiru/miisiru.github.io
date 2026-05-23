
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
    constructor({unit_id, name=undefined, max_energy=undefined, kit, lightcone=undefined, relics=undefined, spd=undefined, eidolon=0, rotation={initial: [], repeat: ['B']}, faction=Side.ALLY, archetype=Archetype.CHARACTER}) {
        this.faction = faction
        this.archetype = archetype
        
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

        this.listeners = []

        this.rotation = rotation
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
    adjust_action_guage(advance_ratio, delay_ratio, current_time) {
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
    set_action_guage(value, current_time) {
        // 강제로 설정할 게이지가 0보다 작을 수 없도록 보정
        let new_gauge = Math.max(0, value);

        // 새 게이지를 바탕으로 타임라인 상의 목표 도착 시간을 재설정
        this.current_action_value = current_time + (new_gauge / this.current_speed);

        return this;
    }

    modification(ability, ability_values) {
        if(ability === Ability.ActionGuageModification) {
            return this.adjust_action_guage(ability_values.aa || 0, ability_values.ad || 0);
        }
        return this;
    }

    modifyEnergy(value, modifiedByERR=true) {
        this.energy = Math.min(this.energy + (modifiedByERR ? this.err : 1) * value, this.max_energy);
    }
}
