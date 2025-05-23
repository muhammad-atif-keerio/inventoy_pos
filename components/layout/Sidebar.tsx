"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

import {
    BarChart3,
    BookOpen,
    Box,
    Droplets,
    Factory,
    LayoutDashboard,
    LucideIcon,
    Scissors,
    ShoppingBag,
    Users,
} from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import { additionalNavItems, mainNavItems } from "./navItems";

// Icon mapping for main navigation items
const iconMap: Record<string, LucideIcon> = {
    "/dashboard": LayoutDashboard,
    "/inventory": Box,
    "/vendors": Users,
    "/thread-orders": Scissors,
    "/dyeing-process": Droplets,
    "/fabric-production": Factory,
    "/sales": ShoppingBag,
    "/analytics": BarChart3,
    "/ledger": BookOpen,
};

export default function Sidebar() {
    const pathname = usePathname();
    const isActiveLink = (href: string) => {
        return pathname === href || pathname.startsWith(`${href}/`);
    };

    return (
        <aside className="from-background to-background/95 hidden w-64 shrink-0 border-r bg-gradient-to-b md:block">
            <ScrollArea className="h-[calc(100vh-4rem)] px-4 py-6">
                <div className="flex flex-col gap-8">
                    <div className="space-y-2">
                        <p className="text-muted-foreground mb-3 px-3 text-xs font-semibold tracking-wider uppercase">
                            Main Navigation
                        </p>
                        <nav className="grid gap-1.5 px-2">
                            {mainNavItems.map((item) => {
                                const IconComponent = iconMap[item.href];
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                                            isActiveLink(item.href)
                                                ? "bg-primary/10 text-primary"
                                                : "text-muted-foreground hover:bg-accent/80 hover:text-foreground"
                                        }`}
                                    >
                                        {IconComponent && (
                                            <IconComponent
                                                className={`h-4 w-4 transition-colors ${
                                                    isActiveLink(item.href)
                                                        ? "text-primary"
                                                        : "text-muted-foreground group-hover:text-foreground"
                                                }`}
                                            />
                                        )}
                                        <span>{item.name}</span>
                                        {isActiveLink(item.href) && (
                                            <div className="bg-primary ml-auto h-1.5 w-1.5 rounded-full" />
                                        )}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>

                    <Separator className="opacity-50" />

                    <div className="space-y-2">
                        <p className="text-muted-foreground mb-3 px-3 text-xs font-semibold tracking-wider uppercase">
                            System
                        </p>
                        <nav className="grid gap-1.5 px-2">
                            {additionalNavItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                                        isActiveLink(item.href)
                                            ? "bg-primary/10 text-primary"
                                            : "text-muted-foreground hover:bg-accent/80 hover:text-foreground"
                                    }`}
                                >
                                    {item.icon && (
                                        <item.icon
                                            className={`h-4 w-4 transition-colors ${
                                                isActiveLink(item.href)
                                                    ? "text-primary"
                                                    : "text-muted-foreground group-hover:text-foreground"
                                            }`}
                                        />
                                    )}
                                    <span>{item.name}</span>
                                    {isActiveLink(item.href) && (
                                        <div className="bg-primary ml-auto h-1.5 w-1.5 rounded-full" />
                                    )}
                                </Link>
                            ))}
                        </nav>
                    </div>
                </div>
            </ScrollArea>
        </aside>
    );
}
