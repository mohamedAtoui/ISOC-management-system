import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FFFDF7] px-4">
      <div>
        <div className="mb-6 flex justify-center">
          <img src="/logo.png" alt="Royal Holloway ISOC" className="h-20 w-auto" />
        </div>
        <SignIn />
      </div>
    </div>
  );
}
