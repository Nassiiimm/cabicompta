import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  FileText,
  CalendarCheck,
  Users,
  TrendingUp,
  Phone,
  Mail,
  MapPin,
  ArrowRight,
} from "lucide-react";

const SERVICES = [
  {
    icon: FileText,
    title: "Tenue de livres",
    description:
      "Saisie comptable, conciliation bancaire et états financiers mensuels ou trimestriels pour les PME et travailleurs autonomes.",
  },
  {
    icon: CalendarCheck,
    title: "Déclarations fiscales",
    description:
      "Production des déclarations T2, CO-17, TPS/TVQ et rapports DAS. Respect de toutes les échéances gouvernementales québécoises.",
  },
  {
    icon: Users,
    title: "Paie et ressources humaines",
    description:
      "Gestion de la paie, production des relevés RL-1 et T4, calcul des cotisations et des avantages imposables.",
  },
  {
    icon: TrendingUp,
    title: "Conseil et planification",
    description:
      "Optimisation fiscale, planification de la retraite, évaluation d'entreprise et accompagnement au financement.",
  },
];

const STATS = [
  { value: "15+", label: "années d'expérience" },
  { value: "200+", label: "clients accompagnés" },
  { value: "100%", label: "conformité garantie" },
  { value: "48h", label: "délai de réponse" },
];

