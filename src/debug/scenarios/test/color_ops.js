export default {
    name: 'Test: Color Operations',
    scene: 'test',
    description: 'Cycles a panel through various semantic colors via Controller logic.',
    timeline: [
        { type: 'server_event', event: 'DIRECTOR_CMD', data: { target: 'test_panel_1', action: 'set_color', value: 'neutral' }, delay: 1000 },
        { type: 'server_event', event: 'DIRECTOR_CMD', data: { target: 'test_panel_1', action: 'set_border_color', value: 'warning' }, delay: 1000 },
        { type: 'server_event', event: 'DIRECTOR_CMD', data: { target: 'test_panel_1', action: 'set_color', value: 'success' }, delay: 1000 },
        { type: 'server_event', event: 'DIRECTOR_CMD', data: { target: 'test_panel_1', action: 'set_border_color', value: 'danger' }, delay: 1000 },
        
        // Test Block Header Tinting
        { type: 'server_event', event: 'DIRECTOR_CMD', data: { target: 'test_block', action: 'set_text_color', value: 'primary' }, delay: 1000 },
        
        { type: 'server_event', event: 'DIRECTOR_CMD', data: { target: 'test_panel_1', action: 'set_color', value: 'primary' }, delay: 1000 },
        { type: 'server_event', event: 'DIRECTOR_CMD', data: { target: 'test_panel_1', action: 'set_border_color', value: 0xFF00FF }, delay: 1000 },
        { type: 'server_event', event: 'DIRECTOR_CMD', data: { target: 'test_panel_1', action: 'set_color', value: 'neutral' }, delay: 1000 },
        { type: 'server_event', event: 'DIRECTOR_CMD', data: { target: 'test_panel_1', action: 'set_border_color', value: 'success' }, delay: 1000 },
    ]
};