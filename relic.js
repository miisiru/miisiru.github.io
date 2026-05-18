const base = {
    "main": [
        "HPDelta",
        "AttackDelta"
    ],
    "sub": [
        {
            "name": "HPDelta",
            "count": 2,
            "quality": "mid"
        },
        {
            "name": "AttackDelta",
            "count": 2,
            "quality": "mid"
        },
        {
            "name": "DefenceDelta",
            "count": 2,
            "quality": "mid"
        },
        {
            "name": "HPAddedRatio",
            "count": 2,
            "quality": "mid"
        },
        {
            "name": "AttackAddedRatio",
            "count": 2,
            "quality": "mid"
        },
        {
            "name": "DefenceAddedRatio",
            "count": 2,
            "quality": "mid"
        },
        {
            "name": "SpeedDelta",
            "count": 2,
            "quality": "mid"
        },
        {
            "name": "CriticalChanceBase",
            "count": 2,
            "quality": "mid"
        },
        {
            "name": "CriticalDamageBase",
            "count": 2,
            "quality": "mid"
        },
        {
            "name": "StatusProbabilityBase",
            "count": 2,
            "quality": "mid"
        },
        {
            "name": "StatusResistanceBase",
            "count": 2,
            "quality": "mid"
        },
        {
            "name": "BreakDamageAddedRatioBase",
            "count": 2,
            "quality": "mid"
        }
    ],
    "sets": {
        "outer2": 101,
        "outer4": 101,
        "planar2": 301
    }
}

export class Relics {
    constructor() {
        this.stats = structuredClone(base)
    }

    addMainStat(statName) {
        this.stats.main.push(statName)
        return this
    }

    addMainStats(...statNames) {
        this.stats.main.push(...statNames);
        return this
    }

    addSubStat(statName, count, quality) {
        this.stats.sub.push({"name": statName, "count": count, "quality": quality})
        return this
    }

    addSubStats(...items) {
        items.forEach(item => {
            // 배열 구조 분해 할당으로 내부 값 추출
            const [statName, count, quality] = item;
            
            this.stats.sub.push({
                "name": statName,
                "count": count,
                "quality": quality
            });
        });
        return this
    }

    changeSets(outer2, outer4, planar2) {
        this.stats.sets.outer2 = outer2 !== 0 ? outer2 : this.stats.sets.outer2;
        this.stats.sets.outer4 = outer4 !== 0 ? outer4 : this.stats.sets.outer4;
        this.stats.sets.planar2 = planar2 !== 0 ? planar2 : this.stats.sets.planar2;
        return this;
    }

    changeSet1(outer2) {
        this.stats.sets.outer2 = outer2
        return this
    }

    changeSet2(outer4) {
        this.stats.sets.outer4 = outer4
        return this
    }

    changePlanar(planar2) {
        this.stats.sets.planar2 = planar2
        return this
    }
}

const Evanescia = new Relics().addMainStats("CriticalDamageBase", "SpeedDelta", "PhysicalAddedRatio", "SPRatioBase").addSubStats(["CriticalChanceBase", 11, "mid"], ["CriticalDamageBase", 13, "mid"]).changeSets(129, 129, 325).stats
const Sunday = new Relics().addMainStats("CriticalDamageBase", "SpeedDelta", "HPAddedRatio", "SPRatioBase").addSubStats(["SpeedDelta", 1, "mid"], ["CriticalDamageBase", 15, "mid"]).changeSets(121, 121, 317).stats
const Robin = new Relics().addMainStats("AttackAddedRatio","AttackAddedRatio","AttackAddedRatio","SPRatioBase").addSubStats(["AttackDelta", 9, "mid"], ["AttackAddedRatio", 15, "mid"]).changeSets(123, 116, 317).stats
const Huohuo = new Relics().addMainStats("HealRatioBase", "SpeedDelta", "HPAddedRatio", "SPRatioBase").addSubStats(["HPAddedRatio", 15, "mid"], ["SpeedDelta", 15, "mid"]).changeSets(125, 125, 317).stats

export function getBaseRelics(id) {
    const idMap = {
        1505: Evanescia,
        1313: Sunday,
        1309: Robin,
        1217: Huohuo
    }

    return idMap[id] ?? base;
}