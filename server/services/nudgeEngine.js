import Nudge from '../models/Nudge.js';

const SYSTEM_PROMPT = `You are CarbonLens, an expert carbon coach.
You will receive a user's daily carbon score breakdown as JSON.
Return ONLY valid JSON (no markdown) with this shape:
{
  "nudges": [
    {
      "content": "string, concise, actionable, friendly",
      "category": "commute|energy|food|shopping",
      "potentialSavingKg": number
    }
  ]
}
Rules:
- Generate 3 to 5 nudges.
- Each nudge must be specific to the breakdown.
- Avoid guilt; focus on small, realistic next steps.
- Keep each content <= 200 characters.
- potentialSavingKg should be plausible (0.1 to 3.0).
`;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function topCategory(breakdown) {
  const cats = [
    ['commute', Number(breakdown?.commuteCo2 || 0)],
    ['energy', Number(breakdown?.energyCo2 || 0)],
    ['food', Number(breakdown?.foodCo2 || 0)],
    ['shopping', Number(breakdown?.shoppingCo2 || 0)],
  ];
  cats.sort((a, b) => b[1] - a[1]);
  return { category: cats[0][0], value: cats[0][1] };
}

/**
 * Zero-cost heuristic nudges (no external API).
 * @param {{ breakdown: any }} params
 * @returns {{ nudges: Array<{ content: string, category: 'commute'|'energy'|'food'|'shopping', potentialSavingKg: number }> }}
 */
function generateHeuristicNudges(params) {
  const b = params.breakdown || {};
  const total = Number(b.totalCo2Kg || 0);
  const { category } = topCategory(b);

  const nudges = [];

  // General
  if (total >= 10) {
    nudges.push({
      category,
      content: 'Today is a high-emission day. Try one small swap in your biggest category to bring tomorrow under 10 kg.',
      potentialSavingKg: 1.2,
    });
  } else if (total >= 5) {
    nudges.push({
      category,
      content: 'You’re close to the green zone. One small change (10–15%) in your top category could drop you under 5 kg.',
      potentialSavingKg: 0.6,
    });
  } else {
    nudges.push({
      category,
      content: 'Great job staying in the green zone. Keep it consistent—repeat today’s low-carbon choices tomorrow.',
      potentialSavingKg: 0.2,
    });
  }

  // Category-specific
  nudges.push(
    ...[
      {
        category: 'commute',
        when: Number(b.commuteCo2 || 0) >= 2,
        content: 'Commute tip: try metro/bus for one leg this week or combine errands into a single trip.',
        potentialSavingKg: 0.8,
      },
      {
        category: 'energy',
        when: Number(b.energyCo2 || 0) >= 3,
        content: 'Energy tip: set AC to 26°C, use a fan first, and switch off standby loads for the evening.',
        potentialSavingKg: 0.7,
      },
      {
        category: 'food',
        when: Number(b.foodCo2 || 0) >= 2,
        content: 'Food tip: swap one non-veg meal for a veg meal tomorrow (dal/beans/curd) to cut CO₂ fast.',
        potentialSavingKg: 1.0,
      },
      {
        category: 'shopping',
        when: Number(b.shoppingCo2 || 0) >= 1,
        content: 'Shopping tip: delay non-urgent purchases 24 hours—often you’ll skip it, saving money and CO₂.',
        potentialSavingKg: 0.5,
      },
    ].filter((x) => x.when),
  );

  // Ensure 3-5 nudges
  const byCat = {
    commute: {
      category: 'commute',
      content: 'Commute tip: if you must drive, keep tires inflated and avoid idling—small habits add up.',
      potentialSavingKg: 0.3,
    },
    energy: {
      category: 'energy',
      content: 'Energy tip: run heavy appliances together off-peak and wash with cold water where possible.',
      potentialSavingKg: 0.4,
    },
    food: {
      category: 'food',
      content: 'Food tip: plan tomorrow’s meal to reduce food waste—waste is hidden CO₂.',
      potentialSavingKg: 0.3,
    },
    shopping: {
      category: 'shopping',
      content: 'Shopping tip: choose durable items or repair once before replacing; it reduces embodied emissions.',
      potentialSavingKg: 0.4,
    },
  };

  while (nudges.length < 3) nudges.push(byCat[category]);
  return { nudges: nudges.slice(0, 5).map((n) => ({ ...n, potentialSavingKg: round1(n.potentialSavingKg) })) };
}

/**
 * Generate AI nudges for a score and save them.
 * @param {{ userId: string, scoreId: string, region: string, breakdown: any }} params
 * @returns {Promise<import('../models/Nudge.js').default[]>}
 */
export async function generateAndSaveNudges(params) {
  const apiKey = process.env.OPENAI_API_KEY;
  const useHeuristicOnly = !apiKey || process.env.NUDGE_ENGINE === 'heuristic';

  const userMessage = JSON.stringify(
    {
      region: params.region,
      scoreId: params.scoreId,
      breakdown: params.breakdown,
    },
    null,
    2,
  );

  let parsed;
  if (useHeuristicOnly) {
    parsed = generateHeuristicNudges({ breakdown: params.breakdown });
  } else {
    try {
      const { default: OpenAI } = await import('openai');
      const client = new OpenAI({ apiKey });
      const resp = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        temperature: 0.6,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        response_format: { type: 'json_object' },
      });

      const content = resp.choices?.[0]?.message?.content || '';
      parsed = JSON.parse(content);
    } catch (_e) {
      // Zero-cost fallback if OpenAI errors or returns unexpected output
      parsed = generateHeuristicNudges({ breakdown: params.breakdown });
    }
  }

  const nudges = Array.isArray(parsed?.nudges) ? parsed.nudges : [];
  const docs = [];
  for (const n of nudges.slice(0, 5)) {
    if (!n?.content || !n?.category) continue;
    docs.push({
      userId: params.userId,
      scoreId: params.scoreId,
      content: String(n.content).slice(0, 2000),
      category: n.category,
      potentialSavingKg: clamp(Number(n.potentialSavingKg || 0.2), 0.1, 3.0),
      isRead: false,
      isActedOn: false,
      generatedAt: new Date(),
    });
  }

  if (docs.length === 0) return [];
  const saved = await Nudge.insertMany(docs, { ordered: false });
  return saved;
}

