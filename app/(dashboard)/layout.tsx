"use client";

import React from "react";

import NavBar from "@/components/layout/NavBar";
import Sidebar from "@/components/layout/Sidebar";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="flex min-h-screen flex-col">
            <NavBar />
            <div className="flex flex-1">
                <Sidebar />
                <main className="flex-1">{children}</main>
            </div>
        </div>
    );
};

export default DashboardLayout;
