import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { APP_NAME } from "@/lib/constants";
import { AdminLogoutButton } from "./logout-button";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check Clerk auth and isAdmin flag - no second password step needed
  const { member } = await requireAdmin();

  return (
    <div className="min-h-screen bg-[#FFFDF7]">
      <nav className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <Link
                href="/admin"
                className="flex items-center gap-2 text-lg font-semibold text-stone-900"
              >
                <img src="/logo.png" alt="" className="h-8 w-auto" />
                {APP_NAME} Admin
              </Link>
              <div className="hidden sm:flex sm:items-center sm:gap-1">
                <NavLink href="/admin">Dashboard</NavLink>
                <NavLink href="/admin/events">Events</NavLink>
                <NavLink href="/admin/members">Members</NavLink>
                <NavLink href="/admin/checkin">Check-in</NavLink>
                <NavLink href="/admin/import">Import</NavLink>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/book"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900"
              >
                Member View
              </Link>
              <span className="text-sm text-stone-600">
                {member.name}
              </span>
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                Admin
              </span>
              <AdminLogoutButton />
            </div>
          </div>
        </div>
        {/* Mobile nav */}
        <div className="border-t border-stone-200 sm:hidden">
          <div className="flex gap-1 overflow-x-auto px-4 py-2">
            <NavLink href="/admin">Dashboard</NavLink>
            <NavLink href="/admin/events">Events</NavLink>
            <NavLink href="/admin/members">Members</NavLink>
            <NavLink href="/admin/checkin">Check-in</NavLink>
            <NavLink href="/admin/import">Import</NavLink>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900"
    >
      {children}
    </Link>
  );
}
