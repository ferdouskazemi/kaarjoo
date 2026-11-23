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
} from 'lucide-react';
import type { CompanyBoard } from '@kaarjoo/shared';

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
  const { t } = useTranslation();
  const [newUrl, setNewUrl] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [detected, setDetected] = useState<any | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

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

  const filteredBoards = boards.filter(
    (b) =>
      b.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      b.atsType.toLowerCase().includes(searchFilter.toLowerCase()) ||
      b.industry?.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div>
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-sky-400" />
              {t('jobs.monitoredCompanies')}
            </h3>
            <p className="text-xs text-slate-400 mt-1">{t('jobs.monitoredDesc')}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Add Company Section */}
        <div className="p-5 bg-slate-950/40 border-b border-slate-800 flex flex-col gap-3">
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
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xs font-medium text-slate-200 transition-colors border border-slate-700"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span>{detecting ? 'در حال بررسی...' : t('jobs.detectAts')}</span>
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>افزودن به رصد</span>
              </button>
            </div>
          )}
        </div>

        {/* Search bar inside modal */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-2.5" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="جستجو در نام شرکت، ATS یا صنعت..."
              className="w-full ps-9 pe-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>
          <span className="text-xs text-slate-500 shrink-0">{filteredBoards.length} شرکت</span>
        </div>

        {/* Companies List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredBoards.map((b) => (
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

                {/* Active switch */}
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
    </div>
  );
};
