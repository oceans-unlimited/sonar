import { Colors } from '../../../core/uiStyle.js';

export default {
  name: 'Teletype - Pristine Diagnostics',
  description: 'Fully automated sequence. Messages auto-type on push. Exceeds 10-row cap to test eviction.',
  scene: 'teletype',
  
  timeline: [
    { type: 'delay', ms: 500 },
    
    // Phase 1: Boot Sequence
    { type: 'server_event', event: 'PUSH_TEST_MESSAGE', data: { text: ">> Initialize Teletype Mock..." } },
    { type: 'delay', ms: 1000 },
    { type: 'server_event', event: 'PUSH_TEST_MESSAGE', data: { text: ">> System Ready." } },
    { type: 'delay', ms: 1000 },

    // Phase 2: System Diagnostics
    { type: 'server_event', event: 'PUSH_TEST_MESSAGE', data: { text: ">> Checking Reactor Core Integrity..." } },
    { type: 'delay', ms: 1000 },
    { type: 'server_event', event: 'PUSH_TEST_MESSAGE', data: { text: ">> Verifying Sonar Array Response..." } },
    { type: 'delay', ms: 1000 },
    { type: 'server_event', event: 'PUSH_TEST_MESSAGE', data: { text: ">> All Systems Operational." } },
    
    { type: 'delay', ms: 1000 },

    // Phase 3: Styled Messages
    { type: 'server_event', event: 'PUSH_TEST_MESSAGE', 
      data: { text: "[Sonar] Biological contact detected - North East.", options: { fill: Colors.roleSonar } } },
    { type: 'delay', ms: 1000 },

    { type: 'server_event', event: 'PUSH_TEST_MESSAGE', 
      data: { text: "[Warning] Integrity Breach in Sector 4!", options: { fill: Colors.warning } } },
    { type: 'delay', ms: 1000 },

    { type: 'server_event', event: 'PUSH_TEST_MESSAGE', 
      data: { text: "[Cpt] Execute Sequence Alpha-6.", options: { fill: Colors.roleCaptain } } },
    { type: 'delay', ms: 1000 },

    { type: 'server_event', event: 'PUSH_TEST_MESSAGE', 
      data: { text: ">> Sequence Confirmed.", options: { fill: Colors.subB } } },
    
    { type: 'delay', ms: 1000 },

    // Phase 4: Overflow — these push past the 10-row cap
    { type: 'server_event', event: 'PUSH_TEST_MESSAGE', data: { text: ">> Navigation system recalibrating..." } },
    { type: 'delay', ms: 1000 },
    { type: 'server_event', event: 'PUSH_TEST_MESSAGE', data: { text: ">> Torpedo bay sealed. Pressure nominal." } },
    { type: 'delay', ms: 1000 },

    { type: 'server_event', event: 'PUSH_TEST_MESSAGE', 
      data: { text: "[Warning] Hull stress exceeding threshold!", options: { fill: Colors.warning } } },
    { type: 'delay', ms: 1000 },

    { type: 'server_event', event: 'PUSH_TEST_MESSAGE', 
      data: { text: "[Sonar] Contact lost. Resuming passive scan.", options: { fill: Colors.roleSonar } } },
    { type: 'delay', ms: 1000 },

    { type: 'server_event', event: 'PUSH_TEST_MESSAGE', data: { text: ">> All stations report ready." } },
    { type: 'delay', ms: 1000 },

    { type: 'server_event', event: 'PUSH_TEST_MESSAGE', 
      data: { text: ">> End of diagnostics sequence.", options: { fill: Colors.subB } } }
  ]
};
