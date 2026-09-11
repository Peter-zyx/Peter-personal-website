export type FootballDetections = {
  ball: boolean;
  goal: boolean;
  goal1: boolean;
  redRobot: boolean;
  robot1: boolean;
};

export function explainFootballCommand(seen: FootballDetections) {
  if (!Object.values(seen).some(Boolean)) return { id: "search", title: "Turn to search", left: -50, right: 50, detail: "No objects detected: turn for 100 ms, then stop." };
  if (seen.ball && seen.goal) return { id: "advance", title: "Drive forward", left: 100, right: 100, detail: "Ball + goal: send equal forward commands, then wait 100 ms. This branch takes priority over the remaining rules." };
  if (seen.ball && seen.goal1) return { id: "turn", title: "Turn in place", left: 50, right: -50, detail: "Ball + goal1: send opposite motor commands. This branch has no timed stop." };
  if (seen.robot1) return { id: "curve", title: "Curve around", left: 50, right: 100, detail: "Robot1 detected: drive the right wheel faster than the left. This branch precedes ball-only movement." };
  if (seen.ball) return { id: "approach", title: "Approach the ball", left: 50, right: 50, detail: "Ball without either goal or robot1: send equal, moderate forward commands, then wait 100 ms." };
  return { id: "unchanged", title: "No new command", left: null, right: null, detail: "Objects are visible, but none of the movement conditions match. The script does not issue a new motor command or an explicit stop." };
}
