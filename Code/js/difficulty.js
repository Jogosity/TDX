// TDX — difficulty settings (M9 "Integer"). Written by the Difficulty Curve tool (tools/curve/).
// The levels are balanced for Advanced. Basic multiplies every level's
// enemyDelta (HP ×, damage ×) by the numbers below. The Tutorial ignores them.
export const DIFFICULTY = {
  basic: { health: 0.8, damage: 0.8 },
  advanced: { health: 1, damage: 1 },
};
