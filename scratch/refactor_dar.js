const fs = require('fs');

const files = [
  'components/dar/SignaturePad.tsx',
  'components/dar/DarObjectiveSection.tsx',
  'components/dar/DarFormActions.tsx',
  'components/dar/DarDraftActions.tsx',
  'components/dar/DarDistributionSection.tsx',
  'components/dar/DarAttachmentUpload.tsx',
  'components/dar/DarApprovalPanel.tsx'
];

files.forEach(file => {
  let c = fs.readFileSync(file, 'utf8');
  let original = c;

  // Replace <button> with <Button> and handle </button> properly
  c = c.replace(/<button([^>]*?)className="btn btn-ghost btn-xs([^"]*?)"([^>]*?)>([\s\S]*?)<\/button>/g, '<Button variant="ghost" size="sm" className="h-6 px-2 text-xs$2" $1 $3>$4</Button>');
  c = c.replace(/<button([^>]*?)className="btn btn-ghost btn-sm([^"]*?)"([^>]*?)>([\s\S]*?)<\/button>/g, '<Button variant="ghost" size="sm" className="$2" $1 $3>$4</Button>');
  c = c.replace(/<button([^>]*?)className="btn btn-primary btn-sm([^"]*?)"([^>]*?)>([\s\S]*?)<\/button>/g, '<Button size="sm" className="$2" $1 $3>$4</Button>');
  c = c.replace(/<button([^>]*?)className="btn btn-error btn-sm([^"]*?)"([^>]*?)>([\s\S]*?)<\/button>/g, '<Button variant="destructive" size="sm" className="$2" $1 $3>$4</Button>');
  c = c.replace(/<button([^>]*?)className="btn btn-error btn-outline btn-sm([^"]*?)"([^>]*?)>([\s\S]*?)<\/button>/g, '<Button variant="destructive" size="sm" className="bg-transparent border border-rose-500 text-rose-500 hover:bg-rose-50$2" $1 $3>$4</Button>');
  c = c.replace(/<button([^>]*?)className="btn btn-ghost btn-sm btn-square([^"]*?)"([^>]*?)>([\s\S]*?)<\/button>/g, '<Button variant="ghost" size="sm" className="w-8 h-8 p-0 flex items-center justify-center$2" $1 $3>$4</Button>');

  c = c.replace(/<a([^>]*?)className="btn btn-outline btn-sm([^"]*?)"([^>]*?)>/g, '<a className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-3 text-xs$2" $1 $3>');
  c = c.replace(/<a([^>]*?)className="btn btn-primary btn-sm([^"]*?)"([^>]*?)>/g, '<a className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-8 px-3 text-xs$2" $1 $3>');

  // Also replace some cases where class names are dynamic like className={`btn btn-sm ${...}`}
  c = c.replace(/className={`btn btn-sm \${font === f\.value \? "btn-primary" : "btn-ghost border border-base-300"}`}/g, 'className={`h-8 px-3 text-xs rounded-md font-medium transition-colors ${font === f.value ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-transparent border border-slate-300 text-slate-700 hover:bg-slate-50"}`}');
  
  // `btn btn-ghost btn-xs gap-1 text-neutral`
  c = c.replace(/className="btn btn-ghost btn-xs gap-1 text-neutral"/g, 'className="h-6 px-2 text-xs gap-1 text-slate-600 hover:bg-slate-100 rounded-md font-medium inline-flex items-center"');
  // `btn btn-ghost btn-xs text-error`
  c = c.replace(/className="btn btn-ghost btn-xs text-error"/g, 'className="h-6 px-2 text-xs text-rose-500 hover:bg-rose-50 rounded-md font-medium inline-flex items-center"');
  // `btn btn-ghost btn-xs text-neutral`
  c = c.replace(/className="btn btn-ghost btn-xs text-neutral"/g, 'className="h-6 px-2 text-xs text-slate-600 hover:bg-slate-100 rounded-md font-medium inline-flex items-center"');

  // Input & Select
  c = c.replace(/className="input input-bordered w-full text-\[14px\]"/g, 'className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"');
  c = c.replace(/className={`input input-bordered input-sm w-full text-\[14px\] \${errors\?\.docTypeOther \? "input-error" : ""}`}/g, 'className={`flex h-8 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${errors?.docTypeOther ? "border-rose-500" : "border-input"}`}');
  
  c = c.replace(/className={`select select-bordered select-sm w-full text-\[14px\] \${errors\?\.objective \? "select-error" : ""}`}/g, 'className={`w-full h-8 px-3 py-1 text-[14px] rounded-md border bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 ${errors?.objective ? "border-rose-500" : "border-slate-300"}`}');
  c = c.replace(/className={`select select-bordered select-sm w-full text-\[14px\] \${errors\?\.docType \? "select-error" : ""}`}/g, 'className={`w-full h-8 px-3 py-1 text-[14px] rounded-md border bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 ${errors?.docType ? "border-rose-500" : "border-slate-300"}`}');
  c = c.replace(/className="select select-bordered select-sm w-full text-\[14px\]"/g, 'className="w-full h-8 px-3 py-1 text-[14px] rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"');

  // Checkbox
  c = c.replace(/className="checkbox checkbox-sm checkbox-primary"/g, 'className="w-4 h-4 text-emerald-600 bg-slate-100 border-slate-300 rounded focus:ring-emerald-500"');
  
  // Loading
  c = c.replace(/<span className="loading loading-spinner loading-xs" \/>/g, '<span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />');
  c = c.replace(/<span className="loading loading-spinner loading-sm text-primary" \/>/g, '<span className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin inline-block" />');
  c = c.replace(/<span className="loading loading-spinner loading-md text-primary" \/>/g, '<span className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin inline-block" />');

  // Textarea
  c = c.replace(/className="textarea textarea-bordered w-full text-\[14px\]"/g, 'className="w-full min-h-[80px] px-3 py-2 text-[14px] rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"');

  // Modals
  c = c.replace(/className="modal-box rounded-2xl/g, 'className="bg-white rounded-2xl');
  c = c.replace(/className="modal-box rounded-2xl p-6 shadow-\[0_8px_30px_rgb\(0,0,0,0\.04\)\] max-w-md w-full"/g, 'className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] max-w-md w-full border border-slate-200"');

  if (c !== original) {
    if (/<Button/.test(c)) {
      if (!c.includes('import { Button }')) {
        c = c.replace(/(import .* from ".*";\n)/, '$1import { Button } from "@/components/ui/button";\n');
      }
    }
    fs.writeFileSync(file, c);
    console.log("Updated", file);
  }
});
