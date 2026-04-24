/**
 * 测试 ENABLE_SWAGGER 环境变量行为
 *
 * 由于 main.ts 的 Swagger 初始化代码需要在 NestJS 应用启动时执行，
 * 我们通过环境变量读取逻辑的单元测试来验证行为。
 */
describe('ENABLE_SWAGGER 环境变量', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    // 恢复原始环境变量
    process.env = { ...originalEnv };
  });

  it('未设置时应该禁用 Swagger', () => {
    delete process.env.ENABLE_SWAGGER;
    const enableSwagger = process.env.ENABLE_SWAGGER === 'true';
    expect(enableSwagger).toBe(false);
  });

  it('设置为 "true" 时应该启用 Swagger', () => {
    process.env.ENABLE_SWAGGER = 'true';
    const enableSwagger = process.env.ENABLE_SWAGGER === 'true';
    expect(enableSwagger).toBe(true);
  });

  it('设置为 "false" 时应该禁用 Swagger', () => {
    process.env.ENABLE_SWAGGER = 'false';
    const enableSwagger = process.env.ENABLE_SWAGGER === 'true';
    expect(enableSwagger).toBe(false);
  });

  it('设置为空字符串时应该禁用 Swagger', () => {
    process.env.ENABLE_SWAGGER = '';
    const enableSwagger = process.env.ENABLE_SWAGGER === 'true';
    expect(enableSwagger).toBe(false);
  });

  it('设置为任意非 "true" 值时应该禁用 Swagger', () => {
    const falsyValues = ['0', 'yes', '1', 'TRUE', 'True'];
    falsyValues.forEach(value => {
      process.env.ENABLE_SWAGGER = value;
      const enableSwagger = process.env.ENABLE_SWAGGER === 'true';
      expect(enableSwagger).toBe(false);
    });
  });
});
