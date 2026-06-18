import { redirect } from "next/navigation";
import { getCurrentUser, scopeHomePath } from "@/lib/auth/rbac";

// Root route - no landing page.
// If user is logged in, send them to their scope home.
// Otherwise, send to login.
export default async function Home() {
  const user = await getCurrentUser();
  if (user) {
    redirect(scopeHomePath(user.global_role));
  }
  redirect("/login");
}
