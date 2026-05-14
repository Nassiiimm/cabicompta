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
  ChevronRight,
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
      "Production des déclarations T2, CO-17, TPS/TVQ et des rapports DAS. Respect de toutes les échéances gouvernementales québécoises.",
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
      "Accompagnement stratégique : optimisation fiscale, planification de la retraite, évaluation d'entreprise et financement.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 h-16 border-b bg-white/90 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto h-full px-6 flex items-center justify-between">
          <div>
            <span className="text-base font-bold tracking-tight">CabiCompta</span>
            <span className="hidden sm:inline text-xs text-muted-foreground ml-2">
              Cabinet comptable agréé
            </span>
          </div>
          <nav className="flex items-center gap-1">
            <a
              href="#services"
              className="hidden sm:inline-flex text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 transition-colors"
            >
              Services
            </a>
            <a
              href="#contact"
              className="hidden sm:inline-flex text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 transition-colors"
            >
              Contact
            </a>
            <Link
              href="/login"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Espace client
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-neutral-950 text-white">
          <div className="max-w-5xl mx-auto px-6 py-20 sm:py-32">
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-5">
              Cabinet comptable — Québec
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1] max-w-2xl">
              Votre comptabilité,{" "}
              <span className="text-neutral-400">prise en charge.</span>
            </h1>
            <p className="mt-6 text-neutral-300 text-lg max-w-xl leading-relaxed">
              Nous accompagnons les PME et entrepreneurs québécois dans leur
              comptabilité, leur fiscalité et leur développement — avec rigueur
              et transparence.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <a
                href="#contact"
                className="inline-flex items-center justify-center h-11 px-6 rounded-md bg-white text-neutral-950 text-sm font-semibold hover:bg-neutral-100 transition-colors"
              >
                Prendre rendez-vous
                <ChevronRight className="ml-1.5 size-4" />
              </a>
              <a
                href="#services"
                className="inline-flex items-center justify-center h-11 px-6 rounded-md border border-neutral-700 text-white text-sm font-medium hover:border-neutral-500 transition-colors"
              >
                Nos services
              </a>
            </div>
          </div>
        </section>

        {/* Chiffres clés */}
        <section className="border-b">
          <div className="max-w-5xl mx-auto px-6 py-12">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
              {[
                { value: "15+", label: "années d'expérience" },
                { value: "200+", label: "clients accompagnés" },
                { value: "100%", label: "conformité garantie" },
                { value: "48h", label: "délai de réponse" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
                  <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Services */}
        <section id="services" className="border-b">
          <div className="max-w-5xl mx-auto px-6 py-16 sm:py-20">
            <h2 className="text-2xl font-bold tracking-tight mb-2">Nos services</h2>
            <p className="text-muted-foreground text-sm mb-10">
              Des solutions comptables adaptées à chaque étape de la vie de votre entreprise.
            </p>
            <div className="grid sm:grid-cols-2 gap-6">
              {SERVICES.map((s) => (
                <div
                  key={s.title}
                  className="rounded-xl border p-6 hover:border-neutral-400 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-md bg-neutral-100">
                      <s.icon className="size-4 text-neutral-700" />
                    </div>
                    <h3 className="font-semibold text-sm">{s.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {s.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Approche */}
        <section className="border-b bg-neutral-50 dark:bg-neutral-950/40">
          <div className="max-w-5xl mx-auto px-6 py-16 sm:py-20">
            <div className="grid sm:grid-cols-2 gap-10 items-center">
              <div>
                <h2 className="text-2xl font-bold tracking-tight mb-4">
                  Une relation de confiance, pas juste un dossier
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                  Chez CabiCompta, chaque client a un interlocuteur dédié qui
                  connaît son dossier. Nous ne gérons pas des numéros — nous
                  accompagnons des entrepreneurs.
                </p>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Grâce à notre portail sécurisé, vous déposez vos documents en
                  ligne, suivez vos échéances en temps réel et consultez vos
                  états financiers à tout moment.
                </p>
              </div>
              <div className="space-y-4">
                {[
                  "Interlocuteur dédié à votre dossier",
                  "Portail client sécurisé 24/7",
                  "Rappels automatiques des échéances",
                  "Réponse garantie sous 48 heures",
                  "Conformité CPA et normes québécoises",
                ].map((point) => (
                  <div key={point} className="flex items-center gap-3">
                    <div className="size-1.5 rounded-full bg-neutral-900 shrink-0" />
                    <p className="text-sm">{point}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="border-b">
          <div className="max-w-5xl mx-auto px-6 py-16 sm:py-20">
            <h2 className="text-2xl font-bold tracking-tight mb-2">Nous contacter</h2>
            <p className="text-muted-foreground text-sm mb-10">
              Un premier échange sans engagement pour évaluer vos besoins.
            </p>
            <div className="grid sm:grid-cols-3 gap-6">
              <a
                href="tel:+15141234567"
                className="flex items-start gap-4 rounded-xl border p-5 hover:border-neutral-400 transition-colors group"
              >
                <div className="p-2 rounded-md bg-neutral-100 group-hover:bg-neutral-200 transition-colors">
                  <Phone className="size-4 text-neutral-700" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                    Téléphone
                  </p>
                  <p className="text-sm font-medium">+1 (514) 123-4567</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Lun–Ven, 9h–17h
                  </p>
                </div>
              </a>

              <a
                href="mailto:info@cabicompta.ca"
                className="flex items-start gap-4 rounded-xl border p-5 hover:border-neutral-400 transition-colors group"
              >
                <div className="p-2 rounded-md bg-neutral-100 group-hover:bg-neutral-200 transition-colors">
                  <Mail className="size-4 text-neutral-700" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                    Courriel
                  </p>
                  <p className="text-sm font-medium">info@cabicompta.ca</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Réponse sous 48h
                  </p>
                </div>
              </a>

              <div className="flex items-start gap-4 rounded-xl border p-5">
                <div className="p-2 rounded-md bg-neutral-100">
                  <MapPin className="size-4 text-neutral-700" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                    Adresse
                  </p>
                  <p className="text-sm font-medium">1234 rue Sherbrooke O.</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Montréal, QC H3G 1G1
                  </p>
                </div>
              </div>
            </div>

            {/* Espace client CTA */}
            <div className="mt-10 rounded-xl border bg-neutral-950 text-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="font-semibold">Déjà client ?</p>
                <p className="text-sm text-neutral-400 mt-0.5">
                  Accédez à votre espace sécurisé pour déposer des documents et
                  suivre vos dossiers.
                </p>
              </div>
              <Link
                href="/login"
                className="inline-flex items-center justify-center h-10 px-5 rounded-md bg-white text-neutral-950 text-sm font-semibold hover:bg-neutral-100 transition-colors shrink-0"
              >
                Espace client
                <ChevronRight className="ml-1.5 size-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-6 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>CabiCompta — Cabinet comptable agréé, Québec</span>
          <span>&copy; {new Date().getFullYear()} CabiCompta. Tous droits réservés.</span>
        </div>
      </footer>
    </div>
  );
}
