"use client";

import Image from "next/image";
import Link from "next/link";
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

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

/* ---------- Data ---------- */
const CATEGORIES = [
  { label: "Smartwatch", href: "category/smart-watch" },
  { label: "True Wireless Earbuds", href: "category/true-wireless-earbuds" },
];

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
        <ChevronRight className="h-3.5 w-3.5 opacity-40 transition-transform group-hover:translate-x-0.5" />
        <span className="underline-offset-4 hover:underline">{children}</span>
      </Link>
    </li>
  );
}

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto max-w-[1600px] [padding-inline:clamp(1rem,5vw,6rem)] py-10">
        {/* Mobile View */}
        <div className="lg:hidden space-y-6">
          {/* Brand + Social (always visible) */}
          <div>
            <Link href="/" className="inline-block">
              <Image
                src={Logo}
                alt="KICK"
                width={200}
                height={60}
                className="w-32"
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
                  rel="noreferrer"
                  className="group grid h-9 w-9 place-items-center rounded-full border bg-white/60 shadow-sm transition hover:shadow-md hover:bg-white"
                >
                  <Icon className="h-4.5 w-4.5 text-foreground/80 transition-transform duration-200 group-hover:-translate-y-0.5" />
                </Link>
              ))}
            </div>
          </div>

          {/* Accordion Sections */}
          <Accordion type="multiple" className="space-y-3">
            <AccordionItem value="categories">
              <AccordionTrigger className="text-sm font-medium tracking-wide">
                Categories
              </AccordionTrigger>
              <AccordionContent>
                <ul className="mt-3 space-y-1.5">
                  {CATEGORIES.map((item) => (
                    <ListLink key={item.label} href={item.href}>
                      {item.label}
                    </ListLink>
                  ))}
                </ul>
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
                    <Mail className="mt-0.5 h-4.5 w-4.5 text-muted-foreground" />
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
                    <Phone className="mt-0.5 h-4.5 w-4.5 text-muted-foreground" />
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
                    <MapPin className="mt-0.5 h-4.5 w-4.5 text-muted-foreground" />
                    <div>
                      <div className="text-muted-foreground">Address</div>
                      <p>
                        Kick Lifestyle, Kathmandu, Nepal
                        <br />
                        <Link href="/contact" className="hover:underline">
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
            <Link href="/" className="inline-block">
              <Image
                src={Logo}
                alt="KICK"
                width={200}
                height={60}
                className="w-32"
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
                  rel="noreferrer"
                  className="group grid h-9 w-9 place-items-center rounded-full border bg-white/60 shadow-sm transition hover:shadow-md hover:bg-white"
                >
                  <Icon className="h-4.5 w-4.5 text-foreground/80 transition-transform duration-200 group-hover:-translate-y-0.5" />
                </Link>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-sm font-medium tracking-wide">Categories</h4>
            <ul className="mt-3 space-y-1.5">
              {CATEGORIES.map((item) => (
                <ListLink key={item.label} href={item.href}>
                  {item.label}
                </ListLink>
              ))}
            </ul>
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
                <Mail className="mt-0.5 h-4.5 w-4.5 text-muted-foreground" />
                <div>
                  <div className="text-muted-foreground">Email</div>
                  <Link
                    href="mailto:hello@example.com"
                    className="hover:underline"
                  >
                    hello@example.com
                  </Link>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="mt-0.5 h-4.5 w-4.5 text-muted-foreground" />
                <div>
                  <div className="text-muted-foreground">Phone</div>
                  <Link href="tel:+9779820810020" className="hover:underline">
                    +977 9820810020
                  </Link>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4.5 w-4.5 text-muted-foreground" />
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
