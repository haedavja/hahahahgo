/**
 * @file community-share.ts
 * @description 커뮤니티 공유 시스템 - 덱, 리플레이, 리더보드
 *
 * ## 기능
 * - 덱 코드 내보내기/가져오기
 * - 런 리플레이 공유
 * - 리더보드 시스템
 * - 덱 평가 및 코멘트
 */

import type { SimulationResult, BattleResult } from '../core/types';
import type { DeckAnalysisResult } from './deck-analyzer';
import type { ReplayData } from './replay-enhanced';

// ==================== 타입 정의 ====================

export interface SharedDeck {
  id: string;
  code: string;                 // 공유 코드
  name: string;
  creator: string;
  cards: string[];
  description?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  stats: DeckStats;
  ratings: DeckRating[];
  comments: Comment[];
}

export interface DeckStats {
  views: number;
  copies: number;
  likes: number;
  winRate?: number;
  gamesPlayed?: number;
  avgFloor?: number;
}

export interface DeckRating {
  id: string;
  userId: string;
  username: string;
  score: number;               // 1-5 점
  review?: string;
  createdAt: Date;
}

export interface Comment {
  id: string;
  userId: string;
  username: string;
  content: string;
  createdAt: Date;
  replies?: Comment[];
}

export interface SharedReplay {
  id: string;
  code: string;
  title: string;
  creator: string;
  description?: string;
  replayData: CompressedReplay;
  metadata: ReplayMetadata;
  createdAt: Date;
  views: number;
  likes: number;
  comments: Comment[];
}

export interface CompressedReplay {
  version: string;
  deck: string[];
  enemy: string;
  seed: number;
  actions: string;              // 압축된 액션 문자열
  result: 'win' | 'loss' | 'draw';
  turns: number;
  finalHp: number;
}

export interface ReplayMetadata {
  duration: number;
  cardUsage: Record<string, number>;
  keyMoments: Array<{
    turn: number;
    description: string;
  }>;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  score: number;
  category: LeaderboardCategory;
  details: Record<string, number | string>;
  updatedAt: Date;
}

export type LeaderboardCategory =
  | 'highest_floor'
  | 'fastest_win'
  | 'most_damage'
  | 'perfect_runs'
  | 'win_streak'
  | 'total_wins';

export interface CommunityStats {
  totalDecks: number;
  totalReplays: number;
  totalUsers: number;
  recentActivity: Activity[];
  trendingDecks: SharedDeck[];
  trendingReplays: SharedReplay[];
}

export interface Activity {
  id: string;
  type: 'deck_shared' | 'replay_shared' | 'comment' | 'rating' | 'achievement';
  userId: string;
  username: string;
  targetId: string;
  targetType: 'deck' | 'replay' | 'user';
  description: string;
  createdAt: Date;
}

// ==================== 덱 코드 시스템 ====================

export class DeckCodec {
  private static readonly VERSION = '1';
  private static readonly ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

  /**
   * 덱을 공유 코드로 인코딩
   */
  static encode(deck: { cards: string[]; name?: string }): string {
    const cardMap = new Map<string, number>();

    // 카드 ID를 숫자로 매핑 (실제 구현에서는 전체 카드 목록 사용)
    let index = 0;
    for (const cardId of deck.cards) {
      if (!cardMap.has(cardId)) {
        cardMap.set(cardId, index++);
      }
    }

    // 카드 목록을 바이트로 압축
    const cardIndices = deck.cards.map(c => cardMap.get(c)!);
    const cardBytes = this.encodeCardList(cardIndices);

    // 메타데이터
    const meta = {
      v: this.VERSION,
      n: deck.name || 'Unnamed',
      c: cardMap.size,
    };

    // 최종 코드 생성
    const payload = JSON.stringify(meta) + '|' + cardBytes;
    const encoded = this.base58Encode(Buffer.from(payload));

    return `HD${this.VERSION}${encoded}`;
  }

  /**
   * 공유 코드를 덱으로 디코딩
   */
  static decode(code: string): { cards: string[]; name: string } | null {
    try {
      if (!code.startsWith('HD')) {
        return null;
      }

      const version = code[2];
      if (version !== this.VERSION) {
        console.warn(`Unknown deck code version: ${version}`);
      }

      const encoded = code.slice(3);
      const decoded = this.base58Decode(encoded);
      const payload = decoded.toString('utf8');

      const [metaStr, cardBytes] = payload.split('|');
      const meta = JSON.parse(metaStr);

      // 카드 목록 복원 (간소화된 버전)
      const cardIndices = this.decodeCardList(cardBytes);

      // 실제 구현에서는 인덱스를 카드 ID로 변환
      // 여기서는 데모용으로 간단히 처리
      const cards = cardIndices.map(i => `card_${i}`);

      return {
        cards,
        name: meta.n,
      };
    } catch (e) {
      console.error('Failed to decode deck code:', e);
      return null;
    }
  }

