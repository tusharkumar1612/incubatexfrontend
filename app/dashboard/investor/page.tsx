'use client';
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ScoreBar } from '@/components/startups/ScoreBar';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { startupsApi } from '@/lib/api/startups';
import apiClient from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/auth.store';
import {
  Search, SlidersHorizontal, X, Building2, Globe,
  Calendar, ChevronDown, Star,
} from 'lucide-react';
import { clsx } from 'clsx';

// ── constants ──────────────────────────────────────────────────────────────

const INDUSTRIES = [
  'EdTech', 'FinTech', 'HealthTech / MedTech', 'AgriTech', 'CleanTech / GreenTech',
  'PropTech', 'LegalTech', 'HRTech', 'RetailTech', 'LogisticsTech',
  'FoodTech', 'TravelTech', 'Cybersecurity', 'AI / ML', 'SaaS',
  'E-Commerce', 'IoT', 'Blockchain / Web3', 'Gaming', 'MediaTech', 'Other',
];

const STAGES = [
  { value: 'validation',     label: 'Validation' },
  { value: 'pre_revenue',    label: 'Pre Revenue' },
  { value: 'prototype',      label: 'Prototype' },
  { value: 'mvp',            label: 'MVP' },
  { value: 'pilot',          label: 'Pilot' },
  { value: 'revenue_model',  label: 'Revenue Model' },
  { value: 'early_traction', label: 'Early Traction' },
  { value: 'revenue_stage',  label: 'Revenue Stage' },
  { value: 'scaling',        label: 'Scaling' },
  { value: 'ideation',       label: 'Ideation' },
  { value: 'growth',         label: 'Growth' },
  { value: 'scale',          label: 'Scale' },
];

const STATUSES = [
  { value: 'active',     label: 'Active' },
  { value: 'inactive',   label: 'Inactive' },
  { value: 'graduated',  label: 'Graduated' },
  { value: 'suspended',  label: 'Suspended' },
];

const STATUS_VARIANT: Record<string, any> = {
  active: 'success', inactive: 'warning', graduated: 'info', suspended: 'danger',
};

const SCORE_PARAMS = [
  { key: 'sector',           label: 'Sector Relevance' },
  { key: 'stage',            label: 'Stage Fit' },
  { key: 'founderStrength',  label: 'Founder Strength' },
  { key: 'incorporation',    label: 'Legal Readiness' },
  { key: 'problemMarket',    label: 'Problem-Market Fit' },
  { key: 'gtm',              label: 'Go-to-Market Strategy' },
  { key: 'marketValidation', label: 'Market Validation' },
] as const;

type ScoreKey = (typeof SCORE_PARAMS)[number]['key'];

const EMPTY_SCORES: Record<ScoreKey, number> = {
  sector: 5, stage: 5, founderStrength: 5, incorporation: 5,
  problemMarket: 5, gtm: 5, marketValidation: 5,
};

// ── page ───────────────────────────────────────────────────────────────────

