/**
 * Point d'entrée CommonJS pour Phusion Passenger.
 * Utilisé car certains serveurs cPanel (LiteSpeed) ne supportent pas le chargement direct d'ESM.
 */
async function load() {
    try {
        console.log('[Passenger] Loading ESM application...');
        await import('./dist/index.js');
    } catch (err) {
        console.error('[Passenger] FATAL ERROR:', err);
        const fs = require('fs');
        const path = require('path');
        const logFile = path.resolve(__dirname, 'startup.log');
        fs.appendFileSync(logFile, `[${new Date().toISOString()}] [Passenger FATAL] ${err.stack || err}\n`);
        process.exit(1);
    }
}

load();
