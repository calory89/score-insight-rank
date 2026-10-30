import { Link, useLocation } from "react-router-dom";
const links = [["/admin/activity/network","Network CRM"],["/admin/activity/operations","Operations"],["/admin/activity/contacts","All contacts"],["/admin","Site & support"]];
export default function AdminWorkspaceNav() {
 const {pathname}=useLocation();
 return <nav aria-label="Administration workspaces" className="flex gap-2 overflow-x-auto pb-3 mb-5">{links.map(([to,label])=><Link key={to} to={to} aria-current={pathname===to?"page":undefined} className={`shrink-0 rounded-full border px-4 min-h-11 inline-flex items-center text-sm ${pathname===to?"bg-ink text-paper border-ink":"border-hairline"}`}>{label}</Link>)}</nav>;
}
