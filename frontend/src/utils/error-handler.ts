import { AxiosError } from 'axios';
import { toast } from 'sonner';
import { adminPath } from '../constants/routes';

/**
 * HTTP 错误码枚举
 */
export enum HttpStatusCode {
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  METHOD_NOT_ALLOWED = 405,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504,
}

/**
 * 错误类型枚举
 */
export enum ErrorType {
  NETWORK = 'NETWORK',
  TIMEOUT = 'TIMEOUT',
  SERVER = 'SERVER',
  CLIENT = 'CLIENT',
  AUTH = 'AUTH',
  VALIDATION = 'VALIDATION',
  UNKNOWN = 'UNKNOWN',
}

/**
 * 应用错误类
 */
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly statusCode?: number;
  public readonly originalError?: Error;
  public readonly data?: unknown;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    statusCode?: number,
    originalError?: Error,
    data?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.statusCode = statusCode;
    this.originalError = originalError;
    this.data = data;

    // 确保原型链正确
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /**
   * 检查是否为特定类型的错误
   */
  isType(type: ErrorType): boolean {
    return this.type === type;
  }

  /**
   * 检查是否为特定状态码
   */
  isStatus(code: number): boolean {
    return this.statusCode === code;
  }
}

/**
 * HTTP 错误消息映射
 */
const HTTP_ERROR_MESSAGES: Record<number, string> = {
  [HttpStatusCode.BAD_REQUEST]: '请求参数错误，请检查输入',
  [HttpStatusCode.UNAUTHORIZED]: '登录已过期，请重新登录',
  [HttpStatusCode.FORBIDDEN]: '您没有权限执行此操作',
  [HttpStatusCode.NOT_FOUND]: '请求的资源不存在',
  [HttpStatusCode.METHOD_NOT_ALLOWED]: '请求方法不允许',
  [HttpStatusCode.CONFLICT]: '资源冲突，请稍后再试',
  [HttpStatusCode.UNPROCESSABLE_ENTITY]: '数据验证失败，请检查输入',
  [HttpStatusCode.TOO_MANY_REQUESTS]: '请求过于频繁，请稍后再试',
  [HttpStatusCode.INTERNAL_SERVER_ERROR]: '服务器内部错误，请稍后再试',
  [HttpStatusCode.BAD_GATEWAY]: '网关错误，请稍后再试',
  [HttpStatusCode.SERVICE_UNAVAILABLE]: '服务暂时不可用，请稍后再试',
  [HttpStatusCode.GATEWAY_TIMEOUT]: '请求超时，请检查网络连接',
};

/**
 * 网络错误检测
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    // 超时错误单独处理，不算网络错误
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return false;
    }
    return !error.response && error.code === 'ERR_NETWORK';
  }
  return false;
}

/**
 * 超时错误检测
 */
export function isTimeoutError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    return error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';
  }
  return false;
}

/**
 * 获取 HTTP 错误消息
 */
export function getHttpErrorMessage(statusCode: number): string {
  return HTTP_ERROR_MESSAGES[statusCode] || `请求失败 (${statusCode})`;
}

/**
 * 解析 Axios 错误
 */
export function parseAxiosError(error: AxiosError): AppError {
  // 网络错误
  if (isNetworkError(error)) {
    return new AppError('网络连接失败，请检查网络设置', ErrorType.NETWORK, undefined, error);
  }

  // 超时错误
  if (isTimeoutError(error)) {
    return new AppError('请求超时，请稍后再试', ErrorType.TIMEOUT, undefined, error);
  }

  // 服务器返回错误
  if (error.response) {
    const { status, data } = error.response;

    const message = (data as { message?: string })?.message || getHttpErrorMessage(status);

    // 根据状态码分类错误
    let type = ErrorType.SERVER;
    if (status === HttpStatusCode.UNAUTHORIZED) {
      type = ErrorType.AUTH;
    } else if (
      status === HttpStatusCode.BAD_REQUEST ||
      status === HttpStatusCode.UNPROCESSABLE_ENTITY
    ) {
      type = ErrorType.VALIDATION;
    } else if (status >= 400 && status < 500) {
      type = ErrorType.CLIENT;
    }

    return new AppError(message, type, status, error, data);
  }

  // 请求配置错误
  if (error.request) {
    return new AppError('请求发送失败，请检查网络连接', ErrorType.NETWORK, undefined, error);
  }

  // 其他错误
  return new AppError(error.message || '发生未知错误', ErrorType.UNKNOWN, undefined, error);
}

/**
 * 错误处理器配置
 */
export interface ErrorHandlerConfig {
  /** 是否显示 toast 提示 */
  showToast?: boolean;
  /** 是否重定向到登录页（401 错误） */
  redirectToLogin?: boolean;
  /** 自定义错误处理 */
  onError?: (error: AppError) => void;
  /** 401 错误处理 */
  onUnauthorized?: () => void;
  /** 403 错误处理 */
  onForbidden?: () => void;
  /** 404 错误处理 */
  onNotFound?: () => void;
  /** 500 错误处理 */
  onServerError?: () => void;
}

/**
 * 全局错误处理器
 */
export function handleError(error: unknown, config: ErrorHandlerConfig = {}): AppError {
  const {
    showToast = true,
    redirectToLogin = true,
    onError,
    onUnauthorized,
    onForbidden,
    onNotFound,
    onServerError,
  } = config;

  // 转换错误为 AppError
  let appError: AppError;
  if (error instanceof AppError) {
    appError = error;
  } else if (error instanceof AxiosError) {
    appError = parseAxiosError(error);
  } else if (error instanceof Error) {
    appError = new AppError(error.message, ErrorType.UNKNOWN, undefined, error);
  } else {
    appError = new AppError('发生未知错误', ErrorType.UNKNOWN);
  }

  // 调用自定义错误处理
  onError?.(appError);

  // 根据状态码执行特定处理
  switch (appError.statusCode) {
    case HttpStatusCode.UNAUTHORIZED:
      onUnauthorized?.();
      if (redirectToLogin) {
        localStorage.removeItem('token');
        const currentPath = window.location.pathname;
        if (!currentPath.includes(adminPath('login'))) {
          window.location.href = adminPath('login');
        }
      }
      break;
    case HttpStatusCode.FORBIDDEN:
      onForbidden?.();
      break;
    case HttpStatusCode.NOT_FOUND:
      onNotFound?.();
      break;
    case HttpStatusCode.INTERNAL_SERVER_ERROR:
    case HttpStatusCode.BAD_GATEWAY:
    case HttpStatusCode.SERVICE_UNAVAILABLE:
    case HttpStatusCode.GATEWAY_TIMEOUT:
      onServerError?.();
      break;
  }

  // 显示 toast 提示
  if (showToast) {
    showErrorToast(appError);
  }

  return appError;
}

/**
 * 显示错误 Toast
 */
export function showErrorToast(error: AppError): void {
  const title = getErrorTitle(error.type);
  toast.error(title, {
    description: error.message,
    duration: 5000,
  });
}

/**
 * 获取错误标题
 */
function getErrorTitle(type: ErrorType): string {
  const titles: Record<ErrorType, string> = {
    [ErrorType.NETWORK]: '网络错误',
    [ErrorType.TIMEOUT]: '请求超时',
    [ErrorType.SERVER]: '服务器错误',
    [ErrorType.CLIENT]: '请求错误',
    [ErrorType.AUTH]: '认证错误',
    [ErrorType.VALIDATION]: '验证错误',
    [ErrorType.UNKNOWN]: '未知错误',
  };
  return titles[type];
}

/**
 * 安全执行函数 - 捕获并处理错误
 */
export async function safeExecute<T>(
  fn: () => Promise<T>,
  config?: ErrorHandlerConfig
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    handleError(error, config);
    return null;
  }
}

/**
 * 创建带错误处理的请求包装器
 */
export function createErrorHandler(defaultConfig?: ErrorHandlerConfig) {
  return (error: unknown, config?: ErrorHandlerConfig) => {
    return handleError(error, { ...defaultConfig, ...config });
  };
}

export default {
  AppError,
  ErrorType,
  HttpStatusCode,
  handleError,
  parseAxiosError,
  isNetworkError,
  isTimeoutError,
  getHttpErrorMessage,
  safeExecute,
  createErrorHandler,
  showErrorToast,
};
