'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react';
import Link from 'next/link';
import { useT } from '@/lib/i18n';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DocumentStatusBadge } from './DocumentStatusBadge';
import { DocumentControlModal } from './DocumentControlModal';
import { DocumentControlDetailModal } from './DocumentControlDetailModal';
import { UploadRevisionDialog } from './UploadRevisionDialog';
import { formatDate } from '@/lib/formatters';
import PageHeader from '@/components/common/PageHeader';
import FilterBar from '@/components/common/FilterBar';
import EmptyState from '@/components/common/EmptyState';
import Pagination from '@/components/common/Pagination';
import { ActionIconButton } from '@/components/common/ActionButtons';
import { useUrlFilters } from '@/hooks/use-url-filters';
import {
  Plus, ChevronRight, Hash, Download, Upload, Home,
} from 'lucide-react';

interface DocumentControlListClientProps {
  department: { id: string; name: string };
  category: { id: string; name: string };
  canCreate: boolean;
}

function IconSort({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 opacity-30 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 9l4-4 4 4M16 15l-4 4-4-4" />
    </svg>
  );
  return dir === 'asc' ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-primary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-primary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 5v14M19 12l-7 7-7-7" />
    </svg>
  );
}

const STATUS_OPTIONS = ['DRAFT', 'ACTIVE', 'OBSOLETE'];

