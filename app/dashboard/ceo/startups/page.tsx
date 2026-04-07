'use client';
import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ScoreBar } from '@/components/startups/ScoreBar';
import { Modal } from '@/components/ui/Modal';
import { FormField, inputCls, selectCls } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { startupsApi } from '@/lib/api/startups';
import {
  Search, Filter, ChevronRight, AlertTriangle, Building2,
  Plus, Upload, Download, X, CheckCircle, AlertCircle,
} from 'lucide-react';
import { clsx } from 'clsx';
import * as XLSX from 'xlsx';

// ── constants ──────────────────────────────────────────────────────────────

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

const STAGE_VALUES = STAGES.map((s) => s.value);

// Map display labels (from Excel) → enum value
const STAGE_MAP: Record<string, string> = {
  'validation':      'validation',
  'pre revenue':     'pre_revenue',
  'pre-revenue':     'pre_revenue',
  'prototype':       'prototype',
  'mvp':             'mvp',
  'pilot':           'pilot',
  'revenue model':   'revenue_model',
  'early traction':  'early_traction',
  'revenue stage':   'revenue_stage',
  'scaling':         'scaling',
  'ideation':        'ideation',
  'growth':          'growth',
  'scale':           'scale',
};

const SECTORS = [
  'EdTech', 'FinTech', 'HealthTech / MedTech', 'AgriTech', 'CleanTech / GreenTech',
  'PropTech', 'LegalTech', 'HRTech', 'RetailTech', 'LogisticsTech', 'FoodTech',
  'TravelTech', 'Cybersecurity', 'AI / ML', 'SaaS', 'E-Commerce', 'IoT',
  'Blockchain / Web3', 'Gaming', 'MediaTech', 'Other',
];

const FUNDING_SCHEMES = [
  'Bootstrapped', 'Seed', 'Angel', 'Series A', 'Series B', 'Series C+',
  'Government Grant', 'Cohort Fund', 'Venture Debt', 'Other',
];

const STAGE_FILTER = ['', ...STAGE_VALUES];
const STATUSES = ['', 'active', 'inactive', 'graduated', 'suspended'];

const STAGE_COLOR: Record<string, any> = {
  ideation: 'outline', validation: 'warning', early_traction: 'info',
  growth: 'success', scale: 'success',
};
const STATUS_COLOR: Record<string, any> = {
  active: 'success', inactive: 'warning', graduated: 'info', suspended: 'danger',
};

const EMPTY_FORM = {
  // Startup info
  name: '', schemeName: '', sector: { primary: '', tags: '' }, stage: 'ideation',
  cohortYear: String(new Date().getFullYear()), description: '',
  // Online presence
  website: '', pitchDeckLink: '',
  // Incorporation
  incorporationDate: '', cinNumber: '',
  // Funding
  fundingSecured: '', fundingScheme: '', dateOfRelease: '',
};

// ── Excel template columns ─────────────────────────────────────────────────
const TEMPLATE_HEADERS = [
  'Startup Name',        // required
  'Scheme Name',
  'Industry Focus Area', // required
  'Startup Stage',       // required
  'Cohort Year',         // required
  'Description',
  'Website',
  'Pitch Deck Link',
  'Incorporation Date',  // YYYY-MM-DD
  'CIN Number',
  'Funding Secured (INR)',
  'Funding Scheme',
  'Date of Release',     // YYYY-MM-DD
];

const TEMPLATE_EXAMPLE = [
  'AquaTech Solutions',
  'Startup India',
  'CleanTech / GreenTech',
  'Early Traction',
  new Date().getFullYear(),
  'Water purification for rural India',
  'https://aquatech.com',
  'https://drive.google.com/deck',
  '2023-06-15',
  'U12345MH2024PTC123456',
  5000000,
  'Government Grant',
  '2024-01-01',
];

// ── helpers ────────────────────────────────────────────────────────────────

function normalizeStage(raw: string): string {
  const key = String(raw ?? '').toLowerCase().trim();
  return STAGE_MAP[key] ?? key.replace(/\s+/g, '_');
}

