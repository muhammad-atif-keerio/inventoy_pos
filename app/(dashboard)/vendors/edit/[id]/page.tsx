"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Building2, ChevronLeft, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

import { VendorItem } from "../../columns";

// Define the form schema with validation
const formSchema = z.object({
    name: z.string().min(3, "Vendor name must be at least 3 characters"),
    contact: z
        .string()
        .min(5, "Contact information is too short")
        .max(20, "Contact information is too long"),
    email: z
        .string()
        .email("Invalid email format")
        .optional()
        .or(z.literal("")),
    address: z
        .string()
        .max(200, "Address must be less than 200 characters")
        .optional()
        .or(z.literal("")),
    city: z
        .string()
        .max(50, "City must be less than 50 characters")
        .optional()
        .or(z.literal("")),
    notes: z
        .string()
        .max(500, "Notes must be less than 500 characters")
        .optional()
        .or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

export default function EditVendorPage() {
    const router = useRouter();
    const params = useParams();
    const vendorId = params.id as string;

    const [vendor, setVendor] = useState<VendorItem | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initialize form
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            contact: "",
            email: "",
            address: "",
            city: "",
            notes: "",
        },
    });

    // Fetch vendor data
    useEffect(() => {
        async function fetchVendor() {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch(`/api/vendors/${vendorId}`);

                if (!response.ok) {
                    throw new Error("Failed to fetch vendor data");
                }

                const vendorData = await response.json();
                setVendor(vendorData);

                // Set form values
                form.reset({
                    name: vendorData.name || "",
                    contact: vendorData.contact || "",
                    email: vendorData.email || "",
                    address: vendorData.address || "",
                    city: vendorData.city || "",
                    notes: vendorData.notes || "",
                });
            } catch (error) {
                console.error("Error fetching vendor:", error);
                setError("Failed to load vendor data. Please try again.");
                toast.error("Failed to load vendor data");
            } finally {
                setIsLoading(false);
            }
        }

        if (vendorId) {
            fetchVendor();
        }
    }, [vendorId, form, router]);

    // Form submission handler
    const onSubmit = async (data: FormValues) => {
        setIsSubmitting(true);

        try {
            // Call API to update the vendor
            const response = await fetch(`/api/vendors/${vendorId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to update vendor");
            }

            toast.success("Vendor updated successfully");

            // Navigate back to the vendor details page
            router.push(`/vendors/${vendorId}`);
        } catch (error) {
            console.error("Error updating vendor:", error);
            if (error instanceof Error) {
                toast.error(error.message);
            } else {
                toast.error("Failed to update vendor");
            }
            setIsSubmitting(false);
        }
    };

    // Navigation
    const handleCancel = () => {
        router.back();
    };

    return (
        <div className="container max-w-5xl space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        onClick={handleCancel}
                        size="icon"
                        className="h-8 w-8"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {isLoading ? (
                        <Skeleton className="h-8 w-40" />
                    ) : (
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Edit Vendor: {vendor?.name}
                        </h1>
                    )}
                </div>
            </div>

            <Separator />

            {error ? (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    <div className="flex items-center gap-2">
                        <Building2 className="text-muted-foreground h-5 w-5" />
                        <h2 className="text-lg font-medium">
                            Vendor Information
                        </h2>
                    </div>

                    {isLoading ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full md:col-span-2" />
                            </div>
                            <Separator />
                            <Skeleton className="h-32 w-full" />
                        </div>
                    ) : (
                        <Form {...form}>
                            <form
                                onSubmit={form.handleSubmit(onSubmit)}
                                className="space-y-6"
                            >
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Vendor Name{" "}
                                                    <span className="text-destructive">
                                                        *
                                                    </span>
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Enter vendor name"
                                                        {...field}
                                                        autoComplete="organization"
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Name of the thread or fabric
                                                    supplier
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="contact"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Contact Number{" "}
                                                    <span className="text-destructive">
                                                        *
                                                    </span>
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Enter contact number"
                                                        {...field}
                                                        autoComplete="tel"
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Primary contact number for
                                                    orders
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Email Address
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="company@example.com"
                                                        type="email"
                                                        {...field}
                                                        autoComplete="email"
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Email for purchase orders
                                                    and inquiries
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="city"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>City</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Enter city"
                                                        {...field}
                                                        autoComplete="address-level2"
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    City where the vendor is
                                                    located
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="md:col-span-2">
                                        <FormField
                                            control={form.control}
                                            name="address"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>
                                                        Address
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="Enter full address"
                                                            {...field}
                                                            autoComplete="street-address"
                                                        />
                                                    </FormControl>
                                                    <FormDescription>
                                                        Physical address of the
                                                        vendor
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>

                                <Separator className="my-6" />

                                <FormField
                                    control={form.control}
                                    name="notes"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                Additional Notes
                                            </FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Enter additional information about thread types, quality, pricing, etc."
                                                    className="min-h-[120px]"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Any additional information about
                                                this vendor
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="flex items-center justify-end gap-3 pt-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleCancel}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting && (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        )}
                                        {isSubmitting
                                            ? "Saving Changes..."
                                            : "Update Vendor"}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    )}
                </div>
            )}
        </div>
    );
}
