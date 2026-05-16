from dataclasses import dataclass, field
from typing import Any, Self
from enum import Enum
from collections.abc import Callable

class StatusKind(Enum):
    BUFF = "buff"
    DEBUFF = "debuff"
    CONTROL = "control"


class TickTiming(Enum):
    OWNER_TURN_START = "owner_turn_start"
    OWNER_TURN_END = "owner_turn_end"


@dataclass(frozen=True)
class StatusEffect:
    atk_pct: float = 0.0
    defense_pct: float = 0.0
    spd_pct: float = 0.0
    dmg_boost: float = 0.0
    weaken: float = 0.0
    vulnerability: float = 0.0
    mitigation: float = 0.0
    res_pen: float = 0.0
    defense_reduction: float = 0.0
    crit_rate: float = 0.0
    crit_dmg: float = 0.0
    outgoing_healing_boost: float = 0.0
    incoming_healing_boost: float = 0.0
    incoming_healing_reduction: float = 0.0
    shield_bonus: float = 0.0
    cannot_act: bool = False


@dataclass(frozen=True)
class StatusTemplate:
    name: str
    kind: StatusKind
    duration: int
    tick_timing: TickTiming
    effect: StatusEffect = field(default_factory=StatusEffect)
    dispellable: bool = True
    removable_by_cleanse: bool = True


@dataclass
class StatusInstance:
    template: StatusTemplate
    source_unit_id: str
    owner_unit_id: str
    remaining_turns: int

    @classmethod
    def from_template(
        cls,
        template: StatusTemplate,
        *,
        source_unit_id: str,
        owner_unit_id: str,
    ) -> "StatusInstance":
        return cls(
            template=template,
            source_unit_id=source_unit_id,
            owner_unit_id=owner_unit_id,
            remaining_turns=template.duration,
        )

    @property
    def name(self) -> str:
        return self.template.name

    @property
    def effect(self) -> StatusEffect:
        return self.template.effect

    def should_tick(self, timing: TickTiming) -> bool:
        return self.template.tick_timing == timing and self.remaining_turns > 0

    def tick(self) -> bool:
        self.remaining_turns -= 1
        return self.remaining_turns <= 0


@dataclass
class BreakOutcome:
    toughness_damage: int = 0
    break_damage: int = 0
    broken: bool = False


@dataclass
class ToughnessState:
    max_toughness: int
    weaknesses: frozenset[Element] = field(default_factory=frozenset)
    current_toughness: int = 0
    broken: bool = False
    broken_by: Element | None = None

    def __post_init__(self) -> None:
        if self.current_toughness == 0:
            self.current_toughness = self.max_toughness

    def apply(self, amount: int, element: Element, attacker_level: int) -> BreakOutcome:
        if self.broken or amount <= 0 or element not in self.weaknesses:
            return BreakOutcome()

        actual_damage = min(self.current_toughness, amount)
        self.current_toughness -= actual_damage
        if self.current_toughness > 0:
            return BreakOutcome(toughness_damage=actual_damage)

        self.broken = True
        self.broken_by = element
        return BreakOutcome(
            toughness_damage=actual_damage,
            break_damage=calculate_break_damage(element, attacker_level, self.max_toughness),
            broken=True,
        )

    def restore(self) -> None:
        self.current_toughness = self.max_toughness
        self.broken = False
        self.broken_by = None


def action_value_from_spd(spd: int) -> int:
    base = max(1, int(10000 / max(1, spd)))
    return base


