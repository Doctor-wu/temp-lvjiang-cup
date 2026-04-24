import React, { useState } from 'react';
import { Match, Team } from '@/types';
import SwissRoundTree from './SwissRoundTree';

interface SwissStagePCProps {
  matches: Match[];
  teams: Team[];
  advancement?: {
    top8: string[];
    eliminated: string[];
    rankings?: { teamId: string; record: string; rank: number }[];
  };
  onMatchClick?: (match: Match) => void;
  className?: string;
  'data-testid'?: string;
}

const SwissStagePC: React.FC<SwissStagePCProps> = ({
  matches,
  teams,
  advancement,
  onMatchClick,
  className = '',
  'data-testid': testId = 'swiss-stage-pc',
}) => {
  const [activeTab, setActiveTab] = useState<'bo1' | 'bo3'>('bo1');

  return (
    <div className={className} data-testid={testId}>
      <SwissRoundTree
        matches={matches}
        teams={teams}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        advancement={advancement}
        onMatchClick={onMatchClick}
      />
    </div>
  );
};

export default SwissStagePC;
