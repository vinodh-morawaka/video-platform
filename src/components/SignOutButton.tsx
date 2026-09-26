"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="text-sm text-paper-100/50 hover:text-paper-100"
    >
      Log out
    </button>
  );
}
