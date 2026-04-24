import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import * as compression from 'compression';
import * as fs from 'fs';
import * as path from 'path';

const logger = new Logger('Bootstrap');

const REQUIRED_ENV_VARS = [
  'NODE_ENV',
  'PORT',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'ADMIN_USERNAME',
  'ADMIN_PASSWORD',
  'DATABASE_PATH',
  'CORS_ORIGIN',
];

/**
 * 加载环境变量配置文件
 * 优先从环境变量读取，如果不存在则尝试从 .env 文件加载
 */
async function loadEnvironmentConfig() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const envFileName = `.env.${nodeEnv}`;
  const envFilePath = path.resolve(process.cwd(), envFileName);

  logger.log(`当前环境: ${nodeEnv}`);

  // 检查是否所有必需的环境变量都已通过环境变量传入
  const missingFromEnv = REQUIRED_ENV_VARS.filter((varName) => !process.env[varName]);

  // 如果所有变量都已设置，直接返回（支持纯环境变量模式）
  if (missingFromEnv.length === 0) {
    logger.log('✅ 所有配置已从环境变量加载');
    return;
  }

  // 如果有缺失，尝试从文件加载
  logger.log(`尝试从配置文件加载: ${envFileName}`);

  if (!fs.existsSync(envFilePath)) {
    logger.warn(`⚠️ 配置文件不存在: ${envFileName}`);
    logger.warn('将尝试从 .env 文件加载...');

    // 尝试加载默认的 .env 文件
    const defaultEnvPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(defaultEnvPath)) {
      require('dotenv').config({ path: defaultEnvPath });
      logger.log('✅ 已从 .env 文件加载配置');
    } else {
      logger.warn('未找到 .env 文件');
    }
  } else {
    // 加载环境特定的配置文件
    require('dotenv').config({ path: envFilePath });
    logger.log(`✅ 已从 ${envFileName} 加载配置`);
  }

  // 再次检查是否所有变量都已设置
  const stillMissing = REQUIRED_ENV_VARS.filter((varName) => !process.env[varName]);

  if (stillMissing.length > 0) {
    logger.error(`❌ 缺少必需的环境变量: ${stillMissing.join(', ')}`);
    logger.error('');
    logger.error('请通过以下方式之一配置:');
    logger.error('');
    logger.error('方式1 - 环境变量（推荐用于 Docker）:');
    stillMissing.forEach((varName) => {
      logger.error(`  export ${varName}=your_value`);
    });
    logger.error('');
    logger.error('方式2 - 配置文件:');
    logger.error(`  创建 ${envFileName} 文件并添加配置`);
    logger.error('');

    process.exit(1);
  }
}

async function validateEnvironmentConfig() {
  logger.log('');
  logger.log('验证环境变量...');

  const missingVars = REQUIRED_ENV_VARS.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    logger.error(`❌ 缺少必需的环境变量: ${missingVars.join(', ')}`);
    process.exit(1);
  }

  logger.log('✅ 所有必需的环境变量已配置');
  logger.log('');
}

async function bootstrap() {
  await loadEnvironmentConfig();
  await validateEnvironmentConfig();

  const nodeEnv = process.env.NODE_ENV || 'development';
  const logLevelEnv = process.env.LOG_LEVEL || 'debug';

  // 根据环境配置日志级别：生产环境默认只显示 warn 和 error 级别
  let logLevels: ('log' | 'error' | 'warn' | 'debug' | 'verbose')[];

  if (logLevelEnv === 'warn') {
    logLevels = ['warn', 'error', 'log'];
  } else if (logLevelEnv === 'error') {
    logLevels = ['error'];
  } else if (logLevelEnv === 'log') {
    logLevels = ['log', 'error', 'warn'];
  } else if (nodeEnv === 'production') {
    // 生产环境：只显示 warn 和 error，不显示 debug 日志
    logLevels = ['warn', 'error', 'log'];
  } else {
    // 开发环境：显示所有级别包括 debug
    logLevels = ['log', 'error', 'warn', 'debug', 'verbose'];
  }

  const app = await NestFactory.create(AppModule, {
    logger: logLevels,
  });

  // 启用gzip压缩中间件，减少响应体大小，提升传输性能
  app.use(compression());

  app.enableCors({
    origin: process.env.CORS_ORIGIN!,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: false,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  app.useGlobalInterceptors(new TransformInterceptor());

  app.setGlobalPrefix('api');

  const enableSwagger = process.env.ENABLE_SWAGGER === 'true';

  const port = parseInt(process.env.PORT!, 10);

  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('驴酱杯赛事 API')
      .setDescription('驴酱杯LOL娱乐赛事网站后端 API 文档')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    logger.log(`Swagger 文档地址：http://0.0.0.0:${port}/api/docs`);
  } else {
    logger.log('Swagger 文档已禁用 (设置 ENABLE_SWAGGER=true 启用)');
  }

  await app.listen(port, '0.0.0.0');
  logger.log(`应用启动于 http://0.0.0.0:${port}/api`);
  logger.log(`Swagger 文档地址：http://0.0.0.0:${port}/api/docs`);
}

bootstrap();
