const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const axios = require('axios');
const config = require('./config');

// --- PERBAIKAN INISIALISASI BOT ---
const bot = new TelegramBot(config.telegramToken, { 
    polling: {
        autoStart: true,
        params: {
            timeout: 10 // Menambah waktu tunggu polling agar lebih stabil
        }
    } 
});

// --- PERBAIKAN ERROR HANDLING (PENTING) ---
// Menangkap AggregateError agar bot tidak spamming error di terminal
bot.on('polling_error', (error) => {
    if (error.code === 'EFATAL') {
        console.log(chalk.red(`[ SYSTEM ] Koneksi bermasalah atau token double login. Menunggu...`));
    } else {
        console.log(chalk.yellow(`[ POLLING ERROR ] ${error.message}`));
    }
});

// --- SYSTEM PLUGINS LOADER ---
const loadPlugins = () => {
    const pluginFolder = path.join(__dirname, 'plugins');
    if (!fs.existsSync(pluginFolder)) fs.mkdirSync(pluginFolder);
    
    const files = fs.readdirSync(pluginFolder);
    files.forEach(file => {
        if (file.endsWith('.js')) {
            try {
                // Menghapus cache agar saat restart plugin benar-benar baru
                delete require.cache[require.resolve(`./plugins/${file}`)];
                const plugin = require(`./plugins/${file}`);
                if (plugin.onText && plugin.callback) {
                    bot.onText(plugin.onText, (msg, match) => {
                        const isOwner = msg.from.id.toString() === config.ownerId;
                        plugin.callback(bot, msg, match, { isOwner, config });
                    });
                }
            } catch (e) {
                console.error(chalk.red(`Gagal memuat plugin ${file}:`), e);
            }
        }
    });
};

loadPlugins();

// --- OWNER ONLY FEATURES ---

// 1. List Plugins
bot.onText(/^\/listplugins$/, (msg) => {
    if (msg.from.id.toString() !== config.ownerId) return;
    const files = fs.readdirSync('./plugins');
    let teks = '📂 *LIST PLUGINS:*\n\n';
    files.forEach((file, i) => { teks += `${i + 1}. \`${file}\`\n`; });
    bot.sendMessage(msg.chat.id, teks, { parse_mode: 'Markdown' });
});

// 1. Fitur Add Plugin (Reply Kode + Nama File)
bot.onText(/^\/addplugin (.+)$/, async (msg, match) => {
    const isOwner = msg.from.id.toString() === config.ownerId;
    if (!isOwner) return;

    if (!msg.reply_to_message) {
        return bot.sendMessage(msg.chat.id, "❌ *Gagal:* Silakan balas (reply) pesan yang berisi kode/teks plugin!", { parse_mode: 'Markdown' });
    }

    const fileName = match[1].endsWith('.js') ? match[1] : match[1] + '.js';
    const filePath = path.join(__dirname, 'plugins', fileName);

    try {
        // Mengambil teks dari pesan yang di-reply
        const content = msg.reply_to_message.text;
        
        if (!content) return bot.sendMessage(msg.chat.id, "❌ Pesan yang dibalas tidak mengandung teks.");

        fs.writeFileSync(filePath, content);
        await bot.sendMessage(msg.chat.id, `✅ Plugin \`${fileName}\` berhasil disimpan.\n🔄 *Restarting bot via PM2...*`, { parse_mode: 'Markdown' });
        
        // Matikan proses agar PM2 menyalakan ulang dan plugin baru teregistrasi
        setTimeout(() => {
            process.exit(0);
        }, 2000);
    } catch (e) {
        bot.sendMessage(msg.chat.id, `❌ *Error:* ${e.message}`);
    }
});

// 2. Fitur Delete Plugin
bot.onText(/^\/delplugin (.+)$/, async (msg, match) => {
    const isOwner = msg.from.id.toString() === config.ownerId;
    if (!isOwner) return;

    const fileName = match[1].endsWith('.js') ? match[1] : match[1] + '.js';
    const filePath = path.join(__dirname, 'plugins', fileName);

    if (fs.existsSync(filePath)) {
        try {
            fs.unlinkSync(filePath);
            await bot.sendMessage(msg.chat.id, `🗑️ Plugin \`${fileName}\` telah dihapus.\n🔄 *Restarting bot...*`, { parse_mode: 'Markdown' });
            
            setTimeout(() => {
                process.exit(0);
            }, 2000);
        } catch (e) {
            bot.sendMessage(msg.chat.id, `❌ Gagal menghapus: ${e.message}`);
        }
    } else {
        bot.sendMessage(msg.chat.id, `❌ File \`${fileName}\` tidak ditemukan di folder plugins.`, { parse_mode: 'Markdown' });
    }
});
// ... Sisa kode owner features (list, add, del) tetap sama ...

console.log(chalk.cyan.bold(`[ SYSTEM ] Bot Telegram Running. Auto-restart PM2 aktif.`));
