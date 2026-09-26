import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import UploadForm from "@/components/UploadForm";

export default async function UploadPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return <UploadForm />;
}
