제공해주신 텍스트 전체를 누락되거나 건너뛰는 부분 없이 완벽하게 한국어로 번역했습니다. 시뮬레이터 프로젝트(`SRSim`) 개발에 바로 참고하실 수 있도록 용어의 뉘앙스와 코드 구조를 그대로 살려 직관적으로 다듬었습니다.

---

# 붕괴: 스타레일 전투 시스템 메커니즘 상세 해설

> 출처: `~/work/붕괴星穹铁道전투시스템메커니즘보고서.md`
> 설명: 이 문서는 `SRSim` 분할 이후의 문서 엔트리(입구) 페이지입니다. 기존의 긴 본문은 주제별 조회와 향후 유지보수의 편의를 위해 1단계 장(Chapter)별로 `docs/battle-system-mechanics/` 디렉토리에 분할 저장되었습니다.

> 목표: 전투 시뮬레이터를 직접 구현할 수 있을 정도로 상세한 수준까지 정리.
> 범위: **공용 전투 엔진**에 집중하며, 개별 캐릭터·유물·광추·운명의 길 축복의 전량 전용 스크립트는 다루지 않음.
> 방법: 내용을 **A. 확정성 높은 규칙**, **B. 신뢰도 높은 커뮤니티 결론**, **C. 추가 실측 필요/버전별 설정 항목**으로 분류.
> 결론 적용 우선순위: **A와 B가 충돌할 경우 A를 기준으로 삼음. A가 없을 경우 우선 B를 채택하되 설정 가능하게 구현함. C는 하드코딩하지 않는 것을 권장함.**

---

## 장 목록

