// geminiMock.js
// Mock Gemini API for actionable insight, tone check, and pattern analysis

export async function getActionableInsight(status) {
  // Simulate AI insight
  return `Insight: Based on your current status (${status}), focus on shared goals this week.`;
}

export async function toneCheck(feedbackText) {
  // Simple mock: flag 'angry' as WARNING
  if (/angry|hate|stupid|idiot/i.test(feedbackText)) return 'WARNING';
  return 'OK';
}

export async function velinReview(journalEntries, loveActs) {
  // Simulate pattern analysis
  return {
    summary: `In the past week, 70% of your focus was on Financial Goals, while Acts of Service peaked. Velin recommends prioritizing a 'Friendship' goal next week to maintain balance.`,
    recommendation: 'Shift focus to Adventure or Friendship.'
  };
}

export async function conversationPrompt(metrics) {
  // Simulate prompt generation
  return `Velin suggests asking: 'What is one specific thing I can take off your plate today to support your energy for the 5-Year Roadmap goal?'`;
}
