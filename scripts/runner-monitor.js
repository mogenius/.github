// GitHub Runner Monitor
// Überwacht Self-Hosted Runners und sendet Alerts bei Offline-Status

// Umgebungsvariablen aus GitHub Action oder direkt gesetzt
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || 'dein_github_token_hier';
const ORG_NAME = process.env.ORG_NAME || 'mogenius';
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'deine_webhook_url_hier';

async function checkRunners() {
  try {
    const response = await fetch(
      `https://api.github.com/orgs/${ORG_NAME}/actions/runners`,
      {
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'X-GitHub-Api-Version': '2022-11-28'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API Error: ${response.status}`);
    }

    const data = await response.json();
    const runners = data.runners;
    
    const totalRunners = runners.length;
    const offlineRunners = runners.filter(r => r.status === 'offline');
    const offlineCount = offlineRunners.length;
    
    console.log(`Total Runners: ${totalRunners}`);
    console.log(`Online: ${totalRunners - offlineCount}`);
    console.log(`Offline: ${offlineCount}`);
    
    if (offlineCount > 0) {
      // Alert Message erstellen
      const alertMessage = `⚠️ **GitHub Runner Alert**\n\n${offlineCount} von ${totalRunners} Runner offline!\n\nOffline Runner:\n${offlineRunners.map(r => `• ${r.name} (${r.os})`).join('\n')}`;
      
      console.log('\n🚨 ALERT:', alertMessage);
      
      // Alert senden (z.B. an Webhook)
      await sendAlert(alertMessage, offlineCount, totalRunners, offlineRunners);
    } else {
      console.log('✅ Alle Runner sind online');
    }
    
  } catch (error) {
    console.error('Fehler beim Abrufen der Runner:', error.message);
  }
}

async function sendAlert(message, offlineCount, totalCount, offlineRunners) {
  // Slack Webhook mit erweiterten Features
  const slackPayload = {
    text: `🚨 GitHub Runner Alert: ${offlineCount} von ${totalCount} Runner offline`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "🚨 GitHub Runner Alert",
          emoji: true
        }
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Status:*\n${offlineCount} von ${totalCount} offline`
          },
          {
            type: "mrkdwn",
            text: `*Organisation:*\n${ORG_NAME}`
          }
        ]
      },
      {
        type: "divider"
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Offline Runner:*\n${offlineRunners.map(r => `• \`${r.name}\` - ${r.os} - Status: \`${r.status}\``).join('\n')}`
        }
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `🕐 ${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })} | <https://github.com/organizations/${ORG_NAME}/settings/actions/runners|Runner Settings>`
          }
        ]
      }
    ]
  };
  
  // Alternativ: Discord Webhook
  const discordPayload = {
    content: `⚠️ **GitHub Runner Alert**`,
    embeds: [{
      title: "Runner Status",
      description: `**${offlineCount} von ${totalCount} Runner offline**`,
      color: 15158332, // Rot
      fields: offlineRunners.map(r => ({
        name: r.name,
        value: `Status: ${r.status}\nOS: ${r.os}`,
        inline: true
      })),
      timestamp: new Date().toISOString()
    }]
  };
  
  // Alternativ: Microsoft Teams Webhook
  const teamsPayload = {
    "@type": "MessageCard",
    "@context": "https://schema.org/extensions",
    "themeColor": "FF0000",
    "title": "🚨 GitHub Runner Alert",
    "text": `${offlineCount} von ${totalCount} Runner offline`,
    "sections": [{
      "activityTitle": "Offline Runner",
      "facts": offlineRunners.map(r => ({
        name: r.name,
        value: `${r.status} (${r.os})`
      }))
    }]
  };
  
  // Webhook aufrufen (hier beispielhaft für Slack)
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(slackPayload) // oder discordPayload / teamsPayload
    });
    
    if (response.ok) {
      console.log('✅ Alert erfolgreich gesendet');
    } else {
      console.error('❌ Fehler beim Senden des Alerts:', response.status);
    }
  } catch (error) {
    console.error('❌ Fehler beim Senden des Alerts:', error.message);
  }
}

// Runner-Check ausführen
checkRunners();

// Optional: Regelmäßig prüfen (z.B. alle 5 Minuten)
// setInterval(checkRunners, 5 * 60 * 1000);