// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const applicationsPrepareMock = vi.fn();
const applicationsFillMock = vi.fn();

vi.mock('../../../bindings.js', () => ({
  commands: {
    applicationsPrepare: (...args: unknown[]) => applicationsPrepareMock(...args),
    applicationsFill: (...args: unknown[]) => applicationsFillMock(...args),
    jobsDiscover: vi.fn(),
  },
}));

vi.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: () => {} },
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

import { ActivityPill } from '../ActivityPill.js';
import { usePipelineStore } from '../../../stores/pipelineStore.js';
import { useAppStore } from '../../../stores/appStore.js';

describe('ActivityPill P0-1 discovery -> Prepare & fill flow', () => {
  let container: HTMLDivElement;
  let root: Root;
  let queryClient: QueryClient;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    queryClient = new QueryClient();

    applicationsPrepareMock.mockReset();
    applicationsFillMock.mockReset();

    useAppStore.setState({ demoMode: false, currentView: 'home' } as any);
    usePipelineStore.setState({
      isVisible: true,
      isRunning: false,
      isCancelled: false,
      status: 'discovered',
      steps: { discover: 'done', tailor: 'pending', prefill: 'pending' },
      discoveredJobs: [
        {
          id: 'job_1',
          title: 'Senior Frontend Engineer',
          company: 'Stripe',
          applyUrl: 'https://boards.greenhouse.io/stripe/jobs/1',
          atsType: 'greenhouse',
          matchScore: 92,
          matchedSkills: ['React', 'TypeScript'],
          itemStatus: 'pending',
        },
        {
          id: 'job_2',
          title: 'Frontend Platform Engineer',
          company: 'GitLab',
          applyUrl: 'https://job-boards.greenhouse.io/gitlab/jobs/2',
          atsType: 'greenhouse',
          matchScore: 86,
          matchedSkills: ['TypeScript'],
          itemStatus: 'pending',
        },
      ],
      currentItemIndex: 0,
      totalItems: 2,
      currentItemLabel: '',
      errorMessage: null,
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('shows Prepare & fill (N) for discovered jobs and calls commands.applicationsPrepare with selected job IDs', async () => {
    applicationsPrepareMock.mockResolvedValue({
      status: 'ok',
      data: [{ id: 'app_1', jobId: 'job_1' }],
    });
    applicationsFillMock.mockResolvedValue({
      status: 'ok',
      data: [{ id: 'app_1', jobId: 'job_1', status: 'needs_review' }],
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <ActivityPill />
        </QueryClientProvider>
      );
    });

    // Click floating pill to open drawer
    const pillButton = container.querySelector('button');
    expect(pillButton).toBeTruthy();
    await act(async () => {
      pillButton!.click();
    });

    // Uncheck job_2 so only job_1 is selected
    const job2Checkbox = container.querySelector(
      'input[aria-label="Select Frontend Platform Engineer"]'
    ) as HTMLInputElement | null;
    expect(job2Checkbox).toBeTruthy();
    await act(async () => {
      job2Checkbox!.click();
    });

    // Find "Prepare & fill (1)" button and click it
    const buttons = Array.from(container.querySelectorAll('button'));
    const prepareBtn = buttons.find((b) => b.textContent?.includes('Prepare & fill (1)'));
    expect(prepareBtn).toBeTruthy();

    await act(async () => {
      prepareBtn!.click();
    });

    expect(applicationsPrepareMock).toHaveBeenCalledTimes(1);
    expect(applicationsPrepareMock).toHaveBeenCalledWith(['job_1']);
  });
});
