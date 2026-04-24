import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import type { ThanksData } from '@/data/types';

vi.hoisted(() => {
  const mockThanksData: ThanksData = {
    sponsors: [
      { id: 1, sponsorName: '斗鱼官方', sponsorContent: '7W' },
      { id: 2, sponsorName: '神秘老板', sponsorContent: '5K' },
      { id: 3, sponsorName: '秀木老板', sponsorContent: '2W' },
      { id: 4, sponsorName: '玩一下鼓励员老板', sponsorContent: '2K' },
      { id: 5, sponsorName: '洞庭湖里的平头老板', sponsorContent: '3K' },
      { id: 6, sponsorName: '尊师hkl', sponsorContent: '2K' },
      { id: 7, sponsorName: '为何如此衰', sponsorContent: '8K', specialAward: '8强每个队伍1K' },
      {
        id: 8,
        sponsorName: '董B登',
        sponsorContent: '1K',
        specialAward: '冠军每人750g蓝莓果干+250g参片',
      },
      { id: 9, sponsorName: '只会打炉石的SteveD', sponsorContent: '1K' },
      { id: 10, sponsorName: '深红', sponsorContent: '2K' },
      { id: 11, sponsorName: 'MT', sponsorContent: '2K', specialAward: '4强每人一份贡菜千层肚' },
      {
        id: 12,
        sponsorName: '不减到75kg不改名',
        sponsorContent: '1K',
        specialAward: '最佳C/D级（参赛选手评）',
      },
      {
        id: 13,
        sponsorName: '你真的是厉害（天谎星）',
        sponsorContent: '500',
        specialAward: '爆种奖',
      },
      {
        id: 14,
        sponsorName: '直播间最漂亮的寡妇',
        sponsorContent: '1K',
        specialAward: '最拉辅助和最强辅助，一人一半',
      },
      { id: 15, sponsorName: '热心市民小曹', sponsorContent: '2K' },
      { id: 16, sponsorName: '斗驴启动', sponsorContent: '1K', specialAward: '亚军SVP' },
      { id: 17, sponsorName: '小金拉黑属实不行', sponsorContent: '500', specialAward: '爆种奖' },
      {
        id: 18,
        sponsorName: '苏唐',
        sponsorContent: '1K',
        specialAward: '瑞士轮第一个淘汰的队伍5人平分',
      },
      {
        id: 19,
        sponsorName: 'c酱的骚刚',
        sponsorContent: '600',
        specialAward: '弹幕票选表现最差A/S，300R/人',
      },
      { id: 20, sponsorName: '人生梦想', sponsorContent: '1K', specialAward: '冠军打野' },
    ],
    staff: [
      { id: 1, name: '（待补充）', role: '赛事策划' },
      { id: 2, name: '（待补充）', role: '技术支持' },
      { id: 3, name: '（待补充）', role: '运营推广' },
      { id: 4, name: '（待补充）', role: '数据统计' },
    ],
  };
  Object.defineProperty(window, 'THANKS_DATA', {
    value: mockThanksData,
    writable: true,
    configurable: true,
  });
});

beforeEach(() => {
  window.APP_CONFIG = {
    API_BASE_URL: 'http://localhost:3000/api',
    APP_NAME: '驴酱杯赛事',
    VERSION: '1.0.0',
    GITHUB_CDN_BASE: 'https://cdn.jsdmirror.com/gh/forzenfox/lvjiang-cup@main',
  };

  // Mock matchMedia for prefers-reduced-motion
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

afterEach(() => {
  cleanup();
});
