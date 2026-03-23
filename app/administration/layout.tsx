import AdminSidebar from "@/components/interface/AdminSidebar";

export const metadata = {
    title: "Administración | DAIEGO Streaming",
};

export default function AdministrationLayout({ children }) {
    return (
        <div className="min-h-screen flex bg-[#1f2430] text-emerald-50">
            <AdminSidebar />
            <div className="flex-1 px-6 py-6">
                {children}
            </div>
        </div>
    );
}
