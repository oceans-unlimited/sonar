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
  letterSpacing: 2,
  uppercase: true,
};

// Bolder weight, good for titles, headings
export const headerFont = {
  family: "Goldman",
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
};