* [0. 사용 설명](https://www.google.com/search?q=./battle-system-mechanics/00-usage.md)
* [1. 자료 신뢰도 계층화](https://www.google.com/search?q=./battle-system-mechanics/01-confidence-levels.md)
* [2. 핵심 용어 및 통일 표기법](https://www.google.com/search?q=./battle-system-mechanics/02-core-terms-and-notation.md)
* [3. 추천하는 전투 객체(Object) 모델](https://www.google.com/search?q=./battle-system-mechanics/03-battle-object-model.md)
* [4. 전투 프로세스 개요](https://www.google.com/search?q=./battle-system-mechanics/04-battle-flow-overview.md)
* [5. 턴 및 행동 게이지 메커니즘](https://www.google.com/search?q=./battle-system-mechanics/05-turn-and-action-value-system.md)
* [6. 명령 유형 및 자원 시스템](https://www.google.com/search?q=./battle-system-mechanics/06-action-types-and-resources.md)
* [7. 데미지 계산 총공식](https://www.google.com/search?q=./battle-system-mechanics/07-damage-formula.md)
* [8. 다양한 데미지 유형별 독립 규칙](https://www.google.com/search?q=./battle-system-mechanics/08-special-damage-rules.md)
* [9. 생존 관련 메커니즘](https://www.google.com/search?q=./battle-system-mechanics/09-survivability-systems.md)
* [10. 약점 및 속성 시스템](https://www.google.com/search?q=./battle-system-mechanics/10-weakness-and-elements.md)
* [11. 어그로 및 타겟 선택](https://www.google.com/search?q=./battle-system-mechanics/11-aggro-and-targeting.md)
* [12. 버프 / 디버프 / 제어 효과 타임라인 (시퀀스)](https://www.google.com/search?q=./battle-system-mechanics/12-status-timing.md)
* [13. 추가 공격, 반격, 소환수, 카운트다운 객체](https://www.google.com/search?q=./battle-system-mechanics/13-follow-up-counter-summons-countdown.md)
* [14. 이벤트 구동형 구현 제안](https://www.google.com/search?q=./battle-system-mechanics/14-event-driven-architecture.md)
* [15. 추천하는 최소 의사코드](https://www.google.com/search?q=./battle-system-mechanics/15-minimal-pseudocode.md)
* [16. "시뮬레이터 바로 개발하기"를 위한 추천 모듈 분할](https://www.google.com/search?q=./battle-system-mechanics/16-recommended-module-split.md)
* [17. 추가 실측 필요/설정화(Configuration) 권장 부분](https://www.google.com/search?q=./battle-system-mechanics/17-configurable-or-needs-testing.md)
* [18. 추천 테스트 케이스](https://www.google.com/search?q=./battle-system-mechanics/18-test-cases.md)
* [19. 최종 제안: 본 문서를 "실행 가능한 시뮬레이터"로 빌드하는 방법](https://www.google.com/search?q=./battle-system-mechanics/19-how-to-land-this-into-a-simulator.md)
* [20. 참고 자료 및 출처](https://www.google.com/search?q=./battle-system-mechanics/20-references.md)
* [21. 현재 보고서의 결론 강도(확정성) 요약](https://www.google.com/search?q=./battle-system-mechanics/21-conclusion-strength-summary.md)
* [22. 한 줄 요약](https://www.google.com/search?q=./battle-system-mechanics/22-one-line-summary.md)

## 디렉토리 구조

```text
docs/
  battle-system-mechanics.md
  battle-system-mechanics/
    00-usage.md
    01-confidence-levels.md
    02-core-terms-and-notation.md
    03-battle-object-model.md
    04-battle-flow-overview.md
    05-turn-and-action-value-system.md
    06-action-types-and-resources.md
    07-damage-formula.md
    08-special-damage-rules.md
    09-survivability-systems.md
    10-weakness-and-elements.md
    11-aggro-and-targeting.md
    12-status-timing.md
    13-follow-up-counter-summons-countdown.md
    14-event-driven-architecture.md
    15-minimal-pseudocode.md
    16-recommended-module-split.md
    17-configurable-or-needs-testing.md
    18-test-cases.md
    19-how-to-land-this-into-a-simulator.md
    20-references.md
    21-conclusion-strength-summary.md
    22-one-line-summary.md

```

## 사용 방법

* 전체적인 결론을 빠르게 파악하고 싶을 때는 본 페이지를 먼저 읽으십시오.
* 구체적인 메커니즘을 확인하고 싶을 때는 해당 장의 파일로 바로 이동하십시오.
* 시뮬레이터 구현을 진행할 때는 "턴 및 행동 게이지 메커니즘", "명령 유형 및 자원 시스템", "데미지 계산 총공식", "이벤트 구동형 구현 제안" 등의 장을 우선적으로 읽는 것을 권장합니다.

---

# 0. 使用说明 (사용 설명)

[목록으로 돌아가기](https://www.google.com/search?q=../battle-system-mechanics.md)

당장의 목표가 "우선 실행 가능한 시뮬레이터를 만드는 것"이라면, 아래 순서대로 구현하는 것을 추천합니다.

1. **행동 게이지/턴 시스템**: 속도(SPD), 행동 수치(AV), 행동 게이지 당기기(행동 촉진), 행동 게이지 밀기(행동 지연), 추가 턴, 필살기 끼어들기.
2. **기본 데미지 시스템**: 일반 데미지 곱연산 구역(乘区), 치명타, 방어력, 내성, 받피증(받는 데미지 증가), 피해 감면.
3. **약점 격파 시스템**: 강인도 감소(강인성 수치 깎기), 격파 데미지, 격파 상태 이상, 약점 격파(Broken) 상태 회복.
4. **상태 머신**: 버프/디버프/제어 효과의 부여, 턴 감소, 제거, 해제 불가능 처리.
5. **자원 시스템**: 전투 스킬 포인트(SP), 에너지, 전투 전/웨이브별 이벤트.
6. **특수 행동**: 추가 공격, 반격, 소환수, 카운트다운 객체, 필살기 끼어들기.
7. **타겟 선택**: 단일 공격/확산/종해(광역)/바운스(탄사)/랜덤 타겟/어그로 보정/타겟 고정.
8. **캐릭터 스크립트 계층**: 각 캐릭터의 특성/스킬을 이벤트 리스너 형태로 작성.

---

# 1. 资料可信度分层 (자료 신뢰도 계층화)

[목록으로 돌아가기](https://www.google.com/search?q=../battle-system-mechanics.md)

### A. 확정성 높은 규칙

안정적이며 서로 교차 검증이 완료된 메커니즘 페이지 또는 공식 페이지에서 직접 가져온 내용:

* KQM Speed Guide / Beginner Guide: 행동 게이지, AV, 100% 당기기, 필살기 끼어들기, 기습(Ambush).
* HSR Wiki / Fandom 메커니즘 페이지: 강인도(Toughness), 추가 턴(Extra Turn), 상태 효과(Status Effect), 추가 공격(Follow-Up Attack), 비술(Technique).
* HSR Wiki / Fandom 공식 페이지: 데미지(Damage), 방어력(DEF), 강인도(Toughness), 치유(Healing), 쉴드(Shield) (일부 페이지는 데이터 크롤링이 제한되었으나, 다양한 출처를 통해 교차 검증됨).

### B. 신뢰도 높은 커뮤니티 결론

구현하기 적합하지만, 버전별 설정(Configuration) 적용을 권장하는 내용:

* Prydwen의 데미지 공식 세부 분류.
* 커뮤니티에서 정리한 초격파(Super Break) 공식.
* HoYoLAB 이론 분석 글에 기술된 격파 배율, 약점 격파(Broken) 상태에서의 피해 변화 등에 대한 설명.

### C. 추가 검증 필요 항목

현재 검색 결과만으로는 충분히 안정적이고 공개된 통일 플랫 테이블을 확보하지 못한 내용:

* 전투 스킬 포인트(SP)의 정확한 초기 가치/상한/넘침(溢出)/멀티 웨이브 계승에 대한 권위 있는 규칙 페이지.
* 에너지(Energy)의 완전하고 범용적인 "행동별 획득/피격 시 획득/필살기 사용 후 반환/처치 시 반환" 데이터 테이블.
* 어그로 수치 가중치의 완전한 범용 테이블 및 타겟 고정/도발/선택 불가 간의 우선순위를 명시한 완전한 문서.
* AV 수치가 동일하여 동률일 때의 엄격한 정렬 규칙.
* 일부 최신 버전 메커니즘 (예: Exo-Toughness, 다양한 소환 시스템의 완전히 통일된 규칙).

---

# 2. 核心术语与统一记号 (핵심 용어 및 통일 표기법)

[목록으로 돌아가기](https://www.google.com/search?q=../battle-system-mechanics.md)

시뮬레이터 내부에서 아래 네이밍으로 통일하여 사용하는 것을 권장합니다.

### 2.1 개체 (Unit)

전투 계산에 참여할 수 있는 하나의 대상을 의미합니다. 다음을 포함합니다:

* 캐릭터 (캐릭터)
* 적 (몬스터)
* 소환수
* 카운트다운 객체 (일부 특수 메커니즘으로 인해 행동 게이지 상에 표시되는 countdown 객체)
* 일부 임시 형태 객체

### 2.2 속성 (Stats)

네 가지 레이어로 분류합니다:

1. **기본 속성 (Base Stats)**: 캐릭터 캐릭터 창의 기초 스탯, 레벨별 성장 수치, 적의 템플릿 기본값.
2. **장비 속성 (Displayed Stats)**: 장비/부옵션/상시 패시브가 적용된 후의 스탯.
3. **전투 상태 속성 (Battle Stats)**: 전투 진입 후 버프/디버프가 누적된 실시간 스탯.
4. **파생 속성 (Derived Stats)**: 전투 상태 속성을 통해 일시적으로 계산되는 수치. 예: `DEFMult`, `RESMult`, `CurrentAV`.

### 2.3 AV / AG / SPD

* `SPD`: 속도.
* `AG`: Action Gauge. 행동 게이지 총량. KQM 시스템에서의 기본 기준값은 `10000`입니다.
* `AV`: Action Value. 행동 수치. "다음 행동까지 남은 시간"으로 이해할 수 있습니다. 행동 시퀀스는 **AV가 낮은 순서에서 높은 순서**로 정렬되며, **AV가 가장 낮은 개체가 먼저 행동**합니다.

### 2.4 Turn / Action / Extra Turn

세 가지 개념을 명확히 구분할 것을 권장합니다:

* **Normal Turn (일반 턴)**: 정상적인 행동 게이지 진행에 의해 유도되는 턴.
* **Extra Turn (추가 턴)**: 기존 행동 게이지 상의 위치를 변경하지 않으며, 원래의 일반 라운드를 소모하지 않는 턴.
* **Inserted Action (끼어들기 행동)**: 필살기 등과 같이 일반적인 AV 진행으로 얻는 것이 아니라, 계산 윈도우 사이에 삽입되는 행동.

### 2.5 Break / Broken / Toughness

* `Toughness`: 적 전용 강인도 게이지.
* `Weakness Break`: 강인도가 0이 될 때 트리거되는 약점 격파 이벤트.
* `Broken`: 약점 격파된 후 '격파 상태'에 머무르는 기간. 해당 적이 다음번에 자신의 턴을 맞아 행동할 때까지 지속된 후 회복됩니다.

---

# 3. 推荐的战斗对象模型 (추천하는 전투 객체 모델)

[목록으로 돌아가기](https://www.google.com/search?q=../battle-system-mechanics.md)

아래의 객체 구조는 대부분의 공용 메커니즘을 충분히 지원할 수 있습니다.

```ts
interface Unit {
  id: string
  side: 'ally' | 'enemy' | 'summon' | 'special'
  archetype: 'character' | 'enemy' | 'summon' | 'memosprite' | 'countdown' | 'transformed'

  level: number
  maxHp: number
  hp: number

  baseStats: StatBlock
  battleStats: StatBlock

  speedState: {
    currentSpd: number
    currentAg: number
    currentAv: number
  }

  energy: number
  maxEnergy: number

  toughness?: {
    current: number
    max: number
    weaknesses: ElementType[]
    broken: boolean
    brokenBy?: ElementType
  }

  actionState: {
    alive: boolean
    targetable: boolean
    selectable: boolean
    canAct: boolean
    isInExtraTurn: boolean
    hasQueuedUltimate: boolean
  }

  statuses: StatusInstance[]
  shields: ShieldInstance[]
  summons: string[]

  scriptHooks: ScriptHookMap
}

```

### 3.0 기억의 영물(메모스프라이트) / Memosprite의 특수 모델링

이는 이전 버전에는 누락되었으나 최신 버전 시뮬레이터에서 매우 중요한 서브시스템입니다. 현재 확보된 자료로 **보수적이지만 구체화 가능한** 모델링 방식을 충분히 지원할 수 있습니다.

확정성/신뢰도 높은 항목:

* 기억의 영물은 캐릭터의 단순한 상태 마커가 아니라 독립적인 전투 엔티티(Entity)로 취급되어야 합니다.
* 적어도 일부 기억의 영물은 다음과 같은 독립적인 특성을 가집니다:
* 독립적인 `SPD` (속도)
* 독립적인 `HP` (체력)
* 독립적인 행동 횟수 / 라이프사이클
* 독립적인 기억의 영물 스킬 또는 특수 행동


* 적어도 일부 기억의 영물은 **100% 행동 게이지 당기기(Advance Forward)** 효과를 명확하게 받습니다. 이는 행동 게이지 상에서 독립적인 위치를 가짐을 의미합니다.
* 기억의 영물의 **타겟 선택 가능 여부는 글로벌 통합 규칙이 아닙니다**. 일부는 명확히 타겟 선택이 불가능하고, 일부는 전장의 실존 엔티티에 가깝게 동작합니다.
* 일부 기억의 영물/기억의 영물 관련 카운트다운 객체에는 "**웨이브 전환 시 행동 수치(Action Value)가 초기화되지 않는다**"고 명시되어 있으나, 이것이 모든 기억의 영물의 공통 규칙인지 증명하기에는 현재 자료가 부족합니다.

따라서 시뮬레이터에서는 다음과 같은 추가 정의를 추천합니다:

```ts
interface MemospriteState {
  ownerId: string
  initialSpd: number
  independentHp: boolean
  targetabilityMode: 'targetable' | 'untargetable' | 'scripted'
  actionResetOnWaveStart: 'reset' | 'keep' | 'scripted'
  resourceMode?: 'none' | 'charge' | 'custom'
}

```

구현 원칙:

1. **기억의 영물은 Unit으로 모델링**해야 하며, 마스터 스킬의 부수적인 상태로만 처리해서는 안 됩니다.
2. **타겟 선택 가능 여부는 엔티티의 텍스트에 따라 결정**하며, 모든 기억의 영물이 선택 불가능하다고 가정해서는 안 됩니다.
3. **웨이브 시작 시 AV 유지 여부는 엔티티/효과 텍스트에 따라 개별적으로 판단**하며, 글로벌 통합 규칙으로 묶지 않습니다.
4. 기억의 영물이 독립적인 자원(예: Charge)을 가진 경우, 해당 자원은 일반 에너지가 아닌 독립된 자원으로 구현해야 합니다.

### 3.1 중요한 설계 제안

1. **소환수 역시 Unit으로 모델링**해야 하며, 단순한 피시브 마커로 처리해서는 안 됩니다.
2. 행동 시스템과 스킬 시스템을 디커플링(분리)하십시오. 행동 시스템은 오직 "지금 누가 움직일 수 있는가"만 결정하고, 스킬 시스템은 "움직일 때 무엇을 할 것인가"를 결정합니다.
3. **버프/디버프는 범용 인스턴스 객체로 만드십시오.** 효과를 캐릭터 로직 내부에 하드코딩 형태로 고정하지 마십시오.
4. **모든 행동은 이벤트 스트림을 거치도록 처리하십시오.** 예를 들어 다음과 같습니다:
* `OnBattleStart` (전투 시작 시)
* `OnWaveStart` (웨이브 시작 시)
* `OnTurnStart` (턴 시작 시)
* `OnActionStart` (행동 시작 시)
* `OnHit` (명중 시)
* `OnDamageDealt` (피해 유도 시)
* `OnBreak` (약점 격파 시)
* `OnTurnEnd` (턴 종료 시)



---

# 4. 战斗流程总览 (전투 프로세스 개요)

[목록으로 돌아가기](https://www.google.com/search?q=../battle-system-mechanics.md)

추천하는 매크로 프로세스:

```text
전투 진입
→ Battle Start 이벤트 트리거
→ 기습/선제공격 등 특수 오프닝인 경우, AV/상태 조정
→ 메인 루프 진입:
    1. 큐에 대기 중인 필살기 / 패시브 끼어들기 이벤트 처리
    2. 최소 AV를 가진 단위를 다음 정상 행동자로 선택
    3. 전체 AV 진행 (또는 최소 AV만큼 일괄 차감)
    4. Turn Start / Action Start 실행
    5. 행동 수행 (일반 공격/전투 스킬/필살기/추가 공격/반격/소환수 행동)
    6. 명중, 피해, 강인도 감소, 상태 부여, 약점 격파 처리
    7. 행동 종료 트리거 처리
    8. Turn End 처리 및 상태 지속 시간 차감
→ 해당 웨이브의 적이 전멸하면, Wave Start 진입
→ 승패 조건 충족 시 종료

```

### 4.1 전투 시작 (Battle Start)

확정성 높은 항목:

* 일부 비술(Technique) 텍스트에는 "**다음 전투 시작 시(at the start of the next battle)**"라고 명확히 기재되어 있습니다. 따라서 **전투 전 비술은 즉각적인 전투 중 이벤트가 아니라, 전투 진입 시 상태/피해/제어/행동 게이지 조정을 주입하는 것**입니다.
* 필살기는 전투가 시작된 후, AV가 아직 소모되기 전에 사용할 수 있습니다.
* 기습(Ambush)이 발생하면 아군 전체의 행동 게이지가 일괄적으로 **20 AV 뒤로 밀리며**, 이 보정은 **속도(SPD)나 기타 AG 보정에 의존하지 않습니다**.

### 4.2 웨이브 시작 (Wave Start)

확정성 높은 항목:

* "매 웨이브 시작 시"는 독립적인 이벤트 윈도우이며, Battle Start와 등가가 아닙니다.
* 일부 효과는 "매 웨이브 시작 시(at the start of each wave)"라고 명확히 기술되어 있습니다.
* 특정 카운트다운 객체/특수 메커니즘은 **매 웨이브가 시작될 때 AV가 초기화되지 않으며**, 효과 텍스트에 따라 개별적으로 판단해야 합니다.

### 4.3 단일 행동 라이프사이클

다음과 같이 세분화하는 것을 권장합니다:

```text
TurnStart
→ ActionDeclare (행동 선언)
→ CostPay (비용 지불)
→ TargetSelect (타겟 선택)
→ HitSequence (명중 시퀀스, 다단 히트 가능)
→ Damage/Heal/Shield/Break/ApplyStatus (피해/치유/쉴드/격파/상태 부여)
→ AfterActionTriggers (행동 후 트리거)
→ TurnEnd

```

이렇게 하면 캐릭터 스크립트가 "트리거 시점의 차이"로 인해 꼬이는 현상을 방지할 수 있습니다.

---

# 5. 回合与行动条机制 (턴 및 행동 게이지 메커니즘)

[목록으로 돌아가기](https://www.google.com/search?q=../battle-system-mechanics.md)

시뮬레이터의 가장 핵심적인 부분입니다.

### 5.1 행동 게이지의 수학적 정의

확정 공식 (KQM):

* 기본 `Action Gauge = 10000`
* `Base AV = 10000 / SPD`
* `Current AG = Current AV × Current SPD`
* 오직 속도만 변할 때:

```text
New AV = Current AV × Current SPD / New SPD

```

* 일반적인 형태 (속도 변화와 게이지 당기기/밀기가 동시에 존재할 때):

```text
New AV = Current AV × Current SPD / New SPD
       - 10000 × (AdvanceForward% - ActionDelay%) / New SPD

```

### 5.2 정상적인 턴 진행

추천하는 구현 방식:

1. 각 단위의 `currentAV`를 유지 및 관리합니다.
2. 매번 `currentAV`가 가장 작은 단위를 선택하여 행동하게 합니다.
3. 이 최소 AV를 "이번에 흘러간 타임 슬라이스(시간 조각)"로 취급합니다.
4. 정상 대기열에 있는 모든 단위의 `currentAV -= minAV`를 수행합니다.
5. 현재 행동 단위는 `AV = 0`인 행동 상태로 진입합니다.
6. 해당 행동이 종료되면 다음 행동을 위한 기준 AV를 다시 부여합니다 (또는 보정된 AG/AV 상태에 따라 진행).

`AG`를 유지하는 방식으로도 등가 구현이 가능하지만, 로직을 작성할 때는 `AV`가 더 직관적입니다.

### 5.3 속도 변화 (SPD Buff/Debuff)

확정 공식:

```text
New AV = Current AV × Current SPD / New SPD

```

설명:

* 대기열 중간까지 도달한 단위가 가속 버프를 받으면 "새로운 Base AV로 초기화"되는 것이 아니라, **남은 AV를 새로운 속도에 맞추어 환산**합니다.
* 따라서 속도 버프의 효율은 "버프가 언제 적용되었는가"와 연관됩니다.

### 5.4 행동 게이지 당기기 (행동 촉진 / Advance Forward)

확정 공식:

```text
New Action Gauge = max(0, CurrentActionGauge - 10000 × AdvanceForward%)

```

이를 다시 AV로 환산:

```text
New AV = New AG / Current SPD

```

특수 케이스:

* **100% Advance Forward (즉시 행동 촉진)**: AV를 즉시 0으로 만들어 가능한 한 빨리 행동하게 합니다.
* 그러나 이는 여전히 **이미 대기열에 진입한 필살기 및 패시브 정산보다는 늦습니다**.
* 연속으로 여러 개의 100% 당기기가 발생하면, **가장 마지막에 100% 당기기 효과를 받은 단위가 먼저 행동**합니다.

### 5.5 행동 게이지 밀기 (행동 지연 / Action Delay)

게이지 당기기와 반대 방향이며, 본질적으로 AG를 증가시킵니다. 확정 표현:

```text
New Action Gauge = max(0, CurrentActionGauge - 10000 × (AdvanceForward% - ActionDelay%))

```

따라서 지연 효과만 단독으로 존재할 경우:

```text
New Action Gauge = CurrentActionGauge + 10000 × ActionDelay%

```

주의 사항:

* "감속"과 "행동 지연"은 같은 효과가 아닙니다.
* "감속"은 `SPD`를 변화시키고, "행동 지연"은 `AG / AV`를 변화시킵니다.
* 양자/허수 관련 효과에서는 제어, 행동 지연, 감속 중 하나 또는 여러 개가 동시에 나타나는 경우가 많습니다.

### 5.6 추가 턴 (Extra Turn)

확정성 높은 항목:

* 추가 턴은 **정상적인 행동 게이지에서 탈피**하여 수행하는 보너스 행동입니다.
* **원래 남아 있던 정상 라운드를 소모하지 않습니다.**
* **행동 게이지 상에서 단위의 원래 위치를 변경하지 않습니다.**
* **버프/디버프 등의 상태 지속 시간이 추가 턴 동안에는 차감(递减)되지 않습니다.**
* **추가 턴 중에는 필살기를 시전할 수 없습니다.**

따라서 추천하는 구현 모델은 다음과 같습니다:

```text
단위의 현재 정상 행동 게이지 위치를 저장
→ unit.isInExtraTurn = true 설정
→ 독립적인 1회 행동 실행
→ 정상 턴 카운트/지속 시간을 차감하지 않음
→ 종료 후 원래 행동 게이지 위치 복원

```

### 5.7 필살기 끼어들기 (Ultimate Insertion)

확정성 높은 항목:

* 필살기는 거의 임의의 시점에 사용할 수 있습니다.
* 필살기는 **현재 수행 중인 공격 행동이 완료된 직후**에 삽입되어 정산됩니다.
* 정상적인 AV 진행을 통해 얻는 행동이 아닙니다.

추천하는 구현 우선순위:

```text
현재 hit/행동 정산 완료
→ queued ultimates (대기 중인 필살기) 확인
→ 조건을 충족하는 필살기 끼어들기를 순차적으로 실행
→ 다시 정상 행동 게이지로 복귀

```

주의 사항:

* "현재 행동이 완료된 직후"라는 개념은 매우 중요합니다. 단일 hit가 아직 완전히 정산되지 않았을 때 강제로 인터럽트를 걸지 마십시오.
* 플레이어들이 자주 사용하는 "일반 행동 직후 필살기 연타"를 통해 이번 턴의 버프를 보존하는 테크닉은, "턴 종료"의 정의가 행동 선언보다 늦고 대부분의 데미지 정산보다도 늦음을 방증합니다.

### 5.8 기습 (Ambush)

확정성 높은 항목:

* 기습 시, 모든 아군 캐릭터는 일괄적으로 `20 AV`만큼 뒤로 밀립니다.
* 해당 효과는 SPD 나 다른 AG 수정자(Modifier)와 무관합니다.

### 5.9 동일 AV 동률 처리

현재 높은 수준의 통일된 문서를 확보하지 못했습니다.
**임의로 추측한 규칙을 하드코딩하지 마십시오.** 추천 사항:

* 설정 가능한 tie-breaker(동률 처리기)를 사용하십시오.
* 기본값은 우선 "큐 진입 시간 / 단위 생성 순서 / 원래 진형 자리" 중 하나를 사용할 수 있습니다.
* 이후 실제 리플레이 녹화 및 실측 데이터를 확보하여 보완하십시오.

### 5.10 소환수 및 카운트다운 객체의 행동 게이지

확정성 높은 항목:

* 적어도 일부 소환수는 **독립적인 속도, 독립적인 행동 게이지, 독립적인 행동 횟수 또는 카운트다운 객체**를 가집니다.
* 따라서 단순한 애니메이션 연출용 부속 공격으로 모델링해서는 안 됩니다.

추천 구현:

* 소환수 역시 `Unit`입니다.
* 카운트다운 객체 역시 `Unit`이지만, 스킬 리스트가 비어 있을 수 있으며 `OnTurnStart`/`OnActionStart` 시점에 특수 스크립트를 수행합니다.

---

# 6. 指令类型与资源系统 (명령 유형 및 자원 시스템)

[목록으로 돌아가기](https://www.google.com/search?q=../battle-system-mechanics.md)

### 6.1 행동 유형 제안

적어도 다음과 같은 행동 태그들을 지원해야 합니다:

* `BasicATK` (일반 공격)
* `Skill` (전투 스킬)
* `Ultimate` (필살기)
* `TalentTriggeredAction` (특성 트리거 행동)
* `FollowUpAttack` (추가 공격)
* `Counter` (반격)
* `SummonAction` (소환수 행동)
* `TechniqueOpeningEffect` (비술 오프닝 효과)
* `ExtraTurnAction` (추가 턴 행동)
* `JointAttack` (향후 특수 연공/협동 공격 지원용)

행동 태그는 연출용이 아니라 다음과 같은 제어를 위해 필요합니다:

* SP 소모 여부
* 추가 턴 내부 시전 허용 여부
* "추가 공격 횟수" 포함 여부
* 특정 전용 증댐 태그의 적용 여부
* 다른 효과를 다시 트리거하는 트리거로 작동할 수 있는지 여부

### 6.2 SP (전투 스킬 포인트)

이 부분은 충분히 견고하고 기초적인 규칙 그룹을 확인할 수 있으며, 불확실한 요소는 주로 **웨이브 간 계승 규칙** 및 **상한 변경 계열 특수효과의 중첩 우선순위**입니다.
명확한 기본값을 가진 공용 공유 자원 풀로 구현할 것을 권장합니다:

```ts
interface SkillPointState {
  current: number
  min: number
  max: number
  carryOverBetweenWaves: boolean
  initialAtBattleStart: number
}

```

확정성 높은 항목:

* SP는 **팀 공유 자원**이며, 개별 캐릭터의 독립 자원이 아닙니다.
* 팀의 **기본 최대 SP는 5**입니다.
* 팀의 **전투 진입 시 초기 SP는 3**입니다.
* **일반 공격(Basic ATK)을 사용하면 SP가 회복**됩니다.
* **전투 스킬(Skill)을 사용하면 SP가 소모**됩니다.
* 필살기(Ultimate)는 일반적인 "SP를 소모하는 전투 스킬 행동"에 해당하지 않습니다.
* 특정 캐릭터/효과는 **최대 SP(Max SP)를 증가**시킬 수 있으므로, `max`를 상수로 하드코딩해서는 안 됩니다.

따라서 범용 시뮬레이터에서는 아래 내용을 **기본 엔진 규칙**으로 채택하는 것을 추천합니다:

* `initialAtBattleStart = 3`
* `max = 5`
* `BasicATK +1 SP`
* `Skill -1 SP`
* `Ultimate 0 SP`

구현 제안:

* `max=5`를 수정 불가능한 상수로 박아넣지 마십시오. `EngineConfig.spRules.baseMax` 형태로 관리하십시오.
* "기초 규칙"과 "캐릭터/효과에 의한 상한 오버라이드"를 분리하십시오.
* 웨이브 전환 시 SP 계승 여부는 현재로서는 설정 항목으로 남겨두는 것을 권장합니다.
* 목표가 실제 인게임의 높은 재현율이라면, 이 부분은 웨이브 전환 타이밍의 시퀀스를 검증하기 위해 리플레이 실측을 보완하는 것이 좋습니다.

### 6.3 Energy (에너지)

이 부분은 **기초 에너지 반환 표**를 확정할 수 있으나, 여전히 완전한 "모든 피격 템플릿 / 다단 공격 / 특수 행동 에너지 반환 세부 사항"의 통합 표가 부족합니다.
따라서 **기초 공용 규칙 + 오버라이드 가능한 행동 레벨 설정** 구조로 만들 것을 권장합니다.

#### A. 엔진 계층

```ts
interface EnergyState {
  current: number
  max: number
  regenRate: number
}

```

#### B. 행동 스크립트 계층

각 행동, 피격, 처치, 격파, 특정 특성의 에너지 수익을 스크립트 이벤트로 분리하십시오:

* `OnUseBasicGainEnergy`
* `OnUseSkillGainEnergy`
* `OnHitGainEnergy`
* `OnKillGainEnergy`
* `OnBeingHitGainEnergy`
* `OnBreakGainEnergy`

확정성 높은 항목:

* 일반 공격: 기초 회복 `20`
* 강화 일반 공격: 기초 회복 `30`
* 전투 스킬: 기초 회복 `30`
* 필살기: 기초 회복 `5`
* 적 처치 시: 기초 회복 `10`
* 캐릭터는 피격 시 에너지를 획득하며, 수치는 **적의 공격 유형에 따라 가변적**입니다.
* 흔히 볼 수 있는 피격 에너지 회복 구간은 최소 `5 / 10 / 15 / 20 / 25` 단계를 포함합니다.
* `실제 에너지 회복량 = 기초 에너지 회복량 × 에너지 회복 효율(Energy Regeneration Rate)`
* 일부 효과는 전투 시작 시, 매 웨이브 시작 시 또는 특정 트리거 이후 에너지를 부여합니다.
* 필살기는 에너지 임계값(최대 에너지만큼 충전됨)에 의존하며, 정상적인 행동 게이지 시점에는 의존하지 않습니다.

추가 공격(Follow-Up Attack)에 대해 HoYoWiki는 세 가지 기초 에너지 회복 유형을 제시합니다:

* 타입 1 = `0`
* 타입 2 = `5`
* 타입 3 = `10`

따라서 추가 공격에 하나의 통일된 에너지 반환 상수를 부여하지 말고, 에너지 반환 타입을 행동 필드로 빼둘 것을 권장합니다.

엔지니어링 제안:

* 기초 에너지 반환 표를 설정 가능한 JSON으로 구성하되, 기본값은 상기 확정 규칙을 직접 적용하십시오.
* "피격 에너지 회복", "스킬 에너지 회복", "추가 에너지 회복", "추가 공격 분류별 회복"을 동일한 함수 내에 혼재시키지 마십시오.
* 피격 에너지 회복은 단일 상수값이 아니라 **적의 공격 템플릿**에 의해 결정되어야 합니다.

### 6.4 Toughness (강인도 게이지)

확정성 높은 항목:

* 강인도는 **적 전용 속성**입니다.
* 오직 적의 약점 속성과 일치하는 속성으로 공격할 때만 강인도가 감소합니다.
* 강인도가 0이 되면 약점 격파(Weakness Break)가 트리거됩니다.
* 적은 **다음번에 자신의 행동 턴이 돌아올 때**, 강인도를 회복하고 격파(Broken) 상태를 해제합니다.

추천 구조:

```ts
interface ToughnessState {
  current: number
  max: number
  weaknesses: ElementType[]
  broken: boolean
  brokenBy?: ElementType
  brokenSourceUnitId?: string
}

```

---

# 7. 伤害计算总公式 (데미지 계산 총공식)

[목록으로 돌아가기](https://www.google.com/search?q=../battle-system-mechanics.md)

### 7.1 일반 데미지 총공식

Wiki 및 Prydwen을 종합하여 시뮬레이터에 안정적으로 구현할 수 있는 공식 공식:

```text
Damage = BaseDamage
       × CritMult
       × DMGBoostMult
       × WeakenMult
       × DEFMult
       × RESMult
       × VulnerabilityMult
       × DMGMitigationMult
       × BrokenMult

```

엔지니어링 아키텍처 상 분할하기에 가장 적합한 구조입니다.

### 7.2 BaseDamage (기초 데미지)

추천 표현식:

```text
BaseDamage = AbilityMultiplier × ScalingStat + FlatExtraDamage

```

여기서 `ScalingStat`(기반 능력치)은 다음과 같을 수 있습니다:

* 공격력 (ATK)
* 최대 체력 (HP)
* 방어력 (DEF)
* 기타 캐릭터 특정 스탯

스킬 자체에 다단 히트가 존재하고 각 히트별 배율이 다르다면, hit 단위로 개별 계산합니다.

### 7.3 Crit (치명타 구역)

```text
CritMult = 1 + CritDMG   // 해당 hit가 치명타로 적중했을 때
CritMult = 1             // 치명타가 아닐 때

```

확정성 높은 항목:

* 다단 공격은 각 히트별로 치명타 여부를 독립적으로 판정합니다.
* 일반 캐릭터의 지속 피해(DoT)는 치명타가 발생하지 않습니다.
* 격파 데미지와 초격파 데미지는 일반적으로 치명타가 발생하지 않습니다.

### 7.4 DMGBoost (피해 증가 구역 / 증댐구역)

모든 "가하는 피해 증가 %" 효과를 하나의 공용 가산 구역으로 묶은 후, 태그 필터링을 거치도록 설계하는 것을 권장합니다:

* 가하는 모든 피해 증가
* 특정 속성 피해 증가
* 추가 공격 피해 증가
* 지속 피해(DoT) 증가
* 격파 피해 증가 (Break 전용으로 독립 계산)

일반적인 구현:

```text
DMGBoostMult = 1 + ΣApplicableDamageBonuses

```

### 7.5 Weaken (약화 구역)

적이 가하는 피해를 감소시키는 용도의 구역입니다:

```text
WeakenMult = 1 - Weaken

```

### 7.6 DEF (방어력 구역)

추천 엔지니어링 공식:

```text
DEFMult = (AttackerLevel + 20)
        / ((TargetLevel + 20) × EffectiveDEFModifier + AttackerLevel + 20)

```

여기서:

```text
EffectiveDEFModifier = max(0, 1 + DEFBonus - DEFReduction - DEFIgnore)

```

설명:

* `DEFReduction`: 대상에게 부여된 방어력 감소(방깎).
* `DEFIgnore`: 공격자의 방어력 무시(방무).
* 두 효과는 동일한 구역에 속하며, 대상의 유효 방어력을 함께 감소시킵니다.

### 7.7 RES (내성 구역)

추천 공식:

```text
EffectiveRES = clamp(TargetRES - RESPEN, -1.0, 0.9)
RESMult = 1 - EffectiveRES

```

설명:

* 하한 `-100%`, 상한 `90%` 설정은 주로 커뮤니티의 통용 구현을 바탕으로 합니다.
* 이후 더 권위 있는 버전을 확보하게 되면 clamp 부분을 대체할 수 있습니다.

### 7.8 Vulnerability (받는 피해 증가 구역 / 이상구역)

다음과 같이 통합 구현합니다:

```text
VulnerabilityMult = 1 + ΣApplicableTakenDamageBonuses

```

다음을 포함합니다:

* 모든 속성 받는 피해 증가(받피증)
* 특정 속성 받는 피해 증가
* 지속 피해(DoT) 받는 피해 증가
* 추가 공격 받는 피해 증가

### 7.9 DMG Mitigation (피해 감면 구역)

확정성 높은 항목: 여러 피해 감면 효과는 독립적으로 연승(연속 곱셈) 처리합니다:

```text
DMGMitigationMult = ∏(1 - mitigation_i)

```

여러 피해 감면 수치를 선형적으로 직접 더하지 마십시오.

### 7.10 약점 격파(Broken) 상태 구역

확정성 높은 항목:

* 대상이 약점 격파되지 않은 상태(비 Broken)일 때, 일반 가해 피해는 `0.9` 곱연산 구역의 보정을 받습니다.
* 대상이 약점 격파된 상태(Broken)가 되면, 해당 구역은 `1.0`으로 복구됩니다.

추천 구현:

```text
BrokenMult = target.toughness?.broken ? 1.0 : 0.9

```

---

# 8. 各类伤害的独立规则 (各类伤害的独立规则)

[목록으로 돌아가기](https://www.google.com/search?q=../battle-system-mechanics.md)

### 8.1 직격 피해 (Direct Damage)

완전하게 제 7 장의 일반 공식을 따릅니다.

### 8.2 추가 공격 (Follow-Up Attack)

확정성 높은 항목:

* 추가 공격은 **조건 충족 시 자동으로 트리거되는 별도의 공격** 유형입니다.
* 공격 인스턴스이므로 여전히 일반적인 명중/피해/강인도 감소/트리거 프로세스를 탈 수 있습니다.
* 단, 전용 태그를 보유하므로 "추가 공격 피해 증가 / 추가 공격 받피증" 효과의 영향을 받습니다.

추천 구현:

```ts
attack.tags = ['attack', 'follow_up']

```

### 8.3 반격 (Counter)

확정성 높은 항목:

* 반격은 본질적으로 자동 트리거되는 공격입니다.
* 일부 분석 페이지에서는 이를 추가 공격의 하위 분류 또는 관련 브랜치로 취급합니다.

추천 사항:

```ts
attack.tags = ['attack', 'counter', 'follow_up']

```

향후 특정 캐릭터가 "추가 공격" 버프는 받지 않고 오직 "반격" 버프만 받는 특수 케이스가 생긴다면 그때 세분화하십시오.

### 8.4 일반 지속 피해 (DoT)

캐릭터 DoT는 일반 데미지 시스템을 차용하되, 다음 특성을 가집니다:

* 치명타가 발생하지 않음.
* 일반적인 hit로 취급되지 않음.
* 강인도를 깎을 수 있는지 여부는 일반적으로 '아니오'임.
* DoT 전용 피해 증가 / 받피증 효과의 영향을 받음.

추천 공식:

```text
DoTDamage = BaseDoT
          × 1
          × DMGBoostMult
          × WeakenMult
          × DEFMult
          × RESMult
          × VulnerabilityMult
          × DMGMitigationMult
          × BrokenMult

```

### 8.5 격파 데미지 (Break Damage)

확정성 높은 항목: 격파 데미지와 일반 공격 데미지는 상호 독립적인 체계입니다. 주요 특징은 다음과 같습니다:

* 주로 캐릭터 레벨, 격파 특공(Break Effect), 대상의 최대 강인도(Max Toughness), 속성별 기초 배율의 영향을 받습니다.
* 치명타가 발생하지 않습니다.
* 일반적인 DMGBoost(피해 증가) 버프를 받지 못합니다.
* 대상 측 구역인 DEF, RES, Vulnerability, DMGMitigation, Broken 보정은 그대로 적용받습니다.

추천 골격 공식:

```text
BreakDamage = BreakBase
            × (1 + BreakEffect)
            × (1 + BreakDamageIncrease)
            × DEFMult
            × RESMult
            × VulnerabilityMult
            × DMGMitigationMult
            × BrokenMult

```

여기서:

```text
MaxToughnessMult = 0.5 + TargetMaxToughness / 40

```

### 8.6 속성별 격파 기초 배율

확정성 높은 항목:

* 물리: `2.0 × LevelMult × MaxToughnessMult`
* 화염: `2.0 × LevelMult × MaxToughnessMult`
* 얼음: `1.0 × LevelMult × MaxToughnessMult`
* 번개: `1.0 × LevelMult × MaxToughnessMult`
* 바람: `1.5 × LevelMult × MaxToughnessMult`
* 양자: `0.5 × LevelMult × MaxToughnessMult`
* 허수: `0.5 × LevelMult × MaxToughnessMult`

추천 사항: `LevelMult`(레벨 배율)는 수식으로 계산하기보다 데이터 룩업 테이블(테이블 매핑)로 처리하십시오.

### 8.7 격파 상태 이상 (Break DoT / Break Control)

#### 물리 (열상 / Bleed)

다음 두 부분으로 나누어 모델링할 것을 권장합니다:

* 즉각적인 격파 피해
* 후속 열상 피해

Wiki 요약 정보 기준:

* 일반 몬스터: `0.16 × TargetMaxHP`
* 엘리트/Boss 몬스터: `0.07 × TargetMaxHP`
* 상한선은 `2 × LevelMult × MaxToughnessMult` 수치에 의해 제한됩니다.

#### 화염 (연소 / Burn)

* 즉각적인 격파 피해 + 연소
* 기초 연소 참고치: `1 × LevelMult`

#### 번개 (감전 / Shock)

* 즉각적인 격파 피해 + 감전
* 기초 감전 참고치: `2 × LevelMult`

#### 바람 (풍화 / Wind Shear)

* 즉각적인 격파 피해 + 풍화
* 중첩이 가능하며, 기초 공식은 `StackCount × LevelMult`와 연관됩니다.

#### 얼음 (빙결 / Freeze)

확정성 높은 항목:

* 빙결된 단위는 자신의 턴이 돌아왔을 때 해당 턴의 행동을 상실합니다.
* 빙결 해제 시 얼음 격파 관련 피해를 받습니다.
* 이후 "다음 행동 게이지 50% 당기기" 형태로 타임라인에 표현됩니다.

엔지니어링 측면에서는 다음과 같이 분할 처리하는 것을 추천합니다:

```text
Frozen 상태 부착
→ 대상의 turn would start 시점에:
    1. 이번 정상 행동 턴을 소모(생략) 처리
    2. 빙결 피해 정산 / 빙결 해제
    3. 대상의 다음 행동에 대해 50% Advance Forward 적용

```

#### 양자 (얽힘 / Entanglement)

확정성 높은 항목:

* 기초 `20%` 행동 지연 효과를 가집니다.
* 대상의 다음 턴이 돌아올 때 지연 피해가 폭발합니다.
* 행동 지연량은 격파 특공(Break Effect)의 영향을 받습니다.

추천 구현:

* 즉각적인 행동 지연 적용 + "다음 행동 전 폭발" 상태 디버프 부여 형태로 구현하십시오.

#### 허수 (속박 / Imprisonment)

확정성 높은 항목:

* 행동 지연 및 감속 연출이 존재하며, 격파 특공이 행동 지연 정도에 영향을 줍니다.
* 단, 이번 데이터 수집 범위 내에서 완벽하게 통합된 하나의 최종 수식을 확보하지 못했습니다.

추천 사항:

* 허수 격파의 행동 지연량을 버전별 설정 항목으로 분리해 두십시오.
* 우선 커뮤니티 통용 근사치로 구현한 후 실측 보완 시 교체하십시오.

### 8.8 超击破 (초격파 / Super Break)

이 부분은 현재 **커뮤니티 높은 신뢰도 + 엔진 설정화 가능** 구조로 처리하기에 가장 적합합니다.

흔히 사용되는 커뮤니티 구현 골격:

```text
SuperBreakDamage = LevelMult
                 × (ToughnessDamage / 30)
                 × (1 + BreakEffect)
                 × DEFMult
                 × RESMult
                 × VulnerabilityMult
                 × BrokenMult
                 × SpecificSuperBreakBonuses

```

높은 신뢰도에도 불구하고 완전히 고정(Lock)하지 않은 이유:

* 게임 버전에 따라 인게임 강인도 표시 스케일 기준에 변화가 있었을 가능성이 존재합니다.
* 특정 캐릭터/상태 효과가 초격파 곱연산 구역을 추가로 수정할 수 있습니다.
* 공식 출처보다는 커뮤니티 실측 공식의 성격이 강합니다.

구현 제안:

```ts
interface SuperBreakConfig {
  enabled: boolean
  toughnessDisplayToInternalRatio: number
  denominator: number   // default 30
}

```

### 8.9 환희 피해 (Elation DMG)

이 부분은 비교적 최신의 특수한 피해 체계로, 이전 버전에서 누락되었던 내용입니다. 현재 공개된 핵심 자료는 주로 커뮤니티 메커니즘 용어 사전에서 가져온 것이나, 엔진 급 모델링을 지원하기에는 충분합니다.

신뢰도 높은 커뮤니티 확정 항목:

* `Elation DMG`는 **독립적인 피해 카테고리**이며, 일반 `DMG Boost` 프레임워크 내의 일반 공격 피해가 아닙니다.
* 별도의 공식 브랜치를 가지며, 수치는 **Punchline(핵심 펀치라인), Elation(환희 스탯), 캐릭터 레벨**과 관련이 있습니다.
* **일반 피해 증가(DMG Boost)의 영향을 받지 않습니다**.
* 대상 측의 곱연산 구역은 정상적으로 거치게 됩니다:
* `Weaken`
* `DEF`
* `RES`
* `Vulnerability`
* `DMG Mitigation`
* `Broken`


* 치명타가 발생할 수 있습니다.
* 전용 `Elation DMG Vulnerability`가 존재하므로, 일반 받피증 통에 직접 합산해서는 안 됩니다.

시뮬레이터 적용을 위해 피해 카테고리 확장을 권장합니다:

```ts
type DamageClass =
  | 'normal'
  | 'dot'
  | 'break'
  | 'super_break'
  | 'elation'

```

추천 골격 공식:

```text
ElationDamage = ElationBase
               × CritMult
               × PunchlineMult
               × MerrymakeMult
               × WeakenMult
               × DEFMult
               × RESMult
               × ElationVulnerabilityMult
               × DMGMitigationMult
               × BrokenMult

```

구현 설명:

* `ElationBase`는 독립적으로 `AbilityMultiplier × LevelMultiplier × (1 + ElationStat)` 형태의 필드들로만 구성되어야 합니다.
* 기본적으로 일반 `DMGBoostMult` 구역을 곱하지 않습니다.
* 텍스트에 "환희 피해 증가" 또는 "환희 받는 피해 증가"가 명확히 기재되어 있을 때만 해당 전용 버킷에 수치를 넣습니다.
* 특정 환희 피해가 동시에 원소 속성을 가지고 있다면, 원소 속성은 오직 속성/내성 측 정산만 결정할 뿐이며 일반 원소 속성 피해 증가를 자동으로 고스란히 받는다는 의미가 아닙니다.

엔지니어링 제안:

1. 데미지 패킷에 `element` 속성과 `damageClass='elation'` 속성을 동시에 유지하십시오.
2. `Elation Skill`을 자동으로 일반 `Skill`, `Follow-Up Attack` 또는 `Counter`와 동일시하지 마십시오.
3. Punchline / Merrymake / Certified Banger와 연관된 모든 수치는 가급적 독립 자원 및 상태 버킷으로 구현하십시오.

---

# 9. 生存相关机制 (생존 관련 메커니즘)

[목록으로 돌아가기](https://www.google.com/search?q=../battle-system-mechanics.md)

### 9.1 치유 (Healing)

추천 공식:

```text
Healing = (ScalingStat × HealRatio + FlatHeal)
        × (1 + OutgoingHealingBoost + IncomingHealingBoost - IncomingHealingReduction)

```

"치유 보너스(가하는 치유)"와 "받는 치유 보너스/감소"를 분리하여 처리하는 것을 권장하며, 하나의 필드로 혼합하지 마십시오.

### 9.2 쉴드 (Shield)

추천 공식:

```text
ShieldValue = (ScalingStat × ShieldRatio + FlatShield)
            × (1 + ShieldBonus)

```

추천 사항:

* 쉴드는 단순한 하나의 총합 숫자가 아니라, 하나 이상의 `ShieldInstance`가 쌓인 스택 형태로 구현하십시오.
* 그래야만 출처가 다르고, 지속 시간이 다르며, 갱신 가능 여부가 다른 다중 쉴드 메커니즘을 정확히 처리할 수 있습니다.

### 9.3 피격 정산 순서 제안

단일 hit의 최종 정산 순서는 아래 방식을 추천합니다:

```text
기초 원시 데미지 계산
→ 피해 감면/받피증/방어력/내성 적용
→ 쉴드 흡수 정산
→ 잔여 피해 생명력(HP) 차감
→ 빈사/사망/부활 판정 체크
→ 피격 후 이벤트 트리거

```

### 9.4 다운(사망), 빈사, 부활

이 부분은 상당수 캐릭터 스크립트 계층에 속하지만, 엔진 레벨에서 범용 훅(Hook)을 미리 예약해 두어야 합니다:

* `BeforeLethalDamage` (치명적인 피해를 받기 직전)
* `OnDowned` (다운되었을 때)
* `OnRevive` (부활 시)
* `OnLeaveField` (퇴장 시)

그렇지 않으면 향후 "체력 고정(데미지 면역)", "사망 지연", "1회성 부활" 등의 메커니즘을 지원하기가 매우 까다로워집니다.

---

# 10. 弱点与属性系统 (약점 및 속성 시스템)

[목록으로 돌아가기](https://www.google.com/search?q=../battle-system-mechanics.md)

### 10.1 속성 유형

표준 원소 구성:

* Physical (물리)
* Fire (화염)
* Ice (얼음)
* Lightning (번개)
* Wind (바람)
* Quantum (양자)
* Imaginary (허수)

### 10.2 약점 명중 및 강인도 감소

확정성 높은 항목:

* 어떤 속성이든 HP에 피해를 입힐 수 있습니다.
* **오직 적의 약점 속성과 일치하는 공격**만 적의 강인도(Toughness) 게이지를 깎을 수 있습니다.
* 강인도가 0이 되면 약점 격파(Weakness Break)가 발생합니다.
* 약점 격파는 다음과 같은 효과를 유도합니다:
1. 격파 피해(Break Damage) 1회 유도
2. 적의 행동 게이지 `25%` 지연
3. `150%` 기초 확률로 대응 속성의 격파 상태 이상/제어 효과 부여
4. 격파(Broken) 상태 진입



### 10.3 약점 격파(Broken) 상태 회복

약점 격파 상태 회복은 다음과 같이 동작합니다:

* 적은 **다음번에 자신의 행동 턴이 정상적으로 돌아왔을 때** 강인도를 복구합니다.
* 이는 격파 상태의 지속 시간이 고정된 시간 초 단위나 고정된 글로벌 라운드 수가 아니라, 대당 대상이 언제 다시 움직이느냐에 따라 결정됨을 의미합니다.

### 10.4 약점 무시 강인도 감소 / 컬러풀 격파 / 특수 깎기

이러한 메커니즘은 특정 캐릭터 스크립트 계층에서 매우 흔하게 나타나므로, 엔진단에서 아래와 같이 추상화해 두는 것이 가장 좋습니다:

```ts
interface ToughnessDamagePacket {
  amount: number
  element: ElementType
  ignoresWeaknessRequirement?: boolean
  weaknessBreakEfficiencyMultiplier?: number
}

```

이렇게 설계해 두어야 추후 "약점 무시 강인도 감소", "속성 무시 격파", "약점 격파 효율 증가" 등의 효과를 유연하게 적용할 수 있습니다.

---

# 11. 仇恨与目标选择 (어그로 및 타겟 선택)

[목록으로 돌아가기](https://www.google.com/search?q=../battle-system-mechanics.md)

### 11.1 현재 확정성 수준

이 부분은 현재 **직접 구현 가능한 수준의 커뮤니티 리버스 엔지니어링 공식**이 확보되어 있으나, "도발(Taunt)과 타겟 고정(Lock-On)의 공식적인 우선순위 체인" 및 "적 AI 자체의 별도 스크립트 가중치 유무"는 아직 완벽하게 고정되지 않았습니다.
가장 안정적인 전략은 **기본 어그로 공식은 커뮤니티 리버스 공식을 따르되, 강제 지정 계열 효과는 스크립트 레이어에서 덮어쓰도록 처리**하는 것입니다.

확정성/신뢰도 높은 항목:

* 도발(Taunt) 효과는 일반적인 어그로 우선순위를 오버라이드(커버)합니다.
* Lock On / 지정 타겟 계열 효과는 특정 행동 인스턴스를 해당 타겟에 강제로 바인딩합니다.
* 특정 상태 효과는 단위를 선택 불가능하게 만들거나, 아예 행동 시퀀스 순서에서 제외하기도 합니다 (예: Departed / Backup 등의 특수 상태).
* 바운스(Bounce) 공격은 일반 어그로의 영향을 받지 않고, 후보 타겟 풀 내에서 균등한 확률로 무작위 명중합니다.
* 커뮤니티 공용 어그로 계산식:

```text
Aggro = BaseAggro × (1 + AggroModifier)
P(target) = Aggro_target / Σ Aggro_all_candidates

```

* 이미 완성도 높은 운명의 길(Path)별 기초 어그로 테이블이 확보되어 있습니다:
* 수렵 (Hunt) = 3
* 지식 (Erudition) = 3
* 화합 (Harmony) = 4
* 공허 (Nihility) = 4
* 풍요 (Abundance) = 4
* 기억 (Remembrance) = 4
* 환희 (Elation) = 4
* 파멸 (Destruction) = 5
* 보존 (Preservation) = 6



### 11.2 추천하는 타겟 선택 레이어

적의 타겟 선택 로직을 아래 순서대로 계층화하는 것을 권장합니다:

```text
1. 선택 불가 대상을 필터링 (사망, 전장 퇴장, 특수 선택 불가 상태)
2. 스킬 자체가 바운스(Bounce) 구조인 경우, 일반 어그로를 생략하고 후보 풀에서 균등하게 랜덤 추출
3. 강제 타겟 고정 효과 (Lock On / forced target) 적용 여부 체크
4. 도발(Taunt) 계열 효과 적용 여부 체크
5. 남아 있는 유효 후보군 내에서 aggro weight(어그로 가중치)를 기준으로 샘플링 또는 정렬 진행
6. 스킬 자체에 특수 규칙(최저 체력 우선/인접 타겟/특정 약점 우선)이 있다면 기본 로직 위에 오버라이드

```

### 11.3 추천 설정 구조

```ts
interface TargetingConfig {
  baseAggroWeightsByRole?: Record<string, number>
  tauntOverridesNormalAggro: boolean
  lockOnOverridesTaunt: boolean | 'scripted'
  bounceIgnoresAggro: boolean
  defaultTieBreaker: 'slot' | 'spawnOrder' | 'random'
}

```

### 11.4 지금 당장 구현해야 하는 경우

실제 환경에 가장 근접하게 복원할 수 있는 아래 대안을 채택하십시오:

* 일반적인 적의 공격: 어그로 가중치에 기댄 확률적 무작위 추출.
* Base Aggro는 우선 운명의 길(Path) 테이블을 디폴트로 매핑하여 부여.
* 도발: 복잡한 계산 없이 대상 타겟을 즉시 강제 지정.
* Lock-On: 일반 어그로 계산을 스킵하는 스크립트 기반 지정 타겟 효과로 디폴트 처리.
* 바운스: 일반 어그로를 건너뛰고 균등한 확률로 랜덤 추출.
* 특수 보스 스킬: 스킬 스크립트에 고유하게 박혀 있는 개별 타겟 규칙을 우선 따름.

### 11.5 아직 완전히 확정되지 않은 점

* 도발(Taunt)과 타겟 고정(Lock-On)의 **공식적인 우선순위 관계**는 현재로서는 스크립트나 설정 항목으로 빼두는 것이 적합합니다.
* 다중 Lock-On이 공존할 때 서로를 오버라이드하는 방식.
* 여러 출처에서 오는 `AggroModifier`들의 엄격한 연산 누적 순서.
* 특정 보스 몬스터가 일반 어그로 추출 외에 추가적인 고유 AI 룰을 내포하고 있는지 여부.

---

# 12. Buff / Debuff / 控制效果时序 (버프 / 디버프 / 제어 효과 시퀀스)

[목록으로 돌아가기](https://www.google.com/search?q=../battle-system-mechanics.md)

### 12.1 범용 상태 객체

추천 구조:

```ts
interface StatusInstance {
  id: string
  kind: 'buff' | 'debuff' | 'control' | 'other'
  sourceUnitId: string
  ownerUnitId: string

  dispellable: boolean
  removableByCleanse: boolean
  stackable: boolean
  maxStacks?: number
  stacks: number

  durationMode: 'turns' | 'actions' | 'until_trigger' | 'permanent'
  remainingTurns?: number
  tickTiming?: 'source_turn_start' | 'source_turn_end' | 'owner_turn_start' | 'owner_turn_end' | 'special'

  tags: string[]
  params: Record<string, number | string | boolean>
}

```

### 12.2 상태 지속 시간 차감 타이밍

확정성 높은 항목:

* 상태 지속 시간 조건은 개별 효과 텍스트에 독립적으로 기술되어 있습니다 (예: "특정 유닛의 턴 시작 시 지속 시간 1 감소").
* 따라서 **모든 상태가 턴 소유자(owner)의 turn end 시점에 일괄 차감된다고 가정해서는 안 됩니다**.
* 추가 턴(Extra Turn) 동안에는 어떠한 상태 지속 시간도 **차감되지 않습니다**.

구현 제안:

* 각 상태 인스턴스에 `tickTiming` 항목을 명시적으로 설계하십시오.
* 명확한 텍스트 증거가 없다면 글로벌 일괄 타이밍으로 기본 가정을 묶지 마십시오.

### 12.3 해제 / 정화

확정성 높은 항목:

* 디버프는 텍스트에 해제 불가능이 명시되어 있지 않다면 일반적으로 해제(정화)할 수 있습니다.
* 버프 제거와 디버프 제거 로직이 둘 다 시스템 내에 공존해야 합니다.
* 일부 디버프 분류에 속하는 상태라도 "해제 불가능" 속성이 텍스트에 박혀 있는 케이스가 존재합니다.

### 12.4 중첩, 갱신, 오버라이드

현재 완전히 공용화된 단일 "범용 중첩 규칙 가이드 테이블"은 불완전하므로, 개별 상태별로 중첩 정책을 명시 선언하는 형태를 강력히 권장합니다:

```ts
stackPolicy: 'refresh' | 'independent_instances' | 'add_stacks' | 'replace_weaker' | 'replace_stronger' | 'no_stack'

```

### 12.5 제어류 효과

아래 제어 카테고리들은 반드시 독립적으로 지원되도록 코드를 열어두어야 합니다:

* Freeze (빙결)
* Entanglement (얽힘)
* Imprisonment (속박)
* Taunt (도발)
* Forced target / Lock On (강제 타겟 / 타겟 고정)
* Special cannot act / cannot be targeted (특수 행동 불가 / 타겟 선택 불가)
* Time Stop (일부 특수 전투 전 오프닝 기믹 혹은 특정 캐릭터 전용 메커니즘)

---

# 13. 追加攻击、反击、召唤物、倒计时对象 (추가 공격, 반격, 소환수, 카운트다운 객체)

[목록으로 돌아가기](https://www.google.com/search?q=../battle-system-mechanics.md)

### 13.0 Aha Instant (아하 순간 / 아하 타임) 및 Elation Skill (환희 스킬)

이 부분은 환희 체계의 핵심 실행 창구(Window)로, 일반적인 추가 공격 및 추가 턴과 밀접하게 연관되어 있으나 **완전히 동일시해서는 안 됩니다**.

신뢰도 높은 커뮤니티 확정 항목:

* `Aha Instant`는 일종의 전용 정산 윈도우입니다. 조건이 충족되면 아하가 행동에 돌입하며 일련의 연속 정산 시퀀스를 트리거합니다.
* `Aha Instant` 기간 동안, `Elation Skill` 시전 자격을 가진 모든 단위가 각자 1회씩 `Elation Skill`을 방출합니다.
* 현재 시전 가능한 `Elation Skill` 유닛이 전장에 하나도 없다면, 아하는 미리 정의된 디폴트 행동을 대신 수행합니다 (예: 텍스트에 명시된 `Let There Be Laughter`).
* `Elation Skill`들의 구체적인 실행 순서는 고정된 참여자 순서 리스트인 Participant ID에 의해 제어됩니다.
* `Aha Instant` 창이 닫히기 직전, 이번 시퀀스 동안 Punchline 수치에 누적된 결과물에 기초하여 사후 처리를 정산하고 Punchline 풀을 초기화합니다.
* 특정 특수 효과는 아하에게 **즉시 1회의 추가 턴(extra turn)을 제공**할 수 있습니다. 이는 아하 본체의 행동 타이밍 자체를 바꾸는 기믹이며, 모든 환희 스킬들을 자동으로 일반 추가 공격 취급으로 바꾸는 것과는 별개의 레이어입니다.

따라서 추천하는 엔진 모델링은 아래 구조를 지양하고:

```text
Aha Instant = 일련의 일반적인 추가 공격 모음

```

대신 아래 시퀀스 구조를 채택해야 합니다:

```text
아하 행동 돌입
→ 전용 AhaInstant 윈도우 개방
→ 자격을 갖춘 ElationSkill 참여 유닛 리스트 수집
→ 참여자 ID 정렬 순서대로 ElationSkill 목록 순차 실행
→ 인스턴트 종료 시점의 보상 정산 / 클린업 적용
→ Punchline 클리어 (효과 텍스트에 그렇게 하도록 지시되어 있는 경우)
→ 전용 윈도우 폐쇄

```

중요한 구분점:

* `Elation Skill`은 **디폴트로 일반 추가 공격(Follow-Up Attack) 마킹을 덧씌우지 않는 것**이 안전합니다.
* `Aha Instant`는 일반적인 추가 턴과 **동치가 아닙니다**. 이는 아하의 단일 행동 범위 내부에서 작동하는 "다중 캐릭터 전용 상호작용 정산 창"에 가깝습니다.
* 오직 텍스트에 명시적으로 "즉시 추가 턴 1회 획득" 문구가 박혀 있을 때만 아하 본체 객체에 추가 턴 의미론(Semantics)을 부여하십시오.

추천 데이터 구조:

```ts
interface AhaState {
  punchline: number
  instantOpen: boolean
  merrymake?: number
}

interface ElationSkillParticipant {
  unitId: string
  participantId: number
  canCast: boolean
}

```

### 13.1 추가 공격

확정성 높은 항목:

* 추가 공격은 조건에 부합할 때 자동으로 트리거되는 공격이며, "정상적인 턴 내의 행동 선언" 파이프라인의 일부가 아닙니다.
* 트리거 시 타겟 선택, 명중, 피해 유도, 강인도 감소, 사후 트리거를 포함하는 하나의 온전한 독립 공격 이벤트 스트림을 생성합니다.

### 13.2 반격

본질적으로 추가 공격과 완전히 동일한 엔진 메커니즘을 공유하도록 하되, 단지 내부 태그에 `counter` 식별자만 추가하는 방식을 권장합니다.

### 13.3 소환수

확정성 높은 항목:

* 적어도 일부 소환수는 명확하게 다음 속성들을 보유합니다:
* 독립적인 속도 (SPD)
* 독립적인 행동 게이지 (Timeline 위치)
* 독립적인 행동 횟수 / 중첩 레이어 / 우선 타겟 타겟팅 로직



추천 구현 구조:

```ts
interface SummonUnit extends Unit {
  ownerId: string
  durationMode: 'indefinite' | 'turn_count' | 'action_count' | 'special'
  remainingActions?: number
}

```

### 13.4 카운트다운 객체

일부 시스템 기믹은 행동 게이지 상에 별도의 "카운트다운 객체"를 생성합니다. 이것의 본질은 다음과 같습니다:

* 일반 유닛들과 동등하게 행동 순서 정렬에 참여함.
* 자신의 타임라인 차례가 도달했을 때 지정된 특수 스크립트를 밀어 넣음.
* 일반 공격이나 전투 스킬과 같은 표준 선택지 콤보를 보유하지 않을 수 있음.

이것을 캐릭터 객체 본체 내부의 부속 필드로 억지로 쑤셔 넣지 말고, 온전한 하나의 `Unit` 인스턴스로 분리 대우하는 편이 설계상 깨끗합니다.

---

# 14. 事件驱动实现建议 (이벤트 구동형 구현 제안)

[목록으로 돌아가기](https://www.google.com/search?q=../battle-system-mechanics.md)

확장과 유지보수가 용이한 시뮬레이터를 원한다면 방대한 `if-else` 분기문을 작성하는 대신 **이벤트 구동형(Event-Driven) 아키텍처**를 채택할 것을 강력히 권장합니다.

### 14.1 핵심 이벤트 엔트리 목록

```text
OnBattleStart (전투 시작 시)
OnWaveStart (웨이브 시작 시)
OnBeforeActionOrderResolve (행동 순서 정렬 직전)
OnTurnStart (턴 시작 시)
OnActionStart (행동 시작 시)
OnBeforePayCost (비용 지불 직전)
OnAfterPayCost (비용 지불 직후)
OnBeforeTargetSelect (타겟 선택 직전)
OnAfterTargetSelect (타겟 선택 직후)
OnBeforeHit (명중 직전)
OnHit (명중 시)
OnDamageCalculated (데미지 계산 완료 시)
OnDamageDealt (데미지 가해 완료 시)
OnHealDone (치유 완료 시)
OnShieldApplied (쉴드 적용 시)
OnToughnessDamage (강인도 감소 시)
OnWeaknessBreak (약점 격파 시)
OnStatusApply (상태 효과 부여 시)
OnStatusExpire (상태 효과 만료 시)
OnKill (처치 시)
OnUnitDowned (단위 다운 시)
OnRevive (부활 시)
OnActionEnd (행동 종료 시)
OnTurnEnd (턴 종료 시)
OnUltimateQueued (필살기 대기열 진입 시)
OnUltimateInserted (필살기 끼어들기 시점)

```

### 14.2 이벤트 구동형이 강제되는 이유

붕괴: 스타레일의 캐릭터 스킬 텍스트는 대부분 아래와 같은 논리 구조를 띄고 있습니다:

* "아군이 공격을 가한 후……"
* "적의 약점이 격파될 때……"
* "아군의 턴이 시작될 때……"
* "이번 공격이 추가 공격에 해당할 경우……"
* "매 웨이브가 시작될 때……"

이러한 메커니즘은 본질적으로 전형적인 이벤트 리스너 패턴에 부합하며, 거대한 메인 프로세스 파이프라인 내부에 직접 하드코딩하기에 부적합합니다.

---

# 15. 推荐的最小伪代码 (추천하는 최소 의사코드)

[목록으로 돌아가기](https://www.google.com/search?q=../battle-system-mechanics.md)

### 15.1 메인 루프 (Main Loop)

```ts
while (!battle.isFinished()) {
  // 필살기, 강제 패시브, 외보 행동 등 처리
  processQueuedInsertedActions() 

  const actor = getNextNormalActorByMinAV()
  advanceTimelineTo(actor)

  startTurn(actor)

  if (actor.actionState.canAct) {
    const action = actor.controller.chooseAction(battle)
    executeAction(actor, action)
  }

  endTurn(actor)

  if (battle.waveCleared()) {
    startNextWave()
  }
}

```

### 15.2 행동 게이지 타임라인 진행

```ts
function advanceTimelineTo(actor: Unit) {
  const dt = actor.speedState.currentAv

  for (const unit of battle.normalTimelineUnits()) {
    unit.speedState.currentAv = Math.max(0, unit.speedState.currentAv - dt)
    unit.speedState.currentAg = unit.speedState.currentAv * unit.speedState.currentSpd
  }
}

```

### 15.3 속도 변화 시 정산 로직

```ts
function recalcAVOnSpeedChange(unit: Unit, newSpd: number) {
  const currentAv = unit.speedState.currentAv
  const currentSpd = unit.speedState.currentSpd

  unit.speedState.currentAv = currentAv * currentSpd / newSpd
  unit.speedState.currentSpd = newSpd
  unit.speedState.currentAg = unit.speedState.currentAv * newSpd
}

```

### 15.4 게이지 당기기 / 밀기 (Advance / Delay)

```ts
function modifyActionGauge(unit: Unit, advancePct: number, delayPct: number) {
  const currentAg = unit.speedState.currentAg
  const newAg = Math.max(0, currentAg - 10000 * (advancePct - delayPct))
  unit.speedState.currentAg = newAg
  unit.speedState.currentAv = newAg / unit.speedState.currentSpd
}

```

### 15.5 추가 턴 보상 및 처리

```ts
function grantExtraTurn(unit: Unit) {
  battle.extraTurnStack.push({
    unitId: unit.id,
    preservedAv: unit.speedState.currentAv,
    preservedAg: unit.speedState.currentAg,
  })
}

function executeExtraTurn(unit: Unit) {
  unit.actionState.isInExtraTurn = true
  // 필살기 사용 제한, 상태 타이머 고정
  const action = unit.controller.chooseExtraTurnAction(battle)
  executeAction(unit, action)
  unit.actionState.isInExtraTurn = false
}

```

### 15.6 일반 데미지 정산 핵심 함수

```ts
function calcNormalDamage(ctx: DamageContext): number {
  const base = ctx.abilityMultiplier * ctx.scalingStat + ctx.flatExtraDamage
  const crit = ctx.canCrit && ctx.didCrit ? (1 + ctx.critDmg) : 1
  const dmgBoost = 1 + sumApplicableDamageBonuses(ctx)
  const weaken = 1 - ctx.target.weaken
  const defMult = calcDEFMult(ctx)
  const resMult = calcRESMult(ctx)
  const vulnMult = 1 + sumApplicableVulnerabilities(ctx)
  const mitigationMult = multiplyMitigations(ctx.target)
  const brokenMult = ctx.target.isBroken ? 1.0 : 0.9

  return base * crit * dmgBoost * weaken * defMult * resMult * vulnMult * mitigationMult * brokenMult
}

```

### 15.7 격파 데미지 정산 핵심 함수

```ts
function calcBreakDamage(ctx: BreakContext): number {
  const breakBase = calcBreakBase(ctx.element, ctx.attacker.level, ctx.target.maxToughness)
  const breakEffectMult = 1 + ctx.attacker.breakEffect
  const breakDmgIncrease = 1 + ctx.attacker.breakDamageIncrease
  const defMult = calcDEFMult(ctx)
  const resMult = calcRESMult(ctx)
  const vulnMult = 1 + sumApplicableVulnerabilities(ctx)
  const mitigationMult = multiplyMitigations(ctx.target)
  const brokenMult = ctx.target.isBroken ? 1.0 : 0.9

  return breakBase * breakEffectMult * breakDmgIncrease * defMult * resMult * vulnMult * mitigationMult * brokenMult
}

```

---

# 16. 如果你要“直接开始写模拟器”，推荐的模块拆分 ("시뮬레이터 바로 개발하기"를 위한 추천 모듈 분할)

[목록으로 돌아가기](https://www.google.com/search?q=../battle-system-mechanics.md)

```text
battle/
  engine.ts                // 메인 루프 관제
  timeline.ts              // SPD / AV / 끼어들기 / Extra Turn / 소환수 타임라인 관리
  events.ts                // 중앙 이벤트 버스
  targeting.ts             // 타겟 선택 알고리즘 및 어그로 계산
  damage.ts                // 일반 데미지 / DoT / 격파 / 초격파 정산 파이프라인
  toughness.ts             // 강인도 수치 감소, 격파 트리거, Broken 복원 관리
  statuses.ts              // 버프/디버프/제어/해제/타이머 차감 제어
  resources.ts             // HP / Shield / SP / Energy 자원 상태 관리
  actions.ts               // 행동 선언/비용 지불/타겟 바인딩/다단 hit 제어
  scripts/
    character/*.ts         // 개별 캐릭터 전용 리스너 스크립트 덤프
    enemy/*.ts             // 적 개별 스크립트 덤프
  config/
    engine-version.json
    energy-rules.json
    sp-rules.json
    aggro-rules.json

```

이 구조의 장점은 규칙이 아직 완전히 명확하지 않은 가변 요소들(SP, Energy, 어그로 세부사항 등)을 전부 외부 config 설정 파일로 격리해 둘 수 있어, 핵심 핵심 메인 엔진 파이프라인의 종단 개발을 방해하지 않는다는 것입니다.

---

# 17. 仍需实测/建议配置化的部分 (추가 실측 필요/설정화 권장 부분)

[목록으로 돌아가기](https://www.google.com/search?q=../battle-system-mechanics.md)

아래 명시된 규칙들은 **v1.0 빌드 단계에서 절대 불변의 진리로 하드코딩하지 마십시오**.

### 17.1 SP (전투 스킬 포인트)

현재 확정된 핵심 하드 룰:

* `initialAtBattleStart = 3`
* `max = 5`
* `basicGain = 1`
* `skillCost = 1`
* `ultimateCost = 0`

설정 항목으로 빼둘 것을 권장하는 유일한 요소:

* `carryOverBetweenWaves` (웨이브 간 SP 인계 여부)
* `max` 수치의 전투 중 동적 수정/중첩 우선순위 규칙

추천 설정 예시:

```json
{
  "initialAtBattleStart": 3,
  "max": 5,
  "basicGain": 1,
  "skillCost": 1,
  "ultimateCost": 0,
  "carryOverBetweenWaves": true
}

```

상기 5개 핵심 수치는 이미 충분히 공신력 있는 출처를 보유하고 있습니다. 오직 `carryOverBetweenWaves` 항목만 시스템 유연성을 위해 설정 키값으로 분리해 둘 것을 권장합니다.

### 17.2 Energy (에너지)

기초 에너지 반환을 아래와 같은 기본 디폴트 매핑 테이블로 구성하는 것을 제안합니다:

```json
{
  "basic": 20,
  "enhancedBasic": 30,
  "skill": 30,
  "ultimate": 5,
  "kill": 10,
  "beingHitBuckets": [5, 10, 15, 20, 25],
  "followUpTypeEnergy": {
    "type1": 0,
    "type2": 5,
    "type3": 10
  }
}

```

일반 공격 / 강화 일반 공격 / 전투 스킬 / 필살기 / 처치 및 ERR(에너지 회복 효율) 곱연산의 관계는 이미 높은 확정성을 보장합니다.
향후 정밀 실측 데이터나 인게임 프레임 녹화본을 통해 추적 검대 보완해야 하는 실질적 구역은 다음과 같습니다:

* 적의 구체적인 공격 템플릿별 `beingHitBucket` 인덱스 매핑 관계.
* 다단 공격 시 에너지 반환이 꽂히는 정밀 프레임 프랙션 시점.
* 특정 기믹형 특수 행동의 추가 에너지 획득 효과가 ERR 버프의 곱연산 보정을 받는지 여부.

### 17.3 어그로 (Aggro)

우선 아래 설정을 디폴트로 빌드하십시오:

```json
{
  "baseByPath": {
    "hunt": 3,
    "erudition": 3,
    "harmony": 4,
    "nihility": 4,
    "abundance": 4,
    "remembrance": 4,
    "elation": 4,
    "destruction": 5,
    "preservation": 6
  },
  "tauntOverridesNormalAggro": true,
  "lockOnOverridesTaunt": "scripted",
  "bounceIgnoresAggro": true
}

```

운명의 길 기반 기본 웨이트 가중치와 바운스 스킬의 어그로 스킵 공식은 검증된 커뮤니티 출처에 기반합니다. 정밀한 조율이 필요한 구역은 Lock-On 과 도발(Taunt) 간의 공식적인 상호 오버라이드 정산 우선순위 구조입니다.

### 17.4 동일 AV 동률 정렬 정책

우선 아래 단일 정책 설정을 사용하십시오:

```json
{
  "timelineTieBreaker": "spawnOrder"
}

```

---

# 18. 推荐测试用例 (추천 테스트 케이스)

[목록으로 돌아가기](https://www.google.com/search?q=../battle-system-mechanics.md)

시뮬레이터 코드를 작성한 후, 시스템 안정성 회귀 테스트를 위해 아래 최소 유스케이스 검증을 필수적으로 통과시켜야 합니다.

### 18.1 순수 속도 선형성 검증

* 조건 A: 100 SPD 유닛
* 조건 B: 125 SPD 유닛
* 외부 게이지 당기기 / 감속 요소 완전 배제

검증 포인트: 동일한 장기 매크로 AV 타임라인 범위 내에서 B 유닛의 총 행동 횟수가 선형적으로 더 많아야 하며, 이는 KQM 가이드라인에 명시된 "100 SPD 유닛이 4회 움직일 때, 125 SPD 유닛은 약 5회 움직인다"는 물리적 속도 비례 관계를 정확히 만족해야 합니다.

### 18.2 진행 중 실시간 속도 가속 정산

* 특정 유닛의 잔여 AV 수치가 0이 아닌 타임라인 중간 상태에서 동적 속도 버프 부여.

검증 포인트: 유닛의 타임라인 대기열 잔여 AV가 새로운 속도 기준으로 일괄 초기화되는 오류가 없어야 하며, `CurrentAV × CurrentSPD / NewSPD` 수식에 의거하여 현재 위치 기준 비례 환산이 한 프레임의 오차도 없이 깨끗하게 맞아떨어져야 합니다.

### 18.3 100% 게이지 당기기 (즉시 촉진) 메커니즘

검증 포인트:

* 효과 적용 즉시 해당 유닛의 AV가 0으로 수렴해야 함.
* 타임라인 도달 시점에 대기열에 이미 누적되어 있던 타 유닛의 필살기 선언 및 기 가동 중인 패시브 인터럽트가 여전히 구조적 우선권을 유지해야 함.
* 다중 유닛이 동일 타이밍에 연속적으로 100% 당기기 버프를 중첩 취득했을 경우, 논리상 가장 마지막에 버프를 취득한 유닛이 최선두 행동권을 낚아채야 함.

### 18.4 추가 턴 (Extra Turn) 의미론 무결성

검증 포인트:

* 추가 턴 진입 및 종료 시 행동 게이지 상의 원본 대기 위치가 훼손되지 않아야 함.
* 부착되어 있던 버프/디버프 등의 지속 시간 턴 카운터가 전혀 깎이지 않아야 함.
* 추가 턴 구동 도중에는 인게임 룰셋에 따라 필살기 사용 스탬프 선언이 원천 차단되어야 함.

### 18.5 약점 격파 (Weakness Break) 트리거 시퀀스

검증 포인트:

* 적 강인도를 0으로 깎아 내리는 명중 프레임 즉시 격파 피해 정산 파이프라인이 정상 트리거되어야 함.
* 대상 적 객체의 기본 타임라인 AV 가 선형적으로 25% 지연 연산되어야 함.
* 대상 적 객체가 즉시 Broken 상태 플래그를 취득해야 함.
* 대상 적 객체가 자신의 고유 행동 턴을 완전히 소모하여 다시 원래 자리로 돌아오는 Turn End 프레임에 도달해서야 강인도 복구 및 Broken 플래그 해제가 순차 처리되어야 함.

### 18.6 약점 격파(Broken) 데미지 멀티플라이어 연동

검증 포인트:

* 대상을 격파하기 전 일반 타격 타겟팅 상태에서는 `BrokenMult = 0.9` 가 인입 데미지 패킷에 정확히 곱해져야 함.
* 대상이 격파된 Broken 상태를 유지하는 동안에는 피해량 곱연산 구역에 `BrokenMult = 1.0` 이 누락 없이 주입되어야 함.

### 18.7 다단 공격 (Multi-Hit) 분할 판정

검증 포인트:

* 단일 액션 내부의 매 히트(hit) 분할 세그먼트마다 치명타 발생 및 개별 온히트 트리거 리스너가 독립적으로 정상 가동해야 함.
* 단, 액션 전체 종료 조건에 바인딩된 '행동 종료 후 트리거' 계열 리스너는 모든 세그먼트 hit 정산이 완전히 완료된 최종 통합 프레임에만 정확히 1회 호출되어야 함.

### 18.8 전투 시작 오프닝 비술 및 웨이브 오프닝 이벤트 구분

검증 포인트:

* Battle Start 컨텍스트와 Wave Start 컨텍스트가 상호 독립적인 고유 이벤트로 분리 발송되어야 함.
* 오직 전투 시작 시점에만 영구 주입되도록 설계된 비술 버프 패킷이 웨이브 전환 프레임을 통과할 때 원인 미상으로 다시 재중첩되는 버그가 없어야 함.

---

# 19. 最终建议：如何从这份文档落地成“可运行模拟器” (최종 제안: 본 문서를 "실행 가능한 시뮬레이터"로 빌드하는 방법)

[목록으로 돌아가기](https://www.google.com/search?q=../battle-system-mechanics.md)

### 제1단계: "코어 엔진 메커니즘의 무결성" 달성

반드시 아래 5가지 코어 아키텍처 규칙 계층을 먼저 완전한 무결성 상태로 확보하십시오:

1. 시간선 타겟팅 정렬 및 선형 진행 로직.
2. 일반 데미지 곱연산 구역 공식의 완벽한 수식 복원.
3. 강인도 연산, 격파 판정 및 턴 연동형 복구 시퀀스.
4. 독립 버프/디버프 타이머 및 조건부 지속 시간 차감 알고리즘.
5. 인터럽트 행동 파이프라인 제어 (필살기 삽입 / 추가 턴 스택 / 추가 공격 인스턴스 큐).

### 제2단계: "동적 가변 규칙의 설정 파일 격리"

아래 기재된 가변 연산 규칙 모델들은 메인 코어 엔진 소스 코드 내부에 하드코딩 형태로 오염시키지 말고, 외부 JSON/상수 설정 레이어로 완전히 격리 밀어내십시오:

* 적 공격 템플릿 정보와 연동되는 가변 피격 에너지 반환 데이터베이스.
* 전투 스킬 포인트(SP)의 웨이브 전환 간 상속 불투명 규칙 및 버프형 상한 확장 우선순위 연산식.
* Lock-On 효과와 도발 효과 간의 정밀 타겟 바인딩 스크립트 오버라이드 계층.
* 기억의 영물 인스턴스의 개별 타겟팅 가부 플래그 및 웨이브 전환 시의 AV 보존 스크립트.
* 환희/아하 메커니즘 관련 Punchline 풀 자원 및 개별 전용 배율 제어 공식.
* 초격파 연산 세부 파라미터 셋.
* 타임라인 동률 정렬 Tie-Breaker 모드 옵션 키.

### 제3단계: "개별 캐릭터 전용 비즈니스 로직 스크립트화"

각 캐릭터 고유의 스킬 기믹 소스 코드가 공용 코어 전투 엔진 파이프라인 내부를 오염시키지 않도록 구조적 거리를 유지하십시오.
캐릭터 스크립트 모듈은 오직 공용 엔진 이벤트 버스를 구독(Subscribe)하고, 이벤트 콜백 발생 시점에 엔진이 열어둔 인터페이스를 경유하여 규격화된 동작을 선언하거나 상태 인스턴스를 주입하는 순수 리스너 역할만 수행하도록 설계해야 합니다.

---

# 20. 参考资料与来源 (참고 자료 및 출처)

[목록으로 돌아가기](https://www.google.com/search?q=../battle-system-mechanics.md)

### 행동 게이지 / 턴 / 필살기 / 추가 턴

1. KQM Speed Guide
[https://hsr.keqingmains.com/misc/speed-guide/]()
2. KQM Beginner Guide
[https://hsr.keqingmains.com/misc/beginner-guide/]()
3. HSR Wiki / Fandom - Extra Turn
[https://honkai-star-rail.fandom.com/wiki/Extra_Turn]()
4. HSR Wiki / Fandom - Technique
[https://honkai-star-rail.fandom.com/wiki/Technique]()
5. HSR Wiki / Fandom - Follow-Up Attack
[https://honkai-star-rail.fandom.com/wiki/Follow-Up_Attack]()

### 피해 / 방어력 / 강인도 / 격파 / 치유 / 쉴드

6. HSR Wiki / Fandom - Damage
[https://honkai-star-rail.fandom.com/wiki/Damage]()
7. HSR Wiki / Fandom - DEF
[https://honkai-star-rail.fandom.com/wiki/DEF]()
8. HSR Wiki / Fandom - Toughness
[https://honkai-star-rail.fandom.com/wiki/Toughness]()
9. HSR Wiki / Fandom - Healing
[https://honkai-star-rail.fandom.com/wiki/Healing]()
10. HSR Wiki / Fandom - Shield
[https://honkai-star-rail.fandom.com/wiki/Shield]()
11. Prydwen - Damage Formula
[https://www.prydwen.gg/star-rail/guides/damage-formula/]()
12. Reddit - Calculating & Understanding Super Break
[https://www.reddit.com/r/HonkaiStarRail/comments/1co5sqr/calculating_understanding_super_break/]()
13. Super Break Calculator Sheet
[https://docs.google.com/spreadsheets/d/1pWKUU6U0RkX9_iPE9zE4ea7KDiwLvo0IQ7_zgQ1rkTg/edit?usp=sharing]()

### 상태 / 메커니즘 보충

14. HSR Wiki / Fandom - Status Effect
[https://honkai-star-rail.fandom.com/wiki/Status_Effect]()
15. HSR Wiki / Fandom - Aggro
[https://honkai-star-rail.fandom.com/wiki/Aggro]()
16. HSR Wiki / Fandom - Technique
[https://honkai-star-rail.fandom.com/wiki/Technique]()
17. HSR Wiki / Fandom - Follow-Up Attack
[https://honkai-star-rail.fandom.com/wiki/Follow-Up_Attack]()
18. HSR Wiki / Fandom - Skill
[https://honkai-star-rail.fandom.com/wiki/Skill]()
19. HSR Wiki / Fandom - Tutorial / Skills and Skill Points
[https://honkai-star-rail.fandom.com/wiki/Tutorial/Skills_and_Skill_Points]()
20. HSR Wiki / Fandom - Tutorial / Skill Point
[https://honkai-star-rail.fandom.com/wiki/Tutorial/Skill_Point]()
21. HSR Wiki / Fandom - Energy
[https://honkai-star-rail.fandom.com/wiki/Energy]()
22. HSR Wiki / Fandom - Tutorial / Energy and Ultimate
[https://honkai-star-rail.fandom.com/wiki/Tutorial/Energy_and_Ultimate]()
23. HoYoWiki - Energy
[https://wiki.hoyolab.com/pc/hsr/entry/1246?lang=en-us]()
24. HoYoWiki - Sparkle (Max SP increase example)
[https://wiki.hoyolab.com/pc/hsr/entry/1807?lang=en-us]()
25. Honey Hunter - Taunt status
[https://starrail.honeyhunterworld.com/taunt-status/?lang=EN]()
26. Honey Hunter - Lock-On target monster skill
[https://starrail.honeyhunterworld.com/lock-on-target-monster_skill/?lang=EN]()
27. HSR Wiki / Fandom - Elation DMG
[https://honkai-star-rail.fandom.com/wiki/Elation_DMG]()
28. HSR Wiki / Fandom - Elation Skill
[https://honkai-star-rail.fandom.com/wiki/Elation_Skill]()
29. HSR Wiki / Fandom - Aha Instant
[https://honkai-star-rail.fandom.com/wiki/Aha_Instant]()
30. HSR Wiki / Fandom - Ode to Worldbearing
[https://honkai-star-rail.fandom.com/wiki/Ode_to_Worldbearing]()
31. HoYoLAB - Castorice / Netherwing mechanics reference
[https://www.hoyolab.com/article/38189462]()
32. HoYoLAB - Cyrene / Demiurge mechanics reference
[https://www.hoyolab.com/article/42179395]()

### 보충 이론 분석 글 (보조적인 교차 검증 용도이며, 단독으로 유일한 근거로 삼아서는 안 됨)

33. HoYoLAB - 격파/전투 메커니즘 관련 공개 분석 글 (본 검증 회차에서 교차 검증용으로 활용됨)
[https://www.hoyolab.com/article/18525394]()
34. HoYoLAB - 격파 메커니즘 상세 보충
[https://www.hoyolab.com/article/28947572]()
35. HoYoLAB - Broken 상태 등 상세 보충 설명
[https://www.hoyolab.com/article/25810190]()

---

# 21. 当前报告的结论强度总结 (현재 보고서의 결론 강도 요약)

[목록으로 돌아가기](https://www.google.com/search?q=../battle-system-mechanics.md)

### 코어 엔진 코드에 즉시 반영 가능한 확정 항목

* SPD / AV / AG 선형 정산 체계 전반.
* 속도 변화에 따른 비례 환산 로직.
* 행동 게이지 당기기 / 밀기 처리.
* 100% 즉시 촉진 메커니즘.
* 필살기 대기열 및 삽입형 끼어들기 시퀀스.
* 추가 턴 상태 독립 제어 파이프라인.
* 기억의 영물 객체를 온전한 독립 전투 개체로 다루는 모델링 기초 설계안.
* 표준 데미지 곱연산 구역 공식 세트.
* DEF / RES / Vulnerability / Mitigation / Broken 측 곱연산 구역.
* 강인도 차감 / 약점 격파 트리거 / 턴 연동형 복구 파이프라인.
* 원소별 약점 격파 기초 피해 배율 세트.
* 환희 피해를 공용 데미지 풀에 오염시키지 않고 완전히 독립적인 고유 피해 카테고리로 분류하는 구조.
* Aha Instant 시퀀스를 다중 캐릭터 연속 정산용 전용 독립 윈도우 인터페이스로 분리 설계하는 구조.
* 액션 내부의 세그먼트 hit 분할 모델.
* 전투 진입 오프닝 / 매 웨이브 개시 시점 이벤트 분리 발송 구조.
* 버프/디버프/제어를 아우르는 상태 인스턴스 공용 객체 구조 모델.

### 설정 레이어로 분리 격리한 후 구현해야 하는 가변 항목

* 전투 스킬 포인트(SP)의 웨이브 간 인계 가부 및 상한 보정 버프의 연산 누적 체계.
* 적 공격 템플릿과 연동되는 가변 피격 에너지 반환 데이터셋 및 특수 기믹 행동의 에너지 정산 규칙.
* Lock-On 효과와 도발 효과 간의 정밀 타겟 지정 우선순위 판단 스크립트.
* 기억의 영물 객체의 가변적 타겟 선택 가능 여부 조건 플래그 및 웨이브 전환 간의 AV 보존 규칙 세트.
* 환희/아하 시스템 하위의 정밀 리소스 자원 관리 및 고유 가변 배율 세부 조건 스크립트.
* 초격파 피해 산출 공식 내부의 디테일 가변 파라미터.
* 타임라인 동률 정렬 알고리즘의 룰셋 옵션 키.

### 향후 인게임 프레임 데이터 분석 및 정밀 실측을 통해 보완해야 하는 불투명 항목

* 최신 고유 시스템 메커니즘 (예: Exo-Toughness 시스템 및 일부 최신 소환수 연동 아키텍처).
* 특정 고유 캐릭터의 텍스트 설명에 포함된 '엔진 글로벌 룰 무시' 계열의 최상위 우선순위 예외 처리.
* 특정 특수 보스 몬스터 고유의 스크립트화된 전용 타겟 선택 AI 알고리즘 패턴.

---

# 22. 一句话总结 (한 줄 요약)

[목록으로 돌아가기](https://www.google.com/search?q=../battle-system-mechanics.md)

본 문서의 설계 패러다임을 충실히 이행하십시오: **"타임라인 진행, 데미지 구역 연산, 약점 격파 판정, 버프/디버프 타이머, 인터럽트 끼어들기" 계층은 엔진의 견고한 하드 룰로 구축하고, "SP 인계, 에너지 반환 데이터베이스, 어그로 오버라이드 룰, 초격파 세부 수치" 계층은 가변 설정 항목으로 완벽히 분리 격리**해 두면, 구조적 확장성을 완벽히 보존하면서 실제 인게임 프레임 환경에 한 단계씩 안전하게 접근할 수 있는 최상의 《붕괴: 스타레일》 전투 시뮬레이터 코어 베이스를 확보할 수 있습니다.

추가 가이드라인: 최신 버전의 특수 시스템을 매끄럽게 흡수하기 위해, **기억의 영물**은 반드시 단독 엔티티 객체(`Unit`)로 취급하고, 환희 피해(Elation DMG)는 별개의 독립 피해 카테고리로 분리 대우하며, **Aha Instant**는 고유의 전용 정산 윈도우 인터페이스로 처리하십시오. 이들을 과거 레거시 아키텍처 하위의 일반 소환수 / 추가 공격 / 일반 데미지 도메인 내부에 억지로 구겨 넣는 형태의 임시방편적 모델링은 향후 심각한 구조적 한계(Technical Debt)를 초래할 위험이 큽니다.