@dataclass
class Unit:
    unit_id: str
    name: str
    faction: Faction
    level: int
    base_stats: Stats
    kit: UnitKit
    element: Element = Element.PHYSICAL
    base_resistance: float = 0.0
    toughness: ToughnessState | None = None
    hp: int = field(init=False)
    energy: int = field(init=False)
    shield: int = field(init=False)
    statuses: list[StatusInstance] = field(default_factory=list)
    current_speed: int = field(init=False)
    base_action_value: int = field(init=False)
    current_action_value: int = field(init=False)
    is_extra_turn: bool = field(default=False, init=False)

    def __post_init__(self) -> None:
        self.hp = self.base_stats.max_hp
        self.energy = 0
        self.shield = 0
        self.current_speed = self.base_stats.spd
        self.base_action_value = action_value_from_spd(self.current_speed)
        self.current_action_value = self.base_action_value

    def is_defeated(self) -> bool:
        return self.hp <= 0

    def reset_action_value(self) -> None:
        self.current_action_value = self.base_action_value

    def take_damage(self, amount: int) -> int:
        damage = max(0, amount)
        if self.shield > 0 and damage > 0:
            absorbed = min(self.shield, damage)
            self.shield -= absorbed
            damage -= absorbed
        self.hp = max(0, self.hp - damage)
        return damage

    def heal(self, amount: int) -> int:
        healed = min(self.base_stats.max_hp - self.hp, max(0, amount))
        self.hp += healed
        return healed

    def gain_energy(self, amount: int) -> int:
        requested_gain = max(0, amount)
        previous_energy = self.energy
        self.energy = min(self.base_stats.max_energy, self.energy + requested_gain)
        return self.energy - previous_energy

    def spend_energy(self, amount: int) -> None:
        if amount > self.energy:
            raise ValueError(f"{self.name} lacks energy: {self.energy} < {amount}")
        self.energy -= amount

    def energy_full(self) -> bool:
        return self.energy >= self.base_stats.max_energy

    def snapshot_stats(self) -> Stats:
        effects = self.active_effects()
        return Stats(
            max_hp=self.base_stats.max_hp,
            atk=max(1, int(round(self.base_stats.atk * (1.0 + effects.atk_pct)))),
            defense=max(0, int(round(self.base_stats.defense * (1.0 + effects.defense_pct)))),
            spd=max(1, int(round(self.base_stats.spd * (1.0 + effects.spd_pct)))),
            max_energy=self.base_stats.max_energy,
        )

    def speed_tick(self, delta: int) -> None:
        self.current_action_value = max(0, self.current_action_value - delta)

    def recalculate_action_value_for_speed(self, new_speed: int) -> None:
        self.current_action_value = max(
            0, int(self.current_action_value * self.current_speed / new_speed)
        )
        self.current_speed = new_speed
        self.base_action_value = action_value_from_spd(new_speed)

    def advance_action(self, advance_ratio: float) -> None:
        self._adjust_action_gauge(advance_ratio=advance_ratio, delay_ratio=0.0)

    def delay_action(self, delay_ratio: float) -> None:
        self._adjust_action_gauge(advance_ratio=0.0, delay_ratio=delay_ratio)

    def _adjust_action_gauge(self, *, advance_ratio: float, delay_ratio: float) -> None:
        current_gauge = self.current_action_value * self.current_speed
        new_gauge = max(0.0, current_gauge - 10000 * (advance_ratio - delay_ratio))
        self.current_action_value = max(0, int(new_gauge / self.current_speed))

    def apply_shield(self, amount: int) -> int:
        shield_amount = max(0, amount)
        self.shield += shield_amount
        return shield_amount

    def apply_status(self, template: StatusTemplate, source_unit_id: str) -> StatusInstance:
        for status in self.statuses:
            if status.name == template.name:
                status.remaining_turns = template.duration
                self.refresh_speed_from_statuses()
                return status

        instance = StatusInstance.from_template(
            template,
            source_unit_id=source_unit_id,
            owner_unit_id=self.unit_id,
        )
        self.statuses.append(instance)
        self.refresh_speed_from_statuses()
        return instance

    def tick_statuses(self, timing: TickTiming) -> list[str]:
        expired: list[str] = []
        remaining: list[StatusInstance] = []
        for status in self.statuses:
            if status.should_tick(timing) and status.tick():
                expired.append(status.name)
                continue
            remaining.append(status)
        self.statuses = remaining
        self.refresh_speed_from_statuses()
        return expired

    def refresh_speed_from_statuses(self) -> None:
        new_speed = self.snapshot_stats().spd
        if new_speed == self.current_speed:
            return
        self.recalculate_action_value_for_speed(new_speed)

    def active_effects(self) -> StatusEffect:
        effect = StatusEffect()
        for status in self.statuses:
            item = status.effect
            effect = StatusEffect(
                atk_pct=effect.atk_pct + item.atk_pct,
                defense_pct=effect.defense_pct + item.defense_pct,
                spd_pct=effect.spd_pct + item.spd_pct,
                dmg_boost=effect.dmg_boost + item.dmg_boost,
                weaken=effect.weaken + item.weaken,
                vulnerability=effect.vulnerability + item.vulnerability,
                mitigation=effect.mitigation + item.mitigation,
                res_pen=effect.res_pen + item.res_pen,
                defense_reduction=effect.defense_reduction + item.defense_reduction,
                crit_rate=effect.crit_rate + item.crit_rate,
                crit_dmg=effect.crit_dmg + item.crit_dmg,
                outgoing_healing_boost=(
                    effect.outgoing_healing_boost + item.outgoing_healing_boost
                ),
                incoming_healing_boost=(
                    effect.incoming_healing_boost + item.incoming_healing_boost
                ),
                incoming_healing_reduction=(
                    effect.incoming_healing_reduction + item.incoming_healing_reduction
                ),
                shield_bonus=effect.shield_bonus + item.shield_bonus,
                cannot_act=effect.cannot_act or item.cannot_act,
            )
        return effect

    def can_act(self) -> bool:
        return not self.active_effects().cannot_act

    def damage_boost(self) -> float:
        return self.active_effects().dmg_boost

    def weaken(self) -> float:
        return self.active_effects().weaken

    def vulnerability(self) -> float:
        return self.active_effects().vulnerability

    def damage_mitigation(self) -> float:
        remaining_ratio = 1.0
        for status in self.statuses:
            remaining_ratio *= 1.0 - status.effect.mitigation
        return 1.0 - max(0.0, remaining_ratio)

    def defense_reduction(self) -> float:
        return self.active_effects().defense_reduction

    def res_pen(self) -> float:
        return self.active_effects().res_pen

    def crit_rate(self) -> float:
        return self.active_effects().crit_rate

    def crit_dmg(self) -> float:
        return 0.5 + self.active_effects().crit_dmg

    def outgoing_healing_boost(self) -> float:
        return self.active_effects().outgoing_healing_boost

    def incoming_healing_boost(self) -> float:
        return self.active_effects().incoming_healing_boost

    def incoming_healing_reduction(self) -> float:
        return self.active_effects().incoming_healing_reduction

    def shield_bonus(self) -> float:
        return self.active_effects().shield_bonus

    def resistance_for(self, _: Element) -> float:
        return self.base_resistance

    def __repr__(self) -> str:
        return (
            f"{self.name}(HP={self.hp}, SH={self.shield}, EN={self.energy}, "
            f"AV={self.current_action_value})"
        )


