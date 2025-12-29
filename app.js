/**
 * Point d'entrée pour Phusion Passenger sur cPanel.
 */
console.log('[Passenger] app.js starting...');
import('./dist/index.js').catch(err => {
    console.error('[Passenger] FATAL ERROR during import:', err);
    const fs = require('fs');
    const path = require('path');
    const logFile = path.resolve(__dirname, 'startup.log');
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] [Passenger FATAL] ${err.stack || err}\n`);
    process.exit(1);
});
