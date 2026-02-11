/**
 * UI Style Definitions
 * Central source of truth for application colors and shared style constants.
 */

export const Colors = {
    // Base Pallette
      background: 0x001100,
  text: 0x28ee28,
  primary: 0x3498db, // Added Primary Blue
  dim: 0x146e14,
  border: 0x116611,
  subA: 0x00aaff,
  subB: 0xff5555,
  roleCaptain: 0xffcc00,
  roleXO: 0x005aff,
  roleSonar: 0x00ff00,
  roleEngineer: 0xb3b3b3,
  caution: 0xffa500,
  active: 0xffffff,

    // Role Colors
    engineer: 0xb3b3b3, // Grey
    captain: 0xffcc00,  // Yellow
    xo: 0x005aff,       // Blue
    sonar: 0x00ff00,    // Green
    
    // Status Colors
    success: 0x2ecc71,
    warning: 0xf1c40f,
    danger: 0xe74c3c,
    neutral: 0x95a5a6,
    
    // UI Elements
    // textLight: 0xecf0f1,
    // textDark: 0x2c3e50,
    // overlayDark: 0x000000,
};

export const Alphas = {
    disabled: 0.5,
    overlay: 0.7,
    hover: 0.8
};

export const SystemColors = {
  vessel: 0xffcc00,   // yellow
  detection: 0x00ff00, // green
  weapons: 0xe74c3c,   // red
  reactor: 0xb3b3b3,   // grey
};

export const MessageGradients = {
  toast: {
    normal: [
      { offset: 0.1, color: 0xffffff, alpha: 0.8 },
      { offset: 0.35, color: 0xffffff, alpha: 0.35 },
      { offset: 1, color: 0xffffff, alpha: 0.2 }
    ],
    uniform: [
      { offset: 0, color: 0xffffff, alpha: 0.5 },
      { offset: 0.5, color: 0xffffff, alpha: 0.6 },
      { offset: 1, color: 0xffffff, alpha: 0.5 }
    ]
  },
  docked: {
    normal: [
      { offset: 0.1, color: 0xffffff, alpha: 1.0 },
      { offset: 0.4, color: 0xffffff, alpha: 0.5 },
      { offset: 1, color: 0xffffff, alpha: 0.3 }
    ],
    uniform: [
      { offset: 0, color: 0xffffff, alpha: 0.5 },
      { offset: 0.5, color: 0xffffff, alpha: 0.8 },
      { offset: 1, color: 0xffffff, alpha: 0.5 }
    ]
  }
};