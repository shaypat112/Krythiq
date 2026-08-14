import type { Metadata } from "next";
import { DirectMessageClient } from "./DirectMessageClient";

export const metadata: Metadata = { title: "Direct message · Krythiq", description: "Private real-time messaging between connected Krythiq users." };
export default async function DirectMessagePage({ params }: { params: Promise<{ userId: string }> }) { const { userId } = await params; return <DirectMessageClient userId={userId} />; }
