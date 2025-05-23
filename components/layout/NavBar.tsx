"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

import { UserButton } from "@clerk/nextjs";
import { Menu } from "lucide-react";

import { ModeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

import MobileSidebar from "./MobileSidebar";
import { mainNavItems } from "./navItems";

export default function NavBar() {
    const pathName = usePathname();
    // Ensure pathname is always a string for isActiveLink function
    const pathname = typeof pathName === "string" ? pathName : "";

    const isActiveLink = (href: string) => {
        return pathname === href || pathname.startsWith(`${href}/`);
    };

    return (
        <header className="from-background to-background/80 sticky top-0 z-40 border-b bg-gradient-to-r backdrop-blur-sm">
            <div className="flex h-16 items-center justify-between px-4">
                <div className="flex items-center gap-3">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="hover:bg-primary/10 md:hidden"
                            >
                                <Menu className="h-5 w-5" />
                                <span className="sr-only">Toggle menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-64 p-0">
                            <MobileSidebar pathname={pathname} />
                        </SheetContent>
                    </Sheet>

                    <Link
                        href="/dashboard"
                        className="flex items-center gap-2 transition-transform hover:scale-[1.02]"
                    >
                        <span className="from-primary to-primary/80 bg-gradient-to-r bg-clip-text text-xl font-bold text-transparent">
                            Raheel Fabrics
                        </span>
                    </Link>
                </div>

                <nav className="hidden items-center gap-1 md:flex">
                    {mainNavItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`hover:bg-primary/10 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                                isActiveLink(item.href)
                                    ? "text-primary bg-primary/5"
                                    : "text-muted-foreground"
                            }`}
                        >
                            {item.name}
                        </Link>
                    ))}
                </nav>

                <div className="flex items-center gap-3">
                    <ModeToggle />
                    <UserButton afterSignOutUrl="/" />
                </div>
            </div>
        </header>
    );
}
