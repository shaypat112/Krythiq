import { GuidedFixesPage } from "../workspace-data";
export default async function Page({ searchParams }: { searchParams: Promise<{ repo?: string }> }) {
  const { repo } = await searchParams;
  return <GuidedFixesPage repository={repo} />;
}
