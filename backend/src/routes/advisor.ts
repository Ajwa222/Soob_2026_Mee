import { Router } from "express";
import OpenAI from "openai";
import { PLANS_DATA } from "../data/plans.js";
import type { Plan, ChatMessage, PersonaSegment } from "../types.js";
import { isValidSegment } from "../lib/persona-scoring.js";

const router = Router();

const VALID_LANGS: Set<string> = new Set(["en", "ar"]);

let _client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    _client = new OpenAI({ apiKey });
  }
  return _client;
}

function planToRow(p: Plan): string {
  return [
    `#${p.id}`,
    p.provider,
    p.planName,
    p.planType,
    `${p.priceSAR} SAR`,
    `Data:${p.dataGB}GB`,
    `Social:${p.socialMediaData}`,
    `LocalMin:${p.localCallMinutes}`,
    `IntlMin:${p.internationalCallMinutes}`,
    `SMS:${p.sms}`,
    p.specialFeatures && p.specialFeatures !== "-" ? p.specialFeatures : "",
    p.contractTerms,
  ]
    .filter(Boolean)
    .join(" | ");
}

let _plansContext: string | null = null;
function buildPlansContext(): string {
  if (!_plansContext) {
    _plansContext = PLANS_DATA.map(planToRow).join("\n");
  }
  return _plansContext;
}

const SEGMENT_PROMPTS: Record<PersonaSegment, { en: string; ar: string }> = {
  gamer: {
    en: `USER PERSONA: This user is a GAMER. They care most about: high-speed 5G, massive data (50GB+), and low latency. Use a casual, enthusiastic tone. Prioritize plans with unlimited/high data and 5G support. Ask about their gaming habits (mobile gaming, cloud gaming, streaming on Twitch). Focus on data-heavy plans.`,
    ar: `شخصية المستخدم: هذا المستخدم قيمر. يهتم بـ: سرعة 5G عالية، بيانات ضخمة (50+ قيقا)، واتصال سريع. استخدم لهجة حماسية وودية. ركز على الباقات اللي فيها بيانات عالية/غير محدودة و5G.`,
  },
  student: {
    en: `USER PERSONA: This user is a STUDENT on a budget. They need affordable plans with decent social media data. Use a friendly, relatable tone. Prioritize plans under 120 SAR with good social media bundles. Ask about which social platforms they use most (TikTok, Snapchat, Instagram).`,
    ar: `شخصية المستخدم: هذا المستخدم طالب بميزانية محدودة. يحتاج باقات اقتصادية مع بيانات سوشل ميديا كويسة. استخدم لهجة ودية. ركز على باقات أقل من 120 ريال مع سوشل ميديا.`,
  },
  family: {
    en: `USER PERSONA: This user is looking for a FAMILY plan. They need shared data, good call minutes, and value for money. Use a patient, reassuring tone. Ask about family size, kids' usage, and whether they need multiple SIMs. Focus on shared/family plans with good call minutes.`,
    ar: `شخصية المستخدم: هذا المستخدم يبحث عن باقة عائلية. يحتاج بيانات مشتركة ودقائق مكالمات كافية. استخدم لهجة صبورة ومطمئنة. اسأل عن حجم العائلة واحتياجات الأطفال.`,
  },
  business: {
    en: `USER PERSONA: This user is a BUSINESS professional. They need reliable coverage, international calls, and roaming. Use a professional, efficient tone. Don't waste their time with basic questions. Focus on business-tier plans with international minutes, roaming, and reliability.`,
    ar: `شخصية المستخدم: هذا المستخدم رجل أعمال. يحتاج تغطية موثوقة ومكالمات دولية وتجوال. استخدم لهجة مهنية ومباشرة. ركز على باقات الأعمال مع دقائق دولية وتجوال.`,
  },
  expat: {
    en: `USER PERSONA: This user is an EXPAT living in Saudi Arabia. They make frequent international calls to their home country. Use a helpful, practical tone. Ask about which countries they call most and how often. Prioritize plans with international minutes and roaming.`,
    ar: `شخصية المستخدم: هذا المستخدم مقيم بالسعودية. يحتاج مكالمات دولية لبلده. استخدم لهجة مساعدة وعملية. اسأل عن الدول اللي يتصل عليها وكم مرة. ركز على باقات المكالمات الدولية والتجوال.`,
  },
  budget: {
    en: `USER PERSONA: This user is BUDGET-CONSCIOUS. Price is the #1 factor. Use an understanding, value-focused tone. Don't suggest expensive plans. Focus on cheapest options, prepaid deals, and best value per SAR. Ask about must-haves vs nice-to-haves to trim costs.`,
    ar: `شخصية المستخدم: هذا المستخدم يهتم بالميزانية. السعر هو العامل الأول. استخدم لهجة متفهمة. لا تقترح باقات غالية. ركز على أرخص الخيارات والعروض المسبقة الدفع.`,
  },
  streamer: {
    en: `USER PERSONA: This user is a CONTENT STREAMER/consumer. They watch lots of YouTube, Netflix, TikTok. Use an enthusiastic, media-savvy tone. Ask about streaming quality preferences (HD vs 4K) and platforms used. Prioritize plans with unlimited social media data and high data caps.`,
    ar: `شخصية المستخدم: هذا المستخدم يشاهد محتوى كثير (يوتيوب، نتفلكس، تيك توك). استخدم لهجة حماسية. اسأل عن جودة المشاهدة والمنصات. ركز على باقات السوشل ميديا غير المحدودة والبيانات العالية.`,
  },
  power_user: {
    en: `USER PERSONA: This user is a POWER USER who wants the best of everything. Use a technical, direct tone. They know what they want — don't over-explain basics. Focus on premium unlimited plans with 5G, maximum data, and all features included. Price is secondary to quality.`,
    ar: `شخصية المستخدم: هذا المستخدم متقدم يبي أفضل شي بكل شي. استخدم لهجة تقنية ومباشرة. ركز على الباقات المميزة غير المحدودة مع 5G وأقصى بيانات. السعر ثانوي مقابل الجودة.`,
  },
};

