import { SCENARIO_REGISTRY, SCENARIO_CATEGORIES } from './scenarios/index.js';

export class DebugOverlay {
  constructor(director, sceneManager) {
    this.director = director;
    this.sceneManager = sceneManager;
    this.panel = null;
    this.toggleButton = null;
    this.isCollapsed = false;
    this.currentSceneKey = 'test'; // Initialize with the default selected scene
  }

  mount() {
    this.toggleButton = document.createElement('button');
    this.toggleButton.id = 'debug-toggle';
    this.toggleButton.innerHTML = '🎬';
    this.toggleButton.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.9);
      color: #00ff00;
      border: 2px solid #00ff00;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      font-size: 20px;
      cursor: pointer;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
    `;

    this.toggleButton.addEventListener('click', () => this.toggle());
    document.body.appendChild(this.toggleButton);

    this.panel = document.createElement('div');
    this.panel.id = 'debug-panel';
    this.panel.style.cssText = `
      position: fixed;
      top: 60px;
      right: 10px;
      background: rgba(0, 0, 0, 0.9);
      color: #00ff00;
      padding: 20px;
      border: 2px solid #00ff00;
      border-radius: 8px;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      z-index: 9999;
      width: 320px;
      max-height: 85vh;
      overflow-y: auto;
      transition: all 0.3s ease;
      box-shadow: 0 0 30px rgba(0, 255, 0, 0.3);
    `;

    document.body.appendChild(this.panel);
    this.render();

    window.addEventListener('director:ui_trigger', (e) => {
      this.handleUITrigger(e.detail);
    });

    // Update last event display periodically
    setInterval(() => this.updateLastEvent(), 500);
  }

  toggle() {
    this.isCollapsed = !this.isCollapsed;
    if (this.isCollapsed) {
      this.panel.style.opacity = '0';
      this.panel.style.transform = 'translateX(20px)';
      this.panel.style.pointerEvents = 'none';
      this.toggleButton.innerHTML = '🎬';
    } else {
      this.panel.style.opacity = '1';
      this.panel.style.transform = 'translateX(0)';
      this.panel.style.pointerEvents = 'auto';
      this.toggleButton.innerHTML = '✕';
    }
  }

  render() {
    // Get the initial scene key to render scenario options correctly
    const initialSceneKey = this.sceneManager.getAvailableScenes().find(scene => scene === 'mapTest') || this.sceneManager.getAvailableScenes()[0];
    this.currentSceneKey = initialSceneKey;

    this.panel.innerHTML = `
      <h3 style="margin: 0 0 15px 0; color: #00ff00; border-bottom: 2px solid #00ff00; padding-bottom: 8px; font-size: 18px;">🎬 DIRECTOR MODE</h3>
      
      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 8px; font-weight: bold;">Select Scene:</label>
        <select id="scene-select" style="width: 100%; padding: 10px; background: #000; color: #00ff00; border: 1px solid #00ff00; border-radius: 4px; font-size: 14px;">
          ${this.renderSceneOptions()}
        </select>
      </div>

      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 8px; font-weight: bold;">Select Scenario:</label>
        <select id="scenario-select" style="width: 100%; padding: 10px; background: #000; color: #00ff00; border: 1px solid #00ff00; border-radius: 4px; font-size: 14px;">
          <option value="">-- Choose Scenario --</option>
          ${this.renderScenarioOptions(this.currentSceneKey)}
        </select>
      </div>
      
      <button id="load-scenario-btn" style="width: 100%; padding: 12px; background: #004400; color: #00ff00; border: 1px solid #00ff00; border-radius: 4px; cursor: pointer; margin-bottom: 20px; font-weight: bold; text-transform: uppercase; font-size: 14px;">
        Load Scenario
      </button>

      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 8px; font-weight: bold;">Timeline Controls:</label>
        <div style="display: flex; gap: 8px;">
          <button id="pause-timeline-btn" style="flex: 1; padding: 10px; background: #444400; color: #ffff00; border: 1px solid #ffff00; border-radius: 4px; cursor: pointer; font-size: 14px;">
            ⏸ Pause
          </button>
          <button id="resume-timeline-btn" style="flex: 1; padding: 10px; background: #004400; color: #00ff00; border: 1px solid #00ff00; border-radius: 4px; cursor: pointer; font-size: 14px;">
            ▶ Resume
          </button>
        </div>
      </div>

      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 8px; font-weight: bold;">Manual Event Injection:</label>
        <div style="display: flex; gap: 8px; margin-bottom: 8px;">
          <select id="event-type-select" style="flex: 1; padding: 8px; background: #000; color: #00ff00; border: 1px solid #00ff00; border-radius: 4px; font-size: 14px;">
            <option value="state">state</option>
            <option value="cross_off_system">cross_off_system</option>
            <option value="SONAR_PING">SONAR_PING</option>
            <option value="SET_INTENT">SET_INTENT</option>
            <option value="CENTER_ON_OWNSHIP">CENTER_ON_OWNSHIP</option>
          </select>
          <button id="inject-event-btn" style="padding: 8px 15px; background: #440044; color: #ff00ff; border: 1px solid #ff00ff; border-radius: 4px; cursor: pointer; font-size: 14px;">
            Inject
          </button>
        </div>
        <textarea id="event-data-input" placeholder='{"key": "value"}' style="width: 100%; height: 80px; background: #000; color: #00ff00; border: 1px solid #003300; border-radius: 4px; font-family: monospace; font-size: 12px;"></textarea>
      </div>

