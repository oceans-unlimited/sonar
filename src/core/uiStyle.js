/**
 * UI Style — Merged from existing uiStyle.js and planned additions.
 * Central hub for consistent styling across the application.
 */

// ──────────────────────── Color Palette ────────────────────────
export const Colors = {
    // Core
    background: 0x001100,
    text: 0x28ee28,
    dim: 0x146e14,
    border: 0x116611,
    primary: 0x28ee28,
    active: 0xffffff,

    // Submarines
    subA: 0x00aaff,
    subB: 0xff5555,

    // Roles
    roleCaptain: 0xffcc00,
    roleXO: 0x005aff,
    roleSonar: 0x00ff00,
    roleEngineer: 0xb3b3b3,

    // Status
    caution: 0xffa500,
    danger: 0xff0000,
    success: 0x00ff00,
};

// ──────────────────────── Alpha Values ────────────────────────
export const Alphas = {
    faint: 0.05,
    dim: 0.4,
    medium: 0.6,
    bright: 0.85,
    full: 1.0,
    overlay: 0.5,
    disabled: 0.3
};

// ──────────────────────── Fonts ────────────────────────
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
};

// ──────────────────────── Layout ────────────────────────
export const Layout = {
    margin: 24,
    panelPadding: 12,
    menuWidth: 360,
    menuHeight: 450,
};

// ──────────────────────── System Colors ────────────────────────
// Mapping of system asset names (used in engine UI) to a canonical color value.
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

// ──────────────────────── Message Gradients ────────────────────────
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
