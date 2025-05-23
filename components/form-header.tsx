import { useRouter } from "next/navigation";

import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

interface FormHeaderProps {
    title: string;
    subtitle?: string;
    showBackButton?: boolean;
}

export default function FormHeader({
    title,
    subtitle,
    showBackButton = true,
}: FormHeaderProps) {
    const router = useRouter();

    return (
        <div className="mb-6">
            <div className="flex items-center gap-4">
                {showBackButton && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => router.back()}
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Back</span>
                    </Button>
                )}
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="text-muted-foreground">{subtitle}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
