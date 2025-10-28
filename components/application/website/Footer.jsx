"use client";

import Image from "next/image";
import Link from "next/link";

// ⬇️ use the two-card variant
import KickFooterTopCards from "./KickFooterTopCards";

import Logo from "@/public/assets/images/logo-black.png";
import {
  Facebook,
  Instagram,
  Youtube,
  Twitter,
  Mail,
  Phone,
  MapPin,
  ChevronRight,
} from "lucide-react";

/* shadcn/ui */
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

/* Pull categories exactly like in Header */
import { useMemo } from "react";
import { useCategories } from "@/components/providers/CategoriesProvider";
import { CATEGORY_VIEW_ROUTE } from "@/routes/WebsiteRoutes";

/* ---------- Helpers ---------- */
const toTitle = (s) =>
  (s || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());

/* ---------- Static Data ---------- */
const USEFUL = [
  { label: "About", href: "/about" },
  { label: "Register", href: "/auth/register" },
  { label: "Login", href: "/auth/login" },
];

const HELP = [
  { label: "Support", href: "/support" },
  { label: "Warranty", href: "/warranty" },
  { label: "Privacy Policy", href: "/policies/privacy" },
  { label: "Terms & Conditions", href: "/policies/terms" },
];

const SOCIAL = [
  { label: "Facebook", href: "https://facebook.com/yourbrand", Icon: Facebook },
  {
    label: "Instagram",
    href: "https://instagram.com/yourbrand",
    Icon: Instagram,
  },
  { label: "YouTube", href: "https://youtube.com/@yourbrand", Icon: Youtube },
  {
    label: "Twitter / X",
    href: "https://twitter.com/yourbrand",
    Icon: Twitter,
  },
];

/* ---------- Reusable link ---------- */
function ListLink({ href, children }) {
  return (
    <li>
      <Link
        href={href}
        className="group flex items-center gap-2 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronRight className="h-4 w-4 opacity-40 transition-transform group-hover:translate-x-0.5" />
        <span className="underline-offset-4 group-hover:underline">
          {children}
        </span>
      </Link>
    </li>
  );
}

