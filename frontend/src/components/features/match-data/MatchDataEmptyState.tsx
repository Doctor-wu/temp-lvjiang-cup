import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, ArrowLeft } from 'lucide-react';
import { ADMIN_PREFIX, adminPath } from '@/constants/routes';

interface MatchDataEmptyStateProps {
  matchId?: string;
}

const MatchDataEmptyState: React.FC<MatchDataEmptyStateProps> = ({ matchId }) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (matchId && window.location.pathname.includes(`/${ADMIN_PREFIX}/`)) {
      navigate(adminPath('matches'));
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <div className="w-24 h-24 mb-6 text-gray-600">
        <Database className="w-full h-full" />
      </div>

      <h2 className="text-2xl font-bold text-white mb-3">暂无对战数据</h2>

      <p className="text-gray-400 text-center max-w-md mb-8">管理员尚未上传该对战的详细数据</p>

      <button
        onClick={handleBack}
        className="flex items-center gap-2 px-6 py-3 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-white rounded-lg transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        返回上一页
      </button>
    </div>
  );
};

export default MatchDataEmptyState;