@dataclass
class Stats:
    max_hp: int
    atk: int
    defense: int
    spd: int
    max_energy: int = 100

    def copy(self) -> Self:
        return self.__class__(
            max_hp=self.max_hp,
            atk=self.atk,
            defense=self.defense,
            spd=self.spd,
            max_energy=self.max_energy,
        )


class EventType(Enum):
    BATTLE_START = "battle_start"
    WAVE_START = "wave_start"
    BEFORE_ACTION_ORDER_RESOLVE = "before_action_order_resolve"
    TURN_START = "turn_start"
    ACTION_START = "action_start"
    HIT = "hit"
    DAMAGE_DEALT = "damage_dealt"
    HEAL_DONE = "heal_done"
    SHIELD_APPLIED = "shield_applied"
    TOUGHNESS_DAMAGE = "toughness_damage"
    WEAKNESS_BREAK = "weakness_break"
    STATUS_APPLY = "status_apply"
    STATUS_EXPIRE = "status_expire"
    KILL = "kill"
    UNIT_DOWNED = "unit_downed"
    ULTIMATE_QUEUED = "ultimate_queued"
    ULTIMATE_INSERTED = "ultimate_inserted"
    ACTION_END = "action_end"
    TURN_END = "turn_end"


@dataclass
class BattleEvent:
    event_type: EventType
    actor_id: str | None = None
    target_id: str | None = None
    payload: dict[str, str | int | float | bool] = field(default_factory=dict)


EventHandler = Callable[[BattleEvent], None]


class EventBus:
    def __init__(self) -> None:
        self._subscribers: dict[EventType, list[EventHandler]] = {event: [] for event in EventType}
        self.history: list[BattleEvent] = []

    def subscribe(self, event_type: EventType, handler: EventHandler) -> None:
        self._subscribers[event_type].append(handler)

    def emit(
        self,
        event_type: EventType,
        *,
        actor_id: str | None = None,
        target_id: str | None = None,
        payload: dict[str, str | int | float | bool] | None = None,
    ) -> BattleEvent:
        event = BattleEvent(
            event_type=event_type,
            actor_id=actor_id,
            target_id=target_id,
            payload=payload or {},
        )
        self.history.append(event)
        for handler in self._subscribers[event_type]:
            handler(event)
        return event


