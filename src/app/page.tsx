import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-14 border-b flex items-center px-6">
        <div className="max-w-5xl mx-auto w-full flex items-center justify-between">
          <span className="text-sm font-semibold tracking-tight">CabiCompta</span>
          <div className="flex items-center gap-2">
            <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Connexion
            </Link>
            <Link href="/register" className={buttonVariants({ size: "sm" })}>
              Essai gratuit
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="max-w-5xl mx-auto px-6 pt-20 sm:pt-28 pb-16">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1] max-w-2xl">
            La gestion de votre cabinet comptable, simplifiée.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-lg leading-relaxed">
            Dossiers clients, documents, factures et échéances fiscales québécoises —
            centralisés dans un seul outil.
          </p>
          <div className="mt-8 flex gap-3">
            <Link
              href="/register"
              className={buttonVariants() + " h-10 px-5 text-sm"}
            >
              Commencer
              <ArrowRight className="ml-1.5 size-3.5" />
            </Link>
            <Link
              href="/login"
              className={buttonVariants({ variant: "outline" }) + " h-10 px-5 text-sm"}
            >
              Se connecter
            </Link>
          </div>
        </section>

        {/* What it does */}
        <section className="border-t">
          <div className="max-w-5xl mx-auto px-6 py-16">
            <div className="grid sm:grid-cols-3 gap-8 sm:gap-12">
              <div>
                <div className="text-sm font-semibold mb-2">01</div>
                <h3 className="font-semibold mb-1">Portail client</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Vos clients déposent leurs documents en ligne.
                  Ils reçoivent des rappels automatiques quand quelque chose manque.
                </p>
              </div>
              <div>
                <div className="text-sm font-semibold mb-2">02</div>
                <h3 className="font-semibold mb-1">Échéances fiscales</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  T2, CO-17, TPS/TVQ, DAS, RL-1 — toutes les dates sont
                  générées automatiquement selon la fin d&apos;exercice.
                </p>
              </div>
              <div>
                <div className="text-sm font-semibold mb-2">03</div>
                <h3 className="font-semibold mb-1">Extraction IA</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  L&apos;IA analyse les documents déposés, identifie le type
                  et extrait les données pour pré-remplir vos formulaires.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t bg-neutral-950 text-white">
          <div className="max-w-5xl mx-auto px-6 py-16 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Prêt à commencer ?</h2>
              <p className="text-neutral-400 text-sm mt-1">
                14 jours d&apos;essai gratuit. Aucune carte requise.
              </p>
            </div>
            <Link
              href="/register"
              className="inline-flex items-center h-10 px-5 rounded-md bg-white text-neutral-950 text-sm font-semibold hover:bg-neutral-200 transition-colors shrink-0"
            >
              Créer un compte
              <ArrowRight className="ml-1.5 size-3.5" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t py-5 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-xs text-muted-foreground">
          <span>CabiCompta</span>
          <span>&copy; {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
