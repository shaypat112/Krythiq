import { redirect } from "next/navigation";

export default function ProfilePage() {
  redirect("/scan?view=repositories");
}
