import type { Metadata } from "next";
import { FollowRequestsClient } from "./FollowRequestsClient";

export const metadata: Metadata = { title: "Follow requests · Krythiq", description: "Review your Krythiq community follow requests." };
export default function FollowRequestsPage() { return <FollowRequestsClient />; }
