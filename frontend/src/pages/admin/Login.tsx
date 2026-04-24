import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '../../components/ui/card';
import { Trophy, Loader2, User, Lock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { adminPath } from '../../constants/routes';

/**
 * 表单验证错误接口
 */
interface FormErrors {
  username?: string;
  password?: string;
}

/**
 * 管理员登录页面
 *
 * 功能：
 * - 集成 useAuth Hook 进行认证
 * - 调用真实登录 API
 * - 表单验证（用户名和密码必填）
 * - 错误提示
 * - 登录成功后跳转到 /admin/dashboard
 * - 已登录用户自动跳转
 */
const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, loading: authLoading, error: authError, clearError } = useAuth();

  // 表单状态
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState('');

  // 如果用户已登录，自动跳转到管理后台
  useEffect(() => {
    if (isAuthenticated) {
      navigate(adminPath('dashboard'), { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // 同步 authError 到 submitError
  useEffect(() => {
    if (authError) {
      setSubmitError(authError);
    }
  }, [authError]);

  /**
   * 验证表单
   * @returns 是否验证通过
   */
  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!username.trim()) {
      errors.username = '请输入用户名';
    }

    if (!password) {
      errors.password = '请输入密码';
    } else if (password.length < 6) {
      errors.password = '密码长度至少为 6 位';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * 处理输入变化，清除对应字段的错误
   */
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    if (formErrors.username) {
      setFormErrors(prev => ({ ...prev, username: undefined }));
    }
    if (submitError) {
      setSubmitError('');
      clearError();
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (formErrors.password) {
      setFormErrors(prev => ({ ...prev, password: undefined }));
    }
    if (submitError) {
      setSubmitError('');
      clearError();
    }
  };

  /**
   * 处理登录提交
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    clearError();

    // 表单验证
    if (!validateForm()) {
      return;
    }

    try {
      await login({ username: username.trim(), password });
      // 登录成功后的跳转由 useAuth 处理
    } catch {
      // 错误已由 useAuth 设置，这里不需要额外处理
      // 保持表单状态以便用户重新输入
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-800 border-gray-700">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Trophy className="h-12 w-12 text-secondary" />
          </div>
          <CardTitle className="text-2xl text-white">管理员登录</CardTitle>
          <CardDescription className="text-gray-400">
            请输入用户名和密码访问管理后台
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {/* 用户名输入 */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-1">
                用户名
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={handleUsernameChange}
                  placeholder="请输入用户名"
                  disabled={authLoading}
                  className={`w-full pl-10 pr-3 py-2 bg-gray-700 border rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    formErrors.username
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-600 focus:ring-secondary'
                  }`}
                />
              </div>
              {formErrors.username && (
                <p className="text-red-500 text-sm mt-1">{formErrors.username}</p>
              )}
            </div>

            {/* 密码输入 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                密码
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="请输入密码"
                  disabled={authLoading}
                  className={`w-full pl-10 pr-3 py-2 bg-gray-700 border rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    formErrors.password
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-600 focus:ring-secondary'
                  }`}
                />
              </div>
              {formErrors.password && (
                <p className="text-red-500 text-sm mt-1">{formErrors.password}</p>
              )}
            </div>

            {/* 全局错误提示 */}
            {submitError && (
              <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-md">
                <p className="text-red-400 text-sm text-center">{submitError}</p>
              </div>
            )}

            {/* 登录按钮 */}
            <Button
              type="submit"
              disabled={authLoading}
              className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {authLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  登录中...
                </>
              ) : (
                '登录'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;
