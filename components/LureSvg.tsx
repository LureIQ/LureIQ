import React from 'react';
import { SvgXml } from 'react-native-svg';

type Props = { svg: string; width?: number; height?: number };

export default function LureSvg({ svg, width = 300, height = 180 }: Props) {
  return <SvgXml xml={svg} width={width} height={height} />;
}
