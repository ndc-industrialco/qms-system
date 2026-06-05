"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createAnnouncement } from "@/lib/actions/announcement";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/lib/i18n";

export default function PostAnnouncementModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const t = useT();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      await createAnnouncement(formData);
      setIsOpen(false);
    } catch (error) {
      console.error(error);
      toast.error(t("announcement.createFail"), { duration: Infinity });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 rounded-lg shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t("announcement.publishBtn")}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="px-5 py-4 border-b border-base-300 bg-base-100/50 m-0">
          <DialogTitle className="text-lg font-bold text-base-content flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
            {t("announcement.createTitle")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-[13px] font-semibold text-base-content mb-1.5">{t("announcement.fieldTitle")}</label>
            <input 
              type="text" 
              name="title" 
              required 
              placeholder={t("announcement.placeholderTitle")}
              className="w-full px-3 py-2 bg-base-100 border border-base-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-base-content mb-1.5">{t("announcement.fieldContent")}</label>
            <Textarea
              name="content"
              required
              rows={4}
              placeholder={t("announcement.placeholderContent")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-semibold text-base-content mb-1.5">{t("announcement.fieldSourceSystem")}</label>
              <select 
                name="sourceSystem" 
                className="w-full px-3 py-2 bg-base-100 border border-base-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
              >
                <option value="QMS">QMS</option>
                <option value="IT">IT</option>
                <option value="HR">HR</option>
                <option value="GA">GA</option>
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-base-content mb-1.5">{t("announcement.fieldDisplayType")}</label>
              <select 
                name="displayType" 
                className="w-full px-3 py-2 bg-base-100 border border-base-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
              >
                <option value="LIST">{t("announcement.displayTypeList")}</option>
                <option value="SCROLLING">{t("announcement.displayTypeScrolling")}</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-3 p-3 border border-base-300 rounded-lg hover:bg-base-200/50 cursor-pointer transition-colors">
              <input 
                type="checkbox" 
                name="pushToCompanyCenter" 
                defaultChecked 
                className="w-4 h-4 text-emerald-600 bg-slate-100 border-slate-300 rounded focus:ring-emerald-500"
              />
              <div>
                <p className="text-[14px] font-semibold text-base-content">{t("announcement.fieldPushToCompany")}</p>
                <p className="text-[12px] text-neutral">{t("announcement.pushToCompanyHint")}</p>
              </div>
            </label>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-base-300 mt-6">
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={loading} className="min-w-[120px]">
              {loading ? (
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
              ) : (
                t("announcement.publish")
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