export default function Footer() {
  const year = new Date().getFullYear();

  // Fetch categories just like Header
  const { categories, isLoading } = useCategories();
  const catLinks = useMemo(() => {
    const list = Array.isArray(categories) ? categories : [];
    return list
      .filter((c) => c?.showOnWebsite)
      .map((c) => ({
        label: toTitle(c?.name),
        href: CATEGORY_VIEW_ROUTE(c?.slug),
      }));
  }, [categories]);

  return (
    <footer className="w-full border-t bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:bg-neutral-950/60">
      {/* ⭐ Top two-card row (brand warranty + all-nepal delivery) */}
      <KickFooterTopCards />

      {/* match header widths */}
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-10 2xl:px-16 py-10">
        {/* Mobile View */}
        <div className="lg:hidden space-y-6">
          {/* Brand + Social */}
          <div>
            <Link href="/" className="inline-block" aria-label="KICK Home">
              <Image
                src={Logo}
                alt="KICK"
                width={200}
                height={60}
                className="w-32 h-auto"
                priority
              />
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              Tech that fits your lifestyle — smart, sleek, and built to last.
            </p>
            <div className="mt-5 flex items-center gap-3">
              {SOCIAL.map(({ label, href, Icon }) => (
                <Link
                  key={label}
                  href={href}
                  aria-label={label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group grid h-9 w-9 place-items-center rounded-full border bg-white/60 shadow-sm transition hover:shadow-md hover:bg-white dark:bg-neutral-900/60 dark:hover:bg-neutral-900"
                >
                  <Icon className="h-4 w-4 text-foreground/80 transition-transform duration-200 group-hover:-translate-y-0.5" />
                  <span className="sr-only">{label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Accordion Sections */}
          <Accordion type="multiple" className="space-y-3">
            {/* Categories from Provider */}
            <AccordionItem value="categories">
              <AccordionTrigger className="text-sm font-medium tracking-wide">
                Categories
              </AccordionTrigger>
              <AccordionContent>
                {isLoading ? (
                  <div className="mt-2 text-sm text-muted-foreground">
                    Loading…
                  </div>
                ) : (
                  <ul className="mt-3 space-y-1.5">
                    {catLinks?.length ? (
                      catLinks.map((item) => (
                        <ListLink key={item.label} href={item.href}>
                          {item.label}
                        </ListLink>
                      ))
                    ) : (
                      <li className="py-1.5 text-sm text-muted-foreground">
                        No categories available
                      </li>
                    )}
                  </ul>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="useful">
              <AccordionTrigger className="text-sm font-medium tracking-wide">
                Useful Links
              </AccordionTrigger>
              <AccordionContent>
                <ul className="mt-3 space-y-1.5">
                  {USEFUL.map((item) => (
                    <ListLink key={item.label} href={item.href}>
                      {item.label}
                    </ListLink>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="help">
              <AccordionTrigger className="text-sm font-medium tracking-wide">
                Help Center
              </AccordionTrigger>
              <AccordionContent>
                <ul className="mt-3 space-y-1.5">
                  {HELP.map((item) => (
                    <ListLink key={item.label} href={item.href}>
                      {item.label}
                    </ListLink>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="contact">
              <AccordionTrigger className="text-sm font-medium tracking-wide">
                Contact
              </AccordionTrigger>
              <AccordionContent>
                <ul className="mt-3 space-y-3 text-sm">
                  <li className="flex items-start gap-3">
                    <Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-muted-foreground">Email</div>
                      <Link
                        href="mailto:info@kick.com.np"
                        className="hover:underline"
                      >
                        info@kick.com.np
                      </Link>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Phone className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-muted-foreground">Phone</div>
                      <Link
                        href="tel:+9779820810020"
                        className="hover:underline"
                      >
                        +977 9820810020
                      </Link>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-muted-foreground">Address</div>
                      <p>
                        Kick Lifestyle, Kathmandu, Nepal
                        <br />
                        <Link
                          href="https://maps.app.goo.gl/3VVPwH56bnSftizMA"
                          className="hover:underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Get directions →
                        </Link>
                      </p>
                    </div>
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Desktop View */}
        <div className="hidden lg:grid gap-10 lg:grid-cols-5">
          {/* Brand + Social */}
          <div>
            <Link href="/" className="inline-block" aria-label="KICK Home">
              <Image
                src={Logo}
                alt="KICK"
                width={200}
                height={60}
                className="w-32 h-auto"
                priority
              />
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              Tech that fits your lifestyle — smart, sleek, and built to last.
            </p>
            <div className="mt-5 flex items-center gap-3">
              {SOCIAL.map(({ label, href, Icon }) => (
                <Link
                  key={label}
                  href={href}
                  aria-label={label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group grid h-9 w-9 place-items-center rounded-full border bg-white/60 shadow-sm transition hover:shadow-md hover:bg-white dark:bg-neutral-900/60 dark:hover:bg-neutral-900"
                >
                  <Icon className="h-4 w-4 text-foreground/80 transition-transform duration-200 group-hover:-translate-y-0.5" />
                  <span className="sr-only">{label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Categories (live) */}
          <div>
            <h4 className="text-sm font-medium tracking-wide">Categories</h4>
            {isLoading ? (
              <div className="mt-3 text-sm text-muted-foreground">Loading…</div>
            ) : (
              <ul className="mt-3 space-y-1.5">
                {catLinks?.length ? (
                  catLinks.map((item) => (
                    <ListLink key={item.label} href={item.href}>
                      {item.label}
                    </ListLink>
                  ))
                ) : (
                  <li className="py-1.5 text-sm text-muted-foreground">
                    No categories available
                  </li>
                )}
              </ul>
            )}
          </div>

          {/* Useful */}
          <div>
            <h4 className="text-sm font-medium tracking-wide">Useful Links</h4>
            <ul className="mt-3 space-y-1.5">
              {USEFUL.map((item) => (
                <ListLink key={item.label} href={item.href}>
                  {item.label}
                </ListLink>
              ))}
            </ul>
          </div>

          {/* Help */}
          <div>
            <h4 className="text-sm font-medium tracking-wide">Help Center</h4>
            <ul className="mt-3 space-y-1.5">
              {HELP.map((item) => (
                <ListLink key={item.label} href={item.href}>
                  {item.label}
                </ListLink>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-medium tracking-wide">Contact</h4>
            <ul className="mt-3 space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-muted-foreground">Email</div>
                  <Link
                    href="mailto:info@kick.com.np"
                    className="hover:underline"
                  >
                    info@kick.com.np
                  </Link>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-muted-foreground">Phone</div>
                  <Link href="tel:+9779820810020" className="hover:underline">
                    +977 9820810020
                  </Link>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-muted-foreground">Address</div>
                  <p>Kick Lifestyle, Kathmandu, Nepal</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 border-t pt-5 text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {year} KICK. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/policies/privacy" className="hover:underline">
              Privacy Policy
            </Link>
            <Link href="/policies/terms" className="hover:underline">
              Terms & Conditions
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
