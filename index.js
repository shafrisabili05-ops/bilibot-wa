const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

// --- PENGATURAN ---
// Nanti ganti ID di bawah ini setelah lu dapet ID-nya dari terminal
const idGrupTarget = '120363425474562327@g.us'; 
// ------------------

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        handleSIGINT: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('>>> [SCAN] Scan QR Code ini pake WhatsApp lu!');
});

client.on('ready', () => {
    console.log('>>> [INFO] Bot sudah online dan siap bekerja!');
});

client.on('message', async (msg) => {
    const chat = await msg.getChat();

    // 1. Logika untuk nyari ID Grup (Muncul di terminal/command prompt)
    if (chat.isGroup) {
        console.log(`[LOG] Chat dari Grup: ${chat.name} | ID: ${chat.id._serialized}`);
    }

    // 2. Filter: Hanya jalan jika itu Grup DAN ID-nya cocok
    if (chat.isGroup && chat.id._serialized === idGrupTarget) {
        const pesan = msg.body.toLowerCase();

        switch (pesan) {
            case '!p':
            case 'ping':
                msg.reply('Pong! Bot standby bos.');
                break;

            case '!menu':
                msg.reply(
                    '--- *MENU BOT GRUP* ---\n\n' +
                    'Ketik perintah ini:\n' +
                    '• *!qris* - Untuk bayar\n' +
                    '• *!info* - Informasi grup\n' +
                    '• *!admin* - Hubungi admin'
                );
                break;

            case '!qris':
            case 'bayar':
                if (fs.existsSync('./qris.png')) {
                    const media = MessageMedia.fromFilePath('./qris.png');
                    await client.sendMessage(msg.from, media, { 
                        caption: 'Silakan scan QRIS di atas.\n\nJangan lupa kirim bukti transfer ya!' 
                    });
                } else {
                    msg.reply('Waduh, file qris.png nggak ketemu di folder bot!');
                }
                break;

            case '!info':
                msg.reply('Grup ini dilindungi oleh Bot otomatis. Jangan spam ya!');
                break;

            case '!admin':
                msg.reply('Admin bisa dihubungi di: wa.me/628123456789');
                break;
        }
    }
});

client.initialize();