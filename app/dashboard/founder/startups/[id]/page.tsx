'use client';
import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ScoreBar } from '@/components/startups/ScoreBar';
import { StatCard } from '@/components/ui/StatCard';
import { Modal } from '@/components/ui/Modal';
import { FormField, inputCls, selectCls } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import apiClient from '@/lib/api/client';
import { intelligenceApi } from '@/lib/api/startups';
import {
  ArrowLeft, Building2, Globe, Calendar, Link2,
  Users, IndianRupee, Landmark, Hash, TrendingUp,
  Zap, CheckCircle, Pencil, FileText,
} from 'lucide-react';
import { clsx } from 'clsx';

// ── constants ──────────────────────────────────────────────────────────────

const INDUSTRIES = [
  'EdTech','FinTech','HealthTech / MedTech','AgriTech','CleanTech / GreenTech',
  'PropTech','LegalTech','HRTech','RetailTech','LogisticsTech','FoodTech',
  'TravelTech','Cybersecurity','AI / ML','SaaS','E-Commerce','IoT',
  'Blockchain / Web3','Gaming','MediaTech','Other',
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

const FUNDING_SCHEMES = [
  'Bootstrapped','Seed','Angel','Series A','Series B','Series C+',
  'Government Grant','Cohort Fund','Venture Debt','Other',
];

const STATUS_VARIANT: Record<string, any> = {
  active: 'success', inactive: 'warning', graduated: 'info', suspended: 'danger',
};

// ── helpers ────────────────────────────────────────────────────────────────

function toDateInput(val?: string) {
  if (!val) return '';
  return new Date(val).toISOString().slice(0, 10);
}

function fmt(date?: string) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function inr(amount?: number) {
  if (!amount) return '—';
  if (amount >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(2)} Cr`;
  if (amount >= 100_000)    return `₹${(amount / 100_000).toFixed(2)} L`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

// ── page ───────────────────────────────────────────────────────────────────

export default function StartupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();

  // edit state
  const [editStartup, setEditStartup]   = useState(false);
  const [editFounder, setEditFounder]   = useState<any>(null); // founder object
  const [startupForm, setStartupForm]   = useState<any>(null);
  const [founderForm, setFounderForm]   = useState<any>(null);
  const [saveError, setSaveError]       = useState('');

  // ── queries ──────────────────────────────────────────────────────────────

  const { data: startup, isLoading } = useQuery({
    queryKey: ['startup-detail', id],
    queryFn: () => apiClient.get(`/startups/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const { data: score } = useQuery<number>({
    queryKey: ['startup-score', id],
    queryFn: () => intelligenceApi.getScore(id).then((r) => r.data),
    enabled: !!id,
  });

  const { data: recommendations = [] } = useQuery<string[]>({
    queryKey: ['recommendations', id],
    queryFn: () => intelligenceApi.getRecommendations(id).then((r) => r.data),
    enabled: !!id,
  });

  const { data: evalAggregate } = useQuery<any>({
    queryKey: ['eval-aggregate', id],
    queryFn: () => apiClient.get(`/evaluations/startup/${id}/aggregate`).then((r) => r.data),
    enabled: !!id,
  });

  // ── mutations ─────────────────────────────────────────────────────────────

  const updateStartupMutation = useMutation({
    mutationFn: (data: any) =>
      apiClient.patch(`/founders/my/startup/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['startup-detail', id] });
      qc.invalidateQueries({ queryKey: ['my-startups'] });
      setEditStartup(false);
      setSaveError('');
    },
    onError: (err: any) =>
      setSaveError(err?.response?.data?.message ?? 'Failed to save changes.'),
  });

  const updateFounderMutation = useMutation({
    mutationFn: ({ founderId, data }: { founderId: string; data: any }) =>
      apiClient.patch(`/founders/my/profile/${founderId}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['startup-detail', id] });
      setEditFounder(null);
      setSaveError('');
    },
    onError: (err: any) =>
      setSaveError(err?.response?.data?.message ?? 'Failed to save changes.'),
  });

  // ── open modals ───────────────────────────────────────────────────────────

  function openEditStartup() {
    if (!startup) return;
    setStartupForm({
      name:              startup.name            ?? '',
      schemeName:        startup.schemeName      ?? '',
      industry:          startup.sector?.primary ?? '',
      stage:             startup.stage           ?? '',
      cohortYear:        startup.cohortYear      ?? new Date().getFullYear(),
      description:       startup.description     ?? '',
      website:           startup.website         ?? '',
      pitchDeckLink:     startup.pitchDeckLink   ?? '',
      incorporationDate: toDateInput(startup.incorporationDate),
      cinNumber:         startup.cinNumber        ?? '',
      fundingSecured:    startup.fundingSecured   ?? '',
      fundingScheme:     startup.fundingScheme    ?? '',
      dateOfRelease:     toDateInput(startup.dateOfRelease),
    });
    setSaveError('');
    setEditStartup(true);
  }

  function openEditFounder(f: any) {
    setFounderForm({
      name:    f.name    ?? '',
      email:   f.email   ?? '',
      contact: f.contact ?? '',
      bio:     f.bio     ?? '',
    });
    setSaveError('');
    setEditFounder(f);
  }

  function sf(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setStartupForm((p: any) => ({ ...p, [field]: e.target.value }));
  }

  function ff(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setFounderForm((p: any) => ({ ...p, [field]: e.target.value }));
  }

  function submitStartup(e: React.FormEvent) {
    e.preventDefault();
    setSaveError('');
    updateStartupMutation.mutate({
      name:              startupForm.name       || undefined,
      schemeName:        startupForm.schemeName || undefined,
      sector:            { primary: startupForm.industry, tags: startup?.sector?.tags ?? [] },
      stage:             startupForm.stage      || undefined,
      cohortYear:        Number(startupForm.cohortYear),
      description:       startupForm.description     || undefined,
      website:           startupForm.website          || undefined,
      pitchDeckLink:     startupForm.pitchDeckLink    || undefined,
      incorporationDate: startupForm.incorporationDate || undefined,
      cinNumber:         startupForm.cinNumber         || undefined,
      fundingSecured:    startupForm.fundingSecured !== '' ? Number(startupForm.fundingSecured) : undefined,
      fundingScheme:     startupForm.fundingScheme     || undefined,
      dateOfRelease:     startupForm.dateOfRelease     || undefined,
    });
  }

  function submitFounder(e: React.FormEvent) {
    e.preventDefault();
    setSaveError('');
    updateFounderMutation.mutate({
      founderId: editFounder._id,
      data: {
        name:    founderForm.name    || undefined,
        email:   founderForm.email   || undefined,
        contact: founderForm.contact || undefined,
        bio:     founderForm.bio     || undefined,
      },
    });
  }

  // ── loading / not found ───────────────────────────────────────────────────

  const displayScore = score ?? startup?.latestScore ?? 0;
  const founders: any[] = startup?.founderIds ?? [];

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-5">
          <div className="h-8 w-48 bg-slate-100 rounded-lg animate-pulse" />
          <div className="h-52 bg-slate-100 rounded-xl animate-pulse" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />)}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!startup) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <p className="text-slate-400">Startup not found.</p>
          <Link href="/dashboard/founder" className="text-violet-500 text-sm mt-2 inline-block hover:underline">
            ← Back to My Startups
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Back */}
        <Link href="/dashboard/founder"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-violet-600 transition-colors">
          <ArrowLeft size={14} /> Back to My Startups
        </Link>

        {/* Hero card */}
        <Card>
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                  <Building2 size={22} className="text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-black text-slate-900 leading-tight">{startup.name}</h1>
                    <button onClick={openEditStartup}
                      className="flex items-center gap-1 text-xs text-violet-500 hover:text-violet-700 border border-violet-200 rounded-full px-2.5 py-0.5 hover:bg-violet-50 transition-colors">
                      <Pencil size={11} /> Edit
                    </button>
                  </div>
                  {startup.schemeName && <p className="text-sm text-slate-400 mt-0.5">{startup.schemeName}</p>}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Badge variant="info">{startup.sector?.primary}</Badge>
                <Badge variant="outline">{startup.stage?.replace(/_/g, ' ')}</Badge>
                <Badge variant={STATUS_VARIANT[startup.status] ?? 'default'}>{startup.status}</Badge>
                {startup.cohortYear && <Badge variant="outline">Cohort {startup.cohortYear}</Badge>}
              </div>

              {startup.description && (
                <p className="text-slate-600 text-sm leading-relaxed max-w-xl">{startup.description}</p>
              )}

              <div className="flex flex-wrap gap-4 mt-4">
                {startup.website && (
                  <a href={startup.website} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-violet-600 hover:underline font-medium">
                    <Globe size={13} /> {startup.website.replace(/^https?:\/\//, '')}
                  </a>
                )}
                {startup.pitchDeckLink && (
                  <a href={startup.pitchDeckLink} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-violet-600 hover:underline font-medium">
                    <Link2 size={13} /> Pitch Deck
                  </a>
                )}
              </div>
            </div>

            {/* Score */}
            <div className="md:w-48 flex-shrink-0">
              <div className="text-center p-5 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Health Score</p>
                <p className={`text-5xl font-black leading-none ${
                  displayScore >= 70 ? 'text-emerald-600' : displayScore >= 40 ? 'text-amber-500' : 'text-red-500'
                }`}>{displayScore}</p>
                <p className="text-xs text-slate-400 mt-1">/100</p>
                <div className="mt-4"><ScoreBar score={displayScore} label="" /></div>
                <div className="mt-3">
                  {displayScore >= 70
                    ? <Badge variant="success">On Track</Badge>
                    : displayScore >= 40
                    ? <Badge variant="warning">Needs Attention</Badge>
                    : <Badge variant="danger">At Risk</Badge>}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Investor Reviews" value={evalAggregate?.evaluationCount ?? 0} icon={<Users size={16} />} color="blue" />
          <StatCard label="Avg Eval Score" value={evalAggregate ? `${Math.round(evalAggregate.avgTotal * 10) / 10}/70` : '—'} icon={<TrendingUp size={16} />} color="amber" />
          <StatCard label="Funding Secured" value={inr(startup.fundingSecured)} icon={<IndianRupee size={16} />} color="green" />
          <StatCard label="Founders" value={founders.length || '—'} icon={<Users size={16} />} color="purple" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: details */}
          <div className="lg:col-span-2 space-y-5">

            {/* Incorporation */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Incorporation Details</CardTitle>
                  <button onClick={openEditStartup}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-violet-600 transition-colors">
                    <Pencil size={12} /> Edit
                  </button>
                </div>
              </CardHeader>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DetailRow icon={<Hash size={14} />}      label="CIN Number"          value={startup.cinNumber || '—'} />
                <DetailRow icon={<Calendar size={14} />}  label="Incorporation Date"   value={fmt(startup.incorporationDate)} />
                <DetailRow icon={<Calendar size={14} />}  label="Date of Release"      value={fmt(startup.dateOfRelease)} />
                <DetailRow icon={<FileText size={14} />}  label="Cohort Year"          value={startup.cohortYear ?? '—'} />
              </dl>
            </Card>

            {/* Funding */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Funding</CardTitle>
                  <button onClick={openEditStartup}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-violet-600 transition-colors">
                    <Pencil size={12} /> Edit
                  </button>
                </div>
              </CardHeader>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DetailRow icon={<IndianRupee size={14} />} label="Funding Secured" value={inr(startup.fundingSecured)} />
                <DetailRow icon={<Landmark size={14} />}    label="Funding Scheme"  value={startup.fundingScheme || '—'} />
              </dl>
              {startup.fundingSecured > 0 && (
                <div className="mt-4 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                  <p className="text-xs text-emerald-700 font-medium flex items-center gap-1.5">
                    <CheckCircle size={13} />
                    {inr(startup.fundingSecured)} raised via {startup.fundingScheme || 'undisclosed scheme'}
                  </p>
                </div>
              )}
            </Card>

            {/* Founders */}
            <Card>
              <CardHeader><CardTitle>Founders ({founders.length})</CardTitle></CardHeader>
              {founders.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-4">No founders linked yet</p>
              ) : (
                <div className="space-y-3">
                  {founders.map((f: any) => (
                    <div key={f._id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                      <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-sm flex-shrink-0">
                        {f.name?.[0]?.toUpperCase() ?? 'F'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-800 text-sm">{f.name}</p>
                        <p className="text-xs text-slate-400">{f.email}</p>
                        {f.contact && <p className="text-xs text-slate-400">{f.contact}</p>}
                      </div>
                      <button
                        onClick={() => openEditFounder(f)}
                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-violet-600 border border-slate-200 hover:border-violet-300 rounded-full px-2.5 py-1 transition-colors flex-shrink-0"
                      >
                        <Pencil size={11} /> Edit
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Right: recommendations + tags + links */}
          <div className="space-y-5">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>AI Recommendations</CardTitle>
                  <Zap size={14} className="text-violet-400" />
                </div>
              </CardHeader>
              <ul className="space-y-3">
                {recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                    <span className="w-6 h-6 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {rec}
                  </li>
                ))}
                {recommendations.length === 0 && (
                  <p className="text-slate-400 text-sm text-center py-4">No recommendations yet</p>
                )}
              </ul>
            </Card>

            {(startup.sector?.tags ?? []).length > 0 && (
              <Card>
                <CardHeader><CardTitle>Sector Tags</CardTitle></CardHeader>
                <div className="flex flex-wrap gap-2">
                  {startup.sector.tags.map((tag: string) => (
                    <span key={tag} className="text-xs bg-violet-50 text-violet-700 border border-violet-100 rounded-full px-3 py-1 font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle>Links</CardTitle></CardHeader>
              <div className="space-y-2.5">
                {startup.website
                  ? <a href={startup.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-violet-600 hover:underline"><Globe size={14} /> Website</a>
                  : <p className="text-xs text-slate-300">No website</p>}
                {startup.pitchDeckLink
                  ? <a href={startup.pitchDeckLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-violet-600 hover:underline"><Link2 size={14} /> Pitch Deck</a>
                  : <p className="text-xs text-slate-300">No pitch deck link</p>}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* ── Edit Startup Modal ────────────────────────────────────────── */}
      <Modal open={editStartup} onClose={() => setEditStartup(false)} title="Edit Startup Details" size="lg">
        {startupForm && (
          <form onSubmit={submitStartup}>
            <div className="space-y-5 max-h-[68vh] overflow-y-auto pr-1">

              <Section label="Startup Information">
                <TwoCol>
                  <FormField label="Startup Name" required>
                    <input className={inputCls} value={startupForm.name} onChange={sf('name')} required />
                  </FormField>
                  <FormField label="Scheme Name">
                    <input className={inputCls} value={startupForm.schemeName} onChange={sf('schemeName')} placeholder="e.g. Startup India" />
                  </FormField>
                </TwoCol>
                <TwoCol>
                  <FormField label="Industry Focus">
                    <select className={selectCls} value={startupForm.industry} onChange={sf('industry')}>
                      <option value="">Select…</option>
                      {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Stage">
                    <select className={selectCls} value={startupForm.stage} onChange={sf('stage')}>
                      <option value="">Select…</option>
                      {STAGES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </FormField>
                </TwoCol>
                <TwoCol>
                  <FormField label="Cohort Year">
                    <input className={inputCls} type="number" min={2000} max={2100} value={startupForm.cohortYear} onChange={sf('cohortYear')} />
                  </FormField>
                </TwoCol>
                <FormField label="Description">
                  <textarea className={clsx(inputCls, 'resize-none')} rows={2} value={startupForm.description} onChange={sf('description')} />
                </FormField>
              </Section>

              <Section label="Online Presence">
                <TwoCol>
                  <FormField label="Website">
                    <input className={inputCls} type="url" placeholder="https://" value={startupForm.website} onChange={sf('website')} />
                  </FormField>
                  <FormField label="Pitch Deck Link">
                    <input className={inputCls} type="url" placeholder="https://" value={startupForm.pitchDeckLink} onChange={sf('pitchDeckLink')} />
                  </FormField>
                </TwoCol>
              </Section>

              <Section label="Incorporation">
                <TwoCol>
                  <FormField label="Incorporation Date">
                    <input className={inputCls} type="date" value={startupForm.incorporationDate} onChange={sf('incorporationDate')} />
                  </FormField>
                  <FormField label="CIN Number">
                    <input className={inputCls} placeholder="U12345MH…" value={startupForm.cinNumber} onChange={sf('cinNumber')} />
                  </FormField>
                </TwoCol>
              </Section>

              <Section label="Funding">
                <TwoCol>
                  <FormField label="Funding Secured (₹)">
                    <input className={inputCls} type="number" min={0} value={startupForm.fundingSecured} onChange={sf('fundingSecured')} />
                  </FormField>
                  <FormField label="Funding Scheme">
                    <select className={selectCls} value={startupForm.fundingScheme} onChange={sf('fundingScheme')}>
                      <option value="">Select…</option>
                      {FUNDING_SCHEMES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </FormField>
                </TwoCol>
                <TwoCol>
                  <FormField label="Date of Release">
                    <input className={inputCls} type="date" value={startupForm.dateOfRelease} onChange={sf('dateOfRelease')} />
                  </FormField>
                </TwoCol>
              </Section>

            </div>

            {saveError && (
              <p className="mt-4 text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{saveError}</p>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
              <Button variant="secondary" type="button" onClick={() => setEditStartup(false)}>Cancel</Button>
              <Button type="submit" loading={updateStartupMutation.isPending}>Save Changes</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Edit Founder Modal ────────────────────────────────────────── */}
      <Modal
        open={!!editFounder}
        onClose={() => setEditFounder(null)}
        title={`Edit Founder · ${editFounder?.name ?? ''}`}
        size="sm"
      >
        {founderForm && (
          <form onSubmit={submitFounder} className="space-y-4">
            <FormField label="Name" required>
              <input className={inputCls} value={founderForm.name} onChange={ff('name')} required />
            </FormField>
            <FormField label="Email">
              <input className={inputCls} type="email" value={founderForm.email} onChange={ff('email')} />
            </FormField>
            <FormField label="Contact (Phone)">
              <input className={inputCls} type="tel" placeholder="+91 98765 43210" value={founderForm.contact} onChange={ff('contact')} />
            </FormField>
            <FormField label="Bio">
              <textarea className={clsx(inputCls, 'resize-none')} rows={3} placeholder="Short bio…" value={founderForm.bio} onChange={ff('bio')} />
            </FormField>

            {saveError && (
              <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{saveError}</p>
            )}

            <div className="flex justify-end gap-3 pt-1">
              <Button variant="secondary" type="button" onClick={() => setEditFounder(null)}>Cancel</Button>
              <Button type="submit" loading={updateFounderMutation.isPending}>Save Changes</Button>
            </div>
          </form>
        )}
      </Modal>

    </DashboardLayout>
  );
}

// ── sub-components ─────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 pb-2 border-b border-slate-100">
        {label}
      </p>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function TwoCol({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>;
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-400 mt-0.5">
        {icon}
      </div>
      <div>
        <dt className="text-xs text-slate-400 mb-0.5">{label}</dt>
        <dd className="text-sm font-medium text-slate-800">{value}</dd>
      </div>
    </div>
  );
}
