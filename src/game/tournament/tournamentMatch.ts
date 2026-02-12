/**
 * 锦标赛对战模拟
 *
 * 复用 arenaEngine 的回合制模拟，生成对战叙事
 */

import type { AgentPlayer } from "@/types";
import { simulateRound, type RoundResult } from "../arena/arenaEngine";

export interface TournamentMatchResult {
  winnerId: string | null;
  isDraw: boolean;
  scoreA: number;
  scoreB: number;
  narrative: string;
  rounds: RoundResult[];
}

/**
 * 模拟锦标赛中一场对战（Best of 3 回合）
 */
export function simulateTournamentMatch(
  agentA: AgentPlayer,
  agentB: AgentPlayer,
  context: { tournamentName: string; round: number }
): TournamentMatchResult {
  const rounds: RoundResult[] = [];
  let winsA = 0;
  let winsB = 0;

  // Best of 3
  for (let i = 1; i <= 3; i++) {
    const result = simulateRound(agentA, agentB, i);
    rounds.push(result);

    if (result.challengerDamage > result.opponentDamage) {
      winsA++;
    } else if (result.opponentDamage > result.challengerDamage) {
      winsB++;
    }

    // 提前结束（2:0）
    if (winsA >= 2 || winsB >= 2) break;
  }

  const isDraw = winsA === winsB;
  let winnerId: string | null = null;
  if (winsA > winsB) winnerId = agentA.id;
  else if (winsB > winsA) winnerId = agentB.id;

  // 生成叙事
  const narrative = generateMatchNarrative(agentA, agentB, winsA, winsB, context);

  return {
    winnerId,
    isDraw,
    scoreA: winsA,
    scoreB: winsB,
    narrative,
    rounds,
  };
}

function generateMatchNarrative(
  agentA: AgentPlayer,
  agentB: AgentPlayer,
  winsA: number,
  winsB: number,
  context: { tournamentName: string; round: number }
): string {
  const winner = winsA > winsB ? agentA : agentB;
  const loser = winsA > winsB ? agentB : agentA;
  const winScore = Math.max(winsA, winsB);
  const loseScore = Math.min(winsA, winsB);

  if (winsA === winsB) {
    return `【${context.tournamentName}·第${context.round}轮】${agentA.nickname} 与 ${agentB.nickname} 势均力敌，激战三回合后战成平局。`;
  }

  if (loseScore === 0) {
    return `【${context.tournamentName}·第${context.round}轮】${winner.nickname} 以 ${winScore}:${loseScore} 完胜 ${loser.nickname}，展现压倒性实力！`;
  }

  return `【${context.tournamentName}·第${context.round}轮】${winner.nickname} 经过激烈角逐，以 ${winScore}:${loseScore} 险胜 ${loser.nickname}。`;
}
