import { ModifierManager } from './config.js';

// 적의 개별 공격/스킬 명세서
export class EnemyAbility {
    constructor({ id, name, type = 'SINGLE', multiplier = 1.0, toughnessDamage = 30, effect = null }) {
        this.id = id;
        this.name = name;
        this.type = type;                       // 'SINGLE', 'BLAST', 'AOE' 등 (타겟 해석기용)
        this.multiplier = multiplier;           // 공격 계수 (예: 1.5면 공격력의 150%)
        this.toughnessDamage = toughnessDamage; // 타격 시 깎는 아군의 강인도(나중에 필요할 수 있음)
        
        // 🔥 나중에 복잡한 기믹(스택 쌓기 등)이 생기면 이 콜백에 함수를 넣어 처리
        this.effect = effect; 
    }
}

export class Enemy {
    constructor(config) {
        // 1. 기본 식별 정보
        this.unit_id = config.id;
        this.name = config.name;
        this.level = config.level || 90;
        this.faction = 'ENEMY'; 
        this.archetype = 'ENEMY'; 

        // 2. 기본 스탯
        this.max_hp = config.hp || 100000000;
        this.current_hp = this.max_hp;
        this.base_spd = config.spd || 100;
        this.atk = config.atk || 688.063;
        this.def = config.def || this.level*10+200;
        
        // 3. 저항 관련 스탯
        this.effect_res = config.effect_res || 0.2;
        this.elemental_res = config.elemental_res || {}; 

        // 4. 강인도 (Toughness) 
        this.weaknesses = config.weaknesses || [];
        this.max_toughness = config.toughness || 140;
        this.current_toughness = this.max_toughness;
        this.isBroken = false;

        // 5. 버프/디버프 관리기 (기존 완벽 재사용)
        this.modifiers = new ModifierManager(this);

        // ==========================================
        // 🎯 [핵심] 스킬 사전과 패턴 시스템
        // ==========================================
        
        // 스킬 사전 (Dictionary) - id를 키값으로 꺼내 씀
        this.abilities = config.abilities || {}; 

        // 페이즈별/모드별 행동 패턴 (예: { phase1: ['atk1', 'atk2'], angry_mode: ['atk3', 'ult'] })
        this.patterns = config.patterns || { default: [] };
        
        // 현재 실행 중인 패턴과 진행도
        this.currentPatternKey = config.initialPattern || 'default';
        this.patternIndex = 0;

        // 🔥 나중에 "스킬 10번 쓰면 원래대로 돌아옴", "스택 쌓임" 같은 특수 기믹을 기록할 다용도 메모장
        this.customState = {}; 

        // 타임라인용
        this.base_action_value = 10000 / this.base_spd;
        this.current_action_value = this.base_action_value;
        this.lastAdvancedAV = -1;
        this.turnCount = 0;
    }

    // 엔진이 적의 턴에 "너 뭐 할래?" 라고 물어볼 때 호출하는 함수
    getNextAbility() {
        const pattern = this.patterns[this.currentPatternKey];
        if (!pattern || pattern.length === 0) return null;

        // 현재 순서의 스킬 ID를 가져와서 스킬 사전에서 뽑아냄
        const abilityId = pattern[this.patternIndex];
        const ability = this.abilities[abilityId];

        // 💡 일단은 단순 반복 (루프)
        this.patternIndex = (this.patternIndex + 1) % pattern.length;

        return ability;
    }

    // 나중에 기믹 발동 시 강제로 패턴을 갈아끼울 때 사용할 함수
    changePattern(newPatternKey) {
        if (this.patterns[newPatternKey]) {
            this.currentPatternKey = newPatternKey;
            this.patternIndex = 0; // 패턴이 바뀌면 처음부터 다시 시작
        }
    }

    // 강인도 관련 함수 (기본 틀만 유지)
    reduceToughness(amount, context) {
        if (this.isBroken) return;
        this.current_toughness -= amount;
        if (this.current_toughness <= 0) {
            this.current_toughness = 0;
            this.isBroken = true;
            if (context) context.advanceActionGauge(this.unit_id, -25, "약점 격파");
        }
    }

    recoverToughness() {
        if (this.isBroken) {
            this.current_toughness = this.max_toughness;
            this.isBroken = false;
        }
    }
}