// app/administration/page.jsx
import { ReportsPanel } from "@/components/interface/ReportsPanel";

export default function AdministrationOverviewPage() {
    return (
        <main className="max-w-5xl mx-auto space-y-6">
            <header className="space-y-1">
                <h1 className="text-2xl font-bold">Administración</h1>
                <p className="text-sm text-emerald-300">
                    Administra todas las entidades relacionadas con tu negocio de streaming.
                </p>
            </header>

            <section className="space-y-2 text-sm text-emerald-100">
                <p>
                    Usa la barra lateral izquierda para navegar entre correos, empresas,
                    tarjetas, clientes y cuentas bancarias.
                </p>
            </section>

            {/* REPORTES */}
            <section className="space-y-3">
                <div>
                    <h2 className="text-lg font-semibold text-emerald-50">
                        Reportes (PDF)
                    </h2>
                    <p className="text-xs text-emerald-300">
                        Genera reportes mensuales de resumen de tu negocio.
                    </p>
                </div>

                <ReportsPanel />
            </section>
        </main>
    );
}