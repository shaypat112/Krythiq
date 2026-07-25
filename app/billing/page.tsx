import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase";
import { BillingClient } from "./BillingClient";


export default async function BillingPage() {


  return <BillingClient />;
}
