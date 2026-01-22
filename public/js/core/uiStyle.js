// Contains colors, font settings, layout constants (like the Colors, Font, Layout objects)
// and functions to apply them to HTML elements.

export const Colors = {
  background: 0x001100,
  text: 0x28ee28,
  dim: 0x146e14,
  border: 0x116611,
  subA: 0x00aaff,
  subB: 0xff5555,
  roleCaptain: 0xffcc00,
  roleXO: 0x005aff,
  roleSonar: 0x00ff00,
  roleEngineer: 0xb3b3b3,
  caution: 0xffa500,
  danger: 0xff0000,
  active: 0xffffff
};

// Thin line, great for body text
export const Font = {
  family: "Orbitron",
  size: 22,
  lineHeight: 30,
  letterSpacing: 3,
  uppercase: true,
};

// Bolder weight, good for titles, headings
export const headerFont = {
  family: "Goldman",
  fontWeight: "bold",
  size: 30,
  lineHeight: 30,
  letterSpacing: 2,
  uppercase: true,
}

export const Layout = {
  margin: 24,
  panelPadding: 12,
  menuWidth: 360,
  menuHeight: 450,
};

// Mapping of system asset names (used in engine UI) to a canonical color value.
// Use these when you want to refer to a system by name instead of passing raw hex.
export const SystemColors = {
  stealth: 0xffcc00,   // yellow
  detection: 0x00ff00, // green
  weapons: 0xe74c3c,   // red
  reactor: 0xb3b3b3,   // grey
  vessel: 0x00aaff,    // cyan/blue
};

// Colors for the circuit button frames (distinct from system colors)
export const CircuitColors = {
  A: 0x00aaff, // Cyan
  B: 0x9b59b6, // Purple
  C: 0xe67e22  // Orange
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
