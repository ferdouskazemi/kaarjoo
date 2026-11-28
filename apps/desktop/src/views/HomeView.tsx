import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../stores/appStore.js';
import { useProfileStore } from '../stores/profileStore.js';
import { useProfile, useApplications, useJobs } from '../queries/index.js';
import { formatDate, formatNumber } from '../utils/formatters.js';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/EmptyState.js';
import {
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  Inbox,
  UploadCloud,
  UserCheck,
} from 'lucide-react';

export const HomeView: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';
  const DirectionalArrow = isRtl ? ArrowLeft : ArrowRight;
  const { setCurrentView, demoMode } = useAppStore();
  const { profile: demoProfile } = useProfileStore();

  const {
    data: dbProfile,
    isLoading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useProfile();
  const { data: dbApplications = [], isLoading: appsLoading } = useApplications();
  const { data: jobs = [] } = useJobs();

  const profile = dbProfile ?? (demoMode ? demoProfile : null);
  const applications = dbApplications;

  const profileBlockers = (profile?.issues ?? []).filter((i) => i.severity === 'blocker').length;
  const needsYouApps = applications.filter((a) => a.status === 'needs_user').length;
  const readyReviewApps = applications.filter((a) => a.status === 'needs_review').length;
  const submittedApps = applications.filter(
    (a) => a.status === 'submitted_verified' || a.status === 'submitted_unverified' || a.status === 'submitted'
  ).length;

  const nextAction = !profile
    ? {
        title: t('home.manageProfile'),
        description: t('home.noResumeYet'),
        view: 'profile' as const,
        icon: UploadCloud,
      }
    : profileBlockers > 0
    ? {
        title: t('nav.profile'),
        description: `${formatNumber(profileBlockers, i18n.language)} ${t('common.required')}`,
        view: 'profile' as const,
        icon: AlertCircle,
      }
    : needsYouApps + readyReviewApps > 0
    ? {
        title: t('home.viewQueue'),
        description: `${formatNumber(needsYouApps + readyReviewApps, i18n.language)} ${t('common.items')}`,
        view: 'queue' as const,
        icon: Inbox,
      }
    : {
        title: t('nav.jobs'),
        description: `${formatNumber(jobs.length, i18n.language)} ${t('common.items')}`,
        view: 'jobs' as const,
        icon: Briefcase,
      };

  const NextIcon = nextAction.icon;

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 max-w-6xl mx-auto w-full text-text">
      {/* Page Header: Title, one-line subtitle, single primary button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold text-text">{t('home.welcome')}</h1>
          <p className="text-sm text-muted mt-1">{t('home.desc')}</p>
        </div>
        <Button variant="primary" size="md" onClick={() => setCurrentView(nextAction.view)}>
          <NextIcon className="w-4 h-4" aria-hidden="true" />
          <span>{nextAction.title}</span>
          <DirectionalArrow className="w-4 h-4" aria-hidden="true" />
        </Button>
      </div>

      {profileError && (
        <ErrorState
          title={t('common.error')}
          message={profileError instanceof Error ? profileError.message : String(profileError)}
          retryLabel={t('common.refresh')}
          onRetry={() => void refetchProfile()}
        />
      )}

      {/* What needs you summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          className="cursor-pointer hover:border-border-strong transition-colors"
          onClick={() => setCurrentView('profile')}
        >
          <CardContent className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted">{t('nav.profile')}</span>
              <Badge tone={!profile || profileBlockers > 0 ? 'bad' : 'ok'}>
                {!profile ? t('common.required') : profileBlockers > 0 ? formatNumber(profileBlockers, i18n.language) : t('common.active')}
              </Badge>
            </div>
            <div className="text-base font-semibold text-text truncate">
              {profile?.contact?.fullName || t('home.newUser')}
            </div>
            <div className="text-xs text-muted truncate" dir="ltr">
              {profile?.contact?.email || t('home.noResumeYet')}
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-border-strong transition-colors"
          onClick={() => setCurrentView('queue')}
        >
          <CardContent className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted">{t('status.needs_user')}</span>
              <Badge tone={needsYouApps > 0 ? 'bad' : 'neutral'}>
                {formatNumber(needsYouApps, i18n.language)}
              </Badge>
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-text">
              {formatNumber(needsYouApps, i18n.language)}
            </div>
            <div className="text-xs text-muted">{t('nav.queue')}</div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-border-strong transition-colors"
          onClick={() => setCurrentView('queue')}
        >
          <CardContent className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted">{t('status.needs_review')}</span>
              <Badge tone={readyReviewApps > 0 ? 'info' : 'neutral'}>
                {formatNumber(readyReviewApps, i18n.language)}
              </Badge>
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-text">
              {formatNumber(readyReviewApps, i18n.language)}
            </div>
            <div className="text-xs text-muted">{t('common.review')}</div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-border-strong transition-colors"
          onClick={() => setCurrentView('applications')}
        >
          <CardContent className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted">{t('home.submittedApps')}</span>
              <CheckCircle2 className="w-4 h-4 text-success" aria-hidden="true" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-text">
              {formatNumber(submittedApps, i18n.language)}
            </div>
            <div className="text-xs text-muted">
              {formatNumber(applications.length, i18n.language)} {t('home.totalApps')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-accent" aria-hidden="true" />
            <span>{t('nav.applications')}</span>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setCurrentView('applications')}>
            <span>{t('common.view')}</span>
          </Button>
        </CardHeader>
        <CardContent>
          {profileLoading || appsLoading ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : applications.length === 0 ? (
            <EmptyState
              icon={<Briefcase className="w-8 h-8" aria-hidden="true" />}
              title={t('home.noResumeYet')}
              description={nextAction.description}
              actionLabel={nextAction.title}
              onAction={() => setCurrentView(nextAction.view)}
            />
          ) : (
            <div className="divide-y divide-border">
              {applications.slice(0, 6).map((app) => (
                <div
                  key={app.id}
                  className="py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-text truncate">{app.jobTitle}</div>
                    <div className="text-xs text-muted truncate">
                      {app.company} · {formatDate(app.updatedAt, i18n.language)}
                    </div>
                  </div>
                  <Badge
                    tone={
                      app.status === 'submitted_verified' || app.status === 'submitted'
                        ? 'ok'
                        : app.status === 'needs_user' || app.status === 'failed'
                        ? 'bad'
                        : app.status === 'needs_review'
                        ? 'info'
                        : 'neutral'
                    }
                  >
                    {t(`status.${app.status}`, { defaultValue: app.status })}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