  private static encodeCardList(indices: number[]): string {
    // RLE (Run-Length Encoding) 압축
    const counts: Array<[number, number]> = [];
    let current = indices[0];
    let count = 1;

    for (let i = 1; i <= indices.length; i++) {
      if (i < indices.length && indices[i] === current) {
        count++;
      } else {
        counts.push([current, count]);
        if (i < indices.length) {
          current = indices[i];
          count = 1;
        }
      }
    }

    return counts.map(([idx, cnt]) => `${idx}:${cnt}`).join(',');
  }

  private static decodeCardList(encoded: string): number[] {
    const cards: number[] = [];
    const pairs = encoded.split(',');

    for (const pair of pairs) {
      const [idx, cnt] = pair.split(':').map(Number);
      for (let i = 0; i < cnt; i++) {
        cards.push(idx);
      }
    }

    return cards;
  }

  private static base58Encode(data: Buffer): string {
    let num = BigInt('0x' + data.toString('hex'));
    let result = '';

    while (num > 0n) {
      const remainder = Number(num % 58n);
      result = this.ALPHABET[remainder] + result;
      num = num / 58n;
    }

    // 선행 0 처리
    for (let i = 0; i < data.length && data[i] === 0; i++) {
      result = this.ALPHABET[0] + result;
    }

    return result || this.ALPHABET[0];
  }

  private static base58Decode(str: string): Buffer {
    let num = 0n;

    for (const char of str) {
      const idx = this.ALPHABET.indexOf(char);
      if (idx === -1) throw new Error(`Invalid character: ${char}`);
      num = num * 58n + BigInt(idx);
    }

    const hex = num.toString(16);
    const paddedHex = hex.length % 2 ? '0' + hex : hex;

    // 선행 0 복원
    let leadingZeros = 0;
    for (const char of str) {
      if (char === this.ALPHABET[0]) leadingZeros++;
      else break;
    }

    const zeros = Buffer.alloc(leadingZeros);
    const data = Buffer.from(paddedHex, 'hex');

    return Buffer.concat([zeros, data]);
  }

  /**
   * 덱 코드 유효성 검사
   */
  static isValid(code: string): boolean {
    if (!code || code.length < 5) return false;
    if (!code.startsWith('HD')) return false;

    const version = code[2];
    if (!/^[0-9]$/.test(version)) return false;

    const payload = code.slice(3);
    for (const char of payload) {
      if (!this.ALPHABET.includes(char)) return false;
    }

    return true;
  }
}

// ==================== 리플레이 압축 ====================

export class ReplayCompressor {
  /**
   * 리플레이 데이터 압축
   */
  static compress(replay: ReplayData): CompressedReplay {
    // 액션을 간결한 문자열로 압축
    const actionStrings: string[] = [];

    for (const turn of replay.turns) {
      const turnActions: string[] = [];

      for (const action of turn.actions) {
        // 액션 타입별 압축 코드
        const code = this.encodeAction(action);
        turnActions.push(code);
      }

      actionStrings.push(turnActions.join(';'));
    }

    return {
      version: '1.0',
      deck: replay.initialState?.player?.deck || [],
      enemy: replay.initialState?.enemy?.id || 'unknown',
      seed: replay.seed || 0,
      actions: actionStrings.join('|'),
      result: replay.result as 'win' | 'loss' | 'draw',
      turns: replay.turns.length,
      finalHp: replay.finalState?.player?.hp || 0,
    };
  }

  /**
   * 압축된 리플레이 복원
   */
  static decompress(compressed: CompressedReplay): Partial<ReplayData> {
    const turnStrings = compressed.actions.split('|');
    const turns: Array<{ turn: number; actions: unknown[] }> = [];

    for (let i = 0; i < turnStrings.length; i++) {
      const actionCodes = turnStrings[i].split(';').filter(Boolean);
      const actions = actionCodes.map(code => this.decodeAction(code));

      turns.push({
        turn: i + 1,
        actions,
      });
    }

    return {
      seed: compressed.seed,
      result: compressed.result,
      turns: turns as ReplayData['turns'],
    };
  }

