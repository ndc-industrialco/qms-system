export const runtime = 'edge';

import { redirect } from "next/navigation";

export default function ItIndexPage() {
  redirect("/it/users");
}
