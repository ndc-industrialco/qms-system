export const runtime = 'nodejs';

import { redirect } from "next/navigation";

export default function ItIndexPage() {
  redirect("/it/users");
}
