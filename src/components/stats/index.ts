/**
 * @file index.ts
 * @description 통계 컴포넌트 라이브러리 - 공용 내보내기
 */

// 컴포넌트
export { StatRow, type StatRowProps } from './StatRow';
export { StatsGrid, type StatsGridProps, type StatItem } from './StatsGrid';
export { StatsTable, type StatsTableProps, type StatsTableColumn } from './StatsTable';
export { SectionTitle, type SectionTitleProps } from './SectionTitle';

// 스타일
export {
  // 색상
  STATS_COLORS,
  // 행/그리드
  STAT_ROW_STYLE,
  STAT_LABEL_STYLE,
  STAT_VALUE_STYLE,
  STATS_GRID_STYLE,
  STAT_ITEM_STYLE,
  // 섹션
  SECTION_TITLE_STYLE,
  SECTION_BOX_STYLE,
  // 탭
  TAB_CONTAINER_STYLE,
  TAB_STYLE,
  getTabStyle,
  // 테이블
  TABLE_STYLE,
  TH_STYLE,
  TD_STYLE,
  // 버튼
  COPY_BUTTON_STYLE,
  // 유틸리티
  getValueColor,
  getWinRateColor,
} from './styles';
