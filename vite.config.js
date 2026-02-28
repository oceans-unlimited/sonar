import { defineConfig } from 'vite';

export default defineConfig({
    // Serve static assets from public/ 
    publicDir: 'public',

    server: {
        port: 5173,
        // Proxy Socket.IO requests to the Express server
        proxy: {
            '/socket.io': {
                target: 'http://localhost:3000',
                ws: true,
                changeOrigin: true
            }
        }
    },

    build: {
        outDir: 'dist',
        sourcemap: true
    },

    // Resolve aliases for clean imports
    resolve: {
        alias: {
            // Allow @pixi/layout to resolve correctly
        }
    }
});