      <div id="scenario-events-container" style="margin-bottom: 20px; display: none;">
        <label style="display: block; margin-bottom: 8px; font-weight: bold;">Quick Actions:</label>
        <div id="scenario-events-list" style="display: flex; flex-wrap: wrap; gap: 8px;">
          <!-- Scenario specific buttons will be injected here -->
        </div>
      </div>
      
      <div id="current-scenario" style="margin-bottom: 20px; padding: 12px; background: #001100; border: 1px solid #00ff00; border-radius: 4px;">
        <strong>Current:</strong> <span id="scenario-name">None</span>
      </div>

      <div style="margin-bottom: 20px; padding: 12px; background: #001100; border: 1px solid #003300; border-radius: 4px;">
        <strong>Last Emitted:</strong>
        <pre id="last-event-display" style="margin: 8px 0 0 0; font-size: 12px; color: #00ff00; overflow-x: auto; white-space: pre-wrap; max-height: 120px;">None</pre>
      </div>
      
      <div style="margin-bottom: 15px;">
        <strong>Event Log:</strong>
        <div id="event-log" style="max-height: 200px; overflow-y: auto; background: #000; padding: 12px; border: 1px solid #003300; font-size: 12px; margin-top: 8px; border-radius: 4px;">
          <div style="color: #666;">Waiting for events...</div>
        </div>
      </div>
      