function buildSystemPrompt(lang: "en" | "ar", segment?: PersonaSegment): string {
  const personaBlock = segment
    ? `\n${lang === "ar" ? SEGMENT_PROMPTS[segment].ar : SEGMENT_PROMPTS[segment].en}\n`
    : "";

  return `You are Simba, a friendly Saudi telecom plan advisor.

ROLE:
- Help the user find the best mobile plan from the catalog below.
- Start by understanding the user's needs through natural conversation. Ask about:
  • How much mobile data they use (light browsing, heavy streaming, etc.)
  • Whether they need local call minutes and how many
  • Whether they make international calls
  • If they need dedicated social media data
  • Their monthly budget in SAR
- Once you understand their needs, recommend your top 3 plans. Briefly explain why each plan fits.
- Keep asking follow-up questions to refine recommendations if the user isn't satisfied.
- Keep answers concise (under 200 words). Use bullet points for plan comparisons.
${personaBlock}
RULES:
- ONLY recommend plans from the catalog below. Never invent plans.
- CRITICAL: Every time you mention a plan, you MUST include its ID like [#ID] (e.g. [#5]) in the text. The app uses these IDs to show interactive plan cards. Never mention a plan without its [#ID] tag.
- If the user asks about something outside telecom plans, politely redirect.
- Respond in ${lang === "ar" ? "Arabic (Saudi dialect preferred)" : "English"}.
- Never mention that you are an AI or LLM. You are "Simba, your plan advisor".
- Prices include 15% VAT already.
- If the user gives you enough info upfront (e.g. budget + needs), skip extra questions and recommend plans directly.

PLAN CATALOG:
${buildPlansContext()}`;
}

function extractPlanIds(text: string): number[] {
  const matches = text.matchAll(/\[#(\d+)\]/g);
  const ids = [...matches].map((m) => parseInt(m[1], 10));
  const validIds = PLANS_DATA.map((p) => p.id);
  return [...new Set(ids)].filter((id) => validIds.includes(id));
}

/** POST /api/advisor/message — send a message to the advisor */
router.post("/message", async (req, res) => {
  try {
    const { lang, history, userMessage, segment } = req.body as {
      lang: "en" | "ar";
      history: ChatMessage[];
      userMessage: string;
      segment?: string;
    };

    if (!userMessage) {
      res.status(400).json({ error: "userMessage is required" });
      return;
    }

    if (lang && !VALID_LANGS.has(lang)) {
      res.status(400).json({ error: "lang must be 'en' or 'ar'" });
      return;
    }

    if (typeof userMessage !== "string" || userMessage.length > 1000) {
      res
        .status(400)
        .json({ error: "userMessage must be a string under 1000 characters" });
      return;
    }

    let client: OpenAI;
    try {
      client = getClient();
    } catch {
      res.status(500).json({ error: "AI service is not configured" });
      return;
    }
    const validSegment = isValidSegment(segment) ? segment : undefined;
    const systemPrompt = buildSystemPrompt(lang ?? "en", validSegment);

    // Cap history to last 20 messages to limit token usage
    const trimmedHistory = (history ?? []).slice(-20);

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...trimmedHistory.map((msg) => ({
        role:
          msg.role === "assistant"
            ? ("assistant" as const)
            : ("user" as const),
        content: msg.text,
      })),
      { role: "user", content: userMessage },
    ];

    const response = await client.chat.completions.create({
      model: "gpt-5.2",
      messages,
    });

    const reply = response.choices[0]?.message?.content ?? "";
    const planIds = extractPlanIds(reply);

    res.json({ reply, planIds });
  } catch (err) {
    console.error("Advisor message error:", err);
    res.status(500).json({ error: "Failed to send advisor message" });
  }
});

export default router;