export default function InvestorDashboard() {
  const { user } = useAuthStore();
  const qc = useQueryClient();

  // Filters
  const [search, setSearch] = useState('');
  const [sector, setSector] = useState('');
  const [stage, setStage] = useState('');
  const [status, setStatus] = useState('');
  const [cohortYear, setCohortYear] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Evaluation modal
  const [evalStartup, setEvalStartup] = useState<any>(null);
  const [scores, setScores] = useState<Record<ScoreKey, number>>(EMPTY_SCORES);
  const [notes, setNotes] = useState('');
  const [recommendation, setRecommendation] = useState('neutral');
  const [evalError, setEvalError] = useState('');

  const params: Record<string, any> = { limit: 60 };
  if (sector) params.sector = sector;
  if (stage) params.stage = stage;
  if (status) params.status = status;
  if (cohortYear) params.cohortYear = cohortYear;
  if (search) params.search = search;

  const { data, isLoading } = useQuery({
    queryKey: ['all-startups', params],
    queryFn: () => startupsApi.getAll(params).then((r) => r.data),
    staleTime: 20_000,
  });

  const startups: any[] = data?.startups ?? [];
  const total: number = data?.total ?? 0;

  const submitMutation = useMutation({
    mutationFn: (payload: any) => apiClient.post('/evaluations', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-startups'] });
      closeEval();
    },
    onError: (err: any) => {
      setEvalError(err?.response?.data?.message ?? 'Submission failed. Try again.');
    },
  });

  function openEval(startup: any) {
    setEvalStartup(startup);
    setScores(EMPTY_SCORES);
    setNotes('');
    setRecommendation('neutral');
    setEvalError('');
  }

  function closeEval() {
    setEvalStartup(null);
    setEvalError('');
  }

  function handleSubmit() {
    if (!evalStartup) return;
    setEvalError('');
    submitMutation.mutate({
      startupId: evalStartup._id,
      scores,
      notes: notes || undefined,
      recommendation,
    });
  }

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);

  const hasFilters = !!(sector || stage || status || cohortYear || search);

  function clearFilters() {
    setSearch(''); setSector(''); setStage(''); setStatus(''); setCohortYear('');
  }

  const selectCls = clsx(
    'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white',
    'focus:outline-none focus:ring-2 focus:ring-violet-300 cursor-pointer appearance-none',
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">All Startups</h1>
            <p className="text-slate-500 text-sm mt-1">
              Browse and evaluate startups · {user?.name}
            </p>
          </div>
          {total > 0 && (
            <span className="text-sm text-slate-400 bg-slate-100 rounded-full px-3 py-1">
              {total} startup{total !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Search + Filter bar */}
        <div className="space-y-3">
          <div className="flex gap-2">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                placeholder="Search startups…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Toggle filter panel */}
            <Button
              variant={showFilters ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setShowFilters((v) => !v)}
            >
              <SlidersHorizontal size={14} className="mr-1.5" />
              Filters
              {hasFilters && (
                <span className="ml-1.5 w-4 h-4 rounded-full bg-violet-600 text-white text-[10px] flex items-center justify-center font-bold">
                  {[sector, stage, status, cohortYear].filter(Boolean).length}
                </span>
              )}
            </Button>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X size={13} className="mr-1" /> Clear
              </Button>
            )}
          </div>

          {/* Expandable filter row */}
          {showFilters && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
              {/* Industry */}
              <div className="relative">
                <select className={selectCls} value={sector} onChange={(e) => setSector(e.target.value)}>
                  <option value="">All Industries</option>
                  {INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              {/* Stage */}
              <div className="relative">
                <select className={selectCls} value={stage} onChange={(e) => setStage(e.target.value)}>
                  <option value="">All Stages</option>
                  {STAGES.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              {/* Status */}
              <div className="relative">
                <select className={selectCls} value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="">All Statuses</option>
                  {STATUSES.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              {/* Cohort Year */}
              <input
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                type="number"
                placeholder="Cohort year"
                min={2000}
                max={2100}
                value={cohortYear}
                onChange={(e) => setCohortYear(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Active filter chips */}
        {hasFilters && (
          <div className="flex flex-wrap gap-2">
            {sector && <Chip label={sector} onRemove={() => setSector('')} />}
            {stage && <Chip label={STAGES.find((s) => s.value === stage)?.label ?? stage} onRemove={() => setStage('')} />}
            {status && <Chip label={status} onRemove={() => setStatus('')} />}
            {cohortYear && <Chip label={`Cohort ${cohortYear}`} onRemove={() => setCohortYear('')} />}
          </div>
        )}

        {/* Startup grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-52 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : startups.length === 0 ? (
          <Card>
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Building2 size={28} className="text-slate-200" />
              <p className="text-slate-400 font-medium">No startups found</p>
              {hasFilters && (
                <button onClick={clearFilters} className="text-violet-500 text-sm hover:underline">
                  Clear filters
                </button>
              )}
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {startups.map((s: any) => (
              <StartupCard key={s._id} startup={s} onEvaluate={() => openEval(s)} />
            ))}
          </div>
        )}
      </div>

      {/* ── Evaluation Modal ──────────────────────────────────────────── */}
      <Modal
        open={!!evalStartup}
        onClose={closeEval}
        title={`Evaluate: ${evalStartup?.name ?? ''}`}
        size="md"
      >
        <div className="space-y-5 max-h-[72vh] overflow-y-auto pr-1">
          {/* Startup mini-card */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
              <Building2 size={16} className="text-violet-600" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 text-sm">{evalStartup?.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant="info">{evalStartup?.sector?.primary}</Badge>
                <Badge variant="outline">{evalStartup?.stage?.replace('_', ' ')}</Badge>
              </div>
            </div>
            <div className="ml-auto text-right flex-shrink-0">
              <p className="text-xs text-slate-400">Current</p>
              <p className="text-lg font-black text-violet-600">{evalStartup?.latestScore ?? 0}</p>
            </div>
          </div>

          {/* Score sliders */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Score each parameter (0 – 10)
            </p>
            {SCORE_PARAMS.map(({ key, label }) => (
              <div key={key}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-slate-700 font-medium">{label}</span>
                  <span className="font-bold text-violet-600">{scores[key]}/10</span>
                </div>
                <input
                  type="range" min={0} max={10} step={1}
                  value={scores[key]}
                  onChange={(e) =>
                    setScores((prev) => ({ ...prev, [key]: +e.target.value }))
                  }
                  className="w-full accent-violet-600"
                />
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="flex items-center justify-between py-3 border-t border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-700">Total Score</span>
            <span className="text-2xl font-black text-violet-600">{totalScore}<span className="text-sm font-normal text-slate-400">/70</span></span>
          </div>

          {/* Recommendation */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Recommendation</label>
            <select
              value={recommendation}
              onChange={(e) => setRecommendation(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-300"
            >
              <option value="strongly_recommend">Strongly Recommend</option>
              <option value="recommend">Recommend</option>
              <option value="neutral">Neutral</option>
              <option value="not_recommend">Not Recommend</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">
              Notes <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              placeholder="Share your observations…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>

          {evalError && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {evalError}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
          <Button variant="secondary" onClick={closeEval}>Cancel</Button>
          <Button onClick={handleSubmit} loading={submitMutation.isPending}>
            Submit Evaluation
          </Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}

// ── sub-components ──────────────────────────────────────────────────────────

function StartupCard({ startup, onEvaluate }: { startup: any; onEvaluate: () => void }) {
  const score = startup.latestScore ?? 0;
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-slate-900 text-base leading-tight truncate">{startup.name}</h3>
          {startup.schemeName && (
            <p className="text-xs text-slate-400 mt-0.5 truncate">{startup.schemeName}</p>
          )}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <Badge variant="info">{startup.sector?.primary}</Badge>
            <Badge variant="outline">{startup.stage?.replace('_', ' ')}</Badge>
            <Badge variant={STATUS_VARIANT[startup.status] ?? 'default'}>{startup.status}</Badge>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-slate-400">Score</p>
          <p className="text-2xl font-black text-violet-600 leading-none mt-0.5">{score}</p>
          <p className="text-xs text-slate-400">/100</p>
        </div>
      </div>

      <ScoreBar score={score} label="" />

      {startup.description && (
        <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 -mt-1">
          {startup.description}
        </p>
      )}

      <div className="flex items-center gap-2 pt-1 border-t border-slate-50">
        <span className="flex items-center gap-1 text-xs text-slate-400">
          <Calendar size={11} /> {startup.cohortYear}
        </span>
        {startup.fundingSecured > 0 && (
          <span className="text-xs text-slate-400">
            ₹{(startup.fundingSecured / 100000).toFixed(1)}L
          </span>
        )}
        {startup.website && (
          <a href={startup.website} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-violet-500 transition-colors">
            <Globe size={11} /> Website
          </a>
        )}
        <Button
          variant="secondary"
          size="sm"
          className="ml-auto"
          onClick={onEvaluate}
        >
          <Star size={12} className="mr-1" /> Evaluate
        </Button>
      </div>
    </Card>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200 rounded-full px-3 py-1">
      {label}
      <button onClick={onRemove} className="hover:text-violet-900">
        <X size={11} />
      </button>
    </span>
  );
}
