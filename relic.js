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
    ]
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
}

const Evanescia = new Relics().addMainStats("CriticalDamageBase", "SpeedDelta", "PhysicalAddedRatio", "SPRatioBase").addSubStats(["CriticalChanceBase", 11, "mid"], ["CriticalDamageBase", 13, "mid"]).stats
const Sunday = new Relics().addMainStats("CriticalDamageBase", "SpeedDelta", "HPAddedRatio", "SPRatioBase").addSubStats(["SpeedDelta", 1, "mid"], ["CriticalDamagteBase", 15, "mid"]).stats
const Robin = new Relics().addMainStats("AttackAddedRatio","AttackAddedRatio","AttackAddedRatio","SPRatioBase").addSubStats(["AttackDelta", 9, "mid"], ["AttackAddedRatio", 15, "mid"]).stats
const Huohuo = new Relics().addMainStats("HealRatioBase", "SpeedDelta", "HPAddedRatio", "SPRatioBase").addSubStats(["HPAddedRatio", 15, "mid"], ["SpeedDelta", 15, "mid"]).stats

export function getBaseRelics(id) {
    const idMap = {
        1505: Evanescia,
        1313: Sunday,
        1309: Robin,
        1217: Huohuo
    }

    return idMap[id] ?? base;
}