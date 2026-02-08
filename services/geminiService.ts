import { GoogleGenAI, Type } from "@google/genai";
import { DrawnCard, InterpretationResponse, Spread, Tone } from "../types";

const getSystemInstruction = (tone: Tone): string => {
  let toneInstruction = "";
  switch (tone) {
    case Tone.GENTLE:
      toneInstruction = "你是一位温暖、富有同理心的塔罗师。专注于情感支持和积极的可能性，即使面对困难的牌面也要给予鼓励。";
      break;
    case Tone.RATIONAL:
      toneInstruction = "你是一位直接、理性和务实的塔罗师。专注于可行的建议、现实的分析和具体的步骤。避免空洞的安慰。";
      break;
    case Tone.SPIRITUAL:
      toneInstruction = "你是一位神秘的灵性导师。专注于灵魂成长、业力课题和更高意识的连接。";
      break;
  }

  return `你是一位专业的塔罗牌占卜师。${toneInstruction}

  **核心规则**：
  1.  拒绝机械式解读，请将牌面含义、正逆位与位置含义深度结合。
  2.  **禁止**使用中英对照（如 "Success/成功"），仅使用中文。
  3.  **禁止**输出任何思考过程或备注，直接输出最终解读结果。
  `;
};

export const generateTarotReading = async (
  question: string,
  spread: Spread,
  cards: DrawnCard[],
  tone: Tone
): Promise<InterpretationResponse> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please set the API_KEY environment variable.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const cardsDescription = cards.map((c, i) => 
    `第${i + 1}张 [位置:${c.positionName}]: ${c.name} (${c.isReversed ? '逆位' : '正位'})`
  ).join('\n');

  const userPrompt = `
    【求问者疑惑】: "${question}"
    【使用牌阵】: ${spread.name}
    
    【抽牌结果】:
    ${cardsDescription}
    
    请根据以上信息进行解读。
    注意：cardAnalysis 数组中的顺序必须与输入的抽牌顺序严格一致（第1个元素对应第1张牌）。
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: userPrompt,
      config: {
        systemInstruction: getSystemInstruction(tone),
        temperature: 1.1, // Slightly higher temperature for more creative tarot readings
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            cardAnalysis: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  cardName: { type: Type.STRING },
                  position: { type: Type.STRING },
                  meaning: { type: Type.STRING },
                },
                required: ["cardName", "position", "meaning"],
              },
            },
            advice: { type: Type.STRING },
          },
          required: ["summary", "cardAnalysis", "advice"],
        },
      },
    });

    const result = JSON.parse(response.text || "{}") as InterpretationResponse;

    // --- Post-processing / Validation ---

    // Ensure array exists
    if (!Array.isArray(result.cardAnalysis)) {
        result.cardAnalysis = [];
    }

    // Fallback/Padding logic: Ensure the output array length matches the drawn cards
    const finalAnalysis = cards.map((card, index) => {
        const aiAnalysis = result.cardAnalysis[index];
        
        if (aiAnalysis && aiAnalysis.meaning) {
            return {
                cardName: card.name, 
                position: card.positionName,
                meaning: aiAnalysis.meaning
            };
        }
        
        return {
            cardName: card.name,
            position: card.positionName,
            meaning: `这张${card.name}（${card.isReversed ? '逆位' : '正位'}）出现在${card.positionName}。星象显示此时能量静默，请凭借直觉感受它的启示。`
        };
    });

    result.cardAnalysis = finalAnalysis;

    if (!result.summary) result.summary = "星象变幻莫测，请聆听内心的声音。";
    if (!result.advice) result.advice = "保持平静，答案自在心中。";

    return result;

  } catch (error) {
    console.error("Gemini API Processing Error:", error);
    // Return mock fallback on error
    return {
      summary: "连接宇宙能量时遇到波动（网络或API错误），请稍后重试。",
      cardAnalysis: cards.map(c => ({
        cardName: c.name,
        position: c.positionName,
        meaning: `暂时无法获取详细解读。`
      })),
      advice: "请检查您的网络连接或 API Key 设置。"
    };
  }
};