export default function AdministrationOverviewPage() {
    return (
        <main className="max-w-5xl mx-auto space-y-4">
            <header>
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
        </main>
    );
}