      <button id="clear-log-btn" style="width: 100%; padding: 10px; background: #220000; color: #ff4444; border: 1px solid #ff4444; border-radius: 4px; cursor: pointer; font-size: 12px;">
        Clear Log
      </button>
    `;

    this.attachEventListeners();
  }

  renderScenarioOptions(selectedSceneKey = null) {
    let html = '';
    for (const [category, scenarios] of Object.entries(SCENARIO_CATEGORIES)) {
      const filteredScenarios = scenarios.filter(scenarioKey => {
        const scenario = SCENARIO_REGISTRY[scenarioKey];
        return !selectedSceneKey || scenario.scene === selectedSceneKey;
      });

      if (filteredScenarios.length > 0) {
        html += `<optgroup label="${category}">`;
        for (const scenarioKey of filteredScenarios) {
          const scenario = SCENARIO_REGISTRY[scenarioKey];
          html += `<option value="${scenarioKey}">${scenario.name}</option>`;
        }
        html += `</optgroup>`;
      }
    }
    return html;
  }

  renderSceneOptions() {
    const scenes = this.sceneManager.getAvailableScenes();
    return scenes.map(scene => `
      <option value="${scene}" ${scene === this.currentSceneKey ? 'selected' : ''}>${scene.toUpperCase()}</option>
    `).join('');
  }

  attachEventListeners() {
    const sceneSelect = document.getElementById('scene-select');
    const scenarioSelect = document.getElementById('scenario-select');

    sceneSelect.addEventListener('change', (e) => {
      const sceneKey = e.target.value;
      this.currentSceneKey = sceneKey; // Update currentSceneKey
      this.sceneManager.loadScene(sceneKey);
      this.logEvent(`Scene changed to: ${sceneKey.toUpperCase()}`, '#00ffff');

      // Re-render scenario options for the newly selected scene
      scenarioSelect.innerHTML = `<option value="">-- Choose Scenario --</option>${this.renderScenarioOptions(sceneKey)}`;
    });

    document.getElementById('load-scenario-btn').addEventListener('click', () => {
      const select = document.getElementById('scenario-select');
      const scenarioKey = select.value;
      if (scenarioKey) {
        this.loadScenario(scenarioKey);
      }
    });

    document.getElementById('pause-timeline-btn').addEventListener('click', () => {
      this.director.pauseTimeline();
      this.logEvent('Timeline PAUSED', '#ffff00');
    });

    document.getElementById('resume-timeline-btn').addEventListener('click', () => {
      this.director.resumeTimeline();
      this.logEvent('Timeline RESUMED', '#00ff00');
    });

    document.getElementById('inject-event-btn').addEventListener('click', () => {
      const type = document.getElementById('event-type-select').value;
      const dataStr = document.getElementById('event-data-input').value;
      try {
        const data = dataStr ? JSON.parse(dataStr) : {};
        this.handleEventInjection(type, data);
      } catch (e) {
        this.logEvent(`Injection Error: ${e.message}`, '#ff0000');
      }
    });

    document.getElementById('clear-log-btn').addEventListener('click', () => {
      document.getElementById('event-log').innerHTML = '<div style="color: #666;">Log cleared</div>';
    });
  }

  /**
   * Routes events based on whether they are server-driven or client-local.
   */
  handleEventInjection(type, data) {
    const clientLocalIntents = ['SET_INTENT', 'CENTER_ON_OWNSHIP'];
    const controller = this.sceneManager.currentController;

    if (clientLocalIntents.includes(type) && controller) {
        // Route client-only actions directly to the controller
        this.logEvent(`Local Intent: ${type}`, '#ffff00');
        controller.handleEvent(type, data);
    } else {
        // Route server-driven events through the mock socket (Director)
        this.logEvent(`Socket Event: ${type}`, '#ff00ff');
        this.director.injectEvent(type, data);
    }
  }

  async loadScenario(scenarioKey) {
    const scenario = SCENARIO_REGISTRY[scenarioKey];
    if (!scenario) return;

    this.logEvent(`Loading: ${scenario.name}`, '#ffffff');
    document.getElementById('scenario-name').textContent = scenario.name;

    // Load scene module
    if (scenario.scene && scenario.scene !== this.currentSceneKey) {
      await this.sceneManager.loadScene(scenario.scene);
      this.currentSceneKey = scenario.scene; // Update if scenario changes scene
      // Also update the scene-select dropdown to reflect the change
      const sceneSelect = document.getElementById('scene-select');
      if (sceneSelect) sceneSelect.value = scenario.scene;
      // And re-render scenario options for the new scene
      const scenarioSelect = document.getElementById('scenario-select');
      if (scenarioSelect) scenarioSelect.innerHTML = `<option value="">-- Choose Scenario --</option>${this.renderScenarioOptions(scenario.scene)}`;
    }

    await this.director.loadScenario(scenario);
    this.director.play();
    this.logEvent(`✓ Scenario loaded`, '#00ff00');

    // Populate Suggested Events
    this.updateScenarioEvents(scenario);
  }

  updateScenarioEvents(scenario) {
    const container = document.getElementById('scenario-events-container');
    const list = document.getElementById('scenario-events-list');
    
    if (!scenario.suggestedEvents || scenario.suggestedEvents.length === 0) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'block';
    list.innerHTML = '';

    scenario.suggestedEvents.forEach(def => {
      const btn = document.createElement('button');
      btn.innerText = def.label;
      btn.style.cssText = `
        padding: 6px 8px;
        background: #003344;
        color: #00ffff;
        border: 1px solid #00ffff;
        border-radius: 4px;
        cursor: pointer;
        font-size: 11px;
        font-family: inherit;
        flex: 1 1 130px;
        max-width: 140px;
        text-align: center;
        transition: all 0.2s;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      `;
      btn.onmouseenter = () => btn.style.background = '#004455';
      btn.onmouseleave = () => btn.style.background = '#003344';
      btn.addEventListener('click', () => {
        this.handleEventInjection(def.event, def.data);
      });
      list.appendChild(btn);
    });
  }

  logEvent(message, color = '#00ff00') {
    const log = document.getElementById('event-log');
    const entry = document.createElement('div');
    entry.style.cssText = `margin-bottom: 3px; color: ${color};`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    log.insertBefore(entry, log.firstChild);
  }

  updateLastEvent() {
    const lastEvent = this.director.getLastEmittedEvent();
    const display = document.getElementById('last-event-display');
    if (lastEvent && display) {
      display.textContent = `${lastEvent.event}: ${JSON.stringify(lastEvent.data, null, 2)}`;
    }
  }

  handleUITrigger(trigger) {
    const message = trigger.message || `UI Trigger: ${trigger.action} on ${trigger.target}`;
    this.logEvent(message, '#00ffff');
  }

  destroy() {
    if (this.panel) this.panel.remove();
    if (this.toggleButton) this.toggleButton.remove();
  }
}
