import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProfileIssueDto, UserProfileDto } from '../../bindings.js';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card.js';
import { Badge } from '../ui/Badge.js';
import { Button } from '../ui/Button.js';
import { Input } from '../ui/Input.js';
import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatNumber } from '../../utils/formatters.js';

export interface IssuesFixCardProps {
  profile: UserProfileDto;
  issues: ProfileIssueDto[];
  readinessPercent: number;
  onSaveInlineFix: (patch: Partial<UserProfileDto>) => Promise<void>;
  onJumpToField?: (fieldPath: string) => void;
}

export const IssuesFixCard: React.FC<IssuesFixCardProps> = ({
  profile,
  issues,
  readinessPercent,
  onSaveInlineFix,
  onJumpToField,
}) => {
  const { t, i18n } = useTranslation();
  const [phoneInput, setPhoneInput] = useState(profile.contact.phone ?? '');
  const [emailInput, setEmailInput] = useState(profile.contact.email ?? '');
  const [nameInput, setNameInput] = useState(profile.contact.fullName ?? '');
  const [savingPath, setSavingPath] = useState<string | null>(null);

  const sortedIssues = [...issues].sort((a, b) => {
    const rank = (s: string) => (s === 'blocker' ? 0 : s === 'warning' ? 1 : 2);
    return rank(a.severity) - rank(b.severity);
  });

  const blockersCount = sortedIssues.filter((i) => i.severity === 'blocker').length;
  const warningsCount = sortedIssues.filter((i) => i.severity === 'warning').length;

  const handleSaveContactField = async (fieldPath: string) => {
    setSavingPath(fieldPath);
    try {
      const nextContact = { ...profile.contact };
      if (fieldPath === 'contact.phone') nextContact.phone = phoneInput.trim() || null;
      if (fieldPath === 'contact.email') nextContact.email = emailInput.trim() || null;
      if (fieldPath === 'contact.fullName') nextContact.fullName = nameInput.trim() || null;
      await onSaveInlineFix({ contact: nextContact });
    } finally {
      setSavingPath(null);
    }
  };

  if (sortedIssues.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-success text-sm font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{t('profile.readyToApply', { defaultValue: 'Ready for applications' })}</span>
          </div>
          <Badge tone="ok" className="tabular-nums">
            {formatNumber(readinessPercent, i18n.language)}%
          </Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 flex-wrap">
          <CardTitle>{t('profile.fixBeforeApply', { defaultValue: 'Fix before you can apply' })}</CardTitle>
          {blockersCount > 0 && (
            <Badge tone="bad" className="tabular-nums">
              {formatNumber(blockersCount, i18n.language)} blocker
            </Badge>
          )}
          {warningsCount > 0 && (
            <Badge tone="warn" className="tabular-nums">
              {formatNumber(warningsCount, i18n.language)} warning
            </Badge>
          )}
        </div>
        <span className="text-xs font-mono text-muted tabular-nums">
          Ready: {formatNumber(readinessPercent, i18n.language)}%
        </span>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {sortedIssues.map((issue, idx) => {
          const isBlocker = issue.severity === 'blocker';
          const isPhone = issue.fieldPath === 'contact.phone';
          const isEmail = issue.fieldPath === 'contact.email';
          const isName = issue.fieldPath === 'contact.fullName';

          return (
            <div
              key={`${issue.fieldPath}-${idx}`}
              className="p-3 rounded-[var(--radius-md)] bg-surface-2 border border-border flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  {isBlocker ? (
                    <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" aria-hidden="true" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" aria-hidden="true" />
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-text">{issue.suggestedAction}</div>
                    <div className="text-xs text-muted font-mono" dir="ltr">
                      {issue.fieldPath}
                    </div>
                  </div>
                </div>
                {onJumpToField && !isPhone && !isEmail && !isName && (
                  <Button variant="secondary" size="sm" onClick={() => onJumpToField(issue.fieldPath)}>
                    {t('common.edit')}
                  </Button>
                )}
              </div>

              {(isPhone || isEmail || isName) && (
                <div className="flex items-center gap-2">
                  <Input
                    dir="ltr"
                    value={isPhone ? phoneInput : isEmail ? emailInput : nameInput}
                    onChange={(e) => {
                      if (isPhone) setPhoneInput(e.target.value);
                      else if (isEmail) setEmailInput(e.target.value);
                      else setNameInput(e.target.value);
                    }}
                    placeholder={isPhone ? '+1 555 010 0199' : isEmail ? 'name@example.com' : 'Full Name'}
                    aria-label={issue.fieldPath}
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    loading={savingPath === issue.fieldPath}
                    onClick={() => void handleSaveContactField(issue.fieldPath)}
                  >
                    {t('common.save')}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
