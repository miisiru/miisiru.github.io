import subStatData from './data/relic_sub_affixes.json' with { type: 'json' };
import mainStatData from './data/relic_main_affixes.json' with { type: 'json' };
import gameData from './data/game_data.json' with { type: 'json' };

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