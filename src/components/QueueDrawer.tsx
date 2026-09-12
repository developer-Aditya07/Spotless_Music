import React, { useState } from 'react';
import {
  X,
  Play,
  Trash2,
  ListMusic,
  Radio,
  Sparkles,
  Info,
  Sliders,
  Check,
  Flame,
  Music2,
  RefreshCw,
} from 'lucide-react';
import { Track, RadioMode, RecommendationScoreBreakdown } from '../types';

interface QueueDrawerProps {
  currentTrack: Track | null;
  manualQueue: Track[];
  radioQueue: Track[];
  isSmartRadioEnabled: boolean;
  radioMode: RadioMode;
  isLoadingRadio: boolean;
  debugScores?: RecommendationScoreBreakdown[];
  isOpen: boolean;
  onClose: () => void;
  onPlayTrack: (track: Track) => void;
  onRemoveFromManualQueue: (index: number) => void;
  onRemoveFromRadioQueue: (index: number) => void;
  onClearManualQueue: () => void;
  onToggleSmartRadio: () => void;
  onChangeRadioMode: (mode: RadioMode) => void;
  onRefreshRadio: () => void;
  onStartRadio: (seedTrack: Track) => void;
}

export const QueueDrawer: React.FC<QueueDrawerProps> = ({
  currentTrack,
  manualQueue,
  radioQueue,
  isSmartRadioEnabled,
  radioMode,
  isLoadingRadio,
  debugScores = [],
  isOpen,
  onClose,
  onPlayTrack,
  onRemoveFromManualQueue,
  onRemoveFromRadioQueue,
  onClearManualQueue,
  onToggleSmartRadio,
  onChangeRadioMode,
  onRefreshRadio,
  onStartRadio,
}) => {
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [selectedDebugTrack, setSelectedDebugTrack] = useState<RecommendationScoreBreakdown | null>(null);

  if (!isOpen) return null;

  const modeLabels: Record<RadioMode, string> = {
    normal: 'Balanced Mix',
    artist: 'Artist Radio',
    song: 'Song Radio',
    discovery: 'Discovery',
  };

  return (
    <aside
      id="spotify-queue-drawer"
      className="fixed inset-0 md:static md:w-88 bg-[#121212] border-l border-[#282828] flex flex-col h-full flex-shrink-0 select-none z-50 md:z-20 shadow-2xl"
    >
      {/* Drawer Header */}
      <div id="queue-header" className="p-4 flex items-center justify-between border-b border-[#282828] bg-[#181818]/60">
        <div className="flex items-center gap-2 text-white font-bold text-base">
          <ListMusic className="w-5 h-5 text-[#1db954]" />
          <span>Queue & Smart Radio</span>
        </div>
        <div className="flex items-center gap-2">
          {manualQueue.length > 0 && (
            <button
              id="btn-clear-manual-queue"
              onClick={onClearManualQueue}
              className="text-xs text-[#b3b3b3] hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/5"
              title="Clear manual queue"
            >
              Clear Queue
            </button>
          )}
          <button
            id="btn-toggle-debug"
            onClick={() => setIsDebugOpen(!isDebugOpen)}
            className={`p-1.5 rounded-full transition-colors ${
              isDebugOpen ? 'text-[#1db954] bg-[#1db954]/20' : 'text-[#727272] hover:text-white hover:bg-[#282828]'
            }`}
            title="Algorithm Debug Inspector"
          >
            <Info className="w-4 h-4" />
          </button>
          <button
            id="btn-close-queue"
            onClick={onClose}
            className="p-1 rounded-full text-[#b3b3b3] hover:text-white hover:bg-[#282828] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Smart Radio Mode & Toggle Ribbon */}
      <div id="smart-radio-controls-ribbon" className="p-3 bg-[#1e1e1e] border-b border-[#282828] flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className={`w-4 h-4 ${isSmartRadioEnabled ? 'text-[#1db954] animate-pulse' : 'text-[#727272]'}`} />
            <span className="text-xs font-bold text-white tracking-wide">
              Smart Radio Autoplay
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-toggle-smart-radio"
              onClick={onToggleSmartRadio}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isSmartRadioEnabled ? 'bg-[#1db954]' : 'bg-[#404040]'
              }`}
              title={isSmartRadioEnabled ? 'Disable Smart Radio' : 'Enable Smart Radio'}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  isSmartRadioEnabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Mode Selector Chips */}
        {isSmartRadioEnabled && (
          <div className="flex items-center justify-between gap-1 pt-1">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
              {(['normal', 'artist', 'song', 'discovery'] as RadioMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => onChangeRadioMode(mode)}
                  className={`px-2 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors ${
                    radioMode === mode
                      ? 'bg-[#1db954] text-black shadow-sm'
                      : 'bg-white/5 text-[#b3b3b3] hover:text-white hover:bg-white/10'
                  }`}
                >
                  {modeLabels[mode]}
                </button>
              ))}
            </div>

            <button
              onClick={onRefreshRadio}
              disabled={isLoadingRadio}
              className="p-1 text-[#b3b3b3] hover:text-white transition-colors disabled:opacity-40"
              title="Refresh recommendations"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRadio ? 'animate-spin text-[#1db954]' : ''}`} />
            </button>
          </div>
        )}
      </div>

      {/* Main Drawer Scroll Area */}
      <div id="queue-content-scroll" className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
        {/* Now Playing Section */}
        {currentTrack && (
          <div id="queue-now-playing-section">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-[#b3b3b3] uppercase tracking-wider">
                Now Playing
              </h4>
              <button
                onClick={() => onStartRadio(currentTrack)}
                className="text-[11px] font-semibold text-[#1db954] hover:underline flex items-center gap-1"
                title="Start Radio from this track"
              >
                <Sparkles className="w-3 h-3" />
                <span>Start Radio</span>
              </button>
            </div>
            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[#282828]/70 border border-white/5">
              <img
                src={currentTrack.coverUrl}
                alt={currentTrack.title}
                className="w-11 h-11 rounded object-cover flex-shrink-0 shadow-md"
              />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-semibold text-[#1db954] truncate">
                  {currentTrack.title}
                </span>
                <span className="text-xs text-[#b3b3b3] truncate">{currentTrack.artist}</span>
              </div>
            </div>
          </div>
        )}

        {/* Section 1: User's Manual Queue */}
        <div id="queue-manual-section">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-[#b3b3b3] uppercase tracking-wider flex items-center gap-1.5">
              <span>Next In Queue</span>
              {manualQueue.length > 0 && (
                <span className="text-[10px] bg-white/10 text-white px-1.5 py-0.2 rounded-full">
                  {manualQueue.length}
                </span>
              )}
            </h4>
            <span className="text-[10px] text-[#727272]">Manual Priority</span>
          </div>

          {manualQueue.length === 0 ? (
            <div className="text-xs text-[#636363] py-2 px-3 rounded bg-white/[0.02] border border-white/5">
              No manual tracks queued. Songs you "Add to Queue" play first.
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {manualQueue.map((track, idx) => (
                <div
                  id={`manual-queue-item-${idx}`}
                  key={`manual-${track.id}-${idx}`}
                  className="group flex items-center gap-3 p-2 rounded-md hover:bg-[#282828] transition-colors"
                >
                  <img
                    src={track.coverUrl}
                    alt={track.title}
                    className="w-9 h-9 rounded object-cover flex-shrink-0"
                  />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-medium text-white truncate">{track.title}</span>
                    <span className="text-xs text-[#b3b3b3] truncate">{track.artist}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onPlayTrack(track)}
                      className="p-1 text-[#b3b3b3] hover:text-white"
                      title="Play now"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>
                    <button
                      onClick={() => onRemoveFromManualQueue(idx)}
                      className="p-1 text-[#b3b3b3] hover:text-red-400"
                      title="Remove from queue"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Smart Radio / Up Next */}
        <div id="queue-radio-section">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#1db954]" />
              <span>Up Next — Smart Radio</span>
            </h4>
            <span className="text-[10px] text-[#1db954] font-medium tracking-tight">
              {isSmartRadioEnabled ? `✨ ${modeLabels[radioMode]}` : 'Turned Off'}
            </span>
          </div>

          {!isSmartRadioEnabled ? (
            <div className="text-xs text-[#727272] py-4 text-center rounded bg-white/[0.02] border border-white/5">
              Smart Radio is paused. Turn it on above to continuously discover matching music!
            </div>
          ) : radioQueue.length === 0 ? (
            <div className="text-xs text-[#727272] py-4 text-center flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-[#1db954]" />
              <span>Brewing natural recommendations...</span>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {radioQueue.map((track, idx) => {
                const scoreInfo = debugScores.find((d) => d.trackId === track.id);
                return (
                  <div
                    id={`radio-queue-item-${idx}`}
                    key={`radio-${track.id}-${idx}`}
                    className="group flex items-center gap-3 p-2 rounded-md hover:bg-[#282828] transition-colors"
                  >
                    <img
                      src={track.coverUrl}
                      alt={track.title}
                      className="w-9 h-9 rounded object-cover flex-shrink-0"
                    />
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm font-medium text-white truncate">{track.title}</span>
                      <div className="flex items-center gap-1 text-xs text-[#b3b3b3] truncate">
                        <span>{track.artist}</span>
                        {scoreInfo && (
                          <span className="text-[10px] text-[#1db954]/90 ml-1 font-mono">
                            {(scoreInfo.finalScore * 100).toFixed(0)}% fit
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {scoreInfo && (
                        <button
                          onClick={() => setSelectedDebugTrack(scoreInfo)}
                          className="p-1 text-[#727272] hover:text-[#1db954]"
                          title="View recommendation breakdown"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => onPlayTrack(track)}
                        className="p-1 text-[#b3b3b3] hover:text-white"
                        title="Play now"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                      <button
                        onClick={() => onRemoveFromRadioQueue(idx)}
                        className="p-1 text-[#b3b3b3] hover:text-red-400"
                        title="Dismiss recommendation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Algorithm Score Inspector Modal/Drawer */}
        {isDebugOpen && (
          <div id="algorithm-debug-panel" className="mt-4 p-3 rounded-lg bg-black/80 border border-[#1db954]/30 text-xs text-[#b3b3b3]">
            <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2 font-bold text-white">
              <span className="flex items-center gap-1 text-[#1db954]">
                <Sliders className="w-3.5 h-3.5" />
                <span>Recommendation Inspector</span>
              </span>
              <button
                onClick={() => setIsDebugOpen(false)}
                className="text-[#727272] hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-[11px] text-[#999] mb-3 leading-relaxed">
              Transparent signals powering this queue. Probabilistic selection balances 75% compatibility, 20% adventurous variety, and 5% novel discovery.
            </p>

            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
              {debugScores.slice(0, 6).map((item) => (
                <div key={item.trackId} className="p-2 rounded bg-white/5 border border-white/5">
                  <div className="flex items-center justify-between font-semibold text-white mb-1">
                    <span className="truncate pr-2">{item.title}</span>
                    <span className="text-[#1db954] font-mono">{(item.finalScore * 100).toFixed(0)}%</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-[#888] font-mono">
                    <div>Sim: {(item.similarityScore * 100).toFixed(0)}%</div>
                    <div>Pref: {(item.personalPreferenceScore * 100).toFixed(0)}%</div>
                    <div>Nov: {(item.noveltyScore * 100).toFixed(0)}%</div>
                    <div>Rep: {item.repetitionPenalty.toFixed(2)}</div>
                    <div>Ver: {item.versionPenalty.toFixed(2)}</div>
                    <div>Skip: {item.skipPenalty.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Single Song Breakdown Modal */}
        {selectedDebugTrack && (
          <div className="p-3 rounded-lg bg-[#222] border border-white/10 text-xs text-white">
            <div className="flex items-center justify-between font-bold mb-2">
              <span className="truncate pr-2">Why "{selectedDebugTrack.title}"?</span>
              <button onClick={() => setSelectedDebugTrack(null)} className="text-[#888] hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="flex flex-col gap-1 text-[11px] text-[#b3b3b3] font-mono">
              <div>Artist: {selectedDebugTrack.artist}</div>
              <div>Similarity Score: {(selectedDebugTrack.similarityScore * 100).toFixed(0)}%</div>
              <div>Provider Match: {(selectedDebugTrack.providerScore * 100).toFixed(0)}%</div>
              <div>Artist Affinity: {(selectedDebugTrack.artistPreferenceScore * 100).toFixed(0)}%</div>
              <div>Novelty/Freshness: {(selectedDebugTrack.noveltyScore * 100).toFixed(0)}%</div>
              <div>Version Penalty: {selectedDebugTrack.versionPenalty.toFixed(2)}</div>
              <div>Recency Penalty: {selectedDebugTrack.repetitionPenalty.toFixed(2)}</div>
              <div>Skip Penalty: {selectedDebugTrack.skipPenalty.toFixed(2)}</div>
              <div className="text-[#1db954] font-bold pt-1 border-t border-white/10">
                Final Calculated Score: {(selectedDebugTrack.finalScore * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
