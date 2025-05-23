"use client";

import Link from "next/link";
import React from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import { additionalNavItems, mainNavItems } from "./navItems";

interface MobileSidebarProps {
    pathname: string;
}

export default function MobileSidebar({ pathname }: MobileSidebarProps) {
    const isActiveLink = (href: string) => {
        return pathname === href || pathname.startsWith(`${href}/`);
    };

    return (
        <ScrollArea className="h-full py-6">
            <div className="mb-4 px-4">
                <h2 className="text-xl font-bold">Raheel Fabrics</h2>
            </div>
            <Separator />
            <div className="flex flex-col gap-6 p-4">
                <div className="space-y-1">
                    <p className="text-muted-foreground mb-2 text-sm font-medium">
                        Main Navigation
                    </p>
                    <nav className="grid gap-1">
                        {mainNavItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                                    isActiveLink(item.href)
                                        ? "bg-accent text-accent-foreground"
                                        : "hover:bg-accent hover:text-accent-foreground"
                                }`}
                            >
                                {item.name}
                            </Link>
                        ))}
                    </nav>
                </div>

                <Separator />

                {additionalNavItems.length > 0 && (
                    <div className="space-y-1">
                        <p className="text-muted-foreground mb-2 text-sm font-medium">
                            System
                        </p>
                        <nav className="grid gap-1">
                            {additionalNavItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                                        isActiveLink(item.href)
                                            ? "bg-accent text-accent-foreground"
                                            : "hover:bg-accent hover:text-accent-foreground"
                                    }`}
                                >
                                    {item.icon && (
                                        <item.icon className="h-4 w-4" />
                                    )}
                                    {item.name}
                                </Link>
                            ))}
                        </nav>
                    </div>
                )}
            </div>
        </ScrollArea>
    );
}
