import type { ReactNode } from "react";
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";

export type BadgeTier = "bronze" | "silver" | "gold" | "platinum";

const tierColors: Record<BadgeTier, [string, string, string]> = {
  bronze: ["#F1B06A", "#CD7F32", "#7C3F16"],
  silver: ["#F8FAFC", "#D7DEE8", "#7E8A9A"],
  gold: ["#FFF0A3", "#F6C445", "#B77905"],
  platinum: ["#FFFFFF", "#B9F2FF", "#6D7CFF"],
};

const tierStroke: Record<BadgeTier, string> = {
  bronze: "#CD7F32",
  silver: "#D7DEE8",
  gold: "#F6C445",
  platinum: "#B9F2FF",
};

export function GamificationBadge({
  iconKey,
  tier,
  size = 76,
}: {
  iconKey: string;
  tier?: BadgeTier;
  size?: number;
}) {
  const colors = tier ? tierColors[tier] : null;
  return (
    <Svg width={size} height={size} viewBox="0 0 128 128">
      {colors ? (
        <Defs>
          <LinearGradient id="tierGradient" x1="24" y1="16" x2="104" y2="112" gradientUnits="userSpaceOnUse">
            <Stop stopColor={colors[0]} />
            <Stop offset="0.48" stopColor={colors[1]} />
            <Stop offset="1" stopColor={colors[2]} />
          </LinearGradient>
        </Defs>
      ) : null}
      <Path
        d="M64 7 108 25v34c0 29-18 50-44 62C38 109 20 88 20 59V25L64 7Z"
        fill={tier ? "url(#tierGradient)" : "#202431"}
        stroke={tier ? undefined : "#64748B"}
        strokeWidth={tier ? undefined : 7}
      />
      <Circle
        cx="64"
        cy="61"
        r="40"
        fill="#171A24"
        stroke={tier ? tierStroke[tier] : "#334155"}
        strokeWidth={tier ? 4 : 3}
        strokeDasharray={tier ? undefined : "5 5"}
      />
      {tier === "bronze" || tier === "silver" ? (
        <Path d="M32 31 40 35M96 31 88 35" stroke={tier === "bronze" ? "#FFD0A0" : "#FFFFFF"} strokeWidth={4} strokeLinecap="round" />
      ) : null}
      {tier === "gold" || tier === "platinum" ? (
        <Path d="m31 31 10 5M97 31l-10 5M64 14v8" stroke={tier === "gold" ? "#FFF0A3" : "#FFFFFF"} strokeWidth={4} strokeLinecap="round" />
      ) : null}
      {badgeGlyph(iconKey)}
    </Svg>
  );
}