  private static encodeAction(action: {
    type: string;
    cardId?: string;
    target?: string;
    value?: number;
  }): string {
    const typeCode: Record<string, string> = {
      play: 'P',
      attack: 'A',
      defend: 'D',
      draw: 'W',
      discard: 'X',
      end_turn: 'E',
    };

    const code = typeCode[action.type] || 'U';
    const parts = [code];

    if (action.cardId) parts.push(action.cardId.slice(0, 4));
    if (action.target) parts.push(action.target[0]);
    if (action.value !== undefined) parts.push(action.value.toString());

    return parts.join(':');
  }

  private static decodeAction(code: string): {
    type: string;
    cardId?: string;
    target?: string;
    value?: number;
  } {
    const typeMap: Record<string, string> = {
      P: 'play',
      A: 'attack',
      D: 'defend',
      W: 'draw',
      X: 'discard',
      E: 'end_turn',
      U: 'unknown',
    };

    const parts = code.split(':');
    const result: {
      type: string;
      cardId?: string;
      target?: string;
      value?: number;
    } = {
      type: typeMap[parts[0]] || 'unknown',
    };

    if (parts[1]) result.cardId = parts[1];
    if (parts[2]) result.target = parts[2] === 'p' ? 'player' : 'enemy';
    if (parts[3]) result.value = parseInt(parts[3], 10);

    return result;
  }

  /**
   * 공유 코드 생성
   */
  static generateShareCode(compressed: CompressedReplay): string {
    const json = JSON.stringify(compressed);
    const encoded = Buffer.from(json).toString('base64');
    return `HR1${encoded.slice(0, 32)}...`;  // 미리보기용 축약
  }
}

// ==================== 리더보드 시스템 ====================

export class LeaderboardManager {
  private boards: Map<LeaderboardCategory, LeaderboardEntry[]> = new Map();
  private readonly MAX_ENTRIES = 100;

  constructor() {
    this.initializeBoards();
  }

  private initializeBoards(): void {
    const categories: LeaderboardCategory[] = [
      'highest_floor',
      'fastest_win',
      'most_damage',
      'perfect_runs',
      'win_streak',
      'total_wins',
    ];

    for (const cat of categories) {
      this.boards.set(cat, []);
    }
  }

  /**
   * 점수 제출
   */
  submitScore(
    category: LeaderboardCategory,
    userId: string,
    username: string,
    score: number,
    details: Record<string, number | string> = {}
  ): { rank: number; isNewRecord: boolean } {
    const board = this.boards.get(category)!;

    // 기존 엔트리 확인
    const existingIdx = board.findIndex(e => e.userId === userId);
    let isNewRecord = false;

    if (existingIdx >= 0) {
      // 기존 기록보다 높으면 업데이트
      if (score > board[existingIdx].score) {
        board[existingIdx].score = score;
        board[existingIdx].details = details;
        board[existingIdx].updatedAt = new Date();
        isNewRecord = true;
      }
    } else {
      // 새 엔트리 추가
      board.push({
        rank: 0,
        userId,
        username,
        score,
        category,
        details,
        updatedAt: new Date(),
      });
      isNewRecord = true;
    }

    // 정렬 및 순위 업데이트
    board.sort((a, b) => b.score - a.score);
    board.forEach((entry, idx) => {
      entry.rank = idx + 1;
    });

    // 최대 엔트리 수 제한
    if (board.length > this.MAX_ENTRIES) {
      board.length = this.MAX_ENTRIES;
    }

    const finalEntry = board.find(e => e.userId === userId);
    return {
      rank: finalEntry?.rank || -1,
      isNewRecord,
    };
  }

  /**
   * 리더보드 조회
   */
  getLeaderboard(
    category: LeaderboardCategory,
    limit: number = 20,
    offset: number = 0
  ): LeaderboardEntry[] {
    const board = this.boards.get(category)!;
    return board.slice(offset, offset + limit);
  }

  /**
   * 특정 유저 순위 조회
   */
  getUserRank(category: LeaderboardCategory, userId: string): LeaderboardEntry | null {
    const board = this.boards.get(category)!;
    return board.find(e => e.userId === userId) || null;
  }

  /**
   * 전체 카테고리별 상위 기록
   */
  getTopRecords(): Record<LeaderboardCategory, LeaderboardEntry | null> {
    const result: Partial<Record<LeaderboardCategory, LeaderboardEntry | null>> = {};

    for (const [category, board] of this.boards) {
      result[category] = board[0] || null;
    }

    return result as Record<LeaderboardCategory, LeaderboardEntry | null>;
  }

  /**
   * 카테고리별 아이콘 및 설명
   */
  static getCategoryInfo(category: LeaderboardCategory): {
    icon: string;
    name: string;
    description: string;
    unit: string;
  } {
    const info: Record<LeaderboardCategory, { icon: string; name: string; description: string; unit: string }> = {
      highest_floor: {
        icon: '🏔️',
        name: '최고 층',
        description: '도달한 가장 높은 층',
        unit: '층',
      },
      fastest_win: {
        icon: '⚡',
        name: '최단 승리',
        description: '가장 빠른 클리어 턴',
        unit: '턴',
      },
      most_damage: {
        icon: '💥',
        name: '최대 피해',
        description: '한 게임에서 가한 총 피해',
        unit: '',
      },
      perfect_runs: {
        icon: '💎',
        name: '완벽한 런',
        description: '피해 없이 클리어한 횟수',
        unit: '회',
      },
      win_streak: {
        icon: '🔥',
        name: '연승 기록',
        description: '연속 승리 횟수',
        unit: '연승',
      },
      total_wins: {
        icon: '🏆',
        name: '총 승리',
        description: '누적 승리 횟수',
        unit: '승',
      },
    };

    return info[category];
  }
}

// ==================== 커뮤니티 허브 ====================

export class CommunityHub {
  private decks: Map<string, SharedDeck> = new Map();
  private replays: Map<string, SharedReplay> = new Map();
  private leaderboard: LeaderboardManager;
  private activities: Activity[] = [];

  constructor() {
    this.leaderboard = new LeaderboardManager();
  }

  /**
   * 덱 공유
   */
  shareDeck(
    cards: string[],
    creator: string,
    options: {
      name: string;
      description?: string;
      tags?: string[];
    }
  ): SharedDeck {
    const id = this.generateId();
    const code = DeckCodec.encode({ cards, name: options.name });

    const deck: SharedDeck = {
      id,
      code,
      name: options.name,
      creator,
      cards,
      description: options.description,
      tags: options.tags || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      stats: {
        views: 0,
        copies: 0,
        likes: 0,
      },
      ratings: [],
      comments: [],
    };

    this.decks.set(id, deck);
    this.addActivity({
      id: this.generateId(),
      type: 'deck_shared',
      userId: creator,
      username: creator,
      targetId: id,
      targetType: 'deck',
      description: `${creator}님이 "${options.name}" 덱을 공유했습니다`,
      createdAt: new Date(),
    });

    return deck;
  }

  /**
   * 덱 코드로 가져오기
   */
  importDeck(code: string): { cards: string[]; name: string } | null {
    return DeckCodec.decode(code);
  }

  /**
   * 리플레이 공유
   */
  shareReplay(
    replayData: ReplayData,
    creator: string,
    options: {
      title: string;
      description?: string;
    }
  ): SharedReplay {
    const id = this.generateId();
    const compressed = ReplayCompressor.compress(replayData);
    const code = ReplayCompressor.generateShareCode(compressed);

    const replay: SharedReplay = {
      id,
      code,
      title: options.title,
      creator,
      description: options.description,
      replayData: compressed,
      metadata: this.generateReplayMetadata(replayData),
      createdAt: new Date(),
      views: 0,
      likes: 0,
      comments: [],
    };

    this.replays.set(id, replay);
    this.addActivity({
      id: this.generateId(),
      type: 'replay_shared',
      userId: creator,
      username: creator,
      targetId: id,
      targetType: 'replay',
      description: `${creator}님이 "${options.title}" 리플레이를 공유했습니다`,
      createdAt: new Date(),
    });

    return replay;
  }

  private generateReplayMetadata(replay: ReplayData): ReplayMetadata {
    const cardUsage: Record<string, number> = {};
    const keyMoments: Array<{ turn: number; description: string }> = [];

    for (const turn of replay.turns) {
      for (const action of turn.actions) {
        if (action.type === 'play' && action.cardId) {
          cardUsage[action.cardId] = (cardUsage[action.cardId] || 0) + 1;
        }

        // 핵심 순간 감지
        if (action.type === 'attack') {
          const damage = action.value || 0;
          if (damage >= 20) {
            keyMoments.push({
              turn: turn.turn,
              description: `강력한 공격! ${damage} 피해`,
            });
          }
        }
      }
    }

    return {
      duration: replay.turns.length,
      cardUsage,
      keyMoments: keyMoments.slice(0, 5),
    };
  }

