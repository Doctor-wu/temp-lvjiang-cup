import React, { useState, useMemo } from 'react';
import { Match, Team, MatchStatus } from '@/types';
import { Card } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import { formatDateTime } from '@/utils/datetime';
import { swissRoundSlots, SwissRoundSlot } from './swissRoundSlots';
import MatchEditDialog from '@/pages/admin/components/MatchEditDialog';
import { SWISS_STAGE_CONFIG } from '@/constants/swissStageConfig';
import SwissRecordGroup from '@/components/features/swiss/SwissRecordGroup';

interface SwissStageVisualEditorProps {
  matches: Match[];
  teams: Team[];
  advancement?: {
    top8: string[];
    eliminated: string[];
    rankings?: { teamId: string; record: string; rank: number }[];
  };
  onMatchUpdate: (match: Match) => void;
  onMatchCreate?: (match: Omit<Match, 'id'>) => void;
  onMatchDelete?: (matchId: string) => void;
}

interface TeamLogoProps {
  team?: Team;
}

const TeamLogo: React.FC<TeamLogoProps> = ({ team }) => {
  if (!team?.logo) return <div className="w-5 h-5 rounded-full bg-gray-700" />;
  return <img src={team.logo} alt={team.name} className="w-5 h-5 rounded-full object-cover" />;
};

interface MatchStatusBadgeProps {
  status: MatchStatus;
}

const MatchStatusBadge: React.FC<MatchStatusBadgeProps> = ({ status }) => {
  const styles = {
    upcoming: 'bg-blue-900/40 text-blue-400 border-blue-700/30',
    ongoing: 'bg-green-900/50 text-green-400 border-green-700/30 animate-pulse',
    finished: 'bg-gray-700/50 text-gray-400 border-gray-600/30',
  };

  return (
    <span
      className={`absolute top-0 right-0 px-1.5 py-0.5 text-[10px] rounded-bl border ${styles[status]}`}
    >
      {status === 'upcoming' ? '未开始' : status === 'ongoing' ? '进行中' : '已结束'}
    </span>
  );
};

interface FixedSlotMatchCardProps {
  match: Match | null;
  teams: Team[];
  slot: SwissRoundSlot;
  slotIndex: number;
  onUpdate: (match: Match) => void;
  onCreate?: (match: Omit<Match, 'id'>) => void;
}

