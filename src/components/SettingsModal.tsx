import React, { useState } from 'react';
import { X, Key, ShieldCheck, Volume2, Music, Check } from 'lucide-react';
import { UserSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSaveSettings: (newSettings: UserSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [apiKey, setApiKey] = useState(settings.youtubeApiKey || '');
  const [quality, setQuality] = useState(settings.audioQuality);
  const [normalize, setNormalize] = useState(settings.normalizeVolume);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings({
      youtubeApiKey: apiKey.trim(),
      audioQuality: quality,
      normalizeVolume: normalize,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div
      id="settings-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none"
    >
      <div
        id="settings-modal-container"
        className="bg-[#282828] text-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-white/10 flex flex-col gap-6 animate-fadeIn"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Key className="w-5 h-5 text-[#1db954]" />
            <span>YouTube Music & Player Settings</span>
          </div>
          <button
            id="btn-close-settings"
            onClick={onClose}
            className="p-1 rounded-full text-[#b3b3b3] hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex flex-col gap-5 text-sm">
          {/* Ad-Free Status Banner */}
          <div className="p-3 rounded-lg bg-[#1db954]/10 border border-[#1db954]/30 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#1db954] flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold text-[#1db954] block mb-0.5">Ad-Free Stream Active</span>
              All music is routed directly through clean background audio streams with no third-party advertisements or audio interrupts.
            </div>
          </div>

          {/* YouTube API Key input */}
          <div className="flex flex-col gap-2">
            <label htmlFor="settings-yt-key" className="font-semibold text-white flex items-center justify-between">
              <span>YouTube API Key (Optional)</span>
              <span className="text-xs text-[#a7a7a7] font-normal">For unlimited live music search</span>
            </label>
            <input
              id="settings-yt-key"
              type="text"
              placeholder="Paste your Google Cloud / YouTube v3 API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-[#121212] border border-white/20 rounded-md py-2.5 px-3 text-white placeholder-[#727272] outline-none focus:border-[#1db954] text-xs font-mono"
            />
            <p className="text-[11px] text-[#b3b3b3] leading-relaxed">
              If left blank, the app uses our pre-curated high quality catalog of top chart songs with instantaneous ad-free playback.
            </p>
          </div>

          {/* Audio Quality Selection */}
          <div className="flex flex-col gap-2">
            <label className="font-semibold text-white flex items-center gap-2">
              <Music className="w-4 h-4 text-[#1db954]" />
              <span>Streaming Audio Quality</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['auto', 'high', 'normal'] as const).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuality(q)}
                  className={`py-2 px-3 rounded-md text-xs font-semibold capitalize border transition-colors ${
                    quality === q
                      ? 'bg-[#1db954] text-black border-[#1db954]'
                      : 'bg-[#181818] text-[#b3b3b3] border-white/10 hover:text-white'
                  }`}
                >
                  {q === 'auto' ? 'Auto (Recommended)' : q}
                </button>
              ))}
            </div>
          </div>

          {/* Volume normalization */}
          <div className="flex items-center justify-between py-2 border-t border-white/10">
            <div className="flex flex-col">
              <span className="font-semibold text-white">Normalize Volume</span>
              <span className="text-xs text-[#b3b3b3]">Set the same loudness level for all tracks</span>
            </div>
            <input
              type="checkbox"
              checked={normalize}
              onChange={(e) => setNormalize(e.target.checked)}
              className="w-4 h-4 accent-[#1db954] rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-[#b3b3b3] hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            id="btn-save-settings"
            type="button"
            onClick={handleSave}
            className="px-6 py-2 rounded-full bg-[#1db954] hover:bg-[#1ed760] text-black text-xs font-bold flex items-center gap-1.5 transition-transform active:scale-95"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Saved!</span>
              </>
            ) : (
              <span>Save Changes</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
