import engineerPristine from './engineer/01_pristine.js';
import engineerMoveCycle from './engineer/02_move_cycle.js';
import engineerCircuitNear from './engineer/03_circuit_near_complete.js';
import engineerDirectionCritical from './engineer/04_direction_critical.js';
import engineerReactorCritical from './engineer/05_reactor_critical.js';
import xoPristine from './xo/01_pristine.js';
import testColorOps from './test/color_ops.js';
import testMapPristine from './test/map_pristine.js';
import testMapMovement from './test/map_movement.js';
import teletypePristine from './teletype/01_pristine.js';

export const SCENARIO_REGISTRY = {
  'engineer_pristine': engineerPristine,
  'engineer_move_cycle': engineerMoveCycle,
  'engineer_circuit_near': engineerCircuitNear,
  'engineer_direction_critical': engineerDirectionCritical,
  'engineer_reactor_critical': engineerReactorCritical,
  'xo_pristine': xoPristine,
  'test_color_ops': testColorOps,
  'test_map_pristine': testMapPristine,
  'test_map_movement': testMapMovement,
  'teletype_pristine': teletypePristine
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
  'Test Bed': [
    'test_color_ops',
    'test_map_pristine',
    'test_map_movement'
  ],
  'TELETYPE': [
    'teletype_pristine'
  ]
};
