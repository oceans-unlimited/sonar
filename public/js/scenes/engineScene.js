import * as PIXI from 'pixi.js';
import { Colors, headerFont } from '../core/uiStyle.js';
import {
  createNoiseOverlay,
  createScanlinesOverlay,
  applyFlickerEffect,
} from "../core/uiEffects.js";

function createEngineScene(app, assets, audioManager, state) {
    const scene = new PIXI.Container();
    const engineInterface = new EngineInterface(app, assets, state.submarines[0].engineLayout);
    scene.addChild(engineInterface.container);

    // Add overlays and effects to the interface container itself
    const noise = createNoiseOverlay(assets.noise, app, engineInterface.container.width, engineInterface.container.height);
    const scanlines = createScanlinesOverlay(assets.scanlines, app, engineInterface.container.width, engineInterface.container.height);
    engineInterface.container.addChild(noise, scanlines);

    const flickerCallback = applyFlickerEffect(app, [engineInterface.container]);
    scene.on('destroyed', () => app.ticker.remove(flickerCallback));

    // Handle resizing
    const positionPanel = () => {
        engineInterface.container.x = (app.screen.width - engineInterface.container.width) / 2;
        engineInterface.container.y = (app.screen.height - engineInterface.container.height) / 2;
    };
    app.renderer.on('resize', positionPanel);
    positionPanel(); // Initial positioning

    return scene;
}

class EngineInterface {
    constructor(app, assets, engineLayout) {
        this.app = app;
        this.assets = assets; // Use pre-loaded assets
        this.engineLayout = engineLayout;
        console.log('Engine layout received:', this.engineLayout);
        this.container = new PIXI.Container();

        this.directions = ['N', 'E', 'W', 'S'];
        this.circuitColors = [0x3498db, 0x2ecc71, 0xe74c3c]; // Blue, Green, Red
        this.systems = ['stealth', 'detection', 'weapons', 'reactor'];
        
        this.directionTemplates = [];
        this.circuits = [];
        this.buttons = [];
        
        this.init();
    }

    init() {
        // No longer need to load assets
        this.createDirectionTemplates();
        this.populateSystems();
        this.setupCircuits();
        this.setupInteractions();
    }

    createDirectionTemplates() {
        const templateWidth = 250;
        this.directions.forEach((direction, index) => {
            const template = this.createDirectionTemplate(direction, index, templateWidth);
            this.directionTemplates.push(template);
            this.container.addChild(template); // Add to the class container

            //Debug: log actual bounds
            console.log('Template ${direction}:', {
                x: template.x,
                width: template.width,
                childrenBounds: template.getBounds()
            });
        });

        console.log('Container bounds:', this.container.getBounds());
    }

    createDirectionTemplate(direction, index, templateWidth) {
        const container = new PIXI.Container();
        container.direction = direction;
        container.index = index;

        // --- Demo tinting ---
        const tintColor = index < 2 ? 0xff0000 : 0xffa500; // Red and Orange for demo
        
        // Position templates horizontally
        const gap = 25;
        container.x = index * (templateWidth + gap);
        container.y = 0;

        // Create border frame
        const border = this.createBorder(tintColor);
        container.addChild(border);

        // Create system slots
        const slots = this.createSystemSlots(templateWidth, tintColor);
        container.addChild(slots);

        // Add the label background sprite
        const labelSprite = PIXI.Sprite.from(this.assets.label);
        labelSprite.x = 0;
        labelSprite.y = 0;
        labelSprite.tint = tintColor;
        container.addChild(labelSprite);

        // Create direction label text
        const label = this.createDirectionLabel(direction);
        container.addChild(label);

        // Store reference to slots for circuit connections
        container.slots = slots.children;

        return container;
    }

    createBorder(tintColor) {
        const borderContainer = new PIXI.Container();

        // Add corners
        const cornersSprite = PIXI.Sprite.from(this.assets.corners);
        cornersSprite.tint = tintColor;
        borderContainer.addChild(cornersSprite);

        // Main border (white fill from SVG)
        const borderSprite = PIXI.Sprite.from(this.assets.border);
        borderSprite.anchor.set(0.5);
        borderSprite.x = cornersSprite.width / 2;
        borderSprite.y = cornersSprite.height / 2;
        borderSprite.tint = tintColor;
        borderContainer.addChild(borderSprite);
        return borderContainer;
    }

