import AdminSidebar from "@/components/interface/AdminSidebar";

export const metadata = {
    title: "Administration | Streaming Murillo App",
};

export default function AdministrationLayout({ children }) {
    return (
        <div className="min-h-screen flex bg-emerald-950 text-emerald-50">
            <AdminSidebar />
            <div className="flex-1 px-6 py-6">
                {children}
            </div>
        </div>
    );
}
