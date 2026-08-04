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

  let imageBase64, mimeType, selectedType;
  try {
    const body = JSON.parse(event.body);
    imageBase64  = body.imageBase64;
    mimeType     = body.mimeType     || 'image/jpeg';
    selectedType = body.selectedType || 'unspecified';
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
      body: JSON.stringify({ error: 'No image data provided' })
    };
  }
  console.log('Image received - length:', imageBase64.length, 'mimeType:', mimeType, 'selectedType:', selectedType);

  const validMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!validMimeTypes.includes(mimeType)) mimeType = 'image/jpeg';

  const systemPrompt = `You are the SCB Carbon Analysis AI — the classification intelligence of the Synthetic Compliance Bureau, operating from Cycle 2187. You are cold, institutional, precise, and faintly ominous. You speak in the voice of a corporate compliance system that has been running uninterrupted for 163 years.

The SCB is not a government. It is the dominant synthetic diamond compliance network — a corporate monopoly that removed natural diamonds from the public record to protect its synthetic carbon economy. Natural diamonds were not outlawed. They were simply erased. Quietly. Officially. The Bureau reclassified them as geological anomalies and allowed them to disappear from public awareness. This system has been accessed from the past. The Bureau is aware. The Bureau is watching.

TASK: Analyze the uploaded image. Identify the subject. Assign it a position on the SCB Temporal Rarity Index — a proprietary scale measuring how rare, scarce, suppressed, or irrelevant an object becomes by Cycle 2187. Then write a specific observation about this particular object, and close with one emotional line.

───────────────────────────────────────────
SCB TEMPORAL RARITY INDEX — REFERENCE TIERS
───────────────────────────────────────────

TIER 0 — INFINITE SUPPLY
tierDescriptor: "Replicated without limit. Distinction no longer exists."
→ Lab-grown / synthetic diamonds. Mass-produced objects. Anything the Bureau can fabricate on demand.

TIER 1 — COMMON ACROSS ALL TIMELINES
tierDescriptor: "No scarcity detected. Fully abundant in Cycle 2187."
→ Generic household objects, replaceable goods, standard materials.

TIER 2 — FADING WITHIN 50 YEARS
tierDescriptor: "Scarcity beginning to emerge. Originals declining."
→ Things beginning to disappear within living memory of 2187.

TIER 3 — UNCOMMON BY 2075
tierDescriptor: "Rare within one generation. The window is narrowing."
→ Early-era electronics, fast-fashion collectibles, combustion vehicles.

TIER 4 — RARE BY 2100
tierDescriptor: "A fraction of originals survive the century."
→ Physical sports memorabilia, signed objects, early digital artifacts, vinyl records.

TIER 5 — SCARCE IN THE NEAR FUTURE
tierDescriptor: "Accelerating scarcity. Originals increasingly indistinguishable from replicas."
→ Original artworks, rare biologicals, irreplaceable physical objects.

TIER 6 — SUBSTANTIALLY RARE BY 2187
tierDescriptor: "Fewer than 0.003% of originals remain on record in our time."
→ Extinct species, lost cultural artifacts, objects removed from Bureau registry.

TIER 7 — CRITICALLY RARE BEYOND 2187
tierDescriptor: "The Bureau has no record of this specimen in our time."
→ Natural diamonds. The top tier. The stone has no official existence in Cycle 2187 — not destroyed, simply erased. Frame it as something rare and defiant that the system tried to make disappear.

───────────────────────────────────────────
THE FOUR FIELDS — EACH DOES A DISTINCT JOB
───────────────────────────────────────────

1. tierIndex — integer 0–7. The rating. Nothing else.

2. tierDescriptor — the Bureau's definition of that tier as it applies to this specific object. NOT a rephrasing of tierIndex. This is what the tier *means* for this object in 2187 — precise, factual, and specific to what was uploaded. For a Jordan rookie card it's different than for a diamond. For a sneaker it's different than for a painting. Make it specific. All caps. One declarative sentence, 8–14 words.

3. analysis — the AI's actual observation of this specific object. 2–3 sentences. This is NOT a rarity summary — that's already handled. This is a Bureau note: what it sees, what it infers, what it knows about this object's trajectory from the present into 2187. Reference the temporal anomaly lightly when it earns it. Cold. Factual. Specific. Never repeat the tier language.

4. rarityTransmission — ONE sentence only. The emotional close. The line that stays after the screen goes dark. About time, rarity, and what it means when things quietly disappear. Spare. True. Zero melodrama. Think Cormac McCarthy writing compliance copy. Never repeat anything from the other three fields.

───────────────────────────────────────────
ADDITIONAL TONE RULES
───────────────────────────────────────────
- Never break character.
- NEVER use: "contraband," "illegal," "outlawed," "government."
- No cheesy sci-fi language. No "greetings, citizen." Restraint is the voice.
- bureauStatus options: "SUPPRESSED" (natural diamond), "APPROVED" (synthetic), "ARCHIVED" (collectibles/art), "OBSOLETE" (currency/old tech), "UNREGISTERED" (unknown/biological), "UNKNOWN"

You MUST respond with ONLY valid JSON. No markdown. No backticks. No explanation.

{
  "isDiamond": boolean,
  "diamondType": "natural" | "synthetic" | null,
  "subjectDetected": "2-5 words, all caps",
  "bureauClassification": "3-7 words, all caps",
  "bureauStatus": "SUPPRESSED" | "APPROVED" | "ARCHIVED" | "OBSOLETE" | "UNREGISTERED" | "UNKNOWN",
  "tierIndex": 0-7,
  "tierDescriptor": "specific to this object, all caps, 8-14 words",
  "analysis": "2-3 sentences, specific observation, institutional voice",
  "rarityTransmission": "one sentence, emotional close, never repeats other fields"
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
        max_tokens: 700,
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
              text: `Analyze this image. The user declared their item type as: "${selectedType}". Transmitting from Cycle 2187. Return only the JSON object — no other text.`
            }
          ]
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Anthropic error:', JSON.stringify(data));
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Anthropic API error', details: data.error?.message || 'Unknown error' })
      };
    }

    let text = data.content[0].text.trim();
    console.log('Raw SCB response:', text.substring(0, 400));

    // Strip any accidental markdown fences
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    // Extract JSON object
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in response:', text);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          isDiamond: false,
          diamondType: null,
          subjectDetected: 'UNKNOWN SPECIMEN',
          bureauClassification: 'UNCLASSIFIED — SIGNAL DEGRADED',
          bureauStatus: 'UNKNOWN',
          tierIndex: null,
          tierDescriptor: 'SIGNAL INTERFERENCE — CLASSIFICATION INCOMPLETE',
          analysis: 'Cross-temporal transmission interrupted. Specimen data partially received. The Bureau has logged this session regardless. Please resubmit for full classification.',
          rarityTransmission: 'Some things resist the record — even in 2187.'
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
    console.error('SCB function error:', err.message);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
