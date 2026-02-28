import { SCENARIO_REGISTRY, SCENARIO_CATEGORIES } from './scenarios/index.js';

export class DebugOverlay {
  constructor(director, sceneManager) {
    this.director = director;
    this.sceneManager = sceneManager;
    this.panel = null;
    this.toggleButton = null;
    this.isCollapsed = false;
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
      padding: 15px;
      border: 2px solid #00ff00;
      border-radius: 8px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      z-index: 9999;
      min-width: 350px;
      max-height: 85vh;
      overflow-y: auto;
      transition: all 0.3s ease;
      box-shadow: 0 0 20px rgba(0, 255, 0, 0.2);
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
    this.panel.innerHTML = `
      <h3 style="margin: 0 0 10px 0; color: #00ff00; border-bottom: 1px solid #00ff00; padding-bottom: 5px;">🎬 DIRECTOR MODE</h3>
      
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Select Scenario:</label>
        <select id="scenario-select" style="width: 100%; padding: 8px; background: #000; color: #00ff00; border: 1px solid #00ff00; border-radius: 4px;">
          <option value="">-- Choose Scenario --</option>
          ${this.renderScenarioOptions()}
        </select>
      </div>
      
      <button id="load-scenario-btn" style="width: 100%; padding: 10px; background: #004400; color: #00ff00; border: 1px solid #00ff00; border-radius: 4px; cursor: pointer; margin-bottom: 15px; font-weight: bold; text-transform: uppercase;">
        Load Scenario
      </button>

      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Timeline Controls:</label>
        <div style="display: flex; gap: 5px;">
          <button id="pause-timeline-btn" style="flex: 1; padding: 8px; background: #444400; color: #ffff00; border: 1px solid #ffff00; border-radius: 4px; cursor: pointer;">
            ⏸ Pause
          </button>
          <button id="resume-timeline-btn" style="flex: 1; padding: 8px; background: #004400; color: #00ff00; border: 1px solid #00ff00; border-radius: 4px; cursor: pointer;">
            ▶ Resume
          </button>
        </div>
      </div>

      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Manual Event Injection:</label>
        <div style="display: flex; gap: 5px; margin-bottom: 5px;">
          <select id="event-type-select" style="flex: 1; padding: 5px; background: #000; color: #00ff00; border: 1px solid #00ff00; border-radius: 4px;">
            <option value="GAME_STATE">GAME_STATE</option>
            <option value="cross_off_system">cross_off_system</option>
          </select>
          <button id="inject-event-btn" style="padding: 5px 15px; background: #440044; color: #ff00ff; border: 1px solid #ff00ff; border-radius: 4px; cursor: pointer;">
            Inject
          </button>
        </div>
        <textarea id="event-data-input" placeholder='{"key": "value"}' style="width: 100%; height: 60px; background: #000; color: #00ff00; border: 1px solid #003300; border-radius: 4px; font-family: monospace; font-size: 10px;"></textarea>
      </div>
      
      <div id="current-scenario" style="margin-bottom: 15px; padding: 10px; background: #001100; border: 1px solid #00ff00; border-radius: 4px;">
        <strong>Current:</strong> <span id="scenario-name">None</span>
      </div>

      <div style="margin-bottom: 15px; padding: 10px; background: #001100; border: 1px solid #003300; border-radius: 4px;">
        <strong>Last Emitted:</strong>
        <pre id="last-event-display" style="margin: 5px 0 0 0; font-size: 10px; color: #00ff00; overflow-x: auto; white-space: pre-wrap; max-height: 100px;">None</pre>
      </div>
      
      <div style="margin-bottom: 10px;">
        <strong>Event Log:</strong>
        <div id="event-log" style="max-height: 150px; overflow-y: auto; background: #000; padding: 10px; border: 1px solid #003300; font-size: 10px; margin-top: 5px; border-radius: 4px;">
          <div style="color: #666;">Waiting for events...</div>
        </div>
      </div>
      
      <button id="clear-log-btn" style="width: 100%; padding: 5px; background: #220000; color: #ff4444; border: 1px solid #ff4444; border-radius: 4px; cursor: pointer; font-size: 10px;">
        Clear Log
      </button>
    `;
    
    this.attachEventListeners();
  }
  
  renderScenarioOptions() {
    let html = '';
    for (const [category, scenarios] of Object.entries(SCENARIO_CATEGORIES)) {
      html += `<optgroup label="${category}">`;
      for (const scenarioKey of scenarios) {
        const scenario = SCENARIO_REGISTRY[scenarioKey];
        html += `<option value="${scenarioKey}">${scenario.name}</option>`;
      }
      html += `</optgroup>`;
    }
    return html;
  }
  
  attachEventListeners() {
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
        this.director.injectEvent(type, data);
        this.logEvent(`Manually Injected: ${type}`, '#ff00ff');
      } catch (e) {
        this.logEvent(`Injection Error: ${e.message}`, '#ff0000');
      }
    });
    
    document.getElementById('clear-log-btn').addEventListener('click', () => {
      document.getElementById('event-log').innerHTML = '<div style="color: #666;">Log cleared</div>';
    });
  }
  
  async loadScenario(scenarioKey) {
    const scenario = SCENARIO_REGISTRY[scenarioKey];
    if (!scenario) return;
    
    this.logEvent(`Loading: ${scenario.name}`, '#ffffff');
    document.getElementById('scenario-name').textContent = scenario.name;
    
    // Load scene module
    if (scenario.scene) {
      await this.sceneManager.loadScene(scenario.scene);
    }
    
    await this.director.loadScenario(scenario);
    this.logEvent(`✓ Scenario loaded`, '#00ff00');
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
    this.logEvent(`UI Trigger: ${trigger.action} on ${trigger.target}`, '#00ffff');
  }
  
  destroy() {
    if (this.panel) this.panel.remove();
    if (this.toggleButton) this.toggleButton.remove();
  }
}
