import type { MainnetFixturePreviewItem } from "./mainnet-preview";

const TEAM_FLAGS: Record<string, string> = {
  Argentina: "🇦🇷",
  Belgium: "🇧🇪",
  Brazil: "🇧🇷",
  Colombia: "🇨🇴",
  Egypt: "🇪🇬",
  England: "🏴",
  Japan: "🇯🇵",
  Mexico: "🇲🇽",
  Morocco: "🇲🇦",
  Portugal: "🇵🇹",
  Russia: "🇷🇺",
  Spain: "🇪🇸",
  Switzerland: "🇨🇭",
  USA: "🇺🇸",
};

export function teamFlag(team: string): string | null {
  return TEAM_FLAGS[team.trim()] ?? null;
}

function teamWithFlag(team: string): string {
  const flag = teamFlag(team);
  return flag ? `${flag} ${team}` : team;
}

export function fixtureTitleWithFlags(
  fixture: Pick<MainnetFixturePreviewItem, "participant1" | "participant2">
): string {
  return `${teamWithFlag(fixture.participant1)} vs ${teamWithFlag(fixture.participant2)}`;
}
