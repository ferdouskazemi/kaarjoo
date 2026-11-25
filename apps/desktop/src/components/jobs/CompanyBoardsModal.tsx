import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  Building2,
  Plus,
  Search,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Globe,
  Star,
  Check,
} from 'lucide-react';
import type { CompanyBoard } from '@kaarjoo/shared';
import { formatNumber } from '../../utils/formatters.js';
import { useDirectory, useToggleFollowCompany } from '../../queries/index.js';

interface CompanyBoardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  boards: CompanyBoard[];
  onToggleBoard: (id: string) => void;
  onAddBoard: (board: CompanyBoard) => void;
  onDetectAts: (url: string) => Promise<{ atsType: any; boardSlug: string; boardUrl: string; companyName: string } | null>;
}

export const CompanyBoardsModal: React.FC<CompanyBoardsModalProps> = ({
  isOpen,
  onClose,
  boards,
  onToggleBoard,
  onAddBoard,
  onDetectAts,
}) => {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<'monitored' | 'directory'>('directory');
  const [newUrl, setNewUrl] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [detected, setDetected] = useState<any | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  // Directory filter states
  const [selectedAts, setSelectedAts] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [selectedPolicy, setSelectedPolicy] = useState<string>('all');

  const { data: directoryCompanies = [], isLoading: isDirectoryLoading } = useDirectory({
    atsType: selectedAts !== 'all' ? selectedAts : null,
    country: selectedCountry !== 'all' ? selectedCountry : null,
    remotePolicy: selectedPolicy !== 'all' ? selectedPolicy : null,
    search: searchFilter.trim() || null,
    limit: 150,
  });

  const toggleFollowMutation = useToggleFollowCompany();

  if (!isOpen) return null;

  const handleDetect = async () => {
    if (!newUrl.trim()) return;
    setDetecting(true);
    setDetected(null);
    try {
      const result = await onDetectAts(newUrl.trim());
      setDetected(result);
    } finally {
      setDetecting(false);
    }
  };

  const handleConfirmAdd = () => {
    if (!detected) return;
    const newBoard: CompanyBoard = {
      id: `board_custom_${Date.now()}`,
      name: detected.companyName,
      domain: new URL(detected.boardUrl).hostname,
      atsType: detected.atsType,
      boardSlug: detected.boardSlug,
      boardUrl: detected.boardUrl,
      country: 'US',
      active: true,
      jobCount: 0,
    };
    onAddBoard(newBoard);
    setNewUrl('');
    setDetected(null);
  };

  const handleToggleFollow = async (boardId: string, currentStatus: boolean) => {
    try {
      await toggleFollowMutation.mutateAsync({
        boardId,
        isFollowed: !currentStatus,
      });
    } catch (err) {
      console.error('Failed to toggle company follow:', err);
    }
  };

  const filteredMonitoredBoards = boards.filter(
    (b) =>
      b.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      b.atsType.toLowerCase().includes(searchFilter.toLowerCase()) ||
      b.industry?.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div>
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-sky-400" />
              {t('jobs.monitoredCompanies')}
            </h3>
            <p className="text-xs text-slate-400 mt-1">{t('jobs.monitoredDesc')}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-4 px-6 pt-3 border-b border-slate-800 bg-slate-950/40 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('directory')}
            className={`pb-2.5 transition-colors cursor-pointer flex items-center gap-2 border-b-2 ${
              activeTab === 'directory'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>{t('jobs.directoryTab')}</span>
          </button>
          <button
            onClick={() => setActiveTab('monitored')}
            className={`pb-2.5 transition-colors cursor-pointer flex items-center gap-2 border-b-2 ${
              activeTab === 'monitored'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Star className="w-4 h-4" />
            <span>{t('jobs.monitoredTab')}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-sky-950 text-sky-300 font-mono">
              {formatNumber(boards.length, i18n.language)}
            </span>
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder={t('jobs.searchPlaceholder')}
              className="w-full ps-9 pe-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          {activeTab === 'directory' && (
            <>
              {/* ATS Filter */}
              <select
                value={selectedAts}
                onChange={(e) => setSelectedAts(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="all">{t('jobs.allAts')}</option>
                <option value="greenhouse">Greenhouse</option>
                <option value="lever">Lever</option>
                <option value="ashby">Ashby</option>
                <option value="workable">Workable</option>
                <option value="smartrecruiters">SmartRecruiters</option>
                <option value="recruitee">Recruitee</option>
                <option value="personio">Personio</option>
                <option value="teamtailor">Teamtailor</option>
                <option value="bamboohr">BambooHR</option>
                <option value="breezy">Breezy</option>
                <option value="jazzhr">JazzHR</option>
                <option value="pinpoint">Pinpoint</option>
                <option value="rippling">Rippling</option>
                <option value="join">Join.com</option>
                <option value="workday">Workday</option>
              </select>

              {/* Country Filter */}
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="all">{t('jobs.allCountries')}</option>
                <option value="US">🇺🇸 United States</option>
                <option value="DE">🇩🇪 Germany</option>
                <option value="GB">🇬🇧 United Kingdom</option>
                <option value="NL">🇳🇱 Netherlands</option>
                <option value="SE">🇸🇪 Sweden</option>
                <option value="FR">🇫🇷 France</option>
                <option value="CA">🇨🇦 Canada</option>
                <option value="CH">🇨🇭 Switzerland</option>
                <option value="IE">🇮🇪 Ireland</option>
                <option value="AF">🇦🇫 Afghanistan</option>
              </select>

              {/* Policy Filter */}
              <select
                value={selectedPolicy}
                onChange={(e) => setSelectedPolicy(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="all">{t('jobs.allPolicies')}</option>
                <option value="remote-first">🌐 {t('jobs.remoteFirst')}</option>
                <option value="hybrid">🏢 Hybrid</option>
                <option value="on-site">📍 On-Site</option>
              </select>
            </>
          )}
        </div>

        {/* Tab 1: Global Directory (5,000+ companies) */}
        {activeTab === 'directory' ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {isDirectoryLoading ? (
              <div className="p-12 text-center text-xs text-slate-500">{t('common.loading')}</div>
            ) : directoryCompanies.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500">{t('jobs.noJobsFound')}</div>
            ) : (
              directoryCompanies.map((c) => {
                const isFollowed = c.isFollowed;
                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-slate-800/80 bg-slate-950/40 hover:bg-slate-950/80 transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-xs text-sky-400 font-mono shrink-0">
                        {c.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-200 text-xs">{c.name}</span>
                          <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            {c.atsType}
                          </span>
                          {c.remotePolicy === 'remote-first' && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/50">
                              {t('jobs.remoteFirst')}
                            </span>
                          )}
                          {c.country && (
                            <span className="text-[10px] text-slate-400">
                              {c.country === 'US' ? '🇺🇸' : c.country === 'DE' ? '🇩🇪' : c.country === 'GB' ? '🇬🇧' : c.country === 'NL' ? '🇳🇱' : c.country === 'AF' ? '🇦🇫' : '🌍'} {c.country}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 block truncate mt-0.5">
                          {c.industry || c.headquarters} • {formatNumber(c.jobCount, i18n.language)} {t('queue.openings')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <a
                        href={c.boardUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
                        title={t('jobs.viewOriginal')}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                      <button
                        onClick={() => handleToggleFollow(c.id, isFollowed)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                          isFollowed
                            ? 'bg-sky-600/20 text-sky-300 border-sky-500/40 hover:bg-sky-600/30'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        {isFollowed ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-sky-400" />
                            <span>{t('jobs.following')}</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5 text-slate-400" />
                            <span>{t('jobs.follow')}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* Tab 2: Monitored & Add Custom */
          <div className="flex-1 overflow-y-auto flex flex-col">
            {/* Add Custom Board Bar */}
            <div className="p-4 bg-slate-950/40 border-b border-slate-800 flex flex-col gap-2.5">
              <label className="text-xs font-semibold text-slate-300 block">{t('jobs.addCompany')}:</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="e.g. https://boards.greenhouse.io/stripe or figma.com/careers"
                  className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                />
                <button
                  onClick={handleDetect}
                  disabled={detecting || !newUrl.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xs font-medium text-slate-200 transition-colors border border-slate-700 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  <span>{detecting ? t('common.loading') : t('jobs.detectAts')}</span>
                </button>
              </div>

              {detected && (
                <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-3.5 flex items-center justify-between gap-3 animate-fade-in">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="text-xs text-slate-300">
                      <span>{t('jobs.detectedAs')} </span>
                      <span className="font-mono text-emerald-300 uppercase font-semibold">{detected.atsType}</span>
                      <span className="text-slate-500"> ({detected.companyName})</span>
                    </div>
                  </div>
                  <button
                    onClick={handleConfirmAdd}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t('jobs.addBoardBtn')}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Monitored List */}
            <div className="p-4 space-y-2">
              {filteredMonitoredBoards.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-slate-800/80 bg-slate-950/40 hover:bg-slate-950/80 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg">
                      {b.country === 'US' ? '🇺🇸' : b.country === 'GB' ? '🇬🇧' : b.country === 'SE' ? '🇸🇪' : b.country === 'DE' ? '🇩🇪' : '🌍'}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200 text-xs">{b.name}</span>
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          {b.atsType}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 block truncate">{b.industry || b.headquarters}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <a
                      href={b.boardUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    <button
                      type="button"
                      onClick={() => onToggleBoard(b.id)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        b.active ? 'bg-sky-600' : 'bg-slate-800'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          b.active ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
