const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const pino = require('pino');

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_bilibot');

    const client = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        browser: ['Bilibot', 'Chrome', '1.0.0'],
        printQRInTerminal: false // Memastikan tidak error di terminal
    });

    client.ev.on('creds.update', saveCreds);

    client.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        // Memunculkan QR Code di log
        if (qr) {
            console.log('--- SCAN QR CODE INI ---');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect = (new Boom(lastDisconnect.error))?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                console.log('Koneksi terputus, mencoba menyambung kembali...');
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('>>> BILIBOT BERHASIL KONEK! 🚀');
        }
    });
}

connectToWhatsApp();