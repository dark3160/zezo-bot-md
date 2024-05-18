const isToxic =
  /(كس|كسمك|طيز|زب|نيك|متناك|خول|شرموطه|لبوه)/i;

import axios from 'axios';

export async function before(m, { isAdmin, isBotAdmin }) {
  if (m.isBaileys && m.fromMe) return true;
  if (!m.isGroup) return false;

  let chat = global.db.data.chats[m.chat];
  let bot = global.db.data.settings[this.user.jid] || {};
  const isAntiToxic = isToxic.exec(m.text);
  let removeParticipant = m.key.participant;
  let messageId = m.key.id;

  if (chat.antiToxic && isAntiToxic) {
    var analysisResult = await Analyze(m.text);
    var toxicityLevels = [
      '❤️  ❤️  ❤️  ❤️  ❤️', // Very friendly and welcoming
      '☠️  ❤️  ❤️  ❤️  ❤️', // Mildly toxic, is it fun?
      '☠️  ☠️  ❤️  ❤️  ❤️', // A bit toxic, calm down!
      '☠️  ☠️  ☠️  ❤️  ❤️', // Quite toxic, you can relax!
      '☠️  ☠️  ☠️  ☠️  ❤️', // Highly toxic, be careful!
      '☠️  ☠️  ☠️  ☠️  ☠️', // Extremely toxic!
    ];
    var toxicityVerdict = [
      'You are so friendly. Very welcoming to know you!',
      'You are not too toxic, is it fun?',
      'You appear to be toxic. Calm down!',
      "Don't be so toxic. You can relax!",
      "There's nothing more I could say, you're totally the most toxic person in the world!",
      'Your toxic meter also goes above 100%.',
    ];

    const toxicityPercentage = Number(analysisResult.toxicity * 100).toFixed(2);
    let toxicityIndex;
    if (toxicityPercentage < 15) {
      toxicityIndex = 0;
    } else if (toxicityPercentage >= 15 && toxicityPercentage < 35) {
      toxicityIndex = 1;
    } else if (toxicityPercentage >= 35 && toxicityPercentage < 51) {
      toxicityIndex = 2;
    } else if (toxicityPercentage >= 51 && toxicityPercentage < 76) {
      toxicityIndex = 3;
    } else if (toxicityPercentage >= 76 && toxicityPercentage < 95) {
      toxicityIndex = 4;
    } else {
      toxicityIndex = 5;
    }

    var caption = `*[ TOXIC STRENGTH ]*\n\n${toxicityLevels[toxicityIndex]}\n${toxicityVerdict[toxicityIndex]}\n`;

    await this.sendMessage(m.chat, {
      text: `*Bad Words Detected!*\n ${caption}`,
      mentions: [m.sender]
    });

    if (isBotAdmin) {
      // Remove the participant from the group
      global.db.data.users[m.sender].warn += 1;
      return this.sendMessage(m.chat, {
        delete: { remoteJid: m.chat, fromMe: false, id: messageId, participant: removeParticipant },
      });
    }
  }
  return true;
}

async function Analyze(text) {
  try {
    const result = await axios.post(
      'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=AIzaSyDh6d2S3S4zOuZSgyySRcnj8uZMNJ6kdFQ',
      {
        comment: {
          text: text,
          type: 'PLAIN_TEXT',
        },
        languages: ['en'],
        requestedAttributes: { SEVERE_TOXICITY: {}, INSULT: {} },
      }
    );
    return {
      toxicity: result.data.attributeScores.SEVERE_TOXICITY.summaryScore.value,
      insult: result.data.attributeScores.INSULT.summaryScore.value,
      combined:
        (result.data.attributeScores.SEVERE_TOXICITY.summaryScore.value +
          result.data.attributeScores.INSULT.summaryScore.value) /
        2,
    };
  } catch (error) {
    console.error(error);
    return { toxicity: NaN, insult: NaN, combined: NaN };
  }
}
