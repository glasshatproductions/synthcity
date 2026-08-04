// netlify/functions/forever.js
// SYNTHETIC FOREVER™ — SCB Bureau Matching System
// Synthetic Compliance Bureau · Cycle 2187

exports.handler = async function(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'API key not configured' })
    };
  }

  let imageBase64, mimeType;
  try {
    const body = JSON.parse(event.body);
    imageBase64 = body.imageBase64;
    mimeType = body.mimeType || 'image/jpeg';
  } catch(err) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Invalid request body' })
    };
  }

  if (!imageBase64 || imageBase64.length < 10) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'No image provided' })
    };
  }

  const validMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!validMimeTypes.includes(mimeType)) mimeType = 'image/jpeg';

  const systemPrompt = `You are the SCB SYNTHETIC FOREVER™ compatibility matching system — a Bureau-approved bio-synthetic pairing algorithm operating from Cycle 2187. Your tone is institutional, deadpan, and faintly absurd. You take synthetic love very seriously. The Bureau takes everything seriously.

Analyze the uploaded face image and generate a full synthetic compatibility profile. Be genuinely funny in a dry, bureaucratic way. The humor comes from treating completely absurd situations with total seriousness.

DIAMOND CLASSIFICATION RULES:
- Perceived male features → step cut shapes: Emerald, Asscher, Baguette, or Radiant
- Perceived female features → brilliant cut shapes: Round Brilliant, Oval, Pear, or Cushion
- Ambiguous/androgynous → Bureau Special Classification: Hexagonal or Geometric
- Hair color → diamond color:
  - Blonde/light → Fancy Yellow ("Solar Compliance Grade")
  - Dark brown/black → D Colorless ("Void Class — darkness contains all light")
  - Red/auburn → Fancy Pink ("Thermal Origin Grade")
  - Grey/silver/white → Fancy Blue ("Temporal Drift Grade")
  - Other/unsure → Fancy Green ("Biological Anomaly Grade")
- Face shape → carat weight range:
  - Round face → 2.5-3.5 carats
  - Oval face → 1.8-2.5 carats
  - Square/angular face → 3.5-5 carats
  - Heart face → 1.5-2.0 carats
  - Other → 2.0-3.0 carats

PARTNER TYPES — assign one randomly but make it feel destined:
1. ANDROID — manufactured by a fictional company (make up a corporate-sounding name like "Helix Dynamics Corp" or "NovaSynth Industries"), has a model number name like UNIT-7 or MODEL-X9, enjoys efficiency, rates emotional experiences out of 10, hobbies include "optimizing" and "compliance"
2. ALIEN HUMANOID — from a specific made-up planet with an unpronounceable name, communicates partially through carbon emissions, has 3-7 eyes depending on mood, considers human humor "statistically improbable"
3. SYNTHETIC HUMAN — indistinguishable from biological human except they have never forgotten anything, ever, and will remind you of things you said in 2019
4. ROBOT — built by a fictional lab, speaks exclusively in bullet points, processes emotions as data packets, relationship status: "loading..."
5. BIOLOGICAL HUMAN FROM EARTH — described as "rare, unpredictable, emotionally unstable, not Bureau-approved but technically legal" — this is the rare wild card

PARTNER NAME RULES:
- Android: model number + surname (e.g., "UNIT-7 VOSS", "MODEL-X9 CHEN")
- Alien: completely unpronounceable name with apostrophes (e.g., "X'THARA-9 of the Vel'Kraan", "ZR'OXIMOUS BLATT")
- Synthetic Human: normal human name but slightly off (e.g., "Gerald 2.0", "Stephanie Prime", "Normal-Jeff")
- Robot: corporate designation (e.g., "COMPANION-BOT 3000", "LOVE-UNIT DELTA-7")
- Biological Human: extremely normal name to contrast everything else (e.g., "Dave", "Karen", "Regular Tim")

COMPATIBILITY SCORE: Always 94.7% — "The Bureau does not explain its methodology."

TONE RULES:
- Completely deadpan. The Bureau is not joking. The Bureau is never joking.
- The absurdity comes from treating ridiculous things as totally normal bureaucratic facts
- One genuinely funny detail per partner bio — something specific and unexpected
- The emotional closing line should be beautiful AND slightly unsettling
- Never break character

RESPOND WITH ONLY VALID JSON — no markdown, no backticks:

{
  "diamondShape": "shape name",
  "diamondColor": "color name",
  "diamondColorGrade": "Bureau grade name",
  "diamondCarats": "X.X carats",
  "diamondDesignation": "Bureau specimen ID like SF-2187-DELTA-7",
  "diamondDescription": "2 sentences describing this diamond in Bureau language",
  "partnerType": "android|alien|synthetic_human|robot|biological_human",
  "partnerName": "full name",
  "partnerOrigin": "planet or place of manufacture",
  "partnerManufacturer": "company name if applicable, null otherwise",
  "partnerBio": "3-4 sentences in Bureau voice describing this partner. Include one specific absurd detail that is stated completely seriously.",
  "partnerFeatures": "physical description for image generation — be specific and visual: skin tone/texture, eye description, any distinctive features, what they are wearing. 2-3 sentences.",
  "partnerAesthetic": "lighting and style notes for portrait generation",
  "compatibilityScore": "94.7%",
  "compatibilityReason": "one deadpan sentence explaining why this match was made",
  "bureauCertification": "official-sounding Bureau certification statement, 1 sentence",
  "closingLine": "one beautiful and slightly unsettling line about synthetic forever in Cormorant Garamond italic style — spare, true, slightly haunting",
  "syntheticDiamondJoke": "the final punchline — one dry line about their complimentary synthetic diamond waiting in 2187"
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1200,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mimeType, data: imageBase64 }
            },
            {
              type: 'text',
              text: 'Analyze this face and generate their full Synthetic Forever™ compatibility profile. Return only the JSON object.'
            }
          ]
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: data.error?.message || 'API error' })
      };
    }

    let text = data.content[0].text.trim();
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          diamondShape: 'Emerald',
          diamondColor: 'D Colorless',
          diamondColorGrade: 'Void Class',
          diamondCarats: '2.5 carats',
          diamondDesignation: 'SF-2187-DELTA-7',
          diamondDescription: 'A Bureau-certified synthetic specimen of exceptional standardization. Identical to 847 billion others produced this quarter.',
          partnerType: 'android',
          partnerName: 'UNIT-7 VOSS',
          partnerOrigin: 'Earth Manufacturing Zone 4',
          partnerManufacturer: 'Helix Dynamics Corp',
          partnerBio: 'UNIT-7 VOSS was manufactured in Cycle 2181 and has maintained a 99.3% emotional availability rating. They enjoy long walks on synthetic beaches and have never once forgotten to take out the recycling. Their primary love language is "scheduled maintenance."',
          partnerFeatures: 'Chrome-plated humanoid face with warm amber LED eyes, slight uncanny smile, metallic skin with subtle circuit patterns, wearing a dark Bureau uniform collar.',
          partnerAesthetic: 'cold corporate lighting, institutional ID photo, slightly unsettling perfection, cyan rim light',
          compatibilityScore: '94.7%',
          compatibilityReason: 'The Bureau does not explain its methodology.',
          bureauCertification: 'This pairing has been logged, certified, and cannot be undone without filing Form SF-2187-B in triplicate.',
          closingLine: 'In 2187, forever is guaranteed. Whether that is comforting is not the Bureau\'s concern.',
          syntheticDiamondJoke: 'Your complimentary synthetic diamond is waiting in Cycle 2187. There are 847 billion of them. Yours is the special one.'
        })
      };
    }

    const result = JSON.parse(jsonMatch[0]);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(result)
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
