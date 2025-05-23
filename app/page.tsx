"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { SignedIn, SignedOut, useAuth } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomeClientComponent() {
    const router = useRouter();
    const { isSignedIn, isLoaded } = useAuth();

    // Redirect to dashboard if authenticated
    useEffect(() => {
        if (isLoaded && isSignedIn) {
            router.push("/dashboard/");
        }
    }, [isLoaded, isSignedIn, router]);

    return (
        <div className="bg-background flex h-screen w-screen items-center justify-center p-4">
            <Card className="max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl">
                        Raheel Fabrics - Inventory Management
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center space-y-4">
                    <p className="text-muted-foreground text-center">
                        Welcome to the inventory management system. Please
                        proceed to the dashboard.
                    </p>
                    <div className="flex justify-center gap-4">
                        <SignedOut>
                            <Link href="/sign-in">
                                <Button variant="outline">Sign In</Button>
                            </Link>
                        </SignedOut>
                        <SignedIn>
                            <Link href="/dashboard/">
                                <Button>Go to Dashboard</Button>
                            </Link>
                        </SignedIn>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
