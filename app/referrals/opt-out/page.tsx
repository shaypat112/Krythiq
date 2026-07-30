import { OptOutClient } from "./OptOutClient";

export default async function ReferralOptOutPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  return <OptOutClient token={token} />;
}
