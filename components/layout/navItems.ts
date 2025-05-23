// import { FileText, Settings } from "lucide-react";
import { FileText, Settings } from "lucide-react";

export const mainNavItems = [
    { name: "Dashboard", href: "/dashboard/" },
    { name: "Inventory", href: "/inventory/" },
    { name: "Vendors", href: "/vendors/" },
    { name: "Thread Orders", href: "/thread-orders/" },
    { name: "Dyeing Process", href: "/dyeing-process/" },
    { name: "Fabric Production", href: "/fabric-production/" },
    { name: "Sales & Payments", href: "/sales/" },
    { name: "Ledger", href: "/ledger/" },
];

export const additionalNavItems = [
    { name: "Reports", href: "/reports/", icon: FileText },
    { name: "Settings", href: "/settings/", icon: Settings },
];
