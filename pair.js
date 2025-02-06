const express = require("express");
const fs = require("fs");
const { exec } = require("child_process");
let router = express.Router();
const pino = require("pino");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  delay,
  makeCacheableSignalKeyStore,
  Browsers,
  jidNormalizedUser,
} = require("@whiskeysockets/baileys");
const { upload } = require("./mega");

function removeFile(FilePath) {
  if (!fs.existsSync(FilePath)) return false;
  fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get("/", async (req, res) => {
  let num = req.query.number;
  async function ShiroPair() {
    const { state, saveCreds } = await useMultiFileAuthState(`./session`);
    try {
      let ShiroPairWeb = makeWASocket({
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(
            state.keys,
            pino({ level: "fatal" }).child({ level: "fatal" })
          ),
        },
        printQRInTerminal: false,
        logger: pino({ level: "fatal" }).child({ level: "fatal" }),
        browser: Browsers.macOS("Safari"),
      });

      if (!ShiroPairWeb.authState.creds.registered) {
        await delay(1500);
        num = num.replace(/[^0-9]/g, "");
        const code = await ShiroPairWeb.requestPairingCode(num);
        if (!res.headersSent) {
          await res.send({ code });
        }
      }

      ShiroPairWeb.ev.on("creds.update", saveCreds);
      ShiroPairWeb.ev.on("connection.update", async (s) => {
        const { connection, lastDisconnect } = s;
        if (connection === "open") {
          try {
            await delay(10000);
            const sessionShiro = fs.readFileSync("./session/creds.json");

            const auth_path = "./session/";
            const user_jid = jidNormalizedUser(ShiroPairWeb.user.id);

            function randomMegaId(length = 6, numberLength = 4) {
              const characters =
                "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
              let result = "";
              for (let i = 0; i < length; i++) {
                result += characters.charAt(
                  Math.floor(Math.random() * characters.length)
                );
              }
              const number = Math.floor(
                Math.random() * Math.pow(10, numberLength)
              );
              return `${result}${number}`;
            }

            const mega_url = await upload(
              fs.createReadStream(auth_path + "creds.json"),
              `${randomMegaId()}.json`
            );

            const string_session = mega_url.replace(
              "https://mega.nz/file/",
              ""
            );

            const sid = `*SHIRO-MD [The powerful WA BOT]*\n\n👉 ${string_session} 👈\n\n*This is the your Session ID, copy this id and paste into config.js file*\n\n*You can ask any question using this link*\n\n*wa.me/message/KVACZH3HY2C2B1*\n\n*Subscribe My Youtube channel*\n\n*https://youtube.com/@djthularajay?si=F7FKZw7LYieGHTqK*`;
            const mg = `🛑 *Do not share this code to anyone* 🛑‘`;
            const dt = await ShiroPairWeb.sendMessage(user_jid, {
              image: {
                url: "asset/SHIRO-MD.jpg",
              },
              caption: sid,
            });
            const msg = await ShiroPairWeb.sendMessage(user_jid, {
              text: string_session,
            });
            const msg1 = await ShiroPairWeb.sendMessage(user_jid, { text: mg });
          } catch (e) {
            exec("pm2 restart SHIRO-MD");
          }

          await delay(100);
          return await removeFile("./session");
          process.exit(0);
        } else if (
          connection === "close" &&
          lastDisconnect &&
          lastDisconnect.error &&
          lastDisconnect.error.output.statusCode !== 401
        ) {
          await delay(10000);
          ShiroPair();
        }
      });
    } catch (err) {
      exec("pm2 restart SHIRO-MD");
      console.log("service restarted");
      ShiroPair();
      await removeFile("./session");
      if (!res.headersSent) {
        await res.send({ code: "Service Unavailable" });
      }
    }
  }
  return await ShiroPair();
});

process.on("uncaughtException", function (err) {
  console.log("Caught exception: " + err);
  exec("pm2 restart SHIRO-MD");
});

module.exports = router;
