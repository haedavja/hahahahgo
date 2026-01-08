/**
 * @file SectionTitle.tsx
 * @description 섹션 제목 컴포넌트
 */

import { memo } from 'react';
import { SECTION_TITLE_STYLE } from './styles';

export interface SectionTitleProps {
  children: React.ReactNode;
  color?: string;
  emoji?: string;
}

export const SectionTitle = memo(function SectionTitle({
  children,
  color = '#fbbf24',
  emoji,
}: SectionTitleProps) {
  return (
    <h3 style={{ ...SECTION_TITLE_STYLE, color }}>
      {emoji && `${emoji} `}{children}
    </h3>
  );
});
