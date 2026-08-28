export type SentimentResult = {
  score: number; // -1 to 1
  label: "positive" | "neutral" | "negative";
  confidence: number;
  emotions: string[];
};

const POSITIVE_WORDS = new Set([
  "great", "good", "love", "excellent", "amazing", "perfect", "beautiful",
  "happy", "wonderful", "fantastic", "awesome", "best", "nice", "satisfied",
  "thank", "thanks", "shukriya", "pyara", "zabardast", "awesome", "best",
  "pasand", "acha", "theek", "khush", "mazeed", "impressed", "recommend",
  "quality", "fast", "quick", "helpful", "friendly", "smooth", "reliable",
  "luxurious", "premium", "glow", "soft", "smooth", "hydrating", "lightweight",
]);

const NEGATIVE_WORDS = new Set([
  "bad", "terrible", "awful", "hate", "worst", "poor", "broken", "damaged",
  "slow", "rude", "angry", "disappointed", "waste", "fake", "cheap",
  "problem", "issue", "complaint", "refund", "return", "wrong", "defect",
  "bura", "kharab", "gussa", "naraz", "bekar", "faltu", "waisa", "mehnga",
  "late", "delayed", "missing", "lost", "cancelled", "reject", "unhappy",
  "frustrated", "annoyed", "useless", "pathetic", "disgusting", "horrible",
]);

const EMOTION_INDICATORS: Record<string, string[]> = {
  joy: ["happy", "love", "great", "amazing", "wonderful", "khush", "pyara"],
  anger: ["angry", "furious", "hate", "gussa", "naraz", "rude"],
  sadness: ["sad", "disappointed", "sorry", "unfortunately", "miss"],
  surprise: ["wow", "omg", "unexpected", "suddenly", "shocked"],
  trust: ["trust", "reliable", "honest", "quality", "recommend"],
  anticipation: ["excited", "waiting", "eager", "hope", "expect"],
};

export function analyzeSentiment(text: string): SentimentResult {
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/);

  let positiveCount = 0;
  let negativeCount = 0;
  const detectedEmotions: string[] = [];

  for (const word of words) {
    if (POSITIVE_WORDS.has(word)) positiveCount++;
    if (NEGATIVE_WORDS.has(word)) negativeCount++;

    for (const [emotion, keywords] of Object.entries(EMOTION_INDICATORS)) {
      if (keywords.some((k) => word.includes(k))) {
        if (!detectedEmotions.includes(emotion)) {
          detectedEmotions.push(emotion);
        }
      }
    }
  }

  const total = positiveCount + negativeCount;
  let score = 0;
  if (total > 0) {
    score = (positiveCount - negativeCount) / total;
  }

  // Boost score for exclamation marks and emojis (positive indicators)
  const exclamationBoost = (text.match(/!/g)?.length ?? 0) * 0.05;
  const questionPenalty = (text.match(/\?/g)?.length ?? 0) * 0.02;
  score = Math.max(-1, Math.min(1, score + exclamationBoost - questionPenalty));

  const label: SentimentResult["label"] =
    score > 0.15 ? "positive" : score < -0.15 ? "negative" : "neutral";

  const confidence = total > 0 ? Math.min(1, total / words.length + 0.3) : 0.4;

  return {
    score: Math.round(score * 100) / 100,
    label,
    confidence: Math.round(confidence * 100) / 100,
    emotions: detectedEmotions.length > 0 ? detectedEmotions : ["neutral"],
  };
}

export function getSentimentEmoji(label: string): string {
  switch (label) {
    case "positive": return "😊";
    case "negative": return "😞";
    default: return "😐";
  }
}

export function getSentimentColor(label: string): string {
  switch (label) {
    case "positive": return "#22c55e";
    case "negative": return "#ef4444";
    default: return "#eab308";
  }
}
