// app/(root)/(account)/profile/page.jsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
} from "lucide-react";

// shadcn/ui
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

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

/** Safely read JSON; fall back to text if server returned HTML/error page */
async function safeParse(res) {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try { return await res.json(); } catch { /* ignore */ }
  }
  const text = await res.text();
  return { success: false, message: text?.slice(0, 180) || "Unknown error" };
}

export default function Page() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const [provider, setProvider] = useState("credentials");

  // editable
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // password form (credentials only)
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const initials = useMemo(() => {
    const n = (name || "").trim();
    if (!n) return "U";
    const p = n.split(/\s+/);
    return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || "U";
  }, [name]);

  // load profile
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/auth/me", { credentials: "include" });
        const json = await safeParse(res);
        if (!res.ok || json?.success === false) throw new Error(json?.message || "Failed to load profile");
        const u = json?.data || json?.user;
        if (!u) throw new Error("No profile");
        if (!alive) return;
        setProvider(u.provider || "credentials");
        setName(u.name || "");
        setPhone(u.phone || "");
      } catch (e) {
        if (alive) setError(e?.message || "Could not load profile");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  async function onSaveProfile(e) {
    e?.preventDefault?.();
    setSaved(false);
    setError("");
    try {
      setSaving(true);
      const payload = { name: name?.trim(), phone: digits10(phone) };
      const res = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await safeParse(res);
      if (!res.ok || json?.success === false) throw new Error(json?.message || "Failed to update profile");
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch (e) {
      setError(e?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  async function onChangePassword(e) {
    e?.preventDefault?.();
    setPwError(""); setPwSuccess("");

    if (provider !== "credentials") {
      setPwError("Password is managed by your sign-in provider.");
      return;
    }
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwError("Please fill all password fields."); return;
    }
    if (newPassword.length < 8) {
      setPwError("New password must be at least 8 characters."); return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("New password and confirm password do not match."); return;
    }

    try {
      setPwSaving(true);
      const res = await fetch("/api/account/change-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = await safeParse(res);
      if (!res.ok || json?.success === false) throw new Error(json?.message || "Failed to change password");
      setPwSuccess("Password updated successfully.");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setTimeout(() => setPwSuccess(""), 2200);
    } catch (e) {
      setPwError(e?.message || "Failed to change password");
    } finally {
      setPwSaving(false);
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
        {!loading ? (
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
        ) : null}
      </AnimatePresence>

      {/* Two-column content – tighter, aligned, responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
        {/* LEFT */}
        <motion.div variants={item} className="lg:col-span-5">
          <Card className="overflow-hidden">
            <CardHeader className="pb-0">
              <div className="relative h-16 w-full rounded-md bg-gradient-to-r from-neutral-900 to-black" />
            </CardHeader>
            <CardContent className="-mt-8">
              <div className="flex items-center gap-4">
                <div className="grid place-items-center h-14 w-14 rounded-full ring-4 ring-white bg-neutral-900 text-white font-medium select-none">
                  {loading ? "…" : initials}
                </div>
                <div>
                  <div className="text-base font-semibold">Your Profile</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <User2 className="h-3.5 w-3.5" /> {provider === "credentials" ? "Email sign-in" : "Social sign-in"}
                  </div>
                </div>
              </div>

              <Separator className="my-4" />

              {loading ? (
                <div className="space-y-4">
                  <div className="h-10 bg-muted rounded-md animate-pulse" />
                  <div className="h-10 bg-muted rounded-md animate-pulse" />
                </div>
              ) : (
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
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* RIGHT */}
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
