const {
    default: makeWASocket,
    useMultiFileAuthState
} = require("@whiskeysockets/baileys");
const Pino = require("pino");
const fs = require("fs");
const useCODE = process.argv.includes("--useCODE");

let creds;
try {
    creds = JSON.parse(fs.readFileSync("./auth/creds.json"));
} catch (err) {
    creds = null;
}

async function connectToWhatsapp() {
    const auth = await useMultiFileAuthState("auth");
    ////
    let browser;
    if (!creds) {
        browser = useCODE
            ? ["Chrome (Linux)", "", ""]
            : ["Sibay", "Firefox", "1.0.0"];
    } else {
        if (!creds.pairingCode || creds.pairingCode === "") {
            browser = ["Sibay", "Firefox", "1.0.0"];
        } else {
            browser = ["Chrome (Linux)", "", ""];
        }
    }
    console.log(browser);

    const socket = makeWASocket({
        printQRInTerminal: !useCODE,
        browser: browser,
        auth: auth.state,
        logger: Pino({ level: "silent" }),
        generateHighQualityLinkPreview: true
    });
    ////
    if (useCODE && !socket.user && !socket.authState.creds.registered) {
        const question = pertanyaan =>
            new Promise(resolve => {
                const readline = require("readline").createInterface({
                    input: process.stdin,
                    output: process.stdout
                });
                readline.question(pertanyaan, answer => {
                    resolve(answer);
                    readline.close();
                });
            });
        const nomorWa = await question("Masukkan nomor whatsapp anda: +");
        setTimeout(async function () {
            const pairingCode = await socket.requestPairingCode(nomorWa);
            console.log("Pairing code anda: ", pairingCode);
        }, 3000);
    }
    socket.ev.on("creds.update", auth.saveCreds);
    socket.ev.on("connection.update", ({ connection }) => {
        if (connection === "open")
            console.log(
                "Nomor WA Yang Terhubung: " + socket.user.id.split(":")[0]
            );
        if (connection === "close") connectToWhatsapp();
    });
    socket.ev.on("messages.upsert", ({ messages }) => {
        const msg = messages[0];
        function reply(text) {
            socket.sendMessage(
                msg.key.remoteJid,
                { text: text },
                { quoted: msg }
            );
        }
        /* Menambahkan switch case command */
        /*console.log(msg);*/
        if (!msg.message) return;
        const msgType = Object.keys(msg.message)[0];
        const msgText =
            msgType === "conversation"
                ? msg.message.conversation
                : msgType === "extendedTextMessage"
                ? msg.message.extendedTextMessage.text
                : msgType === "imageMessage"
                ? msg.message.imageMessage.caption
                : "";
        if (!msgText.startsWith(".")) return;
        console.log(`Message Type: ${msgType}\nMessage Text: ${msgText}`);
        const command = msgText.replace(/^\./g, "");
        console.log(`Command: ${command}`);
        const id = msg.key.remoteJid;

        switch (command.toLowerCase()) {
            case "ping":
                reply("Pong!");
                break;
            case "pong":
                reply("Ping!");
                break;
            case "link":
                reply("https://github.com/bayumahadika");
                break;
            case "image":
                socket.sendMessage(
                    id,
                    { image: { url: "./image.png" }, mimeType: "image/png" },
                    { quoted: msg }
                );
                break;
            case "video":
                socket.sendMessage(
                    id,
                    {
                        video: fs.readFileSync("./video.mp4"),
                        mimeType: "video/mp4"
                    },
                    { quoted: msg }
                );
                break;
        }
    });
}

connectToWhatsapp();
