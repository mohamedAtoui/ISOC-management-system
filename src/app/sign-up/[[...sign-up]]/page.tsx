"use client";

import { useState } from "react";
import Link from "next/link";
import { useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { APP_NAME } from "@/lib/constants";

export default function SignUpPage() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [studentId, setStudentId] = useState("");
  const [username, setUsername] = useState("");
  const [gender, setGender] = useState<"M" | "F" | "">("");
  const [verifying, setVerifying] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded) return;

    setError(null);
    setLoading(true);

    try {
      // Validate student ID first (before creating Clerk account)
      const validateRes = await fetch("/api/auth/validate-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: studentId.trim() }),
      });

      if (!validateRes.ok) {
        const data = await validateRes.json();
        setError(data.error || "Invalid Student ID");
        setLoading(false);
        return;
      }

      // Start the sign-up process with Clerk
      const result = await signUp.create({
        emailAddress: email,
        password,
        username: username.trim(),
      });

      // Check if sign-up is already complete (e.g., email already verified from previous attempt)
      if (result.status === "complete") {
        await completeSignUp(result.createdSessionId!);
        return;
      }

      // Send email verification code
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setVerifying(true);
    } catch (err: unknown) {
      const clerkError = err as { errors?: Array<{ message: string; code?: string; meta?: { paramName?: string } }> };
      const firstError = clerkError.errors?.[0];
      const errorMessage = firstError?.message || "";
      const errorCode = firstError?.code || "";
      const paramName = firstError?.meta?.paramName;

      if (errorCode === "form_identifier_exists" || errorMessage.toLowerCase().includes("already")) {
        if (paramName === "username") {
          setError("This username is already taken. Please choose a different one.");
        } else if (paramName === "email_address") {
          setError("This email is already registered. Please sign in instead.");
        } else {
          setError(errorMessage || "This identifier is already taken. Please try a different one.");
        }
      } else {
        setError(errorMessage || "Sign up failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function completeSignUp(sessionId: string) {
    if (!setActive) return;

    // Set the session as active first (required for authenticated API calls)
    await setActive({ session: sessionId });

    // Now link the student ID to the member record
    const linkRes = await fetch("/api/auth/link-member", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: studentId.trim(), gender }),
    });

    const linkData = await linkRes.json();

    if (!linkRes.ok) {
      setError(linkData.error || "Failed to link account. Please contact support.");
      setLoading(false);
      return;
    }

    // Redirect based on role
    if (linkData.isAdmin) {
      router.push("/admin");
    } else {
      router.push("/book");
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded) return;

    setError(null);
    setLoading(true);

    try {
      // Verify the email code
      const result = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (result.status !== "complete") {
        console.log("Verification result:", result.status, result);
        console.log("Missing fields:", result.missingFields);
        console.log("Unverified fields:", result.unverifiedFields);

        // Check if there are specific missing requirements
        if (result.missingFields?.length > 0) {
          setError(`Missing required fields: ${result.missingFields.join(", ")}`);
        } else if (result.unverifiedFields?.length > 0) {
          setError(`Please verify: ${result.unverifiedFields.join(", ")}`);
        } else {
          setError(`Verification incomplete (status: ${result.status}). Please try again.`);
        }
        setLoading(false);
        return;
      }

      await completeSignUp(result.createdSessionId!);
    } catch (err: unknown) {
      console.error("Verification error:", err);
      const clerkError = err as { errors?: Array<{ message: string; code?: string; longMessage?: string }> };
      const errorDetails = clerkError.errors?.[0];
      const errorMsg = errorDetails?.longMessage || errorDetails?.message || "Verification failed. Please try again.";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  if (verifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFFDF7] px-4">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
            <div className="mb-8 text-center">
              <img src="/logo.png" alt="Royal Holloway ISOC" className="mx-auto h-20 w-auto mb-3" />
              <h1 className="text-2xl font-bold tracking-tight text-stone-900">
                Verify your email
              </h1>
              <p className="mt-2 text-sm text-stone-500">
                Enter the code sent to {email}
              </p>
            </div>

            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label
                  htmlFor="code"
                  className="block text-sm font-medium text-stone-700"
                >
                  Verification Code
                </label>
                <input
                  id="code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter code"
                  required
                  autoFocus
                  className="mt-1 block w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-200"
                />
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !code.trim()}
                className="w-full rounded-lg bg-stone-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Verifying..." : "Verify & Continue"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FFFDF7] px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
          <div className="mb-8 text-center">
            <img src="/logo.png" alt="Royal Holloway ISOC" className="mx-auto h-20 w-auto mb-3" />
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">
              {APP_NAME}
            </h1>
            <p className="mt-2 text-sm text-stone-500">
              Create an account to book Iftar events
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="studentId"
                className="block text-sm font-medium text-stone-700"
              >
                Student ID
              </label>
              <input
                id="studentId"
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="e.g. 12345678"
                required
                autoFocus
                className="mt-1 block w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-200"
              />
              <p className="mt-1 text-xs text-stone-500">
                Your Student ID must be registered as an ISOC member
              </p>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-stone-700"
              >
                Email <span className="font-normal text-stone-500">(not uni email)</span>
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="mt-1 block w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-200"
              />
            </div>

            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-stone-700"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a username"
                required
                className="mt-1 block w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                I am a
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setGender("M")}
                  className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                    gender === "M"
                      ? "border-stone-800 bg-stone-800 text-white"
                      : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  Brother
                </button>
                <button
                  type="button"
                  onClick={() => setGender("F")}
                  className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                    gender === "F"
                      ? "border-stone-800 bg-stone-800 text-white"
                      : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  Sister
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-stone-700"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                required
                minLength={8}
                className="mt-1 block w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-200"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !studentId.trim() || !email.trim() || !username.trim() || !password || !gender}
              className="w-full rounded-lg bg-stone-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-stone-500">
            Already have an account?{" "}
            <Link href="/sign-in" className="font-medium text-stone-900 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
