import React from 'react';
import { Match, Team } from '@/types';
import { useIsMobile } from '@/hooks/useMediaQuery';
import SwissStagePC from './swiss/SwissStagePC';
import SwissStageMobile from './swiss/SwissStageMobile';

interface SwissStageProps {
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

const SwissStage: React.FC<SwissStageProps> = ({
  matches,
  teams,
  advancement,
  onMatchClick,
  className = '',
  'data-testid': testId = 'swiss-stage',
}) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <SwissStageMobile
        matches={matches}
        teams={teams}
        advancement={advancement}
        onMatchClick={onMatchClick}
        className={className}
        data-testid={`${testId}-mobile`}
      />
    );
  }

  return (
    <SwissStagePC
      matches={matches}
      teams={teams}
      advancement={advancement}
      onMatchClick={onMatchClick}
      className={className}
      data-testid={`${testId}-pc`}
    />
  );
};

export default SwissStage;
