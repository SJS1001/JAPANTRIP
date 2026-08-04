import InboxManager from "@/app/components/InboxManager";
import { role } from "@/lib/access";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Document Inbox · Japan Trip",
  description: "Privately stage trip documents and review AI suggestions before any change.",
};

export default async function InboxPage() {
  const requestHeaders = await headers();
  const accessRole = await role(new Request("http://japan-trip.local/inbox", {
    headers: { cookie: requestHeaders.get("cookie") ?? "" },
  }));
  if (accessRole !== "editor") redirect("/");
  return <InboxManager />;
}
