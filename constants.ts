import { Spread, TarotCard, Tone } from './types';

// Helper to generate full deck
const suits = ['Wands', 'Cups', 'Swords', 'Pentacles'] as const;
const suitNamesCN: Record<string, string> = { 'Wands': '权杖', 'Cups': '圣杯', 'Swords': '宝剑', 'Pentacles': '星币' };

const majorArcanaCN = [
  '愚者', '魔术师', '女祭司', '皇后', '皇帝',
  '教皇', '恋人', '战车', '力量', '隐士',
  '命运之轮', '正义', '倒吊人', '死神', '节制',
  '恶魔', '高塔', '星星', '月亮', '太阳', '审判', '世界'
];

export const FULL_DECK: TarotCard[] = [
  ...majorArcanaCN.map((name, i) => ({
    id: `major-${i}`,
    name,
    suit: 'Major',
    number: i,
    imageSeed: 100 + i
  } as TarotCard)),
  ...suits.flatMap((suit, suitIndex) => 
    Array.from({ length: 14 }).map((_, i) => {
      const suitName = suitNamesCN[suit];
      let name = `${suitName} ${i + 1}`;
      if (i === 0) name = `${suitName}首牌`;
      if (i === 10) name = `${suitName}侍从`;
      if (i === 11) name = `${suitName}骑士`;
      if (i === 12) name = `${suitName}王后`;
      if (i === 13) name = `${suitName}国王`;
      return {
        id: `${suit}-${i}`,
        name,
        suit,
        number: i + 1,
        imageSeed: 200 + (suitIndex * 14) + i
      } as TarotCard;
    })
  )
];

export const SPREADS: Spread[] = [
  {
    id: 'single',
    name: '每日指引 (单张)',
    description: '快速指引，适合简单的是非题或今日运势。',
    cardCount: 1,
    positions: ['核心指引']
  },
  {
    id: 'three-time',
    name: '时间流 (三张)',
    description: '洞察事情的过去、现在与未来走向。',
    cardCount: 3,
    positions: ['过去', '现在', '未来']
  },
  {
    id: 'relationship',
    name: '关系牌阵 (四张)',
    description: '分析两人之间的关系现状与未来发展。',
    cardCount: 4,
    positions: ['你的状态', '对方状态', '关系现状', '未来走向']
  },
  {
    id: 'celtic',
    name: '凯尔特十字 (十张)',
    description: '全方位深度分析，适合复杂的重大问题。',
    cardCount: 10,
    positions: [
      '当前状态',
      '阻碍/挑战',
      '潜意识/基础',
      '过去的影响',
      '表意识/目标',
      '未来发展',
      '自我态度',
      '环境影响',
      '希望与恐惧',
      '最终结果'
    ]
  }
];

export const QUESTION_TEMPLATES = [
  "我和TA的关系接下来会怎样？",
  "我应该如何推进当前的事业？",
  "最近我的财运如何？",
  "我这周需要注意什么？",
  "我们还有复合的可能吗？"
];

export const TONE_CONFIG = {
  [Tone.GENTLE]: { label: '温暖治愈', color: 'text-pink-400' },
  [Tone.RATIONAL]: { label: '理性分析', color: 'text-blue-400' },
  [Tone.SPIRITUAL]: { label: '灵性指引', color: 'text-purple-400' },
};