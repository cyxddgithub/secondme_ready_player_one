/**
 * Kimi (Moonshot AI) 客户端
 * 使用 OpenAI 兼容格式调用 Kimi 大模型
 */

const KIMI_API_BASE = "https://api.moonshot.cn/v1";
const KIMI_MODEL = "moonshot-v1-8k";

function getApiKey(): string {
  const key = process.env.KIMI_API_KEY;
  if (!key) {
    throw new Error("KIMI_API_KEY 环境变量未设置");
  }
  return key;
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface KimiResponse {
  id: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/** 调用 Kimi 大模型 Chat Completion */
export async function kimiChat(
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const apiKey = getApiKey();

  const res = await fetch(`${KIMI_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: KIMI_MODEL,
      messages,
      temperature: options?.temperature ?? 0.8,
      max_tokens: options?.maxTokens ?? 2000,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Kimi API 调用失败 (${res.status}): ${errorText}`);
  }

  const data: KimiResponse = await res.json();
  return data.choices[0]?.message?.content || "";
}

/** 调用 Kimi 并解析 JSON 响应 */
export async function kimiChatJSON<T>(
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<T> {
  const content = await kimiChat(messages, options);

  // 尝试从回复中提取 JSON
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                    content.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error(`Kimi 返回的内容无法解析为 JSON: ${content.substring(0, 200)}`);
  }

  const jsonStr = jsonMatch[1] || jsonMatch[0];
  return JSON.parse(jsonStr);
}

/** 检查 Kimi API 是否可用 */
export function isKimiAvailable(): boolean {
  return !!process.env.KIMI_API_KEY;
}
