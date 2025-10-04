import axios from "axios";
import 'dotenv/config';
import moment from "moment";

moment().locale('id');

const formatText = (params) => {
  return `
  Hostname : ${params.server.host}
  Port     : ${params.server.port}

  ===== Server Stats =====
  CPU Load : \`${params.usage.cpu}\` / 400 %
  Memory   : \`${params.usage.memory}\` / 5.86 GiB
  Storage  : \`${params.usage.disk}\` / 4.88 GiB
  Network  : ↓ ${params.usage.netRx} ↑ ${params.usage.netTx}
  ======================

  Online players : ${params.server.players.online}/${params.server.players.max}

  ${
    params.players.length > 0
      ? params.players
          .filter(
            (v, i, self) =>
              i === self.findIndex((p) => p.username === v.username)
          )
          .map((v, i) => {
            const durasi = moment
              .duration(moment().diff(v.joinedAt))
              .humanize();
            if (v.username == "WonderNickel222")
              v.username = `${v.username} [Bot]`;
            return `[${i + 1}] ${v.username} - ${durasi}\n`;
          })
          .join("")
      : "-"
  }
  ======================
  `
}

export const bytesToSize = (bytes) => {
  const sizes = ["Bytes", "KiB", "MiB", "GiB", "TiB"];
  if (bytes === 0) return "0 Byte";
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10);
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

// -----------------------------------------------------------------------------------------------------------------

export const getServer = async (playerList) => {
  try {
    const getInformation = await axios.get(
      `https://api.mcstatus.io/v2/status/bedrock/${process.env.SERVER_HOST}:${process.env.SERVER_PORT}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
          "Accept": "application/json",
          "Sec-CH-UA": '"Chromium";v="117", "Not)A;Brand";v="24", "Google Chrome";v="117"',
          "Sec-CH-UA-Platform": '"Windows"',
          "Sec-CH-UA-Mobile": "?0"
        }
      }
    );

    const getServerDetail = await axios.get(
      `${process.env.SERVER_ENDPOINT}/api/client/servers/${process.env.SERVER_ID}/resources`,
      {
        headers: {
          Authorization: `Bearer ${process.env.SERVER_AUTH}`,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
          "Accept": "application/json",
          "Sec-CH-UA": '"Chromium";v="117", "Not)A;Brand";v="24", "Google Chrome";v="117"',
          "Sec-CH-UA-Platform": '"Windows"',
          "Sec-CH-UA-Mobile": "?0"
        },
      }
    );

    const resources = getServerDetail.data.attributes.resources;
    const memory = bytesToSize(resources.memory_bytes);
    const disk = bytesToSize(resources.disk_bytes);
    const netRx = bytesToSize(resources.network_rx_bytes);
    const netTx = bytesToSize(resources.network_tx_bytes);
    const cpu = `${resources.cpu_absolute.toFixed(2)}%`;

    const descriptionText = formatText({
      server : getInformation.data,
      usage: {
        memory: memory,
        disk: disk,
        netRx: netRx,
        netTx: netTx,
        cpu: cpu
      },
      players: playerList
    })

    await axios.patch(process.env.WEBHOOK_UPDATE_REPORT, {
      embeds: [
        {
          title: "Mewing server Information",
          description: descriptionText,
          color: 15548997,
          fields: [
            {
              name: "Version",
              value: getInformation.data.version.name,
              inline: true,
            },
            { name: "Gamemode", value: getInformation.data.gamemode, inline: true },
          ],
          footer: { text: `Last updated : ${moment().format("llll")}` },
        },
      ],
    });

    console.log("✅ success update server at", moment().format("HH:mm:ss"));
  } catch (err) {
    console.log(err)
    console.error("❌ Error getServer:", err.message);
  }
};