class Faction(Enum):
    ALLY = "ally"
    ENEMY = "enemy"


class ActionType(Enum):
    BASIC = "basic"
    SKILL = "skill"
    ULTIMATE = "ultimate"
    FOLLOW_UP = "follow_up"

@dataclass
class BattleOutcome:
    winner: str
    turns: int
    battle_log: list[str]


class BattleEngine:
    def __init__(self, battle_state: BattleState, ai: SimpleAI | None = None) -> None:
        self.state = battle_state
        self.ai = ai or SimpleAI()
        self.pending: PendingActionQueue = self.state.pending_actions

    def run(self, max_turns: int = 100) -> BattleOutcome:
        self.state.events.emit(EventType.BATTLE_START)
        self.state.events.emit(EventType.WAVE_START, payload={"wave": 1})
        while not self.state.is_finished() and self.state.turn_counter < max_turns:
            self._process_pending()
            if self.state.is_finished():
                break

            self.state.events.emit(EventType.BEFORE_ACTION_ORDER_RESOLVE)
            actor = self.state.timeline.next_actor()
            if actor is None:
                break

            if actor.is_defeated():
                continue

            self.state.turn_counter += 1
            self._start_turn(actor, tick_turn_boundaries=True)
            if self.state.is_finished():
                break

            if not actor.can_act():
                self.state.add_log(f"[Control] {actor.name} cannot act")
                self._end_turn(actor, tick_turn_boundaries=True)
                self.state.timeline.reschedule(actor)
                continue

            if actor.energy_full():
                queued_ultimate = self.ai.choose_ultimate(actor, self.state)
                if queued_ultimate is not None:
                    self.state.queue_ultimate(queued_ultimate)

            decision = self.ai.choose_action(actor, self.state)
            self._execute_action(decision.action)
            if self.state.is_finished():
                break
            self._process_pending()
            if self.state.is_finished():
                break
            self._end_turn(actor, tick_turn_boundaries=True)
            self.state.timeline.reschedule(actor)

        if not self.state.alive_allies() and not self.state.alive_enemies():
            winner = "draw"
        elif self.state.alive_enemies() == []:
            winner = "allies"
        elif self.state.alive_allies() == []:
            winner = "enemies"
        else:
            winner = "draw"
        return BattleOutcome(
            winner=winner,
            turns=self.state.turn_counter,
            battle_log=self.state.battle_log,
        )

    def _process_pending(self) -> None:
        while len(self.pending) > 0 and not self.state.is_finished():
            inserted_action = self.pending.pop()
            if inserted_action is None:
                return
            self._execute_inserted_action(inserted_action)

    def _execute_inserted_action(self, inserted_action: InsertedAction) -> None:
        actor = inserted_action.actor
        if actor.is_defeated():
            return
        if inserted_action.kind == InsertedActionKind.ULTIMATE:
            if inserted_action.action is None:
                return
            if not inserted_action.action.has_living_target():
                refreshed_action = self.ai.choose_ultimate(actor, self.state)
                if refreshed_action is None:
                    return
                inserted_action = InsertedAction(
                    kind=inserted_action.kind,
                    actor=actor,
                    action=refreshed_action,
                )
            self.state.events.emit(
                EventType.ULTIMATE_INSERTED,
                actor_id=actor.unit_id,
                payload={"action": inserted_action.action.config.name},
            )
            self._execute_action(inserted_action.action)
            return
        if inserted_action.kind == InsertedActionKind.FOLLOW_UP:
            if inserted_action.action is not None:
                self._execute_action(inserted_action.action)
            return
        if inserted_action.kind == InsertedActionKind.EXTRA_TURN:
            self._execute_extra_turn(actor)

    def _execute_extra_turn(self, actor: Unit) -> None:
        preserved_action_value = actor.current_action_value
        actor.is_extra_turn = True
        try:
            self._start_turn(actor, tick_turn_boundaries=False)
            if not actor.can_act():
                self.state.add_log(f"[Control] {actor.name} cannot act")
                return
            decision = self.ai.choose_action(actor, self.state)
            self._execute_action(decision.action)
        finally:
            self._end_turn(actor, tick_turn_boundaries=False)
            actor.is_extra_turn = False
            actor.current_action_value = preserved_action_value

    def _start_turn(self, unit: Unit, *, tick_turn_boundaries: bool) -> None:
        if tick_turn_boundaries and unit.toughness is not None and unit.toughness.broken:
            unit.toughness.restore()
            self.state.add_log(f"[Recover] {unit.name} restored toughness")
        self.state.events.emit(EventType.TURN_START, actor_id=unit.unit_id)
        if not tick_turn_boundaries:
            return
        for expired in unit.tick_statuses(TickTiming.OWNER_TURN_START):
            self.state.add_log(f"[Status Expire] {unit.name} lost {expired}")
            self.state.events.emit(
                EventType.STATUS_EXPIRE,
                actor_id=unit.unit_id,
                target_id=unit.unit_id,
                payload={"status": expired},
            )

    def _end_turn(self, unit: Unit, *, tick_turn_boundaries: bool) -> None:
        if not tick_turn_boundaries:
            self.state.events.emit(EventType.TURN_END, actor_id=unit.unit_id)
            return
        for expired in unit.tick_statuses(TickTiming.OWNER_TURN_END):
            self.state.add_log(f"[Status Expire] {unit.name} lost {expired}")
            self.state.events.emit(
                EventType.STATUS_EXPIRE,
                actor_id=unit.unit_id,
                target_id=unit.unit_id,
                payload={"status": expired},
            )
        self.state.events.emit(EventType.TURN_END, actor_id=unit.unit_id)

    def _execute_action(self, action: BaseAction) -> None:
        self.state.events.emit(
            EventType.ACTION_START,
            actor_id=action.actor.unit_id,
            payload={"action": action.config.name},
        )
        try:
            result = action.execute(self.state)
        except ValueError as exc:
            self.state.add_log(f"[Invalid] {exc}")
            return

        self.state.adjust_skill_points(result.sp_delta)
        for target_result in result.damage_done:
            self.state.add_log(
                f"[{action.config.action_type.value}] {result.actor} -> "
                f"{target_result.target_name} for {target_result.amount}"
            )
        for target_result in result.shield_absorbed:
            self.state.add_log(
                f"[Shield Absorb] {target_result.target_name} absorbed {target_result.amount}"
            )
        for target_result in result.toughness_damage_done:
            self.state.add_log(f"[Toughness] {target_result.target_name} -{target_result.amount}")
        for target_name in result.broken_targets:
            self.state.add_log(f"[Break] {target_name} weakness broken")
        for target_result in result.healing_done:
            self.state.add_log(f"[Heal] {target_result.target_name} +{target_result.amount}")
        for target_result in result.shields_added:
            self.state.add_log(f"[Shield] {target_result.target_name} +{target_result.amount}")
        for target_result in result.statuses_applied:
            for name in target_result.statuses:
                self.state.add_log(f"[Status] {target_result.target_name} gained {name}")
        for defeated in result.defeated:
            self.state.add_log(f"[KO] {defeated} defeated")

        if action.config.action_type != ActionType.ULTIMATE:
            self.state.add_log(f"[SP] {self.state.skill_points}/{self.state.max_skill_points}")
        self.state.events.emit(
            EventType.ACTION_END,
            actor_id=action.actor.unit_id,
            payload={"action": action.config.name},
        )