    createSystemSlots(templateWidth, tintColor) {
        const slotsContainer = new PIXI.Container();
        
        // Frame slots (vertical alignment)
        const frameSlotPositions = [
            { x: templateWidth / 2, y: 80 },   // slot01 - top frame slot
            { x: templateWidth / 2, y: 180 },   // slot02 - middle frame slot
            { x: templateWidth / 2, y: 280 }    // slot03 - bottom frame slot
        ];

        // Reactor slots (horizontal alignment below frame)
        const reactorSlotPositions = [
            { x: (templateWidth / 4) - 15, y: 400 },  // reactor01 - left
            { x: (templateWidth / 2), y: 400 },  // reactor02 - center
            { x: (templateWidth * 3 / 4) + 15, y: 400 }   // reactor03 - right
        ];

        // Create frame slots (will hold system buttons)
        frameSlotPositions.forEach((pos, index) => {
            const slot = this.createSlot(pos.x, pos.y, `slot0${index + 1}`, tintColor);
            slotsContainer.addChild(slot);
        });

        // Create reactor slots (position references only)
        reactorSlotPositions.forEach((pos, index) => {
            const slot = this.createReactorSlot(pos.x, pos.y, `reactor0${index + 1}`);
            slotsContainer.addChild(slot);
        });

        return slotsContainer;
    }

    createSlot(x, y, id, tintColor) {
        const slot = new PIXI.Container();
        slot.x = x;
        slot.y = y;
        slot.label = id;
        slot.type = 'frame';
        slot.eventMode = 'static';
        slot.cursor = 'pointer';

        // Base slot background (white circle from SVG)
        const baseSprite = PIXI.Sprite.from(this.assets.circuitColor);
        baseSprite.anchor.set(0.5);
        baseSprite.tint = tintColor;
        slot.addChild(baseSprite);

        // Circuit color overlay (initially hidden)
        const circuitOverlay = PIXI.Sprite.from(this.assets.circuitColor);
        circuitOverlay.anchor.set(0.5);
        circuitOverlay.visible = false;
        circuitOverlay.tint = 0xFFFFFF; // Will be set by circuit color
        slot.addChild(circuitOverlay);
        slot.circuitOverlay = circuitOverlay;

        // Toggle button (will be replaced with system-specific button)
        const toggleSprite = PIXI.Sprite.from(this.assets.toggle);
        toggleSprite.anchor.set(0.5);
        slot.addChild(toggleSprite);
        slot.toggle = toggleSprite;

        return slot;
    }

    createReactorSlot(x, y, id) {
        const slot = new PIXI.Container();
        slot.x = x;
        slot.y = y;
        slot.label = id;
        slot.type = 'reactor';
        
        // Reactor slots are just position markers, no visual background
        // System buttons will be placed here but won't get circuit coloring
        const toggleSprite = PIXI.Sprite.from(this.assets.toggle);
        toggleSprite.anchor.set(0.5);
        slot.addChild(toggleSprite);
        slot.toggle = toggleSprite;
        
        return slot;
    }

    createDirectionLabel(direction) {
        const label = new PIXI.Text(direction, {
            fontFamily: headerFont.family,
            fontSize: headerFont.size,
            fontWeight: 'bold',
            fill: 0x000000,
            align: 'center'
        });
        
        label.anchor.set(0.5);
        label.x = 32; // Center of template
        label.y = 25; // Top area
        
        return label;
    }

    populateSystems() {
        this.directionTemplates.forEach(template => {
            const direction = template.direction;
            const directionLayout = this.engineLayout.directions[direction];

            template.slots.forEach(slot => {
                const system = directionLayout.frameSlots[slot.label] || directionLayout.reactorSlots[slot.label];
                if (system) {
                    const button = this.createSystemButton(system);
                    slot.removeChild(slot.toggle); // Remove the placeholder
                    slot.addChild(button);
                    slot.toggle = button;
                }
            });
        });
    }

    createSystemButton(system) {
        const button = new PIXI.Sprite(this.assets[system]);
        button.anchor.set(0.5);
        return button;
    }

    setupCircuits() {
        this.engineLayout.circuits.forEach(circuit => {
            const color = parseInt(circuit.color.substring(1), 16);
            circuit.connections.forEach(conn => {
                const template = this.directionTemplates.find(t => t.direction === conn.direction);
                if (template) {
                    const slot = template.slots.find(s => s.label === conn.slotId);
                    if (slot) {
                        slot.circuitOverlay.visible = true;
                        slot.circuitOverlay.tint = color;
                    }
                }
            });
        });
    }

    setupInteractions() {
        // This will be implemented in next phase
        console.log('Interaction setup ready for implementation');
    }
}

export { createEngineScene };
