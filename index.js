const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');
const fs = require('fs');

// Charger la configuration
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

// Création du client Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Fonction pour résoudre les redirections d'URL
async function resolveUrl(url, maxRedirects = 5) {
  try {
    let currentUrl = url;
    let redirects = 0;

    while (redirects < maxRedirects) {
      const response = await axios.get(currentUrl, {
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 400 || status === 302,
      });

      if (response.status === 302 && response.headers.location) {
        currentUrl = response.headers.location;
        redirects++;
      } else {
        break;
      }
    }

    return currentUrl;
  } catch (error) {
    console.error(`Erreur lors de la résolution de l'URL : ${error.message}`);
    return url;
  }
}

// Fonction pour vérifier l'adhésion au serveur
async function ensureBotInServer() {
  const server = client.guilds.cache.get(config.serverId);

  if (!server) {
    console.log("Le bot n'est pas dans le serveur. Tentative de rejoindre...");
    try {
      await client.fetchInvite(config.inviteLink);
      console.log("Le bot a rejoint le serveur avec succès !");
    } catch (error) {
      console.error("Échec pour rejoindre le serveur :", error.message);
    }
  } else {
    console.log("Le bot est déjà dans le serveur.");
  }
}

// Event : le bot est prêt
client.once('ready', async () => {
  console.log(`Bot connecté en tant que ${client.user.tag}`);
  await ensureBotInServer();
});

// Event : nouveau message
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Regex pour détecter les liens
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = message.content.match(urlRegex);

  if (urls) {
    for (const url of urls) {
      const resolvedUrl = await resolveUrl(url);

      // Vérifie si l'URL résolue contient un domaine bloqué
      if (config.blockedDomains.some((domain) => resolvedUrl.includes(domain))) {
        await message.delete(); // Supprime le message
        await message.author.send(`⚠️ les liens vers les sites nazis sont interdits ici.`);
        
        break;
      }
    }
  }
});

// Démarrage du bot
client.login(config.botToken);
