import { describe, it, expect } from 'vitest';
import { ADMIN_PREFIX, adminPath } from '../../../src/constants/routes';

describe('路由常量', () => {
  describe('ADMIN_PREFIX', () => {
    it('应该有值', () => {
      expect(ADMIN_PREFIX).toBeDefined();
      expect(typeof ADMIN_PREFIX).toBe('string');
      expect(ADMIN_PREFIX.length).toBeGreaterThan(0);
    });

    it('应该有默认值 "admin"', () => {
      expect(ADMIN_PREFIX).toBe('admin');
    });
  });

  describe('adminPath', () => {
    it('应该生成正确的路径', () => {
      expect(adminPath('login')).toBe('/admin/login');
      expect(adminPath('dashboard')).toBe('/admin/dashboard');
      expect(adminPath('matches')).toBe('/admin/matches');
      expect(adminPath('teams')).toBe('/admin/teams');
      expect(adminPath('stream')).toBe('/admin/stream');
      expect(adminPath('schedule')).toBe('/admin/schedule');
    });

    it('应该以斜杠开头', () => {
      expect(adminPath('login')).toMatch(/^\//);
    });

    it('应该正确拼接前缀和路径', () => {
      const path = adminPath('some/path');
      expect(path).toContain(ADMIN_PREFIX);
      expect(path).toContain('some/path');
    });
  });
});
