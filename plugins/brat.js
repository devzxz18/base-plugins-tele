/**
 * Plugin: Brat Telegram (Custom API)
 */
module.exports = {
    // Menangkap perintah /brat [teks]
    onText: /^\/brat (.+)$/, 
    
    callback: async (bot, msg, match, { config }) => {
        const chatId = msg.chat.id;
        const text = match[1]; // Mengambil teks setelah spasi
        
        // Menggunakan API yang kamu berikan
        const url = `https://api.fikmydomainsz.xyz/imagecreator/brat?text=${encodeURIComponent(text)}`;
        
        try {
            // Memberikan indikasi bot sedang bekerja
            await bot.sendChatAction(chatId, 'upload_photo');

            // Mengirim foto langsung menggunakan URL API
            await bot.sendPhoto(chatId, url, { 
                caption: `*Brat Success*\n📝 Teks: ${text}\n👤 Admin: ${config.adminName}`, 
                parse_mode: 'Markdown' 
            });
            
        } catch (e) {
            console.error(e);
            bot.sendMessage(chatId, "❌ Gagal mengambil gambar dari API. Pastikan API sedang online.");
        }
    }
};