class Element(Enum):
    PHYSICAL = "physical"
    FIRE = "fire"
    ICE = "ice"
    LIGHTNING = "lightning"
    WIND = "wind"
    QUANTUM = "quantum"
    IMAGINARY = "imaginary"


_BREAK_DAMAGE_MULTIPLIER: dict[Element, float] = {
    Element.PHYSICAL: 1.0,
    Element.FIRE: 1.2,
    Element.ICE: 1.0,
    Element.LIGHTNING: 1.1,
    Element.WIND: 1.0,
    Element.QUANTUM: 1.3,
    Element.IMAGINARY: 1.2,
}

def calculate_break_damage(element: Element, attacker_level: int, max_toughness: int) -> int:
    multiplier = _BREAK_DAMAGE_MULTIPLIER[element]
    return max(1, int((attacker_level + 20) * max_toughness * multiplier / 20))

@dataclass
class ActionConfig:
    name: str
    multiplier: float
    element: Element | None = None
    toughness_damage: int = 0
    sp_cost: int = 0
    sp_gain: int = 0
    energy_cost: int = 0
    energy_gain: int = 0
    self_heal_multiplier: float = 0.0
    self_heal_flat: int = 0
    self_shield_multiplier: float = 0.0
    self_shield_flat: int = 0
    actor_statuses: tuple[StatusTemplate, ...] = ()
    target_statuses: tuple[StatusTemplate, ...] = ()
    action_type: ActionType = ActionType.BASIC


