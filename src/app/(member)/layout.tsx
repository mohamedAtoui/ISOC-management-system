import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { requireSession } from "@/lib/auth";
import { APP_NAME } from "@/lib/constants";

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { member } = await requireSession();

  return (
    <div className="min-h-screen bg-[#FFFDF7]">
      <nav className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-2xl px-4">
          <div className="flex h-14 items-center justify-between">
            <Link
              href="/book"
              className="flex items-center gap-2 text-lg font-semibold text-stone-900"
            >
              <img src="/logo.png" alt="" className="h-8 w-auto" />
              {APP_NAME}
            </Link>
            <div className="flex items-center gap-2">
              {member.isAdmin && (
                <Link
                  href="/admin"
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900"
                >
                  Admin
                </Link>
              )}
              <span className="text-sm text-stone-600">
                {member.name}
              </span>
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-2xl px-4 py-8">{children}</main>
    </div>
  );
}