const POINTS = [
  "Interlocuteur dédié à votre dossier",
  "Portail client sécurisé 24/7",
  "Rappels automatiques des échéances",
  "Réponse garantie sous 48 heures",
  "Conformité CPA et normes québécoises",
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-900">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-neutral-100">
        <div className="max-w-5xl mx-auto h-16 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-neutral-900 flex items-center justify-center">
              <span className="text-white text-xs font-bold">CC</span>
            </div>
            <div>
              <p className="text-sm font-bold leading-none">CabiCompta</p>
              <p className="text-[10px] text-neutral-400 leading-none mt-0.5">Cabinet comptable agréé</p>
            </div>
          </div>
          <nav className="flex items-center gap-6">
            <a href="#services" className="hidden sm:block text-sm text-neutral-500 hover:text-neutral-900 transition-colors">
              Services
            </a>
            <a href="#contact" className="hidden sm:block text-sm text-neutral-500 hover:text-neutral-900 transition-colors">
              Contact
            </a>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-700 transition-colors"
            >
              Espace client
              <ArrowRight className="size-3.5" />
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-b from-neutral-50 to-white border-b border-neutral-100">
          <div className="max-w-5xl mx-auto px-6 pt-20 pb-24 sm:pt-28 sm:pb-32">
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-6">
              <span className="inline-block size-1.5 rounded-full bg-green-500" />
              Cabinet comptable — Québec
            </span>
            <h1 className="text-4xl sm:text-[52px] font-bold tracking-tight leading-[1.1] max-w-2xl text-neutral-900">
              Votre comptabilité,{" "}
              <span className="text-neutral-400">prise en charge.</span>
            </h1>
            <p className="mt-6 text-neutral-500 text-lg max-w-xl leading-relaxed">
              Nous accompagnons les PME et entrepreneurs québécois dans leur
              comptabilité, leur fiscalité et leur développement — avec rigueur
              et transparence.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <a
                href="#contact"
                className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-lg bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-700 transition-colors"
              >
                Prendre rendez-vous
                <ArrowRight className="size-4" />
              </a>
              <a
                href="#services"
                className="inline-flex items-center justify-center h-11 px-6 rounded-lg border border-neutral-200 text-neutral-700 text-sm font-medium hover:bg-neutral-50 transition-colors"
              >
                Nos services
              </a>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="border-b border-neutral-100">
          <div className="max-w-5xl mx-auto px-6 py-12">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
              {STATS.map((stat) => (
                <div key={stat.label}>
                  <p className="text-3xl font-bold tracking-tight text-neutral-900">{stat.value}</p>
                  <p className="text-sm text-neutral-400 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Services */}
        <section id="services" className="border-b border-neutral-100">
          <div className="max-w-5xl mx-auto px-6 py-16 sm:py-20">
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-3">Services</p>
            <h2 className="text-2xl font-bold tracking-tight text-neutral-900 mb-2">
              Ce que nous faisons
            </h2>
            <p className="text-neutral-400 text-sm mb-10 max-w-md">
              Des solutions comptables adaptées à chaque étape de la vie de votre entreprise.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {SERVICES.map((s) => (
                <div
                  key={s.title}
                  className="rounded-xl border border-neutral-100 bg-neutral-50 p-6 hover:border-neutral-300 hover:bg-white transition-all"
                >
                  <div className="inline-flex p-2 rounded-lg bg-white border border-neutral-100 mb-4">
                    <s.icon className="size-4 text-neutral-600" />
                  </div>
                  <h3 className="font-semibold text-sm text-neutral-900 mb-2">{s.title}</h3>
                  <p className="text-sm text-neutral-500 leading-relaxed">{s.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Approche */}
        <section className="border-b border-neutral-100">
          <div className="max-w-5xl mx-auto px-6 py-16 sm:py-20">
            <div className="grid sm:grid-cols-2 gap-12 items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-3">Notre approche</p>
                <h2 className="text-2xl font-bold tracking-tight text-neutral-900 mb-4">
                  Une relation de confiance, pas juste un dossier
                </h2>
                <p className="text-neutral-500 text-sm leading-relaxed mb-4">
                  Chez CabiCompta, chaque client a un interlocuteur dédié qui
                  connaît son dossier. Nous ne gérons pas des numéros — nous
                  accompagnons des entrepreneurs.
                </p>
                <p className="text-neutral-500 text-sm leading-relaxed">
                  Grâce à notre portail sécurisé, vous déposez vos documents en
                  ligne, suivez vos échéances en temps réel et consultez vos
                  états financiers à tout moment.
                </p>
              </div>
              <div className="space-y-3">
                {POINTS.map((point) => (
                  <div key={point} className="flex items-center gap-3 p-3.5 rounded-lg bg-neutral-50 border border-neutral-100">
                    <div className="size-5 rounded-full bg-neutral-900 flex items-center justify-center shrink-0">
                      <svg className="size-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-sm text-neutral-700">{point}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="border-b border-neutral-100 bg-neutral-50">
          <div className="max-w-5xl mx-auto px-6 py-16 sm:py-20">
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-3">Contact</p>
            <h2 className="text-2xl font-bold tracking-tight text-neutral-900 mb-2">Nous contacter</h2>
            <p className="text-neutral-400 text-sm mb-10">
              Un premier échange sans engagement pour évaluer vos besoins.
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              <a
                href="tel:+15141234567"
                className="flex items-start gap-4 rounded-xl border border-neutral-200 bg-white p-5 hover:border-neutral-400 transition-colors"
              >
                <div className="p-2 rounded-lg bg-neutral-100">
                  <Phone className="size-4 text-neutral-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-1">Téléphone</p>
                  <p className="text-sm font-medium text-neutral-900">+1 (514) 123-4567</p>
                  <p className="text-xs text-neutral-400 mt-0.5">Lun–Ven, 9h–17h</p>
                </div>
              </a>
              <a
                href="mailto:info@cabicompta.ca"
                className="flex items-start gap-4 rounded-xl border border-neutral-200 bg-white p-5 hover:border-neutral-400 transition-colors"
              >
                <div className="p-2 rounded-lg bg-neutral-100">
                  <Mail className="size-4 text-neutral-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-1">Courriel</p>
                  <p className="text-sm font-medium text-neutral-900">info@cabicompta.ca</p>
                  <p className="text-xs text-neutral-400 mt-0.5">Réponse sous 48h</p>
                </div>
              </a>
              <div className="flex items-start gap-4 rounded-xl border border-neutral-200 bg-white p-5">
                <div className="p-2 rounded-lg bg-neutral-100">
                  <MapPin className="size-4 text-neutral-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-1">Adresse</p>
                  <p className="text-sm font-medium text-neutral-900">1234 rue Sherbrooke O.</p>
                  <p className="text-xs text-neutral-400 mt-0.5">Montréal, QC H3G 1G1</p>
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-xl border border-neutral-200 bg-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-neutral-900">Déjà client ?</p>
                <p className="text-sm text-neutral-400 mt-0.5">
                  Accédez à votre espace sécurisé pour déposer vos documents et suivre vos dossiers.
                </p>
              </div>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-700 transition-colors shrink-0"
              >
                Espace client
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-neutral-100 py-6 px-6 bg-white">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <div className="size-5 rounded bg-neutral-900 flex items-center justify-center">
              <span className="text-white text-[8px] font-bold">CC</span>
            </div>
            <span>CabiCompta — Cabinet comptable agréé, Québec</span>
          </div>
          <span>&copy; {new Date().getFullYear()} CabiCompta. Tous droits réservés.</span>
        </div>
      </footer>
    </div>
  );
}