function parseExcelRow(row: any): { payload: any; errors: string[] } {
  const errors: string[] = [];

  const name = String(row['Startup Name'] ?? '').trim();
  if (!name) errors.push('Startup Name is required');

  const sectorPrimary = String(row['Industry Focus Area'] ?? '').trim();
  if (!sectorPrimary) errors.push('Industry Focus Area is required');

  const rawStage = String(row['Startup Stage'] ?? '').trim();
  const stage = normalizeStage(rawStage);
  if (!rawStage) errors.push('Startup Stage is required');

  const rawYear = row['Cohort Year'];
  const cohortYear = rawYear ? Number(rawYear) : new Date().getFullYear();
  if (isNaN(cohortYear) || cohortYear < 2000 || cohortYear > 2100)
    errors.push('Cohort Year must be between 2000–2100');

  const schemeName      = String(row['Scheme Name'] ?? '').trim() || undefined;
  const description     = String(row['Description'] ?? '').trim() || undefined;
  const website         = String(row['Website'] ?? '').trim() || undefined;
  const pitchDeckLink   = String(row['Pitch Deck Link'] ?? '').trim() || undefined;
  const incorporationDate = String(row['Incorporation Date'] ?? '').trim() || undefined;
  const cinNumber       = String(row['CIN Number'] ?? '').trim() || undefined;
  const rawFunding      = row['Funding Secured (INR)'];
  const fundingSecured  = rawFunding !== '' && rawFunding != null ? Number(rawFunding) : undefined;
  const fundingScheme   = String(row['Funding Scheme'] ?? '').trim() || undefined;
  const dateOfRelease   = String(row['Date of Release'] ?? '').trim() || undefined;

  return {
    payload: {
      name, schemeName,
      sector: { primary: sectorPrimary, tags: [] },
      stage, cohortYear, description, website, pitchDeckLink,
      incorporationDate, cinNumber, fundingSecured, fundingScheme, dateOfRelease,
    },
    errors,
  };
}

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, TEMPLATE_EXAMPLE]);

  // Column widths: wider for text-heavy columns
  ws['!cols'] = TEMPLATE_HEADERS.map((h) => {
    if (h === 'Description') return { wch: 40 };
    if (h === 'Pitch Deck Link' || h === 'Website') return { wch: 35 };
    if (h === 'CIN Number') return { wch: 26 };
    return { wch: 22 };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Startups');
  XLSX.writeFile(wb, 'startup_import_template.xlsx');
}

// ── page ───────────────────────────────────────────────────────────────────

export default function StartupsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [page, setPage] = useState(1);

  // Single create/edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Excel import
  const [importModal, setImportModal] = useState(false);
  const [importRows, setImportRows] = useState<Array<{ payload: any; errors: string[] }>>([]);
  const [importDone, setImportDone] = useState<Array<{ name: string; ok: boolean; msg?: string }>>([]);
  const [importing, setImporting] = useState(false);

  // ── queries ───────────────────────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ['startups-list', stageFilter, statusFilter, page],
    queryFn: () =>
      startupsApi.getAll({ stage: stageFilter || undefined, status: statusFilter || undefined, page, limit: 15 })
        .then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => startupsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['startups-list'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => startupsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['startups-list'] });
      closeModal();
    },
  });

  // ── single modal ──────────────────────────────────────────────────────────

  function openCreate() {
    setEditTarget(null); setForm(EMPTY_FORM); setErrors({}); setModalOpen(true);
  }

  function openEdit(s: any, e: React.MouseEvent) {
    e.stopPropagation();
    setEditTarget(s);
    setForm({
      name: s.name,
      schemeName: s.schemeName ?? '',
      sector: { primary: s.sector?.primary ?? '', tags: (s.sector?.tags ?? []).join(', ') },
      stage: s.stage,
      cohortYear: String(s.cohortYear),
      description: s.description ?? '',
      website: s.website ?? '',
      pitchDeckLink: s.pitchDeckLink ?? '',
      incorporationDate: s.incorporationDate ? s.incorporationDate.slice(0, 10) : '',
      cinNumber: s.cinNumber ?? '',
      fundingSecured: s.fundingSecured != null ? String(s.fundingSecured) : '',
      fundingScheme: s.fundingScheme ?? '',
      dateOfRelease: s.dateOfRelease ? s.dateOfRelease.slice(0, 10) : '',
    });
    setErrors({}); setModalOpen(true);
  }

  function closeModal() { setModalOpen(false); setEditTarget(null); setErrors({}); }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.sector.primary) e.sector = 'Sector is required';
    if (!form.stage) e.stage = 'Stage is required';
    const yr = +form.cohortYear;
    if (!form.cohortYear || isNaN(yr) || yr < 2000 || yr > 2100) e.cohortYear = 'Valid year required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function sf(field: keyof typeof EMPTY_FORM) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function handleSubmit() {
    if (!validate()) return;
    const payload: any = {
      name: form.name.trim(),
      schemeName: form.schemeName.trim() || undefined,
      sector: {
        primary: form.sector.primary,
        tags: form.sector.tags ? form.sector.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      },
      stage: form.stage,
      cohortYear: +form.cohortYear,
      description: form.description.trim() || undefined,
      website: form.website.trim() || undefined,
      pitchDeckLink: form.pitchDeckLink.trim() || undefined,
      incorporationDate: form.incorporationDate || undefined,
      cinNumber: form.cinNumber.trim() || undefined,
      fundingSecured: form.fundingSecured !== '' ? Number(form.fundingSecured) : undefined,
      fundingScheme: form.fundingScheme || undefined,
      dateOfRelease: form.dateOfRelease || undefined,
    };
    if (editTarget) updateMutation.mutate({ id: editTarget._id, data: payload });
    else createMutation.mutate(payload);
  }

  // ── Excel import ──────────────────────────────────────────────────────────

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
        const parsed = json.filter((r) => String(r['Startup Name'] ?? '').trim()).map(parseExcelRow);
        setImportRows(parsed);
        setImportDone([]);
        setImportModal(true);
      } catch {
        alert('Could not read file. Make sure it is a valid .xlsx or .csv file.');
      }
    };
    reader.readAsBinaryString(file);
  }

  async function runImport() {
    setImporting(true);
    const results: Array<{ name: string; ok: boolean; msg?: string }> = [];

    for (const row of importRows) {
      if (row.errors.length > 0) {
        results.push({ name: row.payload.name || '(invalid)', ok: false, msg: row.errors[0] });
        continue;
      }
      try {
        await startupsApi.create(row.payload);
        results.push({ name: row.payload.name, ok: true });
      } catch (err: any) {
        const msg = err?.response?.data?.message?.[0] ?? err?.response?.data?.message ?? 'Failed';
        results.push({ name: row.payload.name, ok: false, msg: String(msg) });
      }
    }

    setImportDone(results);
    setImporting(false);
    queryClient.invalidateQueries({ queryKey: ['startups-list'] });
  }

  function closeImport() { setImportModal(false); setImportRows([]); setImportDone([]); }

  // ── render ─────────────────────────────────────────────────────────────────

  const isPending = createMutation.isPending || updateMutation.isPending;
  const mutError = (createMutation.error || updateMutation.error) as any;
  const startups = (data?.startups ?? []).filter((s: any) =>
    search ? s.name.toLowerCase().includes(search.toLowerCase()) : true,
  );
  const validRows = importRows.filter((r) => r.errors.length === 0);
  const invalidRows = importRows.filter((r) => r.errors.length > 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Startups</h1>
            <p className="text-slate-500 text-sm mt-1">{data?.total ?? 0} total · showing {startups.length}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Download template */}
            <Button variant="ghost" onClick={downloadTemplate}>
              <Download size={14} className="mr-1.5" /> Template
            </Button>

            {/* Upload Excel */}
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              <Upload size={14} className="mr-1.5" /> Upload Excel
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Add single */}
            <Button onClick={openCreate}>
              <Plus size={14} className="mr-1.5" /> Add Startup
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search startups..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300" />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400" />
            <select value={stageFilter} onChange={(e) => { setStageFilter(e.target.value); setPage(1); }}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-300">
              {STAGE_FILTER.map((s) => <option key={s} value={s}>{s ? s.replace(/_/g, ' ') : 'All stages'}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-300">
              {STATUSES.map((s) => <option key={s} value={s}>{s || 'All statuses'}</option>)}
            </select>
          </div>
        </div>

        {/* Table */}
        <Card padding={false}>
          {isLoading ? (
            <div className="py-16 text-center text-slate-400 text-sm">Loading startups...</div>
          ) : startups.length === 0 ? (
            <div className="py-16 text-center">
              <Building2 size={32} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No startups found</p>
              <button onClick={openCreate} className="mt-3 text-sm text-violet-600 hover:underline">+ Add first startup</button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              <div className="grid grid-cols-12 px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide bg-slate-50 rounded-t-xl">
                <span className="col-span-4">Startup</span>
                <span className="col-span-2">Sector</span>
                <span className="col-span-2">Stage</span>
                <span className="col-span-2">Score</span>
                <span className="col-span-1">Status</span>
                <span className="col-span-1"></span>
              </div>
              {startups.map((s: any) => (
                <div key={s._id} onClick={() => router.push(`/dashboard/ceo/startups/${s._id}`)}
                  className="grid grid-cols-12 px-6 py-4 items-center hover:bg-slate-50 cursor-pointer transition-colors">
                  <div className="col-span-4 flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {s.name[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">{s.name}</p>
                      {s.isFlagged && (
                        <span className="flex items-center gap-1 text-xs text-red-500">
                          <AlertTriangle size={10} /> Flagged
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="col-span-2 text-sm text-slate-600 truncate">{s.sector?.primary}</div>
                  <div className="col-span-2">
                    <Badge variant={STAGE_COLOR[s.stage] ?? 'outline'}>{s.stage?.replace(/_/g, ' ')}</Badge>
                  </div>
                  <div className="col-span-2 pr-4">
                    <ScoreBar score={s.latestScore ?? 0} showValue={false} />
                    <span className="text-xs text-slate-500 mt-0.5 block">{s.latestScore ?? 0}/100</span>
                  </div>
                  <div className="col-span-1">
                    <Badge variant={STATUS_COLOR[s.status] ?? 'outline'}>{s.status}</Badge>
                  </div>
                  <div className="col-span-1 flex items-center justify-end gap-1">
                    <button onClick={(e) => openEdit(s, e)}
                      className="text-xs text-slate-400 hover:text-violet-600 px-2 py-1 rounded hover:bg-violet-50 transition-colors">
                      Edit
                    </button>
                    <ChevronRight size={16} className="text-slate-300" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <span className="text-sm text-slate-500">Page {page} of {data.totalPages}</span>
            <Button variant="secondary" disabled={page === data.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        )}
      </div>

      {/* ── Single Create / Edit Modal ──────────────────────────────── */}
      <Modal open={modalOpen} onClose={closeModal} title={editTarget ? `Edit: ${editTarget.name}` : 'Add New Startup'} size="lg">
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">

          {/* Section 1 — Startup Information */}
          <Section label="Startup Information">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Startup Name" required error={errors.name}>
                <input className={inputCls} placeholder="e.g. AquaTech Solutions"
                  value={form.name} onChange={sf('name')} />
              </FormField>
              <FormField label="Scheme Name">
                <input className={inputCls} placeholder="e.g. Startup India, DPIIT"
                  value={form.schemeName} onChange={sf('schemeName')} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Industry Focus" required error={errors.sector}>
                <select className={selectCls} value={form.sector.primary}
                  onChange={(e) => setForm((f) => ({ ...f, sector: { ...f.sector, primary: e.target.value } }))}>
                  <option value="">Select industry…</option>
                  {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </FormField>
              <FormField label="Tags" hint="Comma-separated">
                <input className={inputCls} placeholder="AI, SaaS"
                  value={form.sector.tags}
                  onChange={(e) => setForm((f) => ({ ...f, sector: { ...f.sector, tags: e.target.value } }))} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Startup Stage" required error={errors.stage}>
                <select className={selectCls} value={form.stage} onChange={sf('stage')}>
                  <option value="">Select stage…</option>
                  {STAGES.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Cohort Year" required error={errors.cohortYear}>
                <input className={inputCls} type="number" min={2000} max={2100}
                  value={form.cohortYear} onChange={sf('cohortYear')} />
              </FormField>
            </div>
            <FormField label="Description">
              <textarea className={clsx(inputCls, 'resize-none')} rows={2}
                placeholder="What problem are you solving?"
                value={form.description} onChange={sf('description')} />
            </FormField>
          </Section>

          {/* Section 2 — Online Presence */}
          <Section label="Online Presence">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Website">
                <input className={inputCls} type="url" placeholder="https://startup.com"
                  value={form.website} onChange={sf('website')} />
              </FormField>
              <FormField label="Pitch Deck Link">
                <input className={inputCls} type="url" placeholder="https://drive.google.com/…"
                  value={form.pitchDeckLink} onChange={sf('pitchDeckLink')} />
              </FormField>
            </div>
          </Section>

          {/* Section 3 — Incorporation */}
          <Section label="Incorporation">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Incorporation Date">
                <input className={inputCls} type="date"
                  value={form.incorporationDate} onChange={sf('incorporationDate')} />
              </FormField>
              <FormField label="CIN Number">
                <input className={inputCls} placeholder="U12345MH2024PTC123456"
                  value={form.cinNumber} onChange={sf('cinNumber')} />
              </FormField>
            </div>
          </Section>

          {/* Section 4 — Funding */}
          <Section label="Funding">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Funding Secured (₹)">
                <input className={inputCls} type="number" min={0} placeholder="e.g. 5000000"
                  value={form.fundingSecured} onChange={sf('fundingSecured')} />
              </FormField>
              <FormField label="Funding Scheme">
                <select className={selectCls} value={form.fundingScheme} onChange={sf('fundingScheme')}>
                  <option value="">Select scheme…</option>
                  {FUNDING_SCHEMES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Date of Release" hint="When the funding was or will be released">
                <input className={inputCls} type="date"
                  value={form.dateOfRelease} onChange={sf('dateOfRelease')} />
              </FormField>
            </div>
          </Section>

        </div>

        {mutError && (
          <p className="mt-4 text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {mutError?.response?.data?.message?.[0] ?? mutError?.response?.data?.message ?? 'Something went wrong'}
          </p>
        )}
        <div className="flex justify-end gap-3 pt-5 border-t border-slate-100 mt-5">
          <Button variant="secondary" onClick={closeModal}>Cancel</Button>
          <Button onClick={handleSubmit} loading={isPending}>
            {editTarget ? 'Save Changes' : 'Create Startup'}
          </Button>
        </div>
      </Modal>

      {/* ── Excel Import Modal ───────────────────────────────────────── */}
      <Modal open={importModal} onClose={closeImport} title="Import Startups from Excel" size="lg">
        {importDone.length > 0 ? (
          /* Results view */
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                <CheckCircle size={14} /> {importDone.filter((r) => r.ok).length} created
              </span>
              <span className="flex items-center gap-1.5 text-red-500 font-medium">
                <AlertCircle size={14} /> {importDone.filter((r) => !r.ok).length} failed
              </span>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-1.5">
              {importDone.map((r, i) => (
                <div key={i} className={clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm',
                  r.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800',
                )}>
                  {r.ok
                    ? <CheckCircle size={13} className="flex-shrink-0" />
                    : <AlertCircle size={13} className="flex-shrink-0" />}
                  <span className="font-medium flex-1 truncate">{r.name}</span>
                  {r.msg && <span className="text-xs opacity-70 truncate max-w-48">{r.msg}</span>}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={closeImport}>Done</Button>
            </div>
          </div>
        ) : (
          /* Preview view */
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex items-center gap-4 text-sm">
              <span className="text-slate-600">{importRows.length} row(s) detected</span>
              {validRows.length > 0 && (
                <span className="flex items-center gap-1 text-emerald-600">
                  <CheckCircle size={13} /> {validRows.length} valid
                </span>
              )}
              {invalidRows.length > 0 && (
                <span className="flex items-center gap-1 text-red-500">
                  <AlertCircle size={13} /> {invalidRows.length} with errors
                </span>
              )}
            </div>

            {/* Preview table */}
            <div className="max-h-64 overflow-y-auto border border-slate-100 rounded-xl">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 text-slate-500 font-semibold">Name</th>
                    <th className="text-left px-3 py-2 text-slate-500 font-semibold">Industry</th>
                    <th className="text-left px-3 py-2 text-slate-500 font-semibold">Stage</th>
                    <th className="text-left px-3 py-2 text-slate-500 font-semibold">Year</th>
                    <th className="text-left px-3 py-2 text-slate-500 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {importRows.map((row, i) => (
                    <tr key={i} className={row.errors.length > 0 ? 'bg-red-50' : ''}>
                      <td className="px-3 py-2 font-medium text-slate-800">{row.payload.name || <span className="text-slate-300">—</span>}</td>
                      <td className="px-3 py-2 text-slate-600">{row.payload.sector?.primary || <span className="text-slate-300">—</span>}</td>
                      <td className="px-3 py-2 text-slate-600">{row.payload.stage?.replace(/_/g, ' ')}</td>
                      <td className="px-3 py-2 text-slate-600">{row.payload.cohortYear}</td>
                      <td className="px-3 py-2">
                        {row.errors.length > 0 ? (
                          <span className="text-red-500 flex items-center gap-1">
                            <X size={11} /> {row.errors[0]}
                          </span>
                        ) : (
                          <span className="text-emerald-600 flex items-center gap-1">
                            <CheckCircle size={11} /> OK
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {invalidRows.length > 0 && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                Rows with errors will be skipped. Fix them in your spreadsheet and re-upload, or proceed to import only valid rows.
              </p>
            )}

            {importRows.length === 0 && (
              <p className="text-slate-400 text-sm text-center py-4">
                No data rows found. Make sure the file matches the template columns.
              </p>
            )}

            <div className="flex items-center justify-between pt-2">
              <button onClick={downloadTemplate}
                className="flex items-center gap-1.5 text-sm text-violet-600 hover:underline">
                <Download size={13} /> Download template
              </button>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={closeImport}>Cancel</Button>
                <Button
                  onClick={runImport}
                  loading={importing}
                  disabled={validRows.length === 0 || importing}
                >
                  Import {validRows.length} Startup{validRows.length !== 1 ? 's' : ''}
                </Button>
              </div>
            </div>
          </div>
        )}
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
