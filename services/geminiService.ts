import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
} else {
  console.warn("GoogleGenAI API key is not set. Gemini services will use fallback responses in the browser.");
}

export async function getWellbeingSupport(emotion: string, impactText: string): Promise<string> {
  if (!ai) {
    console.warn("Gemini API client unavailable; returning fallback wellbeing message.");
    return "Thank you for sharing your journey with us. We're so glad to have you in the free@last family!";
  }

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
  if (!ai) {
    console.warn("Gemini API client unavailable; returning fallback summary.");
    return "Your contributions are making a real difference in the lives of people in Nechells.";
  }

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

export interface CaseStudyAnalysis {
  category: string;
  sentimentScore: number;
  aiSummary: string;
}

export async function analyzeCaseStudy(content: string): Promise<CaseStudyAnalysis> {
  if (!ai) {
    console.warn("Gemini API client unavailable; returning fallback case study analysis.");
    return {
      category: "Community Outreach",
      sentimentScore: 5,
      aiSummary: "The member shares high appreciation for free@last's role in their personal development."
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `Analyze the following personal feedback/story shared by a member of the free@last community centre in Nechells:
      
      "${content}"
      
      Extract and determine:
      1. An appropriate category for this story (strictly one of: "Youth Support", "Mental Health", "Community Outreach", "Sports Development", "Job & Skills", "Family Well-being").
      2. A sentiment score strictly from 1 to 5, where 1 is negative, 3 is neutral, and 5 is deeply positive/impactful.
      3. A single, concise, professional and inspiring sentence summarizing the quantitative or qualitative social impact mentioned in the story.
      
      Return the output as a clean JSON object with keys "category", "sentimentScore", "aiSummary". Do not return any other text or markdown block wrappers.`,
      config: {
        responseMimeType: "application/json",
        temperature: 0.2,
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    return {
      category: parsed.category || "Community Outreach",
      sentimentScore: typeof parsed.sentimentScore === 'number' ? parsed.sentimentScore : 5,
      aiSummary: parsed.aiSummary || "This story highlights the positive direct support provided by free@last."
    };
  } catch (error) {
    console.error("Case Study Analysis Error:", error);
    return {
      category: "Community Outreach",
      sentimentScore: 5,
      aiSummary: "The member shares high appreciation for free@last's role in their personal development."
    };
  }
}

export async function generateFounderExecutiveReport(data: {
  demographics: any;
  wellbeing: any;
  serviceHours: any;
  bookings: any;
  caseStudies: any[];
}): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `You are an expert Social Impact Assessor. Create an inspiring, professional, and visually spectacular Social Impact Executive Report for the founders and board of free@last, a community center in Nechells, Birmingham.
      
      Use the following actual real-time aggregate statistics compiled from our community hub:
      
      - DEMOGRAPHICS:
        * Total Users Registered: ${data.demographics.totalUsers}
        * Ethnicity Breakdown: ${JSON.stringify(data.demographics.ethnicities)}
        * Religion/Faith Breakdown: ${JSON.stringify(data.demographics.religions)}
        * Age/Group Profiles: ${JSON.stringify(data.demographics.profiles)}
        
      - WELLBEING & REFLECTIONS:
        * Total Member/Team Well-being Logs: ${data.wellbeing.totalLogs}
        * Emotion Categories Reported: ${JSON.stringify(data.wellbeing.emotionCounts)}
        * Urgent Support Notifications flagged: ${data.wellbeing.urgentCount}
        
      - SERVICE & VOLUNTEERING HOURS:
        * Total Volunteer Service Hours Logged by Team: ${data.serviceHours.totalHours}
        * Calculated Net Social Value Generated (at £15.00/hour benchmarking): £${data.serviceHours.socialValue}
        * Core categories of logged sessions: ${JSON.stringify(data.serviceHours.categoryHours)}
        
      - BOOKINGS & COMMUNITY ENGAGEMENT:
        * Total Bookings for Youth and Sport Sessions: ${data.bookings.totalBookings}
        * Active booked session listings: ${JSON.stringify(data.bookings.sessionCategories)}

      - RECENT CASE STUDIES & MEMBER STORIES:
        ${data.caseStudies.map((cs, index) => `[Story ${index + 1}] Response to callback "${cs.requestTitle}" by ${cs.memberName}: "${cs.content}" (AI impact category: ${cs.category}, sentiment: ${cs.sentimentScore}/5)`).join('\n\n')}

      Write an official, print-ready Founder Briefing with:
      1. A majestic and elegant title section (e.g. "free@last Social Impact Assessment - Nechells Community Report").
      2. Executive Summary outlining high-level progress, addressing Nechells' socioeconomic context (Birmingham, deprivation indicators, hope and resilience).
      3. Deep-Dive Metrics: Demographics representation, wellbeing highlights, community logs.
      4. Social Value generated (£${data.serviceHours.socialValue} in value via volunteer service), explaining what this means to Birmingham City Council or public savings.
      5. Impact Voice spotlighting case study quotes.
      6. Strategic Recommendation for the future.

      Write elegant, clean, inspiring Markdown text with highly formatted headings, lists, bold key numbers, and horizontal lines. Tone should be professional, empathetic, and full of hope, demonstrating extreme rigour. Do not wrap in markdown block symbols (\`\`\`) in your final output text, just return the raw markdown string.`,
      config: {
        temperature: 0.7,
      }
    });

    return response.text || "## free@last Social Impact Report\n\nError generating report. Please retry.";
  } catch (error) {
    console.error("Founder Report Error:", error);
    return "## free@last Social Impact Report\n\nUnable to reach AI services at this moment. Please check connection and try again.";
  }
}
