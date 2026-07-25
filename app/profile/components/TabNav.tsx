import { Button } from "@/components/ui/button";

export type TabKey = "scans" | "integrations";

export default function TabNav({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (value: TabKey) => void;
}) {
  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: "scans", label: "Scans" },
    { key: "integrations", label: "Repositories & GitHub" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <Button
          key={tab.key}
          size="sm"
          variant={active === tab.key ? "default" : "outline"}
          onClick={() => onChange(tab.key)}
          className="text-xs"
        >
          {tab.label}
        </Button>
      ))}
    </div>
  );
}
