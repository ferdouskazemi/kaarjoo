import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { commands, type UserProfileDto } from '../../bindings.js';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card.js';
import { Button } from '../ui/Button.js';
import { Badge } from '../ui/Badge.js';
import { Input } from '../ui/Input.js';
import { SegmentedControl } from '../ui/SegmentedControl.js';
import { Plus, X, Check } from 'lucide-react';

export interface PreferencesPanelProps {
  profile: UserProfileDto;
  onSaveProfile: (updated: UserProfileDto) => Promise<void>;
  onContinue: () => void;
}

export const PreferencesPanel: React.FC<PreferencesPanelProps> = ({
  profile,
  onSaveProfile,
  onContinue,
}) => {
  const { t } = useTranslation();
  const [targetTitles, setTargetTitles] = useState<string[]>(profile.targetTitles ?? []);
  const [newTitle, setNewTitle] = useState('');
  const [locations, setLocations] = useState('Remote');
  const [remotePref, setRemotePref] = useState<'remote' | 'hybrid' | 'on-site'>('remote');
  const [salaryFloor, setSalaryFloor] = useState('');
  const [workAuth, setWorkAuth] = useState('');
  const [noticePeriod, setNoticePeriod] = useState('2 weeks');
  const [linkedinUrl, setLinkedinUrl] = useState(profile.contact.linkedinUrl ?? '');
  const [githubUrl, setGithubUrl] = useState(profile.contact.githubUrl ?? '');
  const [answerBank, setAnswerBank] = useState<Array<{ question: string; answer: string }>>([
    { question: 'Notice period', answer: '2 weeks' },
  ]);
  const [savedBanner, setSavedBanner] = useState(false);

  useEffect(() => {
    commands.settingsGetAll().then((res) => {
      if (res.status !== 'ok') return;
      const map = res.data as Partial<Record<string, string>>;
      if (map['pref.locations']) setLocations(map['pref.locations']);
      if (map['pref.remote']) setRemotePref((map['pref.remote'] as any) || 'remote');
      if (map['pref.salaryFloor']) setSalaryFloor(map['pref.salaryFloor']);
      if (map['pref.workAuth']) setWorkAuth(map['pref.workAuth']);
      if (map['pref.noticePeriod']) setNoticePeriod(map['pref.noticePeriod']);
      if (map['pref.answerBank']) {
        try {
          const parsed = JSON.parse(map['pref.answerBank']);
          if (Array.isArray(parsed)) setAnswerBank(parsed);
        } catch {
          // ignore
        }
      }
    });
  }, []);

  const addTitle = () => {
    const trimmed = newTitle.trim();
    if (!trimmed || targetTitles.includes(trimmed)) return;
    setTargetTitles([...targetTitles, trimmed]);
    setNewTitle('');
  };

  const handleSaveAll = async () => {
    await Promise.all([
      commands.settingsSet('pref.locations', locations),
      commands.settingsSet('pref.remote', remotePref),
      commands.settingsSet('pref.salaryFloor', salaryFloor),
      commands.settingsSet('pref.workAuth', workAuth),
      commands.settingsSet('pref.noticePeriod', noticePeriod),
      commands.settingsSet('pref.answerBank', JSON.stringify(answerBank)),
      onSaveProfile({
        ...profile,
        targetTitles,
        contact: {
          ...profile.contact,
          linkedinUrl: linkedinUrl.trim() || null,
          githubUrl: githubUrl.trim() || null,
        },
      }),
    ]);
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 2500);
  };

  return (
    <div className="flex flex-col gap-4 max-w-4xl mx-auto w-full p-6">
      <Card>
        <CardHeader>
          <CardTitle>Target Roles & Work Preferences</CardTitle>
          <Badge tone={targetTitles.length > 0 ? 'ok' : 'bad'}>
            {targetTitles.length > 0 ? `${targetTitles.length} target roles` : 'Add ≥ 1 target title'}
          </Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-muted">Target job titles</label>
            <div className="flex flex-wrap gap-2">
              {targetTitles.map((title) => (
                <Badge key={title} tone="info" className="gap-1.5">
                  <span>{title}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${title}`}
                    onClick={() => setTargetTitles(targetTitles.filter((x) => x !== title))}
                    className="cursor-pointer hover:text-text"
                  >
                    <X className="w-3 h-3" aria-hidden="true" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTitle();
                  }
                }}
                placeholder="e.g. Senior Frontend Engineer"
                aria-label="Add target job title"
              />
              <Button variant="secondary" size="sm" onClick={addTitle}>
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>Add</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted">Preferred Locations</label>
              <Input value={locations} onChange={(e) => setLocations(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted">Remote Preference</label>
              <SegmentedControl
                value={remotePref}
                onChange={setRemotePref}
                ariaLabel="Remote preference"
                options={[
                  { value: 'remote', label: 'Remote' },
                  { value: 'hybrid', label: 'Hybrid' },
                  { value: 'on-site', label: 'On-site' },
                ]}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted">Minimum Salary (USD/yr)</label>
              <Input
                dir="ltr"
                value={salaryFloor}
                onChange={(e) => setSalaryFloor(e.target.value)}
                placeholder="e.g. 60000"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted">Work Authorization</label>
              <Input
                value={workAuth}
                onChange={(e) => setWorkAuth(e.target.value)}
                placeholder="e.g. Remote contractor / US Citizen / EU Permit"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted">LinkedIn URL</label>
              <Input
                dir="ltr"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/..."
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted">GitHub URL</label>
              <Input
                dir="ltr"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Screening Answer Bank</CardTitle>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setAnswerBank([...answerBank, { question: '', answer: '' }])}
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Add Q&A</span>
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {answerBank.map((row, idx) => (
            <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input
                value={row.question}
                onChange={(e) => {
                  const next = [...answerBank];
                  next[idx] = { ...next[idx], question: e.target.value };
                  setAnswerBank(next);
                }}
                placeholder="Question keyword (e.g. years of React)"
              />
              <Input
                value={row.answer}
                onChange={(e) => {
                  const next = [...answerBank];
                  next[idx] = { ...next[idx], answer: e.target.value };
                  setAnswerBank(next);
                }}
                placeholder="Your truthful answer"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Button variant="secondary" size="md" onClick={() => void handleSaveAll()}>
          {savedBanner ? <Check className="w-4 h-4 text-success" aria-hidden="true" /> : null}
          <span>{savedBanner ? t('common.saved') : t('common.save')}</span>
        </Button>
        <Button
          variant="primary"
          size="md"
          disabled={targetTitles.length === 0}
          disabledReason="Add at least one target job title to search"
          onClick={() => {
            void handleSaveAll().then(onContinue);
          }}
        >
          <span>Continue to Opportunities →</span>
        </Button>
      </div>
    </div>
  );
};
