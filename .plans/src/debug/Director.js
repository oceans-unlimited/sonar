export class Director {
  constructor() {
    this.listeners = {};
    this.currentScenario = null;
    this.eventQueue = [];
    this.isRunning = false;
    this.isPaused = false;
    this.lastEvent = null;
  }

  // Socket.io interface
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  emit(event, data) {
    this.lastEvent = { event, data, timestamp: Date.now() };
    console.log(`[Director] EMIT: ${event}`, data);
    const callbacks = this.listeners[event] || [];
    callbacks.forEach(cb => cb(data));
  }

  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  // Director-specific API
  async loadScenario(scenarioDef) {
    console.log(`[Director] Loading scenario: ${scenarioDef.name}`);
    this.reset();
    this.currentScenario = scenarioDef;
    
    // Execute timeline if present
    if (scenarioDef.timeline) {
      this.isRunning = true;
      await this.executeTimeline(scenarioDef.timeline);
    } else if (scenarioDef.run) {
      this.isRunning = true;
      await scenarioDef.run(this);
      this.isRunning = false;
    }
  }

  async executeTimeline(timeline) {
    for (const step of timeline) {
      if (!this.isRunning) break;

      // Pulse check for pause
      while (this.isPaused) {
        await new Promise(resolve => setTimeout(resolve, 100));
        if (!this.isRunning) return;
      }

      if (step.type === 'server_event') {
        this.emit(step.event, step.data);
      } else if (step.type === 'delay') {
        await new Promise(resolve => setTimeout(resolve, step.ms));
      } else if (step.type === 'ui_trigger') {
        window.dispatchEvent(new CustomEvent('director:ui_trigger', { 
          detail: step 
        }));
      }
      
      if (step.delay) {
        await new Promise(resolve => setTimeout(resolve, step.delay));
      }
    }
    this.isRunning = false;
  }

  triggerEvent(event, data, delay = 0) {
    if (delay > 0) {
      setTimeout(() => this.emit(event, data), delay);
    } else {
      this.emit(event, data);
    }
  }

  injectEvent(event, data) {
    console.log('[Director] Manual event injection:', event);
    this.emit(event, data);
  }

  pauseTimeline() {
    this.isPaused = true;
    console.log('[Director] Timeline paused');
  }

  resumeTimeline() {
    this.isPaused = false;
    console.log('[Director] Timeline resumed');
  }

  getLastEmittedEvent() {
    return this.lastEvent;
  }

  reset() {
    this.isRunning = false;
    this.isPaused = false;
    this.currentScenario = null;
    this.eventQueue = [];
    this.lastEvent = null;
  }
}
