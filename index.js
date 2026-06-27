const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const pino = require('pino');
const cron = require('node-cron');
const axios = require('axios');

// Web Server agar Render.com tidak mematikan bot kita
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('✅ Bilibot sedang menyala 24 Jam!'));
app.listen(port, () => console.log(`Web server hidup di port ${port}`));

// Target Grup & API Key Groq
const idGrupTarget = '120363408622489097@g.us';
const AI_API_KEY = 'process.env.AI_API_KEY';

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_bilibot');

    const client = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'silent' }),
        browser: ['Bilibot Render', 'Chrome', '1.0.0']
    });

    client.ev.on('creds.update', saveCreds);

    client.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (new Boom(lastDisconnect.error))?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Koneksi terputus. Menyambung ulang...', shouldReconnect);
            if (shouldReconnect) connectToWhatsApp();
        } else if (connection === 'open') {
            console.log('>>> BILIBOT ONLINE DI RENDER! 🚀');

            // Jadwal Grup
            cron.schedule('0 8 * * *', async () => {
                try {
                    await client.groupSettingUpdate(idGrupTarget, 'not_announcement');
                    await client.sendMessage(idGrupTarget, { text: '🔓 *Grup Dibuka Otomatis*\n\nSelamat pagi! Toko sudah buka. Silakan yang mau order.\n\nKetik *cara pesan* untuk panduan.' });
                } catch (err) {}
            }, { timezone: "Asia/Jakarta" });

            cron.schedule('0 22 * * *', async () => {
                try {
                    await client.groupSettingUpdate(idGrupTarget, 'announcement');
                    await client.sendMessage(idGrupTarget, { text: '🔒 *Grup Ditutup Otomatis*\n\nMohon maaf, jam operasional sudah habis. Grup dibuka kembali besok jam 08:00.' });
                } catch (err) {}
            }, { timezone: "Asia/Jakarta" });
        }
    });

    // Fitur Welcome
    client.ev.on('group-participants.update', async (update) => {
        if (update.id === idGrupTarget && update.action === 'add') {
            for (let participant of update.participants) {
                await client.sendMessage(idGrupTarget, { 
                    text: `Halo @${participant.split('@')[0]}! 👋\n\nSelamat datang di Grup Premium Apps Store. 🎉\n\nKetik *menu* untuk produk. Ketik *cara pesan* untuk order.`,
                    mentions: [participant] 
                });
            }
        }
    });

    // Fitur Baca Pesan
    client.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe || msg.key.remoteJid !== idGrupTarget) return;

        const type = Object.keys(msg.message)[0];
        let pesan = type === 'conversation' ? msg.message.conversation : type === 'extendedTextMessage' ? msg.message.extendedTextMessage.text : type === 'imageMessage' ? (msg.message.imageMessage.caption || '') : '';
        pesan = pesan.toLowerCase().trim();
        const isImage = type === 'imageMessage' || (type === 'extendedTextMessage' && msg.message.extendedTextMessage.contextInfo?.quotedMessage?.imageMessage);
        
        const reply = async (teks) => await client.sendMessage(idGrupTarget, { text: teks }, { quoted: msg });

        if (isImage) return reply('✅ *Bukti transfer diterima!*\n\nPesananmu sedang di proses ya. Mohon ditunggu sebentar. ⏳🙏');
        if (!pesan) return;

        // Command Menu & Jualan
        if (pesan === 'p' || pesan === 'ping') return reply('Pong! Bilibot Online dari Server Render.');
        else if (pesan === 'cara pesan' || pesan === 'order') return reply(`🛒 *CARA PEMESANAN APLIKASI PREMIUM* 🛒\n\n1️⃣ Ketik *menu*\n2️⃣ Ketik *nama aplikasi*\n3️⃣ Ketik *qris*\n4️⃣ Transfer & Kirim bukti foto.\n✅ Admin akan memproses.`);
        else if (pesan === 'menu' || pesan === '!menu') return reply(`*Menu Aplikasi Premium!*\n\n*🎬 MOVIE*\n1. *wetv* \n2. *vidio* \n3. *disney* \n4. *netflix* \n5. *viu* \n6. *iqiyi* \n7. *prime* \n8. *bstation* \n9. *hbo* \n10. *crunchyroll*\n\n*🎵 MUSIC*\n11. *spotify* \n12. *youtube* \n13. *joox* \n14. *applemusic* \n15. *resso*\n\n*🤖 AI*\n16. *chatgpt* \n17. *claude* \n18. *grok* \n19. *midjourney* \n20. *gemini* \n21. *copilot*\n\n*🎨 DESIGN*\n22. *canva* \n23. *capcut* \n24. *alight* \n25. *picsart* \n26. *lightroom* \n27. *vsco* \n28. *kine* \n29. *remini*\n\n*🌐 VPN*\n30. *hma* \n31. *nordvpn* \n32. *expressvpn* \n33. *surfshark*\n\n*📚 EDU*\n34. *zoom* \n35. *duolingo* \n36. *grammarly* \n37. *scribd* \n38. *turnitin*\n\n*🛠️ INFO*\n39. *qris* \n40. *cara pesan*\n41. *admin* \n42. *aturan*\n\n*🔒 ADMIN*\n43. *!open* \n44. *!close*`);
        else if (pesan === 'qris' || pesan === 'bayar') return client.sendMessage(idGrupTarget, { image: { url: 'https://i.postimg.cc/Nf8NCPVV/Whats-App-Image-2026-05-08-at-11-28-50.jpg' }, caption: 'Scan QRIS atau TF ke Dana 081219628008' }, { quoted: msg }).catch(() => reply('Dana/Gopay: 081219628008'));
        else if (pesan === 'admin') return reply('Chat admin: wa.me/081219628008');
        else if (pesan === 'stats') return reply(`*Status Bot:*\n- Mesin: Baileys + Express\n- Hosting: Render.com\n- Mode: Bilibot AI (Groq)`);
        
        // Command Admin
        else if (pesan === '!close' || pesan === '!open') {
            const groupMetadata = await client.groupMetadata(idGrupTarget);
            const isSenderAdmin = groupMetadata.participants.find(p => p.id === (msg.key.participant || msg.key.remoteJid))?.admin;
            if (isSenderAdmin === 'admin' || isSenderAdmin === 'superadmin') {
                if (pesan === '!close') { await client.groupSettingUpdate(idGrupTarget, 'announcement'); return reply('🔒 *Grup Ditutup*'); }
                else { await client.groupSettingUpdate(idGrupTarget, 'not_announcement'); return reply('🔓 *Grup Dibuka*'); }
            }
        }
        
        // Harga (Singkat agar tidak kepanjangan di script ini)
        else if (['wetv','vidio','disney','netflix','viu','iqiyi','prime','bstation','hbo','crunchyroll','spotify','youtube','yt','joox','applemusic','resso','chatgpt','gpt','claude','grok','midjourney','gemini','copilot','canva','capcut','alight','am','picsart','lightroom','vsco','kine','remini','hma','nordvpn','nord','expressvpn','express','surfshark','zoom','duolingo','grammarly','scribd','turnitin'].includes(pesan)) {
            return reply(`✅ Aplikasi *${pesan.toUpperCase()}* tersedia! Ketik *menu* untuk melihat daftar lengkap, atau langsung transfer dan kirim buktinya kesini.`);
        }

        // Bilibot AI
        else {
            try {
                const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                    model: "llama-3.3-70b-versatile", 
                    messages: [
                        { role: "system", content: "Namamu Bilibot, asisten AI di Premium Apps Store. Jawab asik dan santai. Tanya beli = suruh ketik 'cara pesan'." },
                        { role: "user", content: pesan }
                    ]
                }, { headers: { 'Authorization': `Bearer ${AI_API_KEY}` } });
                return reply(`🤖 *Bilibot:*\n\n${response.data.choices[0].message.content}`);
            } catch (error) { console.error('[ERROR AI]:', error.message); }
        }
    });
}
connectToWhatsApp();