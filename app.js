import axios from "axios";
import moment from "moment";
import { CronJob } from "cron";
import { createClient } from "bedrock-protocol";
import "dotenv/config";
import { backupServer, getServer } from "./function.js";

moment().locale("id");

let playerList = [];
let botlog = false;
let client;

if(process.env.BOT_LOG) {
  botlog = true;

  client = createClient({
    host: process.env.SERVER_HOST,
    port: parseInt(process.env.SERVER_PORT),
    username: "WonderNickel222",
  });
} else {
  try {
    new CronJob(process.env.CRON_REPORT, getServer, null, true, "Asia/Jakarta");
    console.log("⏱️ Job Started ");
  } catch (err) {
    console.error("Cron error:", err);
  }
}

if (client) client.on("join", () => {
  console.log("✅ Bot joined the server!");

  try {
    new CronJob(process.env.CRON_REPORT, () => getServer(playerList), null, true, "Asia/Jakarta");
    console.log("⏱️ Job Started");
  } catch (err) {
    console.error("Cron error:", err);
  }

  client.on("text", async (v) => {
    if (v.type == "translation") {
      let typeconnection;
      let getPlayerName = v.parameters[0];

      if (v.message === "§e%multiplayer.player.joined") typeconnection = "joined";
      if (v.message === "§e%multiplayer.player.left") typeconnection = "left";

      if (typeconnection)
        await axios.post(process.env.WEBHOOK_SERVER_LOG, {
          content: `[Connection] ${getPlayerName} ${typeconnection} the game.`,
        });
    }

    if (v.type == "chat") {
      await axios.post(process.env.WEBHOOK_SERVER_LOG, {
        content: `[Message] ${v.source_name} says : ${v.message}.`,
      });
    }
  });

  client.on("player_list", (packet) => {
    if (packet.records.type === "add") {
      for (let player of packet.records.records) {
        if (!playerList.find((p) => p.username === player.username)) {
          playerList.push({
            uuid: player.uuid,
            username: player.username,
            joinedAt: moment(),
          });
        }
      }
    }

    if (packet.records.type === "remove") {
      for (let player of packet.records.records) {
        playerList = playerList.filter((v) => v.uuid !== player.uuid);
      }
    }
  });
});

new CronJob(process.env.CRON_BACKUP, backupServer, null, true, 'Asia/Jakarta');