// app/administration/page.jsx
import { ReportsPanel } from "@/components/interface/ReportsPanel";

export default function AdministrationOverviewPage() {
    return (
        <main className="max-w-5xl mx-auto space-y-6">
            <header className="space-y-1">
                <h1 className="text-2xl font-bold">Administration</h1>
                <p className="text-sm text-emerald-300">
                    Manage all entities related to your streaming business.
                </p>
            </header>

            <section className="space-y-2 text-sm text-emerald-100">
                <p>
                    Use the sidebar on the left to navigate between emails, companies,
                    cards, clients and bank accounts.
                </p>
            </section>

            {/* REPORTES */}
            <section className="space-y-3">
                <div>
                    <h2 className="text-lg font-semibold text-emerald-50">
                        Reports (PDF)
                    </h2>
                    <p className="text-xs text-emerald-300">
                        Generate monthly summary reports of your streaming business.
                    </p>
                </div>

                <ReportsPanel />
            </section>
        </main>
    );
}