import { SignInForm } from "@/components/signin-form/";
import Link from "next/link";
import { signIn } from "./action";

export default async function SignInPage() {
  return (
    <main className="bg-background container md:w-2/3 mx-auto py-32 max-h-screen">
      <SignInForm {...{ signIn }} />
      <Link href="/admin/new" className="text-blue-700">
        Sign Up To Make account
      </Link>
    </main>
  );
}