const FixedSlotMatchCard: React.FC<FixedSlotMatchCardProps> = ({
  match,
  teams,
  slot,
  slotIndex,
  onUpdate,
  onCreate,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const isEmpty = !match;

  const displayMatch = match || {
    id: `new-${slot.swissRecord}-${slotIndex}`,
    teamAId: '',
    teamBId: '',
    scoreA: 0,
    scoreB: 0,
    winnerId: null,
    round: slot.roundName,
    status: 'upcoming' as const,
    startTime: '',
    stage: 'swiss' as const,
    swissRecord: slot.swissRecord,
  };

  const teamA = teams.find(t => t.id === displayMatch.teamAId);
  const teamB = teams.find(t => t.id === displayMatch.teamBId);
  const isFinished = displayMatch.status === 'finished';

  const handleClick = () => {
    if (isEmpty && !onCreate) {
      return;
    }
    setIsDialogOpen(true);
  };

  const handleSave = (updatedMatch: Match) => {
    if (match) {
      onUpdate(updatedMatch);
    } else if (onCreate) {
      onCreate(updatedMatch);
    }
    return true;
  };

  const handleClose = () => {
    setIsDialogOpen(false);
  };

  if (isEmpty) {
    return (
      <>
        <div
          className="bg-gray-800/40 border-2 border-dashed border-gray-700 rounded-lg p-2.5 cursor-pointer hover:border-blue-500/50 hover:bg-gray-800/60 transition-colors min-h-[80px] flex items-center justify-center"
          onClick={handleClick}
        >
          <div className="text-center text-gray-500 text-sm">
            <span className="block text-lg mb-1">+</span>
            等待对阵
          </div>
        </div>
        {onCreate && (
          <MatchEditDialog
            match={displayMatch}
            teams={teams}
            isOpen={isDialogOpen}
            onClose={handleClose}
            onSave={handleSave}
          />
        )}
      </>
    );
  }

  return (
    <>
      <Card
        className="bg-gray-800/80 border-gray-700 p-2.5 hover:bg-gray-800 transition-colors group relative overflow-hidden cursor-pointer hover:border-blue-500/50"
        onClick={handleClick}
      >
        <MatchStatusBadge status={match.status} />
        {match.startTime && (
          <div className="absolute top-0 left-0 bg-gray-700/50 text-gray-400 text-[10px] px-1.5 py-0.5 rounded-br flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{formatDateTime(match.startTime)}</span>
          </div>
        )}
        <div className="flex flex-col gap-2 pt-4">
          <div
            className={`flex items-center justify-between ${match.winnerId === match.teamAId ? 'opacity-100' : isFinished ? 'opacity-50' : 'opacity-100'}`}
          >
            <div className="flex items-center gap-2">
              <TeamLogo team={teamA} />
              <span
                className={`text-sm font-medium ${match.winnerId === match.teamAId ? 'text-yellow-400' : 'text-gray-300'}`}
              >
                {teamA?.name || '待定'}
              </span>
            </div>
            <span
              className={`text-sm font-bold ${match.winnerId === match.teamAId ? 'text-yellow-400' : 'text-gray-500'}`}
            >
              {match.scoreA}
            </span>
          </div>

          <div
            className={`flex items-center justify-between ${match.winnerId === match.teamBId ? 'opacity-100' : isFinished ? 'opacity-50' : 'opacity-100'}`}
          >
            <div className="flex items-center gap-2">
              <TeamLogo team={teamB} />
              <span
                className={`text-sm font-medium ${match.winnerId === match.teamBId ? 'text-yellow-400' : 'text-gray-300'}`}
              >
                {teamB?.name || '待定'}
              </span>
            </div>
            <span
              className={`text-sm font-bold ${match.winnerId === match.teamBId ? 'text-yellow-400' : 'text-gray-500'}`}
            >
              {match.scoreB}
            </span>
          </div>
        </div>
      </Card>
      <MatchEditDialog
        match={match}
        teams={teams}
        isOpen={isDialogOpen}
        onClose={handleClose}
        onSave={handleSave}
      />
    </>
  );
};

const SwissStageVisualEditor: React.FC<SwissStageVisualEditorProps> = ({
  matches,
  teams,
  advancement,
  onMatchUpdate,
  onMatchCreate,
}) => {
  const matchesByRecord = useMemo(() => {
    return swissRoundSlots.reduce(
      (acc, slot) => {
        acc[slot.swissRecord] = matches.filter(m => m.swissRecord === slot.swissRecord);
        return acc;
      },
      {} as Record<string, Match[]>
    );
  }, [matches]);

  const qualifiedTeams = useMemo(() => {
    if (!advancement?.top8) return [];
    return teams.filter(t => advancement.top8.includes(t.id));
  }, [teams, advancement]);

  const eliminatedTeams = useMemo(() => {
    if (!advancement?.eliminated) return [];
    return teams.filter(t => advancement.eliminated.includes(t.id));
  }, [teams, advancement]);

  const allRounds = SWISS_STAGE_CONFIG.rounds;

  const COL_WIDTH = 240;
  const COL_GAP = 16;
  const TOTAL_COLS = 5;
  const BO1_COLS = 3;
  const BO3_COLS = 2;

  const totalWidth = COL_WIDTH * TOTAL_COLS + COL_GAP * (TOTAL_COLS - 1);
  const bo1Width = COL_WIDTH * BO1_COLS + COL_GAP * (BO1_COLS - 1);
  const bo3Width = COL_WIDTH * BO3_COLS + COL_GAP * (BO3_COLS - 1);

  return (
    <div data-testid="swiss-stage-editor" className="w-full">
      <div className="p-4 overflow-x-auto min-w-[900px]">
        {/* BO1/BO3 区域标签 - 精确对齐下方列 */}
        <div className="flex mb-2" style={{ width: totalWidth }}>
          {/* BO1 标签 - 精确覆盖第1-3轮 */}
          <div className="flex flex-col items-center" style={{ width: bo1Width }}>
            <div className="flex items-center justify-center w-full pb-3 border-b-4 border-green-500">
              <span className="px-6 py-1.5 bg-green-600/20 text-green-400 text-sm font-bold rounded border-2 border-green-500/50">
                BO1
              </span>
            </div>
          </div>
          {/* BO3 标签 - 精确覆盖第4-5轮 */}
          <div className="flex flex-col items-center" style={{ width: bo3Width }}>
            <div className="flex items-center justify-center w-full pb-3 border-b-4 border-blue-500">
              <span className="px-6 py-1.5 bg-blue-600/20 text-blue-400 text-sm font-bold rounded border-2 border-blue-500/50">
                BO3
              </span>
            </div>
          </div>
        </div>

        {/* 5轮比赛列 - 均匀分布 */}
        <div className="flex gap-4" style={{ width: totalWidth }}>
          {allRounds.map(round => (
            <div key={round.round} className="flex-shrink-0" style={{ width: COL_WIDTH }}>
              {/* 轮次标题 */}
              <div
                className="text-center pb-2 mb-3"
                style={{ borderBottom: '1px solid rgb(55 65 81)' }}
              >
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  {round.label}
                </h3>
                <span className="text-xs text-gray-500">({round.records.length} 组)</span>
              </div>

              {/* 该轮的所有战绩分组 */}
              <div className="space-y-4">
                {round.records.map(record => {
                  const slot = swissRoundSlots.find(s => s.swissRecord === record);
                  if (!slot) return null;
                  const slotMatches = matchesByRecord[record] || [];
                  return (
                    <div key={record} className="space-y-2">
                      {/* 战绩标签 - 显示 BO1/BO3 标识 */}
                      <div className="text-xs text-gray-400 uppercase tracking-wider text-center font-medium bg-gray-800/50 py-1 rounded flex items-center justify-center gap-2">
                        <span>{record}</span>
                        {['2-0', '0-2'].includes(record) && (
                          <span className="px-1.5 py-0.5 bg-blue-600/30 text-blue-400 text-[10px] rounded border border-blue-500/50">
                            BO3
                          </span>
                        )}
                        {record === '1-1' && (
                          <span className="px-1.5 py-0.5 bg-green-600/30 text-green-400 text-[10px] rounded border border-green-500/50">
                            BO1
                          </span>
                        )}
                      </div>
                      {/* 该战绩的比赛槽位 */}
                      <div className="space-y-2">
                        {slotMatches.map((match, idx) => (
                          <FixedSlotMatchCard
                            key={`${record}-${idx}`}
                            match={match}
                            teams={teams}
                            slot={slot}
                            slotIndex={idx}
                            onUpdate={onMatchUpdate}
                            onCreate={onMatchCreate}
                          />
                        ))}
                        {Array.from({
                          length: Math.max(0, slot.maxMatches - slotMatches.length),
                        }).map((_, idx) => (
                          <FixedSlotMatchCard
                            key={`empty-${record}-${idx}`}
                            match={null}
                            teams={teams}
                            slot={slot}
                            slotIndex={slotMatches.length + idx}
                            onUpdate={onMatchUpdate}
                            onCreate={onMatchCreate}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* 晋级/淘汰区域 - 按战绩拆分 */}
        <div className="flex gap-6 pt-6 mt-6 border-t border-gray-700">
          {advancement?.rankings && (
            <>
              {/* 晋级区域 - 3-0, 3-1, 3-2 */}
              <div className="flex gap-3">
                {['3-0', '3-1', '3-2'].map(record => {
                  const titleMap: Record<string, string> = {
                    '3-0': '3-0 晋级',
                    '3-1': '3-1 晋级',
                    '3-2': '3-2 晋级',
                  };
                  return (
                    <SwissRecordGroup
                      key={record}
                      type="qualified"
                      title={titleMap[record]}
                      teams={qualifiedTeams}
                      record={record}
                      rankings={advancement.rankings}
                      data-testid={`editor-qualified-${record}`}
                    />
                  );
                })}
              </div>

              {/* 淘汰区域 - 0-3, 1-3, 2-3 */}
              <div className="flex gap-3">
                {['0-3', '1-3', '2-3'].map(record => {
                  const titleMap: Record<string, string> = {
                    '0-3': '0-3 淘汰',
                    '1-3': '1-3 淘汰',
                    '2-3': '2-3 淘汰',
                  };
                  return (
                    <SwissRecordGroup
                      key={record}
                      type="eliminated"
                      title={titleMap[record]}
                      teams={eliminatedTeams}
                      record={record}
                      rankings={advancement.rankings}
                      data-testid={`editor-eliminated-${record}`}
                    />
                  );
                })}
              </div>
            </>
          )}
          {!advancement?.rankings && (
            <>
              {qualifiedTeams.length > 0 && (
                <SwissRecordGroup
                  type="qualified"
                  title="3-2 晋级"
                  teams={qualifiedTeams}
                  data-testid="editor-qualified-3-2"
                />
              )}
              {eliminatedTeams.length > 0 && (
                <SwissRecordGroup
                  type="eliminated"
                  title="2-3 淘汰"
                  teams={eliminatedTeams}
                  data-testid="editor-eliminated-2-3"
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SwissStageVisualEditor;
