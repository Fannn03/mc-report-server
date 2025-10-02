import axios from "axios";
import moment from "moment";
import { CronJob } from 'cron';
import { createClient } from "bedrock-protocol";
import 'dotenv/config';

moment().locale('id')

console.log(process.env.SERVER_HOST)

const client = createClient({
  host: process.env.SERVER_HOST,   // optional
  port: parseInt(process.env.SERVER_PORT),         // optional, default 19132
  username: 'WonderNickel222',   // the username you want to join as, optional if online mode
})

let playerList = []


function bytesToSize(bytes) {
  const sizes = ["Bytes", "KiB", "MiB", "GiB", "TiB"];
  if (bytes === 0) return "0 Byte";
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10);
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

const getServer = async () => {
  try {
  const getInformation = await axios.get(`https://api.mcstatus.io/v2/status/bedrock/${process.env.SERVER_HOST}:${process.env.SERVER_PORT}`)

  const getServerDetail = await axios.get(`https://panel.alstore.space/api/client/servers/${process.env.SERVER_ID}/resources`, {
    headers: {
      Authorization: `Bearer ${process.env.SERVER_AUTH}`
    }
  })

  const resources = getServerDetail.data.attributes.resources;
  const memory = bytesToSize(resources.memory_bytes);
  const disk = bytesToSize(resources.disk_bytes);
  const netRx = bytesToSize(resources.network_rx_bytes);
  const netTx = bytesToSize(resources.network_tx_bytes);
  const cpu = `${resources.cpu_absolute.toFixed(2)}%`;

const descriptionText = `
Hostname : ${getInformation.data.host}
Port     : ${getInformation.data.port}

===== Server Stats =====
CPU Load : \`${cpu}\` / 200 %
Memory   : \`${memory}\` / 2.00 GiB
Storage  : \`${disk}\` / 6 GiB
Network  : ↓ ${netRx} ↑ ${netTx}
======================

Online players : ${(playerList.length === 0) ? '0' : playerList.length - 1}/${getInformation.data.players.max}

${
  playerList.length > 0 
    ? playerList
      .filter((v, i, self) => 
          i === self.findIndex(p => p.username === v.username)
      )
      .map((v, i) => {
        const durasi = moment.duration(moment().diff(v.joinedAt)).humanize();
        if (v.username == 'WonderNickel222') v.username = `${v.username} [Bot]`
        return `[${i+1}] ${v.username} - ${durasi}\n`;
      }).join("")
    : "None"
}

======================
`;


  await axios.patch(process.env.WEBHOOK_UPDATE_REPORT, {
    embeds: [
      {
        title: 'Mewing server Information',
        description:descriptionText,
        color: 15548997,
        fields: [
          { name: 'Version', value: getInformation.data.version.name, inline: true },
          { name: 'Gamemode', value: getInformation.data.gamemode, inline: true }
        ],
        footer: { text: `Last updated : ${moment().format('llll')}` }
      }
    ]
  })

  console.log('success update server at ', moment().format('HH:mm:ss'))
  } catch (err) {
    console.log(err)
  }
}


// MESSAGE LOG
client.on('text', async (v) => {
  if (v.type == 'translation') {
    console.log(v)
    let typeconnection;
    let getPlayerName = v.parameters[0];

    if (v.message === '§e%multiplayer.player.joined') typeconnection = 'joined';
    if (v.message === '§e%multiplayer.player.left') typeconnection = 'left';

    if(typeconnection) await axios.post(process.env.WEBHOOK_SERVER_LOG, {
      content: `[Connection] ${getPlayerName} ${typeconnection} the game.`
    })
  }
  if(v.type == 'chat') {
    await axios.post(process.env.WEBHOOK_SERVER_LOG, {
      content: `[Message] ${v.source_name} says : ${v.message}.`
    })
  }
})

client.on("player_list", (packet) => {
  if (packet.records.type === "add") {
    for (let player of packet.records.records) {
      if (!playerList.includes(player.username)) {
        playerList.push({
          uuid: player.uuid,
          username: player.username,
          joinedAt: moment()
        });
      }
    }
  }

  if (packet.records.type === "remove") {
    for (let player of packet.records.records) {
      playerList = playerList.filter(v => v.uuid !== player.uuid)
    }
  }
});


try {
  new CronJob ('*/30 * * * * *', getServer, null, true, 'Asia/Jakarta')
  console.log('Job Started')
} catch (err){
  console.log(err)
}