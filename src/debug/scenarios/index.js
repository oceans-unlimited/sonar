import engineerPristine from './engineer/01_pristine.js';
import engineerMoveCycle from './engineer/02_move_cycle.js';
import engineerCircuitNear from './engineer/03_circuit_near_complete.js';
import engineerDirectionCritical from './engineer/04_direction_critical.js';
import engineerReactorCritical from './engineer/05_reactor_critical.js';
import engineerInterruptPause from './engineer/07_interrupt_pause.js';
import engineerInterruptDamage from './engineer/08_interrupt_damage.js';
import xoPristine from './xo/01_pristine.js';
import xoInterruptPause from './xo/02_interrupt_pause.js';
import xoInterruptWeapon from './xo/03_interrupt_weapon.js';
import testColorOps from './test/color_ops.js';
import testMapPristine from './test/map_pristine.js';
import testMapMovement from './test/map_movement.js';
import testMapSelect from './test/mapSelect.js';
import teletypePristine from './teletype/01_pristine.js';
import connPristine from './conn/01_pristine.js';
import connStartPositions from './conn/01_start_positions.js';
import connInterruptPause from './conn/02_interrupt_pause.js';
import connInterruptWeapon from './conn/03_interrupt_weapon.js';
import submarinePristine from './submarine/pristine.js';
import damagePristine from './damage/pristine.js';
import surfacePristine from './surface/pristine.js';
import surfaceInteractive from './surface/interactive.js';
import realtimeEngineLogic from './test/realtime_engine_logic.js';

export const SCENARIO_REGISTRY = {
  'engineer_pristine': engineerPristine,
  'engineer_move_cycle': engineerMoveCycle,
  'engineer_circuit_near': engineerCircuitNear,
  'engineer_direction_critical': engineerDirectionCritical,
  'engineer_reactor_critical': engineerReactorCritical,
  'engineer_interrupt_pause': engineerInterruptPause,
  'engineer_interrupt_damage': engineerInterruptDamage,
  'xo_pristine': xoPristine,
  'xo_interrupt_pause': xoInterruptPause,
  'xo_interrupt_weapon': xoInterruptWeapon,
  'test_color_ops': testColorOps,
  'test_realtime_engine_logic': realtimeEngineLogic,
  'test_map_pristine': testMapPristine,
  'test_map_movement': testMapMovement,
  'test_map_select': testMapSelect,
  'teletype_pristine': teletypePristine,
  'conn_pristine': connPristine,
  'conn_start_positions': connStartPositions,
  'conn_interrupt_pause': connInterruptPause,
  'conn_interrupt_weapon': connInterruptWeapon,
  'submarine_pristine': submarinePristine,
  'damage_pristine': damagePristine,
  'surface_pristine': surfacePristine,
  'surface_interactive': surfaceInteractive
};

export const SCENARIO_CATEGORIES = {
  'Engineer - Basic': [
    'engineer_pristine',
    'engineer_move_cycle'
  ],
  'Engineer - Damage States': [
    'engineer_circuit_near',
    'engineer_direction_critical',
    'engineer_reactor_critical'
  ],
  'First Officer (XO)': [
    'xo_pristine'
  ],
  'Captain (Conn)': [
    'conn_pristine',
    'conn_start_positions'
  ],
  'Submarine Feature': [
    'submarine_pristine'
  ],
  'Damage Feature': [
    'damage_pristine'
  ],
  'Interrupt States': [
    'engineer_interrupt_pause',
    'engineer_interrupt_damage',
    'conn_interrupt_pause',
    'conn_interrupt_weapon',
    'xo_interrupt_pause',
    'xo_interrupt_weapon'
  ],
  'Surface Feature': [
    'surface_pristine',
    'surface_interactive'
  ],
  'Test Bed': [
    'test_color_ops',
    'test_realtime_engine_logic',
    'test_map_pristine',
    'test_map_movement',
    'test_map_select'
  ],
  'TELETYPE': [
    'teletype_pristine'
  ]
};
