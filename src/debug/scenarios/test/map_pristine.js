export default {
    name: 'Map: Pristine Layout Test',
    scene: 'mapTest',
    description: 'A static test scenario to verify the rendering and layout scalability of the map system.',
    timeline: [
        { type: 'server_event', event: 'SYS_STATUS', data: { status: 'online' }, delay: 100 }
    ]
};
