import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth/dal";

export default async function Home() {
  const profile = await getProfile();
  redirect(profile ? "/dashboard" : "/login");
}