function badgeGlyph(iconKey: string): ReactNode {
  const common = { fill: "none", stroke: "#F1F5F9", strokeWidth: 6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (iconKey) {
    case "badge-icon-first-delivery":
      return <G {...common}><Path d="m43 48 21-11 21 11-21 11-21-11Z" /><Path d="M43 48v25l21 12 21-12V48M64 59v26" /><Path d="m76 73 7 7 13-15" stroke="#22C55E" /></G>;
    case "badge-icon-always-on-time":
      return <G {...common}><Circle cx="61" cy="61" r="27" /><Path d="M61 45v18l12 7M48 28h26" /><Path d="m76 83 7 7 14-17" stroke="#22C55E" /></G>;
    case "badge-icon-pod-professional":
      return <G {...common}><Rect x="36" y="40" width="56" height="42" rx="7" /><Path d="m50 40 5-8h18l5 8" /><Circle cx="64" cy="60" r="11" /><Path d="M42 91c12-9 16 8 27-2 8-8 13 4 21-2" stroke="#F59E0B" /></G>;
    case "badge-icon-multi-stop-master":
      return <G {...common}><Circle cx="41" cy="43" r="8" /><Circle cx="86" cy="58" r="8" /><Circle cx="48" cy="86" r="8" /><Path d="M49 43h14c14 0 14 15 15 15M78 66c-2 12-10 20-22 20" /><Path d="m60 34 9 9-9 9" stroke="#F59E0B" /></G>;
    case "badge-icon-reliable-partner":
      return <G {...common}><Path d="M64 32 90 42v20c0 17-10 29-26 37-16-8-26-20-26-37V42l26-10Z" /><Path d="m51 64 9 9 18-21" stroke="#22C55E" /></G>;
    case "badge-icon-gps-guardian":
      return <G {...common}><Path d="M64 97S39 73 39 55a25 25 0 0 1 50 0c0 18-25 42-25 42Z" /><Circle cx="64" cy="55" r="9" /><Path d="M30 55h-7M105 55h-7M64 21v-7" stroke="#0EA5E9" /></G>;
    case "badge-icon-customer-favorite":
      return <G {...common}><Path d="M64 92 40 70c-16-15-5-36 11-36 8 0 13 5 13 5s5-5 13-5c16 0 27 21 11 36L64 92Z" /><Path d="m64 48 4 9 10 1-8 7 3 10-9-5-9 5 3-10-8-7 10-1 4-9Z" fill="#F59E0B" stroke="#F59E0B" /></G>;
    case "badge-icon-kilometer-hero":
      return <G {...common}><Path d="M47 98c1-22 3-44 9-68M81 98c-1-22-3-44-9-68" /><Path d="M64 39v12M64 63v12M64 87v8" stroke="#F59E0B" /><Path d="M38 98h52" /></G>;
    case "badge-icon-team-player":
      return <G {...common}><Circle cx="64" cy="47" r="12" /><Circle cx="40" cy="55" r="9" /><Circle cx="88" cy="55" r="9" /><Path d="M45 91c1-17 8-25 19-25s18 8 19 25M24 88c1-13 7-20 16-20M104 88c-1-13-7-20-16-20" /></G>;
    case "badge-icon-perfect-week":
      return <G {...common}><Rect x="34" y="36" width="60" height="56" rx="7" /><Path d="M34 52h60M48 29v14M80 29v14" /><Path d="m49 72 10 10 21-23" stroke="#22C55E" /></G>;
    case "badge-icon-deliveries-250":
      return <G {...common}><Path d="M45 36h38v15c0 17-8 28-19 28S45 68 45 51V36Z" /><Path d="M45 43H32v8c0 10 7 17 17 17M83 43h13v8c0 10-7 17-17 17M64 79v13M49 96h30" /><SvgText x="64" y="59" fill="#F59E0B" stroke="none" fontSize="18" fontWeight="800" textAnchor="middle">250</SvgText></G>;
    case "badge-icon-k4y-legend":
      return <G {...common}><Path d="m35 74-5-35 21 15 13-25 13 25 21-15-5 35H35Z" /><Path d="M38 86h52" stroke="#F59E0B" /><SvgText x="64" y="69" fill="#F59E0B" stroke="none" fontSize="15" fontWeight="800" textAnchor="middle">K4Y</SvgText></G>;
    default:
      return <G {...common}><Path d="M64 32 90 42v20c0 17-10 29-26 37-16-8-26-20-26-37V42l26-10Z" /></G>;
  }
}

export function XpStarArtwork({ size = 46 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 128 128">
      <Defs><LinearGradient id="xpGradient" x1="24" y1="18" x2="102" y2="106" gradientUnits="userSpaceOnUse"><Stop stopColor="#FFF0A3" /><Stop offset="0.48" stopColor="#F59E0B" /><Stop offset="1" stopColor="#B97805" /></LinearGradient></Defs>
      <Path d="m64 16 13 29 32 4-24 22 7 32-28-16-28 16 7-32-24-22 32-4 13-29Z" fill="url(#xpGradient)" stroke="#FFF0A3" strokeWidth={4} strokeLinejoin="round" />
      <SvgText x="64" y="71" fill="#171A24" fontSize="25" fontWeight="900" textAnchor="middle">XP</SvgText>
    </Svg>
  );
}

export function StreakFlameArtwork({ size = 26 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 128 128">
      <Defs><LinearGradient id="flameGradient" x1="64" y1="22" x2="64" y2="106" gradientUnits="userSpaceOnUse"><Stop stopColor="#FDE047" /><Stop offset="0.5" stopColor="#F59E0B" /><Stop offset="1" stopColor="#EF4444" /></LinearGradient></Defs>
      <Path d="M69 15c5 22-14 28-8 44 5-9 13-13 20-20 18 17 26 38 16 56-8 15-21 22-36 22-24 0-40-16-40-38 0-22 15-38 31-53 0 14 4 22 10 27-1-17 15-23 7-38Z" fill="url(#flameGradient)" />
      <Path d="M64 66c11 10 15 19 10 28-3 6-8 9-14 9-10 0-17-7-17-16 0-9 7-16 14-22 0 7 2 11 5 13 0-5 1-9 2-12Z" fill="#FFF7D6" />
    </Svg>
  );
}

export function LevelUpArtwork({ size = 96 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 128 128">
      <Defs><LinearGradient id="levelGradient" x1="24" y1="18" x2="102" y2="106" gradientUnits="userSpaceOnUse"><Stop stopColor="#FFF0A3" /><Stop offset="0.48" stopColor="#F59E0B" /><Stop offset="1" stopColor="#B97805" /></LinearGradient></Defs>
      <Path d="m64 4 11 25 23-15-1 28 28-1-15 23 25 11-25 11 15 23-28-1 1 28-23-15-11 25-11-25-23 15 1-28-28 1 15-23L-7 75l25-11L3 41l28 1-1-28 23 15L64 4Z" fill="url(#levelGradient)" opacity={0.95} />
      <Circle cx="64" cy="64" r="35" fill="#171A24" stroke="#FFF0A3" strokeWidth={4} />
      <Path d="m48 69 16-18 16 18M64 52v32" fill="none" stroke="#F59E0B" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
