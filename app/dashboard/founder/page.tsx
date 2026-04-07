'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ScoreBar } from '@/components/startups/ScoreBar';
import { Modal } from '@/components/ui/Modal';
import { FormField, selectCls, inputCls } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import apiClient from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/auth.store';
import Link from 'next/link';
import { Plus, Building2, Globe, Calendar, ArrowRight } from 'lucide-react';
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
];

const FUNDING_SCHEMES = [
  'Bootstrapped', 'Seed', 'Angel', 'Series A', 'Series B', 'Series C+',
  'Government Grant', 'Cohort Fund', 'Venture Debt', 'Other',
];

const STATUS_VARIANT: Record<string, any> = {
  active: 'success', inactive: 'warning', graduated: 'info', suspended: 'danger',
};

const EMPTY_FORM = {
  // Startup info
  name: '', schemeName: '', industry: '', stage: '', cohortYear: new Date().getFullYear(), description: '',
  // Founder details
  founderName: '', contact: '', founderEmail: '',
  // Online presence
  website: '', pitchDeckLink: '',
  // Incorporation
  incorporationDate: '', cinNumber: '',
  // Funding
  fundingSecured: '', fundingScheme: '', dateOfRelease: '',
};

type FormState = typeof EMPTY_FORM;

// ── page ───────────────────────────────────────────────────────────────────

export default function FounderDashboard() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  const { data: startups = [], isLoading } = useQuery<any[]>({
    queryKey: ['my-startups', user?._id],
    queryFn: () => apiClient.get('/founders/my/startups').then((r) => r.data),
    enabled: !!user?._id,
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) =>
      apiClient.post('/founders/my/startup', payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-startups', user?._id] });
      setShowForm(false);
      setForm(EMPTY_FORM);
      setFormError('');
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.message ?? 'Failed to create startup.');
    },
  });

  function set(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    createMutation.mutate({
      name: form.name,
      schemeName: form.schemeName || undefined,
      sector: { primary: form.industry, tags: [] },
      stage: form.stage,
      cohortYear: Number(form.cohortYear),
      description: form.description || undefined,
      // Founder
      founderName: form.founderName,
      contact: form.contact || undefined,
      founderEmail: form.founderEmail,
      // Online
      website: form.website || undefined,
      pitchDeckLink: form.pitchDeckLink || undefined,
      // Incorporation
      incorporationDate: form.incorporationDate || undefined,
      cinNumber: form.cinNumber || undefined,
      // Funding
      fundingSecured: form.fundingSecured ? Number(form.fundingSecured) : undefined,
      fundingScheme: form.fundingScheme || undefined,
      dateOfRelease: form.dateOfRelease || undefined,
    });
  }

  function closeForm() {
    setShowForm(false);
    setForm(EMPTY_FORM);
    setFormError('');
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Startups</h1>
            <p className="text-slate-500 text-sm mt-1">Welcome back, {user?.name}</p>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Plus size={15} className="mr-1.5" /> Add Startup
          </Button>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {[1, 2].map((i) => <div key={i} className="h-52 rounded-xl bg-slate-100 animate-pulse" />)}
          </div>
        ) : startups.length === 0 ? (
          <Card>
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center">
                <Building2 size={28} className="text-violet-400" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-slate-800">No startups yet</p>
                <p className="text-slate-400 text-sm mt-1">Register your first startup to get started</p>
              </div>
              <Button onClick={() => setShowForm(true)}>
                <Plus size={15} className="mr-1.5" /> Add Your First Startup
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {startups.map((s: any) => <StartupCard key={s._id} startup={s} />)}
            <button
              onClick={() => setShowForm(true)}
              className={clsx(
                'rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3 py-10',
                'hover:border-violet-300 hover:bg-violet-50/40 transition-colors text-slate-400 hover:text-violet-500',
              )}
            >
              <Plus size={22} />
              <span className="text-sm font-medium">Add Another Startup</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Add Startup Modal ────────────────────────────────────────── */}
      <Modal open={showForm} onClose={closeForm} title="Register New Startup" size="lg">
        <form onSubmit={handleSubmit}>
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">

            {/* Section 1 — Startup Info */}
            <Section label="Startup Information">
              <TwoCol>
                <FormField label="Startup Name" required>
                  <input className={inputCls} placeholder="e.g. AquaTech Solutions"
                    value={form.name} onChange={set('name')} required />
                </FormField>
                <FormField label="Scheme Name">
                  <input className={inputCls} placeholder="e.g. Startup India, DPIIT"
                    value={form.schemeName} onChange={set('schemeName')} />
                </FormField>
              </TwoCol>
              <TwoCol>
                <FormField label="Industry Focus" required>
                  <select className={selectCls} value={form.industry} onChange={set('industry')} required>
                    <option value="">Select industry…</option>
                    {INDUSTRIES.map((ind) => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Startup Stage" required>
                  <select className={selectCls} value={form.stage} onChange={set('stage')} required>
                    <option value="">Select stage…</option>
                    {STAGES.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </FormField>
              </TwoCol>
              <TwoCol>
                <FormField label="Cohort Year" required>
                  <input className={inputCls} type="number" min={2000} max={2100}
                    value={form.cohortYear} onChange={set('cohortYear')} required />
                </FormField>
              </TwoCol>
              <FormField label="Description">
                <textarea className={clsx(inputCls, 'resize-none')} rows={2}
                  placeholder="What problem are you solving?"
                  value={form.description} onChange={set('description')} />
              </FormField>
            </Section>

            {/* Section 2 — Founder Details */}
            <Section label="Founder Details">
              <TwoCol>
                <FormField label="Founder Name" required>
                  <input className={inputCls} placeholder="Full name"
                    value={form.founderName} onChange={set('founderName')} required />
                </FormField>
                <FormField label="Contact (Phone)">
                  <input className={inputCls} type="tel" placeholder="+91 98765 43210"
                    value={form.contact} onChange={set('contact')} />
                </FormField>
              </TwoCol>
              <FormField label="Founder Email" required>
                <input className={inputCls} type="email" placeholder="founder@startup.com"
                  value={form.founderEmail} onChange={set('founderEmail')} required />
              </FormField>
            </Section>

            {/* Section 3 — Online Presence */}
            <Section label="Online Presence">
              <TwoCol>
                <FormField label="Website">
                  <input className={inputCls} type="url" placeholder="https://yourstartup.com"
                    value={form.website} onChange={set('website')} />
                </FormField>
                <FormField label="Pitch Deck Link">
                  <input className={inputCls} type="url" placeholder="https://drive.google.com/…"
                    value={form.pitchDeckLink} onChange={set('pitchDeckLink')} />
                </FormField>
              </TwoCol>
            </Section>

            {/* Section 4 — Incorporation */}
            <Section label="Incorporation">
              <TwoCol>
                <FormField label="Incorporation Date">
                  <input className={inputCls} type="date"
                    value={form.incorporationDate} onChange={set('incorporationDate')} />
                </FormField>
                <FormField label="CIN Number">
                  <input className={inputCls} placeholder="U12345MH2024PTC123456"
                    value={form.cinNumber} onChange={set('cinNumber')} />
                </FormField>
              </TwoCol>
            </Section>

            {/* Section 5 — Funding */}
            <Section label="Funding">
              <TwoCol>
                <FormField label="Funding Secured (₹)">
                  <input className={inputCls} type="number" min={0} placeholder="e.g. 5000000"
                    value={form.fundingSecured} onChange={set('fundingSecured')} />
                </FormField>
                <FormField label="Funding Scheme">
                  <select className={selectCls} value={form.fundingScheme} onChange={set('fundingScheme')}>
                    <option value="">Select scheme…</option>
                    {FUNDING_SCHEMES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </FormField>
              </TwoCol>
              <TwoCol>
                <FormField label="Date of Release" hint="When the funding was or will be released">
                  <input className={inputCls} type="date"
                    value={form.dateOfRelease} onChange={set('dateOfRelease')} />
                </FormField>
              </TwoCol>
            </Section>

          </div>

          {formError && (
            <p className="mt-4 text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-5 border-t border-slate-100 mt-5">
            <Button variant="secondary" type="button" onClick={closeForm}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending}>Register Startup</Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}

// ── helper components ───────────────────────────────────────────────────────

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

function StartupCard({ startup }: { startup: any }) {
  const score = startup.latestScore ?? 0;
  return (
    <Link href={`/dashboard/founder/startups/${startup._id}`} className="block group">
      <Card className="flex flex-col gap-4 transition-shadow group-hover:shadow-md group-hover:border-violet-200">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 text-base leading-tight truncate group-hover:text-violet-700 transition-colors">
              {startup.name}
            </h3>
            {startup.schemeName && (
              <p className="text-xs text-slate-400 mt-0.5">{startup.schemeName}</p>
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

        <div className="flex items-center gap-3 text-xs text-slate-400 pt-1 border-t border-slate-50">
          <span className="flex items-center gap-1"><Calendar size={11} /> {startup.cohortYear}</span>
          {startup.fundingSecured > 0 && (
            <span>₹{(startup.fundingSecured / 100000).toFixed(1)}L secured</span>
          )}
          {startup.website && (
            <span className="flex items-center gap-1"><Globe size={11} /> Website</span>
          )}
          <span className="ml-auto flex items-center gap-1 text-violet-500 font-medium group-hover:gap-2 transition-all">
            View details <ArrowRight size={11} />
          </span>
        </div>
      </Card>
    </Link>
  );
}