@dataclass
class UnitKit:
    basic: ActionConfig
    skill: ActionConfig
    ultimate: ActionConfig


@dataclass
class BattleState:
    allies: list[Unit]
    enemies: list[Unit]
    skill_points: int = 3
    max_skill_points: int = 5
    events: EventBus = field(init=False)
    timeline: Timeline = field(init=False)
    pending_actions: PendingActionQueue = field(init=False)
    turn_counter: int = 0
    battle_log: list[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        self.events = EventBus()
        self.timeline = Timeline(self.all_units())
        self.pending_actions = PendingActionQueue()

    def all_units(self) -> list[Unit]:
        return self.allies + self.enemies

    def alive_allies(self) -> list[Unit]:
        return [unit for unit in self.allies if not unit.is_defeated()]

    def alive_enemies(self) -> list[Unit]:
        return [unit for unit in self.enemies if not unit.is_defeated()]

    def is_finished(self) -> bool:
        return not self.alive_allies() or not self.alive_enemies()

    def add_log(self, entry: str) -> None:
        self.battle_log.append(entry)

    def adjust_skill_points(self, delta: int) -> None:
        self.skill_points = max(0, min(self.max_skill_points, self.skill_points + delta))

    def queue_ultimate(self, action: UltimateAction) -> None:
        if action.config.action_type != ActionType.ULTIMATE:
            raise ValueError("queue_ultimate requires an ultimate action")
        self.pending_actions.push(
            InsertedAction(
                kind=InsertedActionKind.ULTIMATE,
                actor=action.actor,
                action=action,
            )
        )
        self.events.emit(
            EventType.ULTIMATE_QUEUED,
            actor_id=action.actor.unit_id,
            payload={"action": action.config.name},
        )

    def queue_follow_up(self, action: BaseAction) -> None:
        self.pending_actions.push(
            InsertedAction(
                kind=InsertedActionKind.FOLLOW_UP,
                actor=action.actor,
                action=action,
            )
        )

    def grant_extra_turn(self, unit: Unit) -> None:
        self.pending_actions.push(
            InsertedAction(
                kind=InsertedActionKind.EXTRA_TURN,
                actor=unit,
            )
        )

    def snapshot(self) -> dict[str, Any]:
        return {
            "allies": [(unit.name, unit.hp, unit.shield, unit.energy) for unit in self.allies],
            "enemies": [(unit.name, unit.hp, unit.shield, unit.energy) for unit in self.enemies],
            "sp": self.skill_points,
        }








BRAVERY = StatusTemplate(
    name="Bravery",
    kind=StatusKind.BUFF,
    duration=2,
    tick_timing=TickTiming.OWNER_TURN_END,
    effect=StatusEffect(atk_pct=0.25, dmg_boost=0.15),
)

EXPOSE = StatusTemplate(
    name="Expose",
    kind=StatusKind.DEBUFF,
    duration=2,
    tick_timing=TickTiming.OWNER_TURN_END,
    effect=StatusEffect(vulnerability=0.2),
)

WEAKENED = StatusTemplate(
    name="Weakened",
    kind=StatusKind.DEBUFF,
    duration=1,
    tick_timing=TickTiming.OWNER_TURN_END,
    effect=StatusEffect(weaken=0.2),
)


def build_demo_unit(
    *,
    unit_id: str,
    name: str,
    faction: Faction,
    element: Element,
    hp: int,
    atk: int,
    defense: int,
    spd: int,
    toughness: ToughnessState | None,
    kit: UnitKit,
) -> Unit:
    stats = Stats(
        max_hp=hp,
        atk=atk,
        defense=defense,
        spd=spd,
        max_energy=100,
    )
    return Unit(
        unit_id=unit_id,
        name=name,
        faction=faction,
        level=1,
        base_stats=stats,
        kit=kit,
        element=element,
        toughness=toughness,
    )


def demo_battle() -> None:
    hero_kit = UnitKit(
        basic=ActionConfig(
            name="Demo Hero Basic",
            multiplier=1.0,
            element=Element.PHYSICAL,
            toughness_damage=30,
            sp_gain=1,
            energy_gain=20,
            action_type=ActionType.BASIC,
        ),
        skill=ActionConfig(
            name="Demo Hero Skill",
            multiplier=1.4,
            element=Element.PHYSICAL,
            toughness_damage=30,
            sp_cost=1,
            energy_gain=30,
            self_shield_multiplier=0.5,
            actor_statuses=(BRAVERY,),
            action_type=ActionType.SKILL,
        ),
        ultimate=ActionConfig(
            name="Demo Hero Ultimate",
            multiplier=2.4,
            element=Element.PHYSICAL,
            toughness_damage=60,
            energy_cost=100,
            energy_gain=5,
            self_heal_multiplier=0.5,
            self_heal_flat=30,
            target_statuses=(EXPOSE,),
            action_type=ActionType.ULTIMATE,
        ),
    )
    slime_kit = UnitKit(
        basic=ActionConfig(
            name="Demo Slime Basic",
            multiplier=0.9,
            element=Element.FIRE,
            energy_gain=20,
            action_type=ActionType.BASIC,
        ),
        skill=ActionConfig(
            name="Demo Slime Skill",
            multiplier=1.1,
            element=Element.FIRE,
            energy_gain=30,
            target_statuses=(WEAKENED,),
            action_type=ActionType.SKILL,
        ),
        ultimate=ActionConfig(
            name="Demo Slime Ultimate",
            multiplier=1.8,
            element=Element.FIRE,
            energy_cost=100,
            energy_gain=5,
            action_type=ActionType.ULTIMATE,
        ),
    )

    hero = build_demo_unit(
        unit_id="ally-1",
        name="Demo Hero",
        faction=Faction.ALLY,
        element=Element.PHYSICAL,
        hp=900,
        atk=120,
        defense=90,
        spd=105,
        toughness=None,
        kit=hero_kit,
    )
    slime = build_demo_unit(
        unit_id="enemy-1",
        name="Demo Slime",
        faction=Faction.ENEMY,
        element=Element.FIRE,
        hp=700,
        atk=85,
        defense=60,
        spd=95,
        toughness=ToughnessState(
            max_toughness=60,
            weaknesses=frozenset({Element.PHYSICAL}),
        ),
        kit=slime_kit,
    )

    state = BattleState(allies=[hero], enemies=[slime], skill_points=3, max_skill_points=5)
    outcome = BattleEngine(state).run(max_turns=30)

    print("=== SRSim Minimal Battle Demo ===")
    print(f"Turns: {outcome.turns}")
    print(f"Winner: {outcome.winner}")
    print(
        f"Hero HP: {hero.hp}/{hero.base_stats.max_hp} | "
        f"Shield: {hero.shield} | Energy: {hero.energy}/{hero.base_stats.max_energy}"
    )
    print(
        f"Enemy HP: {slime.hp}/{slime.base_stats.max_hp} | Toughness: "
        f"{slime.toughness.current_toughness if slime.toughness else 0}/"
        f"{slime.toughness.max_toughness if slime.toughness else 0} | "
        f"Energy: {slime.energy}/{slime.base_stats.max_energy}"
    )
    event_counts: dict[str, int] = {}
    for event in state.events.history:
        event_counts[event.event_type.value] = event_counts.get(event.event_type.value, 0) + 1

    print("\nEvent Counts:")
    for event_type in (
        EventType.BATTLE_START,
        EventType.TURN_START,
        EventType.ACTION_START,
        EventType.SHIELD_APPLIED,
        EventType.STATUS_APPLY,
        EventType.TOUGHNESS_DAMAGE,
        EventType.WEAKNESS_BREAK,
        EventType.HEAL_DONE,
        EventType.ACTION_END,
    ):
        print(f"- {event_type.value}: {event_counts.get(event_type.value, 0)}")

    print("\nBattle Log:")
    for entry in outcome.battle_log:
        print(f"- {entry}")


if __name__ == "__main__":
    demo_battle()
