import type { Metadata } from "next";
import NotificationsView from "./NotificationsView";

export const metadata: Metadata = { title: "การแจ้งเตือน" };

export default function NotificationsPage() {
  return <NotificationsView />;
}
