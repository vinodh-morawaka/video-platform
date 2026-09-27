"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ROLES = ["VIEWER", "CREATOR", "MODERATOR", "ADMIN"] as const;

type UserRow = {
  id: string;
  username: string;
  email: string;
  role: string;
  createdAt: Date | string;
};

export default function UserRoleManager({
  users,
  currentUserId,
}: {
  users: UserRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRoleChange(id: string, role: string) {
    setPendingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to update role");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? <p className="text-sm text-signal-500">{error}</p> : null}
      <div className="overflow-hidden rounded-lg border border-ink-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-800 bg-ink-900 text-left text-paper-100/50">
              <th className="px-4 py-2 font-medium">Username</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Joined</th>
              <th className="px-4 py-2 font-medium">Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-ink-800 last:border-0">
                <td className="px-4 py-2 text-paper-100">{u.username}</td>
                <td className="px-4 py-2 text-paper-100/70">{u.email}</td>
                <td className="px-4 py-2 text-paper-100/50">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-2">
                  {u.id === currentUserId ? (
                    <span className="text-paper-100/40" title="Use Prisma Studio to change your own role">
                      {u.role} (you)
                    </span>
                  ) : (
                    <select
                      value={u.role}
                      disabled={pendingId === u.id}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="rounded-md border border-ink-800 bg-ink-900 px-2 py-1 text-sm text-paper-100 focus:border-marquee-500 focus:outline-none disabled:opacity-40"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
