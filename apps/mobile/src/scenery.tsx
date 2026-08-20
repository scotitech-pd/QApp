import React from "react";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";

/* Shared illustrated-map elements: trees, stones (SVG <G>, need a parent
 * <Svg>) and the storefront icon (standalone). Used by the Salons route
 * view and the My Queue journey scene. */

export function TreeG({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${s})`}>
      <Ellipse cx={0} cy={2.5} fill="rgba(16,24,40,0.09)" rx={11} ry={3.2} />
      <Rect fill="#9A7B5C" height={9} rx={1.3} width={2.8} x={-1.4} y={-9} />
      <Circle cx={0} cy={-15} fill="#87AC93" r={8} />
      <Circle cx={-5} cy={-10.5} fill="#97BBA2" r={5.8} />
      <Circle cx={5} cy={-11} fill="#76a084" r={6} />
    </G>
  );
}

export function StoneG({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${s})`}>
      <Ellipse cx={0} cy={1.8} fill="rgba(16,24,40,0.09)" rx={8.5} ry={2.6} />
      <Ellipse cx={0} cy={-2.2} fill="#C4C8CE" rx={7} ry={4.8} />
      <Ellipse cx={-1.8} cy={-3.8} fill="#D8DBDF" rx={3.6} ry={2.1} />
      <Ellipse cx={8} cy={0} fill="#CDD1D6" rx={3.4} ry={2.3} />
    </G>
  );
}

export function Storefront({ size, tint }: { size: number; tint: string }) {
  return (
    <Svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M4 3.5h16l1.5 4.2c0 1.5-1.2 2.7-2.7 2.7-1.2 0-2.2-.8-2.6-1.9-.4 1.1-1.4 1.9-2.6 1.9s-2.2-.8-2.6-1.9c-.4 1.1-1.4 1.9-2.6 1.9S6.2 9.6 5.8 8.5C5.4 9.6 4.4 10.4 3.2 10.4 1.7 10.4.5 9.2.5 7.7L2 3.5h2Z"
        fill={tint}
        opacity={0.9}
      />
      <Path d="M4.5 11v8.2c0 .7.6 1.3 1.3 1.3h12.4c.7 0 1.3-.6 1.3-1.3V11" stroke={tint} strokeLinecap="round" strokeWidth={1.8} />
      <Rect fill={tint} height={5.4} opacity={0.85} rx={0.8} width={4.2} x={13.2} y={14.2} />
    </Svg>
  );
}