  /**
   * 덱 평가
   */
  rateDeck(
    deckId: string,
    userId: string,
    username: string,
    score: number,
    review?: string
  ): boolean {
    const deck = this.decks.get(deckId);
    if (!deck) return false;

    // 기존 평가 확인
    const existingIdx = deck.ratings.findIndex(r => r.userId === userId);
    if (existingIdx >= 0) {
      deck.ratings[existingIdx].score = score;
      deck.ratings[existingIdx].review = review;
    } else {
      deck.ratings.push({
        id: this.generateId(),
        userId,
        username,
        score,
        review,
        createdAt: new Date(),
      });
    }

    this.addActivity({
      id: this.generateId(),
      type: 'rating',
      userId,
      username,
      targetId: deckId,
      targetType: 'deck',
      description: `${username}님이 "${deck.name}" 덱에 ${score}점을 주었습니다`,
      createdAt: new Date(),
    });

    return true;
  }

  /**
   * 댓글 추가
   */
  addComment(
    targetId: string,
    targetType: 'deck' | 'replay',
    userId: string,
    username: string,
    content: string
  ): Comment | null {
    const target = targetType === 'deck'
      ? this.decks.get(targetId)
      : this.replays.get(targetId);

    if (!target) return null;

    const comment: Comment = {
      id: this.generateId(),
      userId,
      username,
      content,
      createdAt: new Date(),
    };

    target.comments.push(comment);

    this.addActivity({
      id: this.generateId(),
      type: 'comment',
      userId,
      username,
      targetId,
      targetType,
      description: `${username}님이 댓글을 남겼습니다`,
      createdAt: new Date(),
    });

    return comment;
  }

  /**
   * 트렌딩 덱 조회
   */
  getTrendingDecks(limit: number = 10): SharedDeck[] {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    return Array.from(this.decks.values())
      .filter(d => d.createdAt > oneWeekAgo)
      .sort((a, b) => {
        const scoreA = a.stats.views + a.stats.likes * 3 + a.stats.copies * 5;
        const scoreB = b.stats.views + b.stats.likes * 3 + b.stats.copies * 5;
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  /**
   * 커뮤니티 통계
   */
  getStats(): CommunityStats {
    const uniqueUsers = new Set<string>();
    for (const deck of this.decks.values()) {
      uniqueUsers.add(deck.creator);
    }
    for (const replay of this.replays.values()) {
      uniqueUsers.add(replay.creator);
    }

    return {
      totalDecks: this.decks.size,
      totalReplays: this.replays.size,
      totalUsers: uniqueUsers.size,
      recentActivity: this.activities.slice(-20),
      trendingDecks: this.getTrendingDecks(5),
      trendingReplays: Array.from(this.replays.values())
        .sort((a, b) => b.views - a.views)
        .slice(0, 5),
    };
  }

  /**
   * 리더보드 접근
   */
  getLeaderboard(): LeaderboardManager {
    return this.leaderboard;
  }

  private addActivity(activity: Activity): void {
    this.activities.push(activity);
    if (this.activities.length > 1000) {
      this.activities = this.activities.slice(-500);
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /**
   * 덱 검색
   */
  searchDecks(query: {
    name?: string;
    tags?: string[];
    creator?: string;
    minRating?: number;
  }): SharedDeck[] {
    let results = Array.from(this.decks.values());

    if (query.name) {
      const nameLower = query.name.toLowerCase();
      results = results.filter(d => d.name.toLowerCase().includes(nameLower));
    }

    if (query.tags && query.tags.length > 0) {
      results = results.filter(d =>
        query.tags!.some(tag => d.tags.includes(tag))
      );
    }

    if (query.creator) {
      results = results.filter(d => d.creator === query.creator);
    }

    if (query.minRating) {
      results = results.filter(d => {
        if (d.ratings.length === 0) return false;
        const avg = d.ratings.reduce((sum, r) => sum + r.score, 0) / d.ratings.length;
        return avg >= query.minRating!;
      });
    }

    return results;
  }
}

// ==================== 팩토리 함수 ====================

export function createCommunityHub(): CommunityHub {
  return new CommunityHub();
}

export function createDeckCodec(): typeof DeckCodec {
  return DeckCodec;
}

export function createLeaderboardManager(): LeaderboardManager {
  return new LeaderboardManager();
}
