// xpLogic.js
// XP and Level logic for Velin

export const XP_AWARDS = {
  goal: 100,
  journal: 25,
  feedback: 50,
  love: 10,
};

export function calculateLevel(xp) {
  // Simple level curve: every 500 XP = 1 level
  return Math.floor(xp / 500) + 1;
}

export function addXP(currentXP, type) {
  return currentXP + (XP_AWARDS[type] || 0);
}
