/**
 * 性能监控工具
 *
 * 功能：
 * 1. 收集 Web Vitals 核心指标（FCP、LCP、CLS、TTFB、INP）
 * 2. 在控制台输出性能数据，便于开发调试
 * 3. 上报到百度统计和自建后端（条件上报策略）
 *
 * 条件上报策略：
 * - "poor" / "needs-improvement" 指标 → 100% 上报
 * - "good" 指标 → 采样上报（默认 10%）
 * - 排除 localhost、测试环境、内部用户
 * - 开发环境仅控制台输出
 *
 * 指标说明：
 * - FCP (First Contentful Paint): 首次内容绘制，目标 < 1.8s
 * - LCP (Largest Contentful Paint): 最大内容绘制，目标 < 2.5s
 * - CLS (Cumulative Layout Shift): 累积布局偏移，目标 < 0.1
 * - TTFB (Time to First Byte): 首字节时间，目标 < 800ms
 * - INP (Interaction to Next Paint): 交互到下次绘制，目标 < 200ms
 */

import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';

/**
 * 分析平台配置接口
 */
interface AnalyticsConfig {
  enabled: boolean;
  sampleRate: number;
  baiduTongjiId: string;
  isDev: boolean;
}

/**
 * 读取分析平台配置（从环境变量）
 */
function getAnalyticsConfig(): AnalyticsConfig {
  return {
    enabled: import.meta.env.VITE_ANALYTICS_ENABLED === 'true',
    sampleRate: parseFloat(import.meta.env.VITE_ANALYTICS_SAMPLE_RATE || '0.1'),
    baiduTongjiId: import.meta.env.VITE_BAIDU_TONGJI_ID || '',
    isDev: import.meta.env.DEV,
  };
}

/**
 * 判断是否为内部用户/测试环境
 */
export function isInternalUser(): boolean {
  return (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.search.includes('test=true') ||
    window.location.search.includes('debug=true') ||
    localStorage.getItem('user_type') === 'internal' ||
    sessionStorage.getItem('is_test_mode') === 'true'
  );
}

/**
 * 判断是否应该上报该指标（条件上报核心逻辑）
 */
export function shouldReportMetric(metric: Metric, config: AnalyticsConfig): boolean {
  // 开发环境：不上报
  if (config.isDev) return false;

  // 配置禁用：不上报
  if (!config.enabled) return false;

  // 排除内部用户/测试环境
  if (isInternalUser()) return false;

  // 策略1：性能差的指标 100% 上报
  if (metric.rating === 'poor' || metric.rating === 'needs-improvement') {
    return true;
  }

  // 策略2："good" 指标采样上报
  if (metric.rating === 'good') {
    return Math.random() < config.sampleRate;
  }

  return false;
}

/**
 * 上报到百度统计
 */
export function reportToBaidu(metric: Metric) {
  if (typeof window._hmt === 'undefined' || !window._hmt.push) {
    console.warn('[Web Vitals] 百度统计未加载');
    return;
  }

  window._hmt.push([
    '_trackEvent',
    'web_vitals',
    metric.name,
    String(Math.round(metric.value)),
    metric.rating,
  ]);
}

/**
 * 智能上报函数：根据条件决定是否上报
 */
function sendToAnalytics(metric: Metric) {
  const config = getAnalyticsConfig();

  // 开发环境：仅控制台输出
  if (config.isDev) {
    console.log(`[Web Vitals] ${metric.name}: ${metric.value} (${metric.rating})`, metric);
    return;
  }

  // 判断是否应该上报
  if (!shouldReportMetric(metric, config)) {
    console.log(`[Web Vitals] 跳过上报: ${metric.name} (${metric.rating})`);
    return;
  }

  // 上报到百度统计
  reportToBaidu(metric);

  // 生产环境控制台也输出（便于调试）
  if (config.enabled) {
    console.log(`[Web Vitals] 已上报百度统计: ${metric.name}: ${metric.value} (${metric.rating})`);
  }
}

/**
 * 页面关闭时上报（百度统计不支持此场景，预留以便后续扩展）
 */
function setupPageUnloadReporting() {
  // 百度统计不支持页面关闭时的数据上报
  // 如需自建后端支持，可在此处实现
}

/**
 * 报告 Web Vitals 性能指标
 * 应在应用入口（main.tsx）调用
 */
export function reportWebVitals() {
  // 设置页面关闭时上报
  setupPageUnloadReporting();

  // 注册 Web Vitals 监听器
  onCLS(sendToAnalytics);
  onFCP(sendToAnalytics);
  onINP(sendToAnalytics);
  onLCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
}

/**
 * 性能阈值常量（用于评估是否达标）
 */
export const PERFORMANCE_THRESHOLDS = {
  FCP: { good: 1800, needsImprovement: 3000 },
  LCP: { good: 2500, needsImprovement: 4000 },
  CLS: { good: 0.1, needsImprovement: 0.25 },
  TTFB: { good: 800, needsImprovement: 1800 },
  INP: { good: 200, needsImprovement: 500 },
} as const;

/**
 * 评估性能指标是否达标
 */
export function evaluateMetric(name: string, value: number): 'good' | 'needsImprovement' | 'poor' {
  const thresholds = PERFORMANCE_THRESHOLDS[name as keyof typeof PERFORMANCE_THRESHOLDS];
  if (!thresholds) return 'good';

  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.needsImprovement) return 'needsImprovement';
  return 'poor';
}
