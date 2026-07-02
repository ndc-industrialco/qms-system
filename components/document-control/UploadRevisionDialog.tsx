'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useT } from '@/lib/i18n';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { uploadRevisionSchema } from '@/schemas/documentControlSchema';
import ResponsiveFormOverlay from '@/components/common/ResponsiveFormOverlay';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { readApiErrorMessage, readApiJson } from '@/lib/client-api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
interface UploadRevisionDialogProps {
  open: boolean;
  onClose: () => void;
  documentId: string;
  onSuccess?: () => void;
}

const STATUSES = ['DRAFT', 'ACTIVE', 'OBSOLETE'];

export function UploadRevisionDialog({
  open,
  onClose,
  documentId,
  onSuccess,
}: UploadRevisionDialogProps) {
  const t = useT();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [darSearch, setDarSearch] = useState('');

  const { data: darsData } = useQuery({
    queryKey: ['completed-dars'],
    queryFn: async () => {
      const res = await fetch('/api/dar?all=true');
      if (!res.ok) throw new Error('Failed to fetch DARs');
      const json = await res.json();
      return (json.data || []) as any[];
    },
    enabled: open,
  });

  const dars = darsData || [];
  const filteredDars = dars.filter((dar) =>
    dar.status === 'COMPLETED' &&
    (dar.darNo?.toLowerCase().includes(darSearch.toLowerCase()) ||
     dar.objective?.toLowerCase().includes(darSearch.toLowerCase()))
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(uploadRevisionSchema),
    defaultValues: {
      revision: '',
      effectiveDate: '',
      status: 'ACTIVE' as any,
      darMasterId: '' as string | null,
    },
  });

  const status = watch('status') || 'ACTIVE';

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch(`/api/document-controls/${documentId}/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        throw new Error(await readApiErrorMessage(res, 'Failed to upload revision'));
      }
      return readApiJson(res, 'Failed to upload revision');
    },
    onSuccess: () => {
      toast.success(t('documentControl.messages.uploadSuccess'));
      reset();
      if (fileInputRef.current) fileInputRef.current.value = '';
      onClose();
      onSuccess?.();
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  const onSubmit = async (data: any) => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error(t('documentControl.messages.fileRequired'));
      return;
    }

    const formData = new FormData();
    // Use URL-encoded filename to bypass Next.js/Undici multipart non-ASCII body parsing bugs
    const safeName = encodeURIComponent(file.name);
    formData.append('file', file, safeName);
    formData.append('filename', file.name);
    formData.append(
      'metadata',
      JSON.stringify({
        revision: data.revision,
        effectiveDate: data.effectiveDate || null,
        status: data.status,
        darMasterId: data.darMasterId || null,
      })
    );

    await uploadMutation.mutateAsync(formData);
  };

  const isLoading = uploadMutation.isPending;

  return (
    <ResponsiveFormOverlay
      open={open}
      onOpenChange={(value) => { if (!value) onClose(); }}
      title={t('documentControl.button.uploadRevision')}
      description={t('documentControl.uploadRevisionDesc')}
      desktopContentClassName="w-[min(96vw,48rem)] max-w-xl rounded-2xl"
      bodyClassName="px-4 py-5 md:px-6 md:py-4"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="h-11 rounded-xl"
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            form="upload-revision-form"
            disabled={isLoading}
            className="h-11 flex-1 rounded-xl bg-primary text-white font-medium hover:bg-primary/90"
          >
            {isLoading ? t('common.loading') : t('common.save')}
          </Button>
        </>
      }
    >
        <form id="upload-revision-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* File Input */}
          <div className="space-y-1.5">
            <Label htmlFor="file-upload" className="text-slate-800 text-sm font-semibold">
              {t('documentControl.button.upload')}{' '}
              <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="file-upload"
              type="file"
              ref={fileInputRef}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
              disabled={isLoading}
              className="bg-slate-50/50 border border-slate-200 rounded-xl"
            />
            <p className="text-xs text-slate-400">{t('documentControl.fileHint')}</p>
          </div>

          {/* Revision Code (REV) */}
          <div className="space-y-1.5">
            <Label htmlFor="revision-input" className="text-slate-800 text-sm font-semibold">
              {t('documentControl.field.revision')}{' '}
              <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="revision-input"
              {...register('revision')}
              placeholder="e.g. 01, A, Rev.B"
              disabled={isLoading}
              className="bg-slate-50/50 border border-slate-200 rounded-xl focus-visible:ring-primary"
            />
            {errors.revision && (
              <p className="text-rose-500 text-xs">{String(errors.revision.message)}</p>
            )}
          </div>

          {/* Effective Date */}
          <div className="space-y-1.5">
            <Label htmlFor="effectiveDate-input" className="text-slate-800 text-sm font-semibold">
              {t('documentControl.field.effectiveDate')}{' '}
              <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="effectiveDate-input"
              {...register('effectiveDate')}
              type="date"
              disabled={isLoading}
              className="bg-slate-50/50 border border-slate-200 rounded-xl focus-visible:ring-primary"
            />
            {errors.effectiveDate && (
              <p className="text-rose-500 text-xs">{String(errors.effectiveDate.message)}</p>
            )}
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label htmlFor="status-select" className="text-slate-800 text-sm font-semibold">
              {t('documentControl.field.status')}
            </Label>
            <Select
              value={status}
              onValueChange={(val) => setValue('status', val as any)}
              disabled={isLoading}
            >
              <SelectTrigger
                id="status-select"
                className="bg-slate-50/50 border border-slate-200 rounded-xl"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((st) => (
                  <SelectItem key={st} value={st}>
                    {t(`documentControl.status.${st}` as any) || st}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Link with DAR (Searchable Dropdown) */}
          <div className="space-y-1.5">
            <Label htmlFor="dar-select" className="text-slate-800 text-sm font-semibold">
              เชื่อมโยงเอกสาร DAR (ไม่บังคับ)
            </Label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="ค้นหาเลขที่ DAR..."
                value={darSearch}
                onChange={(e) => setDarSearch(e.target.value)}
                disabled={isLoading}
                className="w-1/3 text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <select
                id="dar-select"
                value={watch('darMasterId') || ''}
                onChange={(e) => setValue('darMasterId', e.target.value || null)}
                disabled={isLoading}
                className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">-- ไม่เชื่อมโยง --</option>
                {filteredDars.map((dar) => (
                  <option key={dar.id} value={dar.id}>
                    {dar.darNo} - {dar.objective}
                  </option>
                ))}
              </select>
            </div>
          </div>

        </form>
    </ResponsiveFormOverlay>
  );
}
