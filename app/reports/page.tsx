import { redirect } from "next/navigation";

export default function ReportsPage() {
  redirect("/scan?view=history");
}
