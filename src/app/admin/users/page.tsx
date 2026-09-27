import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAllUsers } from "@/lib/users";
import UserRoleManager from "@/components/UserRoleManager";

export default async function UsersAdminPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    redirect("/login");
  }

  const users = await getAllUsers();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 font-display text-2xl font-bold text-paper-100">Manage users</h1>
      <UserRoleManager users={users} currentUserId={session.user.id} />
    </div>
  );
}
