import { GoogleGenAI } from "@google/genai";

// Always use named parameter and direct process.env.API_KEY reference
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getWellbeingSupport(emotion: string, impactText: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `The user is feeling "${emotion}" today. They shared this about how our community center, free@last, has helped them: "${impactText}". 
      As a compassionate community support assistant, provide a short, encouraging, and empathetic response (2-3 sentences) acknowledging their feelings and celebrating their progress with the community.`,
      config: {
        temperature: 0.7,
        maxOutputTokens: 150,
      },
    });
    return response.text || "Thank you for sharing your journey with us. We're so glad to have you in the free@last family!";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Thank you for sharing your thoughts. We're here for you whenever you need support!";
  }
}

export async function summarizeTeamImpact(logs: any[]): Promise<string> {
  try {
    const logSummary = logs.map(l => `${l.sessionName} (${l.hours}hrs): ${l.description}`).join('; ');
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze these team member activity logs: ${logSummary}. Provide a short "Impact Highlight" summarizing the team member's contribution and how it strengthens the Nechells community. Be inspiring and professional.`,
      config: {
        temperature: 0.8,
        maxOutputTokens: 200,
      },
    });
    return response.text || "Your contributions are making a real difference in the lives of people in Nechells.";
  } catch (error) {
    return "Your dedicated service is the heartbeat of free@last. Thank you for everything you do.";
  }
}
