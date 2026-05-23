import { Enemy, EnemyAbility } from '../enemy.js';

// 1. 적이 사용할 개별 스킬(능력) 정의
const singleAttack = new EnemyAbility({
    id: 'atk_single',
    name: "단일 타격",
    type: 'SINGLE',
    multiplier: 3.0, // 공격력의 100% 데미지 (현재는 껍데기)
    toughnessDamage: 0 
});

const singleStrongAttack = new EnemyAbility({
    id: 'atk_single',
    name: "단일 타격",
    type: 'SINGLE',
    multiplier: 4.5, // 공격력의 100% 데미지 (현재는 껍데기)
    toughnessDamage: 0 
});

const blastAttack = new EnemyAbility({
    id: 'atk_blast',
    name: "확산 휩쓸기",
    type: 'BLAST',
    multiplier: 3.5 
});

// 2. 샌드백 적 객체 생성 및 내보내기
export const enemy1004020 = new Enemy({
    id: 1004020,
    name: "테스트용 샌드백",
    level: 90,
    hp: 500000, // 든든한 피통 50만
    spd: 190.08,   // 테스트하기 좋게 속도 130 세팅
    effect_res: 0.2,
    toughness: 300,
    weaknesses: ['Physical', 'Ice', 'Quantum'], 
    
    // 3. 스킬 사전 등록 (위에서 만든 스킬들을 딕셔너리에 넣음)
    abilities: {
        'atk_single': singleAttack,
        'atk_single_strong': singleStrongAttack,
        'atk_blast': blastAttack
    },
    
    // 4. 행동 패턴 세팅 (단일 ➔ 단일 ➔ 확산 무한 루프)
    patterns: {
        default: ['atk_single', 'atk_single_strong', 'atk_blast']
    },
    initialPattern: 'default'
});