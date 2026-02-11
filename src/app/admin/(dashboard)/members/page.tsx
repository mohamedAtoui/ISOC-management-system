"use client";

import { useState, useEffect } from "react";

function isMemberEligible(membershipExpires: string): boolean {
  const today = new Date().toISOString().split("T")[0];
  return membershipExpires >= today;
}

interface Member {
  id: number;
  studentId: string;
  name: string;
  email: string | null;
  gender: "M" | "F";
  joiningDate: string;
  membershipExpires: string;
  strikes: number;
  isBlacklisted: boolean;
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showBlacklistedOnly, setShowBlacklistedOnly] = useState(false);
  const [unbanLoading, setUnbanLoading] = useState<number | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchMembers(search);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  async function fetchMembers(query: string) {
    setLoading(true);
    const params = query ? `?search=${encodeURIComponent(query)}` : "";
    const res = await fetch(`/api/members${params}`);
    if (res.ok) {
      const data = await res.json();
      setMembers(data.members || []);
    }
    setLoading(false);
  }

  async function handleUnban(memberId: number) {
    if (!confirm("Are you sure you want to unban this member? This will reset their strikes to 0.")) {
      return;
    }

    setUnbanLoading(memberId);
    try {
      const res = await fetch(`/api/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unban" }),
      });

      if (res.ok) {
        // Refresh the members list
        fetchMembers(search);
      }
    } finally {
      setUnbanLoading(null);
    }
  }

  // Filter members based on blacklist toggle
  const displayedMembers = showBlacklistedOnly
    ? members.filter((m) => m.isBlacklisted)
    : members;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Members</h1>
        <p className="mt-1 text-sm text-stone-500">
          Search and view all registered members.
        </p>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          placeholder="Search by name or student ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
        />
        <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showBlacklistedOnly}
            onChange={(e) => setShowBlacklistedOnly(e.target.checked)}
            className="rounded border-stone-300 text-red-600 focus:ring-red-500"
          />
          Blacklisted Only
        </label>
      </div>

      {loading ? (
        <p className="py-8 text-center text-stone-500">Loading members...</p>
      ) : displayedMembers.length === 0 ? (
        <p className="py-8 text-center text-stone-500">
          {showBlacklistedOnly
            ? "No blacklisted members found."
            : search
            ? "No members found matching your search."
            : "No members registered."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-stone-200">
          <table className="min-w-full divide-y divide-stone-200">
            <thead className="bg-stone-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">
                  Student ID
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500 sm:table-cell">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">
                  Expires
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">
                  Strikes
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 bg-white">
              {displayedMembers.map((member) => {
                const isEligible = isMemberEligible(member.membershipExpires);
                return (
                  <tr key={member.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-stone-900">
                      {member.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-stone-600">
                      {member.studentId}
                    </td>
                    <td className="hidden whitespace-nowrap px-4 py-3 text-sm text-stone-600 sm:table-cell">
                      {member.email || <span className="text-stone-400 italic">Not set</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-stone-600">
                      {member.membershipExpires}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {member.isBlacklisted ? (
                        <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                          Blacklisted
                        </span>
                      ) : isEligible ? (
                        <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                          Eligible
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600">
                          Expired
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-stone-600">
                      {member.strikes > 0 ? (
                        <span className="font-medium text-amber-600">
                          {member.strikes}
                        </span>
                      ) : (
                        "0"
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {member.isBlacklisted && (
                        <button
                          onClick={() => handleUnban(member.id)}
                          disabled={unbanLoading === member.id}
                          className="rounded-lg bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-200 transition-colors disabled:opacity-50"
                        >
                          {unbanLoading === member.id ? "Unbanning..." : "Unban"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-xs text-stone-400">
        {displayedMembers.length} member{displayedMembers.length !== 1 ? "s" : ""} shown
        {showBlacklistedOnly && members.length !== displayedMembers.length && (
          <span> (filtered from {members.length} total)</span>
        )}
      </p>
    </div>
  );
}
