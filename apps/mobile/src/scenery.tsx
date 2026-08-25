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

/* ---- Countryside dressing: farm props that sit beside the track ---- */

export function HayBaleG({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${s})`}>
      <Ellipse cx={0} cy={2.4} fill="rgba(16,24,40,0.09)" rx={10} ry={2.8} />
      <Circle cx={0} cy={-5} fill="#D8B871" r={7.4} />
      <Circle cx={0} cy={-5} fill="none" r={4.6} stroke="#C29E58" strokeWidth={1.1} />
      <Circle cx={0} cy={-5} fill="none" r={1.9} stroke="#C29E58" strokeWidth={1.1} />
    </G>
  );
}

export function FenceG({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${s})`}>
      <Ellipse cx={9} cy={1.6} fill="rgba(16,24,40,0.07)" rx={16} ry={2.2} />
      <Rect fill="#A98C69" height={12} rx={0.8} width={2} x={-1} y={-12} />
      <Rect fill="#A98C69" height={12} rx={0.8} width={2} x={17} y={-12} />
      <Rect fill="#BFA07A" height={1.8} rx={0.6} width={20} x={-1} y={-10} />
      <Rect fill="#BFA07A" height={1.8} rx={0.6} width={20} x={-1} y={-5.5} />
    </G>
  );
}

export function SheepG({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${s})`}>
      <Ellipse cx={0} cy={1.8} fill="rgba(16,24,40,0.08)" rx={8} ry={2.2} />
      <Rect fill="#8A8A8E" height={4} width={1.5} x={-3.4} y={-3} />
      <Rect fill="#8A8A8E" height={4} width={1.5} x={2.2} y={-3} />
      <Ellipse cx={0} cy={-6} fill="#F4F4F5" rx={7.4} ry={5.2} />
      <Circle cx={-4.6} cy={-8} fill="#FAFAFA" r={3} />
      <Circle cx={4.4} cy={-8.6} fill="#FAFAFA" r={2.6} />
      <Ellipse cx={6.6} cy={-6.6} fill="#4A4A4E" rx={2.6} ry={3} />
      <Circle cx={7.4} cy={-7.4} fill="#F4F4F5" r={0.7} />
    </G>
  );
}

export function TractorG({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${s})`}>
      <Ellipse cx={0} cy={3} fill="rgba(16,24,40,0.10)" rx={15} ry={3} />
      {/* body */}
      <Rect fill="#4C7A46" height={7} rx={1.4} width={17} x={-8} y={-9} />
      {/* cab */}
      <Rect fill="#5E8F57" height={7.5} rx={1.4} width={8} x={-6} y={-16} />
      <Rect fill="#CFE3F5" height={4.4} rx={0.8} width={5} x={-4.6} y={-14.8} />
      {/* exhaust */}
      <Rect fill="#3C6238" height={6} rx={0.7} width={1.6} x={3.4} y={-15} />
      {/* wheels */}
      <Circle cx={-4.4} cy={-1} fill="#2F2F33" r={4.6} />
      <Circle cx={-4.4} cy={-1} fill="#8A8A8E" r={1.9} />
      <Circle cx={6.6} cy={0.4} fill="#2F2F33" r={3.2} />
      <Circle cx={6.6} cy={0.4} fill="#8A8A8E" r={1.3} />
    </G>
  );
}
