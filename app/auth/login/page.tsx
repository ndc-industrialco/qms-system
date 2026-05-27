
import { signIn, auth } from "@/lib/auth-node";
import { redirect } from "next/navigation";
import LoginClient from "@/components/auth/LoginClient";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  const signInAction = async () => {
    "use server";
    await signIn("microsoft-entra-id", { redirectTo: "/" });
  };

  return <LoginClient signInAction={signInAction} />;
}
