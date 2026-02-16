import { Assets } from 'pixi.js';

/**
 * Assets Manager
 * Handles pre-loading of textures, fonts, and other resources.
 */

const ASSET_LIST = {
    noise: 'assets/textures/noise.png',
    scanlines: 'assets/textures/scanlines.png',
    chart_overlay: 'assets/textures/light_rays.png',
    god_rays: 'assets/textures/god_rays_03.png',
    map_sprites: 'assets/sprites/ocean_02.png',
    sub_profileA: 'assets/ui/sub_profileA.svg',
    sub_profileB: 'assets/ui/sub_profileB.svg',
    role_captain: 'assets/ui/role_captain.svg',
    role_engineer: 'assets/ui/role_engineer.svg',
    role_firstofficer: 'assets/ui/role_firstofficer.svg',
    role_sonar: 'assets/ui/role_sonar.svg',
    thumb: 'assets/ui/thumb.svg',
    directionFrame: 'assets/ui/directionFrame.svg',
    reactorGrid: 'assets/ui/reactorGrid.svg',
    circuit_frame: 'assets/ui/circuit_frame.svg',
    grid_tag: 'assets/ui/grid_tag.svg',
    reactor_tag: 'assets/ui/reactor_tag.svg',
    toggle: 'assets/ui/toggle.svg',
    stealth: 'assets/ui/stealth.svg',
    detection: 'assets/ui/detection.svg',
    weapons: 'assets/ui/weapons.svg',
    reactor: 'assets/ui/reactor.svg',
    vessel: 'assets/ui/vessel.svg',
    disabled: 'assets/ui/disabled.svg',
    ping_sys: 'assets/ui/ping_sys.svg',
    four_gauge: 'assets/ui/4_gauge.svg',
    four_gauge_fill1: 'assets/ui/4_gauge_fill1.svg',
    four_gauge_fill2: 'assets/ui/4_gauge_fill2.svg',
    four_gauge_fill3: 'assets/ui/4_gauge_fill3.svg',
    four_gauge_fill4: 'assets/ui/4_gauge_fill4.svg',
    drone_sys: 'assets/ui/drone_sys.svg',
    three_gauge: 'assets/ui/3_gauge.svg',
    three_gauge_fill1: 'assets/ui/3_gauge_fill1.svg',
    three_gauge_fill2: 'assets/ui/3_gauge_fill2.svg',
    three_gauge_fill3: 'assets/ui/3_gauge_fill3.svg',
    mine_sys: 'assets/ui/mine_sys.svg',
    torpedo_sys: 'assets/ui/torpedo_sys.svg',
    stealth_sys: 'assets/ui/stealth_sys.svg',
    six_gauge: 'assets/ui/6_gauge.svg',
    six_gauge_fill1: 'assets/ui/6_gauge_fill1.svg',
    six_gauge_fill2: 'assets/ui/6_gauge_fill2.svg',
    six_gauge_fill3: 'assets/ui/6_gauge_fill3.svg',
    six_gauge_fill4: 'assets/ui/6_gauge_fill4.svg',
    six_gauge_fill5: 'assets/ui/6_gauge_fill5.svg',
    six_gauge_fill6: 'assets/ui/6_gauge_fill6.svg',
    scenario_sys: 'assets/ui/scenario_sys.svg',
    button: 'assets/ui/button.svg',
    filled_box: 'assets/ui/filled_box.svg',
    pause: 'assets/ui/pause.svg',
    captain_badge: 'assets/ui/cpt.svg',
    arrow: 'assets/ui/arrow.svg',
    ownship: 'assets/ui/ownship.svg',
    map_select: 'assets/ui/map_select.svg',
    reticule: 'assets/ui/reticule.svg',
    map_dot: 'assets/ui/map_dot.svg',
    buttonFrame: 'assets/ui/button.svg',
    circuitFrame: 'assets/ui/circuit_frame.svg',
    gridTag: 'assets/ui/grid_tag.svg',
    reactorTag: 'assets/ui/reactor_tag.svg',
    // Sprite Sheets
    gauges: 'assets/sprites/gauges-sprite.json'
};

const FONT_LIST = {
    'Goldman': 'assets/fonts/Goldman-Regular.ttf',
    'Goldman-Bold': 'assets/fonts/Goldman-Bold.ttf',
    'Orbitron': 'assets/fonts/Orbitron-VariableFont_wght.ttf'
};

export class AssetManager {
    constructor() {
        this.assets = {};
    }

    /**
     * Initialize asset loading.
     * @returns {Promise<object>} The loaded assets map.
     */
    async init() {
        // 1. Load Fonts via PixiJS Assets
        // This registers them with @font-face and makes them available to Text objects
        console.log("[AssetManager] Loading fonts...");
        for (const [name, src] of Object.entries(FONT_LIST)) {
            Assets.add({ alias: name, src });
        }
        await Assets.load(Object.keys(FONT_LIST));
        console.log("[AssetManager] Fonts loaded.");

        // 2. Load Textures
        console.log("[AssetManager] Loading textures...");
        for (const [key, src] of Object.entries(ASSET_LIST)) {
            try {
                Assets.add({ alias: key, src });
            } catch (e) {
                console.warn(`[AssetManager] Failed to add asset alias: ${key}`, e);
            }
        }

        try {
            const keys = Object.keys(ASSET_LIST);
            const loadedAssets = await Assets.load(keys);
            this.assets = { ...loadedAssets };
        } catch (e) {
            console.error(`[AssetManager] Batch load failed`, e);
            // Fallback to individual loads if batch fails
            for (const [key, path] of Object.entries(ASSET_LIST)) {
                try {
                    this.assets[key] = await Assets.load(key);
                } catch (err) {
                    console.warn(`[AssetManager] Individual load failed: ${key}`, err);
                }
            }
        }

        console.log(`[AssetManager] Assets loaded: ${Object.keys(this.assets).length}`);

        // 3. Define spritesheets
        this.gaugeSheet = this.assets.gauges;

        return this.assets;
    }

    get(key) {
        return this.assets[key];
    }
}

export const assetManager = new AssetManager();
