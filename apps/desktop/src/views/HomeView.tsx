import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { useAppStore } from '../stores/appStore.js';
import { useProfileStore } from '../stores/profileStore.js';
import { useProfile, useApplications, useJobs } from '../queries/index.js';
import { formatNumber } from '../utils/formatters.js';
import { cardEnterVariants } from '../styles/motion.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { ErrorState, Skeleton } from '../components/ui/EmptyState.js';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Inbox,
  Send,
  UploadCloud,
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
  const { data: applications = [], isLoading: appsLoading } = useApplications();
  const { data: jobs = [] } = useJobs();

  const profile = dbProfile ?? (demoMode ? demoProfile : null);
  const profileBlockers = (profile?.issues ?? []).filter((i) => i.severity === 'blocker');
  const needsYouApps = applications.filter((a) => a.status === 'needs_user' || a.status === 'failed');
  const readyToSendApps = applications.filter((a) => a.status === 'needs_review');
  const sentApps = applications.filter(
    (a) =>
      a.status === 'submitted_verified' ||
      a.status === 'submitted_unverified' ||
      a.status === 'submitted'
  );

  // Choose ONE hero card by priority order (v3 Today)
  const hero = !profile
    ? {
        eyebrow: 'Your next step',
        title: 'Upload your résumé to get started',
        subtitle: 'Everything stays on your computer. Nothing is sent without your click.',
        cta: 'Upload résumé',
        tone: 'info' as const,
        icon: UploadCloud,
        onAction: () => setCurrentView('profile'),
      }
    : profileBlockers.length > 0
    ? {
        eyebrow: 'Your next step',
        title: `Fix ${formatNumber(profileBlockers.length, i18n.language)} things in your profile`,
        subtitle: profileBlockers[0].suggestedAction,
        cta: 'Check profile',
        tone: 'warn' as const,
        icon: AlertCircle,
        onAction: () => setCurrentView('profile'),
      }
    : needsYouApps.length > 0
    ? {
        eyebrow: 'Your next step',
        title: `${formatNumber(needsYouApps.length, i18n.language)} applications need you`,
        subtitle: `${needsYouApps[0].company} — ${needsYouApps[0].jobTitle}`,
        cta: 'Open Applications',
        tone: 'bad' as const,
        icon: Inbox,
        onAction: () => setCurrentView('queue'),
      }
    : readyToSendApps.length > 0
    ? {
        eyebrow: 'Your next step',
        title: `${formatNumber(readyToSendApps.length, i18n.language)} applications ready to send`,
        subtitle: 'Review each form and press Send when it looks right.',
        cta: 'Review & send',
        tone: 'ok' as const,
        icon: Send,
        onAction: () => setCurrentView('queue'),
      }
    : jobs.length > 0
    ? {
        eyebrow: 'Your next step',
        title: `Look through ${formatNumber(jobs.length, i18n.language)} matching jobs`,
        subtitle: 'One at a time — keep the ones you want and skip the rest.',
        cta: 'Start reviewing jobs',
        tone: 'info' as const,
        icon: Briefcase,
        onAction: () => setCurrentView('jobs'),
      }
    : {
        eyebrow: 'All caught up',
        title: 'Nothing waiting for you right now',
        subtitle: 'Search for new jobs or adjust what you are looking for anytime.',
        cta: 'Browse jobs',
        tone: 'ok' as const,
        icon: CheckCircle2,
        onAction: () => setCurrentView('jobs'),
      };

  const HeroIcon = hero.icon;
  const firstName = profile?.contact?.fullName?.split(/\s+/)[0];

  return (
    <div className="flex-1 overflow-y-auto px-6 py-12 flex flex-col items-center text-text">
      <div className="w-full max-w-[760px] flex flex-col gap-6">
        {/* Greeting + one-line status */}
        <div className="flex flex-col gap-1">
          <h1 className="text-[30px] font-semibold tracking-tight text-text">
            {firstName ? `Welcome back, ${firstName}` : t('nav.today', { defaultValue: 'Today' })}
          </h1>
          <p className="text-base text-text-2">
            {profile
              ? `${formatNumber(readyToSendApps.length, i18n.language)} ready to send · ${formatNumber(sentApps.length, i18n.language)} sent`
              : t('app.tagline')}
          </p>
        </div>

        {profileError && (
          <ErrorState
            title={t('common.error')}
            message={profileError instanceof Error ? profileError.message : String(profileError)}
            retryLabel={t('common.refresh')}
            onRetry={() => void refetchProfile()}
          />
        )}

        {profileLoading || appsLoading ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-48 w-full rounded-[20px]" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-20 w-full rounded-[14px]" />
              <Skeleton className="h-20 w-full rounded-[14px]" />
            </div>
          </div>
        ) : (
          <>
            {/* ONE Hero Card ("Your next step") */}
            <motion.section
              variants={cardEnterVariants}
              initial="initial"
              animate="animate"
              className="relative overflow-hidden rounded-[20px] border border-border bg-surface p-7 flex flex-col gap-5"
            >
              <div className="flex items-center justify-between gap-2">
                <Badge tone={hero.tone}>{hero.eyebrow}</Badge>
                <HeroIcon className="w-5 h-5 text-accent-text" aria-hidden="true" />
              </div>

              <div className="flex flex-col gap-1.5">
                <h2 className="text-xl font-semibold text-text">{hero.title}</h2>
                <p className="text-base text-text-2">{hero.subtitle}</p>
              </div>

              <div>
                <Button variant="primary" size="lg" onClick={hero.onAction}>
                  <span>{hero.cta}</span>
                  <DirectionalArrow className="w-4 h-4" aria-hidden="true" />
                </Button>
              </div>
            </motion.section>

            {/* At most TWO quiet cards below */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setCurrentView('queue')}
                className="p-4 rounded-[14px] bg-surface border border-border hover:border-border-strong transition-colors flex items-center justify-between gap-3 text-start cursor-pointer"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm text-muted">Ready to send</span>
                  <span className="text-[22px] font-bold font-mono tabular-nums text-text">
                    {formatNumber(readyToSendApps.length, i18n.language)}
                  </span>
                </div>
                <Inbox className="w-5 h-5 text-accent-text" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => setCurrentView('applications')}
                className="p-4 rounded-[14px] bg-surface border border-border hover:border-border-strong transition-colors flex items-center justify-between gap-3 text-start cursor-pointer"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm text-muted">Sent applications</span>
                  <span className="text-[22px] font-bold font-mono tabular-nums text-text">
                    {formatNumber(sentApps.length, i18n.language)}
                  </span>
                </div>
                <CheckCircle2 className="w-5 h-5 text-success" aria-hidden="true" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