export function DocumentControlListClient({ department, category, canCreate }: DocumentControlListClientProps) {
  const t = useT();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [uploadDocId, setUploadDocId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  // ── URL-bound filters ────────────────────────────────────────────────────────
  const { params, rawValues, setParam, clearAll, hasFilters } = useUrlFilters({
    keys: ['search', 'status', 'page', 'sortBy', 'sortOrder'] as const,
    searchKey: 'search',
    debounceMs: 300,
  });

  const page = Math.max(1, parseInt(params.page || '1', 10));

  // ── Data fetch ───────────────────────────────────────────────────────────────
  const { data, isLoading, error } = useQuery({
    queryKey: ['documents', category.id, params.search, params.status, page, params.sortBy, params.sortOrder],
    queryFn: async () => {
      const p = new URLSearchParams();
      p.set('page', String(page));
      p.set('limit', '20');
      p.set('categoryId', category.id);
      if (params.search) p.set('search', params.search);
      if (params.status) p.set('status', params.status);
      if (params.sortBy) p.set('sortBy', params.sortBy);
      if (params.sortOrder) p.set('sortOrder', params.sortOrder);
      const res = await fetch(`/api/document-controls?${p}`);
      if (!res.ok) throw new Error('Failed to fetch documents');
      return res.json();
    },
  });

  const totalPages = data?.meta ? Math.ceil(data.meta.total / data.meta.limit) : 0;

  const statusFilterOptions = STATUS_OPTIONS.map((st) => ({
    label: t(`documentControl.status.${st}` as never),
    value: st,
  }));

  const openDetail = (id: string) => {
    setSelectedDocId(id);
    setDetailModalOpen(true);
  };

  const openUpload = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setUploadDocId(id);
    setUploadOpen(true);
  };

  function toggleSort(key: string) {
    const currentKey = params.sortBy;
    const currentOrder = params.sortOrder;

    if (currentKey === key) {
      if (currentOrder === 'asc') {
        setParam('sortOrder', 'desc');
      } else {
        setParam('sortOrder', 'asc');
      }
    } else {
      setParam('sortBy', key);
      setParam('sortOrder', 'asc');
    }
    setParam('page', '1');
  }

  function thSort(label: string, colKey: string, widthClass?: string, center = false) {
    const active = params.sortBy === colKey;
    const dir = (params.sortOrder || 'desc') as 'asc' | 'desc';
    return (
      <th
        className={`text-[11px] font-semibold uppercase tracking-wide text-neutral px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors select-none ${widthClass || ''} ${center ? 'text-center' : 'text-left'}`}
        onClick={() => toggleSort(colKey)}
      >
        <span className={`flex items-center gap-1 ${center ? 'justify-center' : 'justify-start'}`}>
          {label}
          <IconSort active={active} dir={dir} />
        </span>
      </th>
    );
  }

  const sortOptions = [
    { value: 'createdAt-desc', label: t('documentControl.sort.latestCreated') },
    { value: 'docNumber-asc', label: t('documentControl.sort.docNumberAsc') },
    { value: 'docNumber-desc', label: t('documentControl.sort.docNumberDesc') },
    { value: 'docName-asc', label: t('documentControl.sort.docNameAsc') },
    { value: 'docName-desc', label: t('documentControl.sort.docNameDesc') },
    { value: 'effectiveDate-desc', label: t('documentControl.sort.effectiveDateDesc') },
    { value: 'effectiveDate-asc', label: t('documentControl.sort.effectiveDateAsc') },
  ];
  const sortVal = params.sortBy && params.sortOrder ? `${params.sortBy}-${params.sortOrder}` : '';

  if (error) {
    return (
      <div className="card-premium p-16 flex flex-col items-center justify-center text-center">
        <p className="font-semibold text-base text-[#0F1059] mb-1">{t('common.error')}</p>
        <Button variant="outline" onClick={() => window.location.reload()} className="mt-4 rounded-xl">
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-neutral flex-wrap">
          <Link href="/qms/document-controls" className="hover:text-[#0F1059] transition-colors flex items-center gap-1">
            <Home className="w-3.5 h-3.5" />
            <span>Document Controls</span>
          </Link>
          <ChevronRight className="w-3.5 h-3.5 opacity-40" />
          <Link href={`/qms/document-controls/dept/${department.id}`} className="hover:text-[#0F1059] transition-colors">
            {department.name}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 opacity-40" />
          <span className="text-[#0F1059] font-medium">{category.name}</span>
        </nav>

        {/* Page Header */}
        <PageHeader
          title={category.name}
          subtitle={t('documentControl.list')}
          actions={
            canCreate && (
              <Button onClick={() => setModalOpen(true)} className="gap-1.5">
                <Plus className="w-4 h-4" />
                {t('documentControl.button.create')}
              </Button>
            )
          }
        />

        {/* Filter Bar */}
        <FilterBar
          searchValue={rawValues.search}
          onSearchChange={(v) => setParam('search', v)}
          searchPlaceholder={t('documentControl.placeholder.search')}
          filters={[
            {
              key: 'status',
              label: t('documentControl.table.colStatus'),
              options: statusFilterOptions,
              allLabel: t('documentControl.filterBar.allStatuses'),
            },
            {
              key: 'sort',
              label: t('documentControl.sort.label'),
              options: sortOptions,
              allLabel: t('documentControl.sort.latestCreated'),
              minWidth: '14rem',
            },
          ]}
          filterValues={{ ...params, sort: sortVal }}
          onFilterChange={(key, val) => {
            if (key === 'status') {
              setParam('status', val);
              setParam('page', '1');
            } else if (key === 'sort') {
              if (!val) {
                setParam('sortBy', '');
                setParam('sortOrder', '');
              } else {
                const [by, order] = val.split('-');
                setParam('sortBy', by);
                setParam('sortOrder', order);
              }
              setParam('page', '1');
            } else {
              setParam(key as any, val);
            }
          }}
          hasActiveFilters={hasFilters}
          onClearAll={clearAll}
          resultCount={data?.data?.length ?? 0}
          totalCount={data?.meta?.total ?? 0}
          countLabel={t('documentControl.pagination.items')}
        />

        {/* Loading skeleton */}
        {isLoading ? (
          <div className="card-premium p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full rounded-xl" />
            ))}
          </div>
        ) : !data?.data?.length ? (
          <div className="card-premium p-16 flex justify-center items-center">
            <EmptyState title={t('documentControl.empty')} description={t('documentControl.emptyDesc')} />
          </div>
        ) : (
          <>
            {/* Mobile Card List */}
            <div className="lg:hidden space-y-3">
              {data.data.map((doc: any) => (
                <div
                  key={doc.id}
                  onClick={() => openDetail(doc.id)}
                  className="card-premium p-4 flex flex-col gap-3 cursor-pointer active:scale-[0.99] transition-transform"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-base text-[#0F1059] leading-snug line-clamp-2">{doc.docName}</h3>
                      <div className="flex items-center gap-1.5 mt-1 text-sm text-neutral">
                        <Hash className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-mono truncate">{doc.docNumber}</span>
                      </div>
                    </div>
                    <DocumentStatusBadge status={doc.status} />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {canCreate && (
                      <button
                        onClick={(e) => openUpload(e, doc.id)}
                        className="flex items-center gap-1 text-xs text-neutral hover:text-[#0F1059] bg-slate-50 px-3 py-1.5 rounded-lg border border-base-300"
                      >
                        <Upload className="w-3 h-3" /> Upload REV
                      </button>
                    )}
                    {doc.spDownloadUrl && (
                      <a
                        href={`/api/document-controls/${doc.id}/download-latest`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 text-xs text-neutral hover:text-[#0F1059] bg-slate-50 px-3 py-1.5 rounded-lg border border-base-300"
                      >
                        <Download className="w-3 h-3" /> Download
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block card-premium overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-base-300">
                    {thSort(t('documentControl.table.colNumber'), 'docNumber', 'w-36')}
                    {thSort(t('documentControl.table.colName'), 'docName')}
                    {thSort(t('documentControl.field.revision'), 'revision', 'w-24', true)}
                    {thSort(t('documentControl.table.colStatus'), 'status', 'w-28', true)}
                    {thSort(t('documentControl.field.effectiveDate'), 'effectiveDate', 'w-32', true)}
                    <th className="text-[11px] font-semibold uppercase tracking-wide text-neutral px-4 py-3 text-right w-28 select-none">
                      {t('documentControl.table.colActions')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((doc: any) => (
                    <tr
                      key={doc.id}
                      onClick={() => openDetail(doc.id)}
                      className="border-b border-base-300 hover:bg-[#0F1059]/[0.02] transition-colors cursor-pointer last:border-b-0"
                    >
                      <td className="text-neutral text-sm font-mono px-4 py-3">{doc.docNumber}</td>
                      <td className="text-slate-800 text-sm font-medium px-4 py-3 max-w-[280px]">
                        <span className="line-clamp-1">{doc.docName}</span>
                      </td>
                      <td className="text-center px-4 py-3">
                        {doc.revision ? (
                          <span className="inline-flex items-center bg-[#0F1059]/10 text-[#0F1059] text-xs font-mono font-semibold px-2.5 py-1 rounded-full">
                            {doc.revision}
                          </span>
                        ) : (
                          <span className="text-neutral/40 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <DocumentStatusBadge status={doc.status} />
                      </td>
                      <td className="text-neutral text-xs font-mono px-4 py-3 text-center">
                        {doc.effectiveDate ? formatDate(doc.effectiveDate) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <ActionIconButton
                            tone="view"
                            label="View"
                            onClick={(e) => { e.stopPropagation(); openDetail(doc.id); }}
                          />
                          {canCreate && (
                            <button
                              onClick={(e) => openUpload(e, doc.id)}
                              title="Upload Revision"
                              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#0F1059]/[0.06] text-neutral transition-colors"
                            >
                              <Upload className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {doc.spDownloadUrl && (
                            <a
                              href={`/api/document-controls/${doc.id}/download-latest`}
                              onClick={(e) => e.stopPropagation()}
                              title="Download Latest"
                              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#0F1059]/[0.06] text-neutral transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <Pagination
              page={page}
              totalPages={totalPages}
              total={data.meta.total}
              countLabel={t('documentControl.pagination.items')}
              onPageChange={(p) => setParam('page', String(p))}
            />
          </>
        )}
      </div>

      {/* Create Modal */}
      <DocumentControlModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        categoryId={category.id}
        departmentId={department.id}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['documents', category.id] });
          setParam('page', '1');
        }}
      />

      {/* Detail Modal */}
      <DocumentControlDetailModal
        documentId={selectedDocId}
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        canEdit={canCreate}
        canDelete={canCreate}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['documents', category.id] })}
      />

      {/* Upload Revision */}
      <UploadRevisionDialog
        open={uploadOpen}
        onClose={() => { setUploadOpen(false); setUploadDocId(null); }}
        documentId={uploadDocId ?? ''}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['documents', category.id] })}
      />
    </>
  );
}
