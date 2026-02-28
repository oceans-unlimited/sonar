
/**
 * UI Style — Merged from existing uiStyle.js and planned additions.
 * Central hub for consistent styling across the application.
 */
import { TextStyle, FillGradient } from "pixi.js";

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
export const Fonts = {
    primary: 'Orbitron',
    header: 'Goldman-Regular',
    headerBold: 'Goldman-Bold'
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
    vessel: 0xffcc00,    // yellow
    weapons: 0xe74c3c,   // red
    detection: 0x2ecc71, // green
    reactor: 0xb3b3b3,   // grey
    empty: 0xcccccc      // grey
};

export const SYSTEM_ASSETS = {
    'vessel': { asset: 'vessel', color: SystemColors.vessel },
    'weapons': { asset: 'weapons', color: SystemColors.weapons },
    'detection': { asset: 'detection', color: SystemColors.detection },
    'reactor': { asset: 'reactor', color: SystemColors.reactor },
    'empty': { asset: null, color: SystemColors.empty }
};

// Colors for the circuit button frames (distinct from system colors)
export const CircuitColors = {
    A: 0x00aaff, // Cyan
    B: 0x9b59b6, // Purple
    C: 0xe67e22  // Orange
};

// ──────────────────────── Teletype Styles ────────────────────────
// Teletype Style
export const TeletypeStyle = new TextStyle({
    fill: new FillGradient({
        colorStops: [
            { offset: 0, color: Colors.text },
            { offset: 1, color: Colors.dim }
        ]
    }),
    fontFamily: Fonts.primary,
    fontVariant: "small-caps",
    fontSize: 16,
    lineHeight: 30,
    wordWrap: false,
});

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
