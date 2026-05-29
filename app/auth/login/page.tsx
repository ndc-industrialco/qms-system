
import { signIn, auth } from "@/lib/auth-node";
import { redirect } from "next/navigation";
import LoginClient from "@/components/auth/LoginClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login",
};

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  const signInAction = async () => {
    "use server";
    await signIn("microsoft-entra-id", { redirectTo: "/" });
  };

  return <LoginClient signInAction={signInAction} />;
}
