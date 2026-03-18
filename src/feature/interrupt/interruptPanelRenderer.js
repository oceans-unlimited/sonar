import { LayoutContainer } from '@pixi/layout/components';
import { Text, TextStyle } from 'pixi.js';
import { Colors, Fonts } from '../../core/uiStyle.js';
import { createButtonFromDef } from '../../render/button.js';

/**
 * Interrupt Panel Renderer
 * Stateless functions that build interrupt panel content.
 * 
 * Resolution order: type:role → type → default fallback.
 * Returns LayoutContainers with labelled interactive children.
 * 
 * Rules:
 * - NO events, NO state, NO server calls.
 * - Interactive nodes are labelled for the overlay to wire behaviors.
 */

// ─────────── Panel Shell ───────────

/**
 * Creates the standard interrupt panel container (background, border, layout).
 * All builders use this as their root.
 * @returns {LayoutContainer}
 */
function createPanelShell() {
    const panel = new LayoutContainer({
        label: 'interruptPanel',
        layout: {
            width: '60%',
            height: 'auto',
            padding: 20,
            backgroundColor: 0x051505,
            backgroundAlpha: 0.9,
            borderColor: Colors.text,
            borderWidth: 2,
            borderRadius: 8,
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 15
        }
    });
    panel.eventMode = 'static';
    return panel;
}

/**
 * Creates a styled title text node.
 * @param {string} text 
 * @returns {Text}
 */
function createTitle(text) {
    return new Text({
        text,
        style: new TextStyle({
            fontFamily: Fonts.header,
            fontSize: 24,
            fill: Colors.text,
            fontWeight: 'bold',
            letterSpacing: 2
        }),
        layout: { marginBottom: 5 }
    });
}

/**
 * Creates a styled message text node.
 * @param {string} text 
 * @returns {Text}
 */
function createMessage(text) {
    return new Text({
        text,
        style: new TextStyle({
            fontFamily: Fonts.primary,
            fontSize: 16,
            fill: 0xcccccc,
            align: 'center'
        })
    });
}

/**
 * Creates a READY button with the canonical label for wiring.
 * @returns {Container}
 */
function createReadyButton() {
    const btn = createButtonFromDef({
        asset: 'pause',
        color: Colors.text,
        profile: 'frame',
        textLabel: 'READY'
    });
    btn.label = 'interrupt_ready_btn';
    return btn;
}

// ─────────── Type-Specific Builders ───────────

function buildPausePanel(interrupt) {
    const panel = createPanelShell();
    panel.addChild(createTitle('GAME PAUSED'));
    panel.addChild(createMessage(interrupt.payload?.message || 'Captain has paused the game.'));
    panel.addChild(createReadyButton());
    return panel;
}

function buildWeaponResolutionPanel(interrupt) {
    const panel = createPanelShell();
    panel.addChild(createTitle('WEAPON IMPACT'));
    panel.addChild(createMessage(interrupt.payload?.message || 'Damage resolution in progress.'));
    panel.addChild(createReadyButton());
    return panel;
}

function buildStartPositionsPanel(interrupt) {
    const panel = createPanelShell();
    panel.addChild(createTitle('SELECT POSITION'));
    panel.addChild(createMessage(interrupt.payload?.message || 'Captains selecting starting positions.'));
    panel.addChild(createReadyButton());
    return panel;
}

function buildPlayerDisconnectPanel(interrupt) {
    const panel = createPanelShell();
    panel.addChild(createTitle('PLAYER DISCONNECTED'));
    panel.addChild(createMessage(interrupt.payload?.message || 'Waiting for reconnection...'));
    panel.addChild(createReadyButton());
    return panel;
}

function buildScenarioActionPanel(interrupt) {
    const panel = createPanelShell();
    panel.addChild(createTitle('SCENARIO ACTION'));
    panel.addChild(createMessage(interrupt.payload?.message || 'Scenario event in progress.'));
    return panel;
}

// ─── SONAR_PING: Crew Default ───

function buildSonarPingCrewPanel(interrupt) {
    const panel = createPanelShell();
    panel.addChild(createTitle('SONAR PING'));
    panel.addChild(createMessage('Awaiting Captain response.'));
    panel.addChild(createReadyButton());
    return panel;
}

// ─── SONAR_PING: Captain (co) ───

function buildSonarPingCaptainPanel(interrupt) {
    const panel = createPanelShell();
    panel.addChild(createTitle('SONAR CONTACT'));
    panel.addChild(createMessage(interrupt.payload?.message || 'You must provide the requested information.'));

    // Stub: Sonar response form will be built out in a follow-on task.
    // For now, show a placeholder and a submit/ready button.
    const placeholder = createMessage('[ Sonar response form — TBD ]');
    placeholder.label = 'sonar_response_placeholder';
    panel.addChild(placeholder);

    const btn = createReadyButton();
    btn.label = 'interrupt_submit_btn';
    panel.addChild(btn);
    return panel;
}

// ─── Default Fallback ───

function buildDefaultPanel(interrupt) {
    const panel = createPanelShell();
    panel.addChild(createTitle(interrupt.type.replace(/_/g, ' ')));
    panel.addChild(createMessage(interrupt.payload?.message || 'SYSTEM INTERRUPT ACTIVE'));
    return panel;
}

// ─────────── Lookup Table ───────────

const PANEL_BUILDERS = {
    // Role-specific overrides (type:role)
    'SONAR_PING:co': buildSonarPingCaptainPanel,

    // Type defaults
    'PAUSE': buildPausePanel,
    'WEAPON_RESOLUTION': buildWeaponResolutionPanel,
    'SONAR_PING': buildSonarPingCrewPanel,
    'START_POSITIONS': buildStartPositionsPanel,
    'PLAYER_DISCONNECT': buildPlayerDisconnectPanel,
    'SCENARIO_ACTION': buildScenarioActionPanel,
};

// ─────────── Public API ───────────

/**
 * Builds the interrupt panel content for the given interrupt and role.
 * Resolution: type:role → type → default fallback.
 * 
 * @param {object} interrupt - { type, payload }
 * @param {string|null} role - Local player role key (co, xo, eng, sonar)
 * @returns {LayoutContainer} Panel container with labelled interactive children.
 */
export function buildPanel(interrupt, role) {
    // 1. Check for role-specific builder
    if (role) {
        const roleKey = `${interrupt.type}:${role}`;
        if (PANEL_BUILDERS[roleKey]) {
            return PANEL_BUILDERS[roleKey](interrupt);
        }
    }

    // 2. Check for type-level default
    if (PANEL_BUILDERS[interrupt.type]) {
        return PANEL_BUILDERS[interrupt.type](interrupt);
    }

    // 3. Fallback
    return buildDefaultPanel(interrupt);
}
