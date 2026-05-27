const fs = require('fs');
let c = fs.readFileSync('components/it/ItUserTable.tsx', 'utf8');

c = c.replace(/import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@\/components\/ui\/table";/g, 'import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";\nimport { Button } from "@/components/ui/button";\nimport { Input } from "@/components/ui/input";');

c = c.replace(/<input\n\s+type="text"\n\s+className="input input-bordered input-sm pl-9 w-full text-\[13px\]"/g, '<Input\n              type="text"\n              className="pl-9 w-full h-8 text-[13px]"');

c = c.replace(/className="select select-bordered select-sm w-full text-\[13px\]"/g, 'className="w-full h-8 px-2 py-1 text-[13px] rounded-md border border-slate-300 bg-white"');
c = c.replace(/className="select select-bordered select-xs text-\[13px\]"/g, 'className="h-7 px-2 py-0.5 text-[13px] rounded-md border border-slate-300 bg-white"');
c = c.replace(/className="select select-bordered select-xs text-\[13px\] min-w-32\.5"/g, 'className="h-7 px-2 py-0.5 text-[13px] min-w-[130px] rounded-md border border-slate-300 bg-white"');

c = c.replace(/<button\n\s+className="btn btn-ghost btn-sm text-\[13px\] self-end"[\s\S]*?<\/button>/g, match => match.replace('<button', '<Button variant="ghost" size="sm"').replace('className="btn btn-ghost btn-sm text-[13px] self-end"', 'className="text-[13px] self-end"').replace('</button>', '</Button>'));

c = c.replace(/<button className="btn btn-primary btn-sm gap-2 ml-auto"[\s\S]*?<\/button>/g, match => match.replace('<button', '<Button size="sm"').replace('className="btn btn-primary btn-sm gap-2 ml-auto"', 'className="gap-2 ml-auto"').replace('</button>', '</Button>'));

c = c.replace(/<button className="btn btn-ghost btn-sm text-\[13px\]"/g, '<Button variant="ghost" size="sm" className="text-[13px]"');
c = c.replace(/{t\.cancelSelect}<\/button>/g, '{t.cancelSelect}</Button>');

c = c.replace(/<span className="loading loading-spinner loading-xs" \/>/g, '<span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5 inline-block" />');

c = c.replace(/className="checkbox checkbox-sm checkbox-primary"/g, 'className="w-4 h-4 text-emerald-600 bg-slate-100 border-slate-300 rounded focus:ring-emerald-500"');
c = c.replace(/className="checkbox checkbox-sm checkbox-primary mt-0\.5 shrink-0"/g, 'className="w-4 h-4 text-emerald-600 bg-slate-100 border-slate-300 rounded focus:ring-emerald-500 mt-0.5 shrink-0"');

c = c.replace(/<input\n\s+ref={empIdRef}\n\s+type="text"\n\s+className="input input-bordered input-xs w-24 text-\[13px\]"/g, '<Input\n                      ref={empIdRef}\n                      type="text"\n                      className="h-7 px-2 w-24 text-[13px]"');
c = c.replace(/<input\n\s+ref={empIdRef}\n\s+type="text"\n\s+className="input input-bordered input-xs flex-1 text-\[13px\]"/g, '<Input\n                  ref={empIdRef}\n                  type="text"\n                  className="h-7 px-2 flex-1 text-[13px]"');

c = c.replace(/<button\n\s+className={`btn btn-xs gap-1 \${pushedIds\.has\(user\.id\) \? "btn-success" : "btn-outline btn-primary"}`}/g, '<Button\n                      size="sm"\n                      variant={pushedIds.has(user.id) ? "default" : "outline"}\n                      className={`h-7 px-2 text-xs ${pushedIds.has(user.id) ? "bg-emerald-500 hover:bg-emerald-600 text-white border-transparent" : ""}`}');
c = c.replace(/title={t\.m365UpdateOk}\n\s+>[\s\S]*?<\/button>/g, match => match.replace('</button>', '</Button>'));

c = c.replace(/<button\n\s+className={`btn btn-sm w-full gap-2 \${pushedIds\.has\(user\.id\) \? "btn-success" : "btn-outline btn-primary"}`}/g, '<Button\n                  size="sm"\n                  variant={pushedIds.has(user.id) ? "default" : "outline"}\n                  className={`w-full gap-2 ${pushedIds.has(user.id) ? "bg-emerald-500 hover:bg-emerald-600 text-white border-transparent" : ""}`}');
c = c.replace(/onClick={\(\) => pushToM365\(user\.id\)}\n\s+>[\s\S]*?<\/button>/g, match => match.replace('</button>', '</Button>'));

fs.writeFileSync('components/it/ItUserTable.tsx', c);
console.log("Done");
