import Link from "next/link";
import Image from "next/image";
import {
  FileText,
  CalendarCheck,
  Users,
  TrendingUp,
  Phone,
  Mail,
  MapPin,
  ArrowRight,
  ShieldCheck,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function HomePage() {
  const t = await getTranslations("home");

  const SERVICES = [
    { icon: FileText,      title: t("services.bookkeeping.title"), description: t("services.bookkeeping.desc") },
    { icon: CalendarCheck, title: t("services.tax.title"),         description: t("services.tax.desc") },
    { icon: Users,         title: t("services.payroll.title"),     description: t("services.payroll.desc") },
    { icon: TrendingUp,    title: t("services.advisory.title"),    description: t("services.advisory.desc") },
  ];

  const STATS = [
    { value: "15+",  label: t("stats.years") },
    { value: "200+", label: t("stats.clients") },
    { value: "100%", label: t("stats.compliance") },
    { value: "48h",  label: t("stats.response") },
  ];

  const POINTS = [
    t("approach.points.dedicated"),
    t("approach.points.portal"),
    t("approach.points.reminders"),
    t("approach.points.response"),
    t("approach.points.compliance"),
  ];

  const TRUST = [
    "CPA certifié",
    "Revenu Québec agréé",
    "Normes IFRS & ASPE",
    "Données hébergées au Canada",
    "Portail sécurisé 24/7",
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-900 scroll-smooth">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-neutral-950/95 backdrop-blur border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between" style={{ height: "72px" }}>
          <Image
            src="/logo-cfc-transparent.png"
            alt="CFC – Comptabilité Fiscalité Conseil"
            width={260}
            height={66}
            className="object-contain"
            style={{ height: "58px", width: "auto" }}
            priority
          />
          <nav className="flex items-center gap-7">
            <a href="#services"  className="hidden md:block text-sm text-neutral-400 hover:text-white transition-colors">Services</a>
            <a href="#approche"  className="hidden md:block text-sm text-neutral-400 hover:text-white transition-colors">Approche</a>
            <a href="#contact"   className="hidden md:block text-sm text-neutral-400 hover:text-white transition-colors">Contact</a>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 h-9 px-5 rounded-full bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-400 transition-colors"
            >
              Espace client <ArrowRight className="size-3.5" />
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">

        {/* ── Hero ───────────────────────────────────────────────────── */}
        <section className="relative bg-neutral-950 text-white overflow-hidden">
          {/* Subtle grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
          {/* Radial glow */}
          <div className="absolute top-0 left-1/3 w-[600px] h-[400px] rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

          <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-0">
            {/* Logo grande — pièce maîtresse */}
            <div className="mb-12">
              <Image
                src="/logo-cfc-transparent.png"
                alt="CFC – Comptabilité Fiscalité Conseil"
                width={380}
                height={96}
                className="object-contain"
                style={{ height: "88px", width: "auto" }}
                priority
              />
            </div>

            {/* Headline */}
            <div className="grid lg:grid-cols-[1fr_auto] gap-12 items-end pb-16">
              <div>
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-6">
                  <span className="inline-block size-1.5 rounded-full bg-emerald-400" />
                  {t("tagline")}
                </span>
                <h1 className="text-5xl sm:text-6xl lg:text-[72px] font-bold tracking-tight leading-[1.02]">
                  Votre comptabilité,
                  <br />
                  <span className="text-neutral-500">prise en charge.</span>
                </h1>
                <p className="mt-7 text-neutral-400 text-lg leading-relaxed max-w-lg">
                  {t("subheadline")}
                </p>
                <div className="mt-10 flex flex-wrap gap-3">
                  <a
                    href="#contact"
                    className="inline-flex items-center gap-2 h-12 px-8 rounded-full bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-400 transition-colors"
                  >
                    {t("cta")} <ArrowRight className="size-4" />
                  </a>
                  <a
                    href="#services"
                    className="inline-flex items-center gap-2 h-12 px-8 rounded-full border border-white/15 text-white text-sm font-medium hover:border-white/30 hover:bg-white/5 transition-colors"
                  >
                    {t("seeServices")}
                  </a>
                </div>
              </div>
            </div>

            {/* Stats band — base du hero */}
            <div className="border-t border-white/10 grid grid-cols-2 sm:grid-cols-4">
              {STATS.map((stat, i) => (
                <div
                  key={stat.label}
                  className={`py-8 px-6 ${i < 3 ? "border-r border-white/10" : ""}`}
                >
                  <p className="text-4xl font-bold tracking-tight text-emerald-400">{stat.value}</p>
                  <p className="text-sm text-neutral-500 mt-1.5 leading-snug">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Bandeau certifications ─────────────────────────────────── */}
        <section className="border-b border-neutral-100 bg-neutral-50">
          <div className="max-w-6xl mx-auto px-6 py-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
            {TRUST.map((badge) => (
              <div key={badge} className="flex items-center gap-2 text-xs font-medium text-neutral-500">
                <ShieldCheck className="size-3.5 text-emerald-500 shrink-0" />
                {badge}
              </div>
            ))}
          </div>
        </section>

        {/* ── Services ───────────────────────────────────────────────── */}
        <section id="services" className="border-b border-neutral-100">
          <div className="max-w-6xl mx-auto px-6 py-20 sm:py-28">
            <div className="flex items-end justify-between gap-8 mb-14">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 mb-3">{t("services.title")}</p>
                <h2 className="text-4xl font-bold tracking-tight">Ce que nous faisons</h2>
              </div>
              <p className="hidden sm:block text-neutral-400 text-sm max-w-xs text-right leading-relaxed">
                {t("services.subtitle")}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-px bg-neutral-100 rounded-2xl overflow-hidden border border-neutral-100">
              {SERVICES.map((s, i) => (
                <div
                  key={s.title}
                  className={`p-8 flex flex-col gap-5 ${
                    i === 0 ? "bg-neutral-950 text-white" : "bg-white hover:bg-neutral-50 transition-colors"
                  }`}
                >
                  <div className={`p-3 rounded-xl w-fit ${i === 0 ? "bg-white/10" : "bg-neutral-100"}`}>
                    <s.icon className={`size-5 ${i === 0 ? "text-white" : "text-neutral-600"}`} />
                  </div>
                  <div>
                    <h3 className={`font-bold text-lg mb-2 ${i === 0 ? "text-white" : "text-neutral-900"}`}>{s.title}</h3>
                    <p className={`text-sm leading-relaxed ${i === 0 ? "text-neutral-400" : "text-neutral-500"}`}>{s.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Approche ───────────────────────────────────────────────── */}
        <section id="approche" className="border-b border-neutral-100 bg-neutral-50">
          <div className="max-w-6xl mx-auto px-6 py-20 sm:py-28">
            <div className="grid lg:grid-cols-[1fr_480px] gap-16 items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 mb-3">Notre approche</p>
                <h2 className="text-4xl font-bold tracking-tight text-neutral-900 mb-7">
                  {t("approach.title")}
                </h2>
                <p className="text-neutral-600 text-base leading-relaxed mb-5">{t("approach.p1")}</p>
                <p className="text-neutral-600 text-base leading-relaxed mb-10">{t("approach.p2")}</p>
                <a
                  href="#contact"
                  className="inline-flex items-center gap-2 h-11 px-7 rounded-full bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-400 transition-colors"
                >
                  Prendre rendez-vous <ArrowRight className="size-3.5" />
                </a>
              </div>
              <div className="space-y-3">
                {POINTS.map((point) => (
                  <div key={point} className="flex items-center gap-4 p-5 rounded-xl bg-white border border-neutral-200 shadow-sm">
                    <CheckCircle2 className="size-5 text-emerald-500 shrink-0" />
                    <p className="text-sm font-medium text-neutral-800">{point}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Portail CTA ────────────────────────────────────────────── */}
        <section className="bg-neutral-950">
          <div className="max-w-6xl mx-auto px-6 py-16 sm:py-20">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-10 sm:p-14 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-4">
                  <span className="size-1.5 rounded-full bg-emerald-400 inline-block" />
                  Déjà client
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">{t("contact.existing")}</h2>
                <p className="text-neutral-400 text-base max-w-md">{t("contact.existingDesc")}</p>
              </div>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 h-13 px-8 rounded-full bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-400 transition-colors shrink-0 whitespace-nowrap"
                style={{ height: "52px" }}
              >
                Accéder à l&apos;espace client <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── Contact ────────────────────────────────────────────────── */}
        <section id="contact" className="border-b border-neutral-100">
          <div className="max-w-6xl mx-auto px-6 py-20 sm:py-28">
            <div className="grid lg:grid-cols-[1fr_560px] gap-16 items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 mb-3">Contact</p>
                <h2 className="text-4xl font-bold tracking-tight mb-4">{t("contact.title")}</h2>
                <p className="text-neutral-500 text-base leading-relaxed">{t("contact.subtitle")}</p>
              </div>
              <div className="space-y-3">
                <a
                  href="tel:+15141234567"
                  className="flex items-center gap-5 rounded-2xl border border-neutral-200 bg-white p-6 hover:border-neutral-400 hover:shadow-sm transition-all"
                >
                  <div className="size-12 rounded-xl bg-neutral-950 flex items-center justify-center shrink-0">
                    <Phone className="size-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-0.5">{t("contact.phone")}</p>
                    <p className="text-base font-bold text-neutral-900">+1 (514) 123-4567</p>
                    <p className="text-xs text-neutral-400 mt-0.5">{t("contact.phoneHours")}</p>
                  </div>
                </a>
                <a
                  href="mailto:info@cabicompta.ca"
                  className="flex items-center gap-5 rounded-2xl border border-neutral-200 bg-white p-6 hover:border-neutral-400 hover:shadow-sm transition-all"
                >
                  <div className="size-12 rounded-xl bg-neutral-950 flex items-center justify-center shrink-0">
                    <Mail className="size-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-0.5">{t("contact.emailLabel")}</p>
                    <p className="text-base font-bold text-neutral-900">info@cabicompta.ca</p>
                    <p className="text-xs text-neutral-400 mt-0.5">{t("contact.emailResponse")}</p>
                  </div>
                </a>
                <div className="flex items-center gap-5 rounded-2xl border border-neutral-200 bg-white p-6">
                  <div className="size-12 rounded-xl bg-neutral-950 flex items-center justify-center shrink-0">
                    <MapPin className="size-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-0.5">{t("contact.addressLabel")}</p>
                    <p className="text-base font-bold text-neutral-900">1234 rue Sherbrooke O.</p>
                    <p className="text-xs text-neutral-400 mt-0.5">Montréal, QC H3G 1G1</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="bg-neutral-950">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <Image
              src="/logo-cfc-transparent.png"
              alt="CFC – Comptabilité Fiscalité Conseil"
              width={220}
              height={56}
              className="object-contain"
              style={{ height: "52px", width: "auto" }}
            />
            <div className="flex flex-col sm:items-end gap-1">
              <p className="text-xs text-neutral-500">{t("footer")}</p>
              <p className="text-xs text-neutral-600">&copy; {new Date().getFullYear()} CFC. {t("rights")}</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
