import { GoogleGenAI, Type } from "@google/genai";
import { DrawnCard, InterpretationResponse, Spread, Tone } from "../types";

const getSystemInstruction = (tone: Tone) => {
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
  
  **核心准则 (Strict Output Rules)**：
  1. **拒绝废话模板**：严禁使用“这张牌代表...”、“它暗示了...”这种机械的句式。请直接切入重点，像讲故事一样解读。
  2. **深度结合**：必须将“牌面含义”、“正逆位状态”与“当前位置含义”三者融合。
  3. **输出纯净性（至关重要）**：
     - **严禁**输出思考过程、草稿或备注（如：“注：这里我选择了...”、“修正后：...”）。
     - **严禁**使用中英对照格式（如：“breakthrough/突破”），**只保留中文**。
     - **严禁**重复啰嗦，JSON字段中的内容必须是**最终定稿**。

  请用中文（简体）回答。
  `;
};

// Helper to clean JSON string from Markdown code blocks
const cleanJsonString = (text: string): string => {
  if (!text) return "";
  let clean = text.replace(/```json\n?|```/g, '').trim();
  // Find the first '{' and last '}' to extract the JSON object
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    clean = clean.substring(firstBrace, lastBrace + 1);
  }
  return clean;
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

  // improved formatting for clarity
  const cardsDescription = cards.map((c, i) => 
    `第${i + 1}张 [位置:${c.positionName}]: ${c.name} (${c.isReversed ? '逆位' : '正位'})`
  ).join('\n');

  const prompt = `
    【求问者疑惑】: "${question}"
    【使用牌阵】: ${spread.name}
    
    【抽牌结果 (请严格按此顺序解读)】:
    ${cardsDescription}
    
    任务：
    1. **Key Insight (summary)**: 给出一段精炼的、直击要害的总结。**注意：直接输出最终结果，不要包含括号注释、不要中英对照、不要列出多个备选项。**
    2. **Card Analysis**: 依次解读每一张牌。数组顺序必须与输入顺序完全一致（第1个解析对应第1张牌）。
    3. **Actionable Advice (advice)**: 具体的建议。
  `;

  const schema = {
    type: Type.OBJECT,
    properties: {
      summary: {
        type: Type.STRING,
        description: "直击要害的总结。纯净中文，无备注。",
      },
      cardAnalysis: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            // We ask for cardName just for debugging, but we rely on order
            cardName: { type: Type.STRING },
            meaning: { type: Type.STRING, description: "直接给出针对此牌在此位置的深度解读，不要重复牌名。" }
          }
        }
      },
      advice: {
        type: Type.STRING,
        description: "建议。纯净中文，无备注。"
      }
    }
  };

  const executeGeneration = async (modelName: string, useThinking: boolean) => {
      const config: any = {
        systemInstruction: getSystemInstruction(tone),
        responseMimeType: "application/json",
        responseSchema: schema,
      };

      if (useThinking) {
         config.thinkingConfig = { thinkingBudget: 1024 };
      }

      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: config
      });
      
      return response.text;
  };

  let text: string | undefined;

  try {
    console.log("Calling Gemini 3 Pro...");
    text = await executeGeneration('gemini-3-pro-preview', true);
  } catch (error) {
    console.warn("Gemini 3 Pro failed, attempting fallback...", error);
    try {
        console.log("Calling Gemini 3 Flash...");
        text = await executeGeneration('gemini-3-flash-preview', false);
    } catch (flashError) {
        console.error("Gemini 3 Flash also failed.", flashError);
        throw flashError;
    }
  }

  try {
    if (!text) throw new Error("No text response from AI");
    
    const cleanedText = cleanJsonString(text);
    if (!cleanedText) throw new Error("Empty JSON content after cleaning");

    const result = JSON.parse(cleanedText) as InterpretationResponse;

    // --- Validation & Padding ---
    
    if (!result.summary) result.summary = "星象能量流转复杂，请重点参考下方的单牌解析。";
    if (!result.advice) result.advice = "请跟随你的直觉，答案往往就在你心底最平静的地方。";
    if (!Array.isArray(result.cardAnalysis)) result.cardAnalysis = [];

    // --- CRITICAL FIX: STRICT INDEX MAPPING ---
    // Instead of trying to match names (which is error-prone), we map strictly by index.
    // Card 0 gets Analysis 0. If Analysis 0 is missing, we fallback.
    
    const finalAnalysis = cards.map((card, index) => {
        const aiAnalysis = result.cardAnalysis[index];
        
        // Valid content check
        if (aiAnalysis && aiAnalysis.meaning && aiAnalysis.meaning.length > 5) {
            return {
                cardName: card.name, 
                position: card.positionName,
                meaning: aiAnalysis.meaning // Use the AI's text directly
            };
        }
        
        // Fallback ONLY if AI missed this specific index
        return {
            cardName: card.name,
            position: card.positionName,
            meaning: `此处能量显得隐晦。这张${card.name}（${card.isReversed ? '逆位' : '正位'}）静静地停留在${card.positionName}，邀请你自己去感受画面中的启示。`
        };
    });

    result.cardAnalysis = finalAnalysis;
    return result;

  } catch (error) {
    console.error("Processing Error:", error);
    return {
      summary: "星象暂时模糊，请稍后重试。",
      cardAnalysis: cards.map(c => ({
        cardName: c.name,
        position: c.positionName,
        meaning: `解析暂时不可用。${c.name}`
      })),
      advice: "请检查网络连接。"
    };
  }
};