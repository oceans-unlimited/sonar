import { io } from 'socket.io-client';

/**
 * Reusable test utilities for multi-client socket.io testing
 */

/**
 * Wait for a client to connect
 * @param {Socket} client - Socket.io client instance
 * @returns {Promise<void>}
 */
export async function waitForConnection(client) {
    return new Promise((resolve) => {
        if (client.connected) {
            resolve();
        } else {
            client.once('connect', resolve);
        }
    });
}

/**
 * Wait for a specific event from a client
 * @param {Socket} client - Socket.io client instance
 * @param {string} eventName - Event to wait for
 * @returns {Promise<any>} - Event payload
 */
export async function waitForEvent(client, eventName) {
    return new Promise((resolve) => {
        client.once(eventName, resolve);
    });
}

/**
 * Get current state from a client
 * @param {Socket} client - Socket.io client instance
 * @returns {Promise<object>} - Server state
 */
export async function getState(client) {
    return new Promise((resolve) => {
        client.once('state', resolve);
    });
}

/**
 * Wait for state to satisfy a condition
 * @param {Socket} client - Socket.io client instance
 * @param {Function} condition - Function that returns true when condition is met
 * @param {number} timeout - Timeout in ms (default 5000)
 * @returns {Promise<object>} - Final state
 */
export async function waitForState(client, condition, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            client.off('state', handler);
            reject(new Error(`Timeout waiting for state condition after ${timeout}ms`));
        }, timeout);

        const handler = (state) => {
            if (condition(state)) {
                clearTimeout(timeoutId);
                client.off('state', handler);
                resolve(state);
            }
        };

        client.on('state', handler);
    });
}

/**
 * Create 8 socket.io clients and wait for player IDs to be assigned
 * @param {string} serverUrl - Server URL (e.g., 'http://localhost:3001')
 * @param {object} options - Socket.io client options
 * @returns {Promise<{clients: Array<Socket>, playerIds: Array<string>}>} - Clients and their assigned player IDs
 */
export async function create8Clients(serverUrl, options = { autoConnect: false }) {
    const clients = [];
    const playerIds = new Array(8).fill(null);

    // Create clients and register player_id handlers BEFORE connecting
    for (let i = 0; i < 8; i++) {
        const client = io(serverUrl, options);
        clients.push(client);

        // Register handler before connecting to catch the emission
        client.on('player_id', (id) => {
            playerIds[i] = id;
        });
    }

    // Now connect all clients if autoConnect is true (default)
    const shouldAutoConnect = options.autoConnect !== false;
    if (shouldAutoConnect) {
        for (const client of clients) {
            client.connect();
            await waitForConnection(client);
        }
    }

    // Wait for all player IDs to be assigned (with timeout)
    // ONLY if we connected. If not, this will happen when the caller connects.
    if (shouldAutoConnect) {
        const startTime = Date.now();
        const timeout = 3000;

        while (playerIds.some(id => id === null)) {
            if (Date.now() - startTime > timeout) {
                throw new Error(`Timeout waiting for player IDs. Got: ${playerIds.filter(id => id !== null).length}/8`);
            }
            await sleep(50);
        }
    }

    return { clients, playerIds };

    return { clients, playerIds };
}

/**
 * Configure client to track player ID and state
 * @param {Socket} client - Socket.io client instance
 * @param {object} tracker - Object to store playerId and state
 * @returns {void}
 */
export function configureClientTracking(client, tracker) {
    client.on('player_id', (playerId) => {
        tracker.playerId = playerId;
    });

    client.on('state', (state) => {
        tracker.state = state;
    });
}

/**
 * Select a role for a client
 * @param {Socket} client - Socket.io client instance
 * @param {number} submarine - Submarine index (0 or 1)
 * @param {string} role - Role ('co', 'xo', 'eng', 'sonar')
 * @returns {Promise<void>}
 */
export async function selectRole(client, submarine, role) {
    client.emit('select_role', { submarine, role });
    await sleep(100); // Wait for server processing
}

/**
 * Leave current role
 * @param {Socket} client - Socket.io client instance
 * @returns {Promise<void>}
 */
export async function leaveRole(client) {
    client.emit('leave_role');
    await sleep(100);
}

/**
 * Change player name
 * @param {Socket} client - Socket.io client instance
 * @param {string} name - New name
 * @returns {Promise<void>}
 */
export async function changeName(client, name) {
    client.emit('change_name', name);
    await sleep(100);
}

/**
 * Mark player as ready
 * @param {Socket} client - Socket.io client instance
 * @returns {Promise<void>}
 */
export async function ready(client) {
    client.emit('ready');
    await sleep(100);
}

/**
 * Mark player as not ready
 * @param {Socket} client - Socket.io client instance
 * @returns {Promise<void>}
 */
export async function notReady(client) {
    client.emit('not_ready');
    await sleep(100);
}

/**
 * Mark all clients as ready
 * @param {Array<Socket>} clients - Array of socket clients
 * @returns {Promise<void>}
 */
export async function allReady(clients) {
    for (const client of clients) {
        await ready(client);
    }
}

/**
 * Disconnect all clients
 * @param {Array<Socket>} clients - Array of socket clients
 * @returns {void}
 */
export function disconnectAll(clients) {
    clients.forEach(client => {
        if (client && client.connected) {
            client.disconnect();
        }
    });
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Assign standard roles to 8 clients (2 subs × 4 roles)
 * @param {Array<Socket>} clients - Array of 8 socket clients
 * @returns {Promise<object>} - Object with sub assignments
 */
export async function assignStandardRoles(clients) {
    if (clients.length !== 8) {
        throw new Error('assignStandardRoles requires exactly 8 clients');
    }

    const assignments = {
        subA: {
            co: clients[0],
            xo: clients[1],
            eng: clients[2],
            sonar: clients[3]
        },
        subB: {
            co: clients[4],
            xo: clients[5],
            eng: clients[6],
            sonar: clients[7]
        }
    };

    // Assign roles
    await selectRole(clients[0], 0, 'co');
    await selectRole(clients[1], 0, 'xo');
    await selectRole(clients[2], 0, 'eng');
    await selectRole(clients[3], 0, 'sonar');
    await selectRole(clients[4], 1, 'co');
    await selectRole(clients[5], 1, 'xo');
    await selectRole(clients[6], 1, 'eng');
    await selectRole(clients[7], 1, 'sonar');

    return assignments;
}
