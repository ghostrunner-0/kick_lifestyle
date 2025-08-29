// app/(root)/(account)/profile/ProfileClient.jsx
"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Save,
  ShieldCheck,
  KeyRound,
  ArrowLeft,
  User2,
  Phone as PhoneIcon,
  Lock,
  BadgeCheck,
  Mail,
  Copy,
  CheckCheck,
} from "lucide-react";

// shadcn/ui
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

axios.defaults.withCredentials = true;

const ACCENT = "#fcba17";
const digits10 = (s) => (String(s || "").match(/\d+/g) || []).join("").slice(-10);

/* micro-animations */
const page = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut", when: "beforeChildren", staggerChildren: 0.06 },
  },
};
const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.26 } } };

function pickApiMessage(err, fallback) {
  if (!err) return fallback;
  if (err.response?.data?.message) return err.response.data.message;
  if (typeof err.message === "string" && err.message) return err.message;
  return fallback;
}

/** Generate a pleasant pastel from a string (name/email) */
function pastelFromString(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return `hsl(${h} 80% 90%)`; // soft pastel bg
}
function pastelTextFromString(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return `hsl(${h} 50% 30%)`; // readable text color
}

export default function ProfileClient({ initialProfile, initialError = "" }) {
  const [error, setError] = useState(initialError);

  // Pre-fill from SSR
  const [provider] = useState(initialProfile?.provider || "credentials");
  const [name, setName] = useState(initialProfile?.name || "");
  const [phone, setPhone] = useState(initialProfile?.phone || "");
  const [email] = useState(
    initialProfile?.email ||
      initialProfile?.emailAddress ||
      initialProfile?.user?.email ||
      ""
  );

  // UI flags
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Password form
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Copy state for email chip
  const [copied, setCopied] = useState(false);

  const initials = useMemo(() => {
    const n = (name || email || "U").trim();
    const parts = n.split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return n.slice(0, 2).toUpperCase();
  }, [name, email]);

  const avatarBg = useMemo(() => pastelFromString(name || email || "U"), [name, email]);
  const avatarText = useMemo(() => pastelTextFromString(name || email || "U"), [name, email]);

  async function onSaveProfile(e) {
    e?.preventDefault?.();
    setSaved(false);
    setError("");
    try {
      setSaving(true);
      const payload = { name: name?.trim(), phone: digits10(phone) };
      const res = await axios.put("/api/account/profile", payload, { validateStatus: () => true });
      if (res.status < 200 || res.status >= 300 || res.data?.success === false) {
        throw new Error(res.data?.message || "Failed to update profile");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch (err) {
      setError(pickApiMessage(err, "Failed to update profile"));
    } finally {
      setSaving(false);
    }
  }

  async function onChangePassword(e) {
    e?.preventDefault?.();
    setPwError("");
    setPwSuccess("");

    if (provider !== "credentials") {
      setPwError("Password is managed by your sign-in provider.");
      return;
    }
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwError("Please fill all password fields.");
      return;
    }
    if (newPassword.length < 8) {
      setPwError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("New password and confirm password do not match.");
      return;
    }

    try {
      setPwSaving(true);
      const res = await axios.put(
        "/api/account/change-password",
        { currentPassword, newPassword },
        { validateStatus: () => true }
      );
      if (res.status < 200 || res.status >= 300 || res.data?.success === false) {
        throw new Error(res.data?.message || "Failed to change password");
      }
      setPwSuccess("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPwSuccess(""), 2200);
    } catch (err) {
      setPwError(pickApiMessage(err, "Failed to change password"));
    } finally {
      setPwSaving(false);
    }
  }

  async function copyEmail() {
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  }

  return (
    <motion.section
      initial="hidden"
      animate="show"
      variants={page}
      className="mx-auto w-full max-w-6xl [padding-inline:clamp(1rem,4vw,3rem)] py-8 sm:py-10 space-y-6"
    >
      {/* Page heading */}
      <motion.div variants={item} className="flex items-center justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-[22px] sm:text-3xl font-semibold tracking-tight">Edit Profile</h1>
          <p className="text-sm text-muted-foreground">
            Keep your details up to date. Need help?{" "}
            <Link href="/support" className="underline underline-offset-4">Contact support</Link>
          </p>
        </div>
        <Button asChild variant="ghost" className="gap-2">
          <Link href="/account"><ArrowLeft className="h-4 w-4" /> Back to account</Link>
        </Button>
      </motion.div>

      {/* Sticky action bar */}
      <AnimatePresence>
        <motion.div
          key="ab"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          className="sticky top-[72px] z-30"
        >
          <div className="rounded-xl border bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70 px-3.5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BadgeCheck className="h-4 w-4" />
              Double-check your name & phone before saving.
            </div>
            <form onSubmit={onSaveProfile}>
              <Button
                type="submit"
                disabled={saving}
                className="gap-2"
                style={{ backgroundColor: ACCENT, color: "#111" }}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </Button>
            </form>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
        {/* LEFT – Redesign (no banner, Name + Email, pastel avatar) */}
        <motion.div variants={item} className="lg:col-span-5">
          <Card className="relative border bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60">
            <CardHeader className="pb-0">
              <div className="flex items-start gap-4">
                {/* Avatar (pastel) */}
                <div
                  className="h-16 w-16 sm:h-18 sm:w-18 rounded-full ring-4 ring-white grid place-items-center text-lg font-semibold shadow-sm"
                  style={{ background: avatarBg, color: avatarText }}
                  aria-label="User initials"
                >
                  {initials}
                </div>

                {/* Headings + email chip */}
                <div className="flex-1">
                  {/* Title becomes "Name" */}
                  <div className="text-[13px] tracking-wide text-muted-foreground mb-1">Your Profile</div>
                  <div className="text-base font-semibold leading-tight break-all">
                    {name || "—"}
                  </div>

                  {/* Email chip (shows real email instead of 'email sign-in') */}
                  {email ? (
                    <div className="mt-2 inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs bg-white/60">
                      <Mail className="h-3.5 w-3.5" />
                      <span className="font-medium">{email}</span>
                      <button
                        type="button"
                        className="ml-1 inline-flex items-center"
                        onClick={copyEmail}
                        aria-label="Copy email"
                        title="Copy email"
                      >
                        {copied ? <CheckCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-muted-foreground">No email on file</div>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4">
              <Separator className="mb-4" />

              <form onSubmit={onSaveProfile} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <div className="relative">
                    <User2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <div className="relative">
                    <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      inputMode="numeric"
                      placeholder="98XXXXXXXX"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Use a number you can receive calls on for support & delivery.
                  </p>
                </div>

                <AnimatePresence>
                  {error ? (
                    <motion.div
                      key="err"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="text-sm rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700"
                    >
                      {error}
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                <div className="flex items-center justify-end">
                  <Button
                    type="submit"
                    disabled={saving}
                    className="gap-2"
                    style={{ backgroundColor: ACCENT, color: "#111" }}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save changes
                  </Button>
                </div>

                <AnimatePresence>
                  {saved ? (
                    <motion.div
                      key="saved"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="text-sm text-emerald-600 flex items-center gap-2"
                    >
                      <ShieldCheck className="h-4 w-4" /> Profile updated
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* RIGHT – Security card unchanged */}
        <motion.div variants={item} className="lg:col-span-7">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <div className="font-semibold flex items-center gap-2">
                <Lock className="h-4 w-4" /> Security
              </div>
              <div className="text-xs text-muted-foreground">
                {provider === "credentials"
                  ? "Update your account password."
                  : "Your account uses a social provider (password not managed here)."}
              </div>
            </CardHeader>
            <CardContent className="sm:p-6">
              <form onSubmit={onChangePassword} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Current password</Label>
                    <Input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      disabled={provider !== "credentials"}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>New password</Label>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={provider !== "credentials"}
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Confirm new password</Label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={provider !== "credentials"}
                    />
                  </div>
                </div>

                <AnimatePresence>
                  {pwError ? (
                    <motion.div
                      key="pwErr"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="text-sm rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700"
                    >
                      {pwError}
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                <AnimatePresence>
                  {pwSuccess ? (
                    <motion.div
                      key="pwOk"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="text-sm rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700"
                    >
                      <ShieldCheck className="h-4 w-4 inline mr-1" />
                      {pwSuccess}
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                <div className="flex items-center justify-end">
                  <Button
                    type="submit"
                    disabled={provider !== "credentials" || pwSaving}
                    variant="outline"
                    className="gap-2"
                  >
                    {pwSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                    Update password
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.section>
  );
}
