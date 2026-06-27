const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const pino = require('pino');

const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bilibot Online'));
app.listen(port);

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_bilibot');

    const client = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        browser: ['Bilibot', 'Chrome', '1.0.0']
    });

    client.ev.on('creds.update', saveCreds);

    client.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        // MEMAKSA QR CODE MUNCUL DI LOG
        if (qr) {
            console.log('--- SCAN QR CODE INI ---');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect = (new Boom(lastDisconnect.error))?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) connectToWhatsApp();
        } else if (connection === 'open') {
            console.log('>>> BILIBOT BERHASIL KONEK! 🚀');
        }
    });
}
connectToWhatsApp();