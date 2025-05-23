"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, ChevronLeft, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

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
import { Textarea } from "@/components/ui/textarea";

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
        .optional(),
    city: z.string().max(50, "City must be less than 50 characters").optional(),
    notes: z
        .string()
        .max(500, "Notes must be less than 500 characters")
        .optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function AddVendorPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    // Form submission handler
    const onSubmit = async (data: FormValues) => {
        setIsSubmitting(true);

        try {
            // Call API to add a new vendor
            const response = await fetch("/api/vendors", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to add vendor");
            }

            // Get the created vendor data
            const responseData = await response.json();

            // Show success message
            toast.success("Vendor added successfully");

            // The API returns the vendor in a nested 'vendor' property
            if (responseData && responseData.vendor && responseData.vendor.id) {
                // Navigate to the new vendor's page
                router.push(`/vendors/${responseData.vendor.id}`);
            } else {
                console.error("No vendor ID returned from API:", responseData);
                toast.error("Vendor created but couldn't load details");
                router.push("/vendors"); // Fallback to vendors list
            }
        } catch (error) {
            console.error("Error adding vendor:", error);
            if (error instanceof Error) {
                toast.error(error.message);
            } else {
                toast.error("Failed to add vendor");
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
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Add New Vendor
                    </h1>
                </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 gap-6">
                <div className="flex items-center gap-2">
                    <Building2 className="text-muted-foreground h-5 w-5" />
                    <h2 className="text-lg font-medium">Vendor Information</h2>
                </div>

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
                                            Primary contact number for orders
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
                                        <FormLabel>Email Address</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="company@example.com"
                                                type="email"
                                                {...field}
                                                autoComplete="email"
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Email for purchase orders and
                                            inquiries
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
                                            City where the vendor is located
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
                                            <FormLabel>Address</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Enter full address"
                                                    {...field}
                                                    autoComplete="street-address"
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Physical address of the vendor
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
                                    <FormLabel>Additional Notes</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Enter additional information about thread types, quality, pricing, etc."
                                            className="min-h-[120px]"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Any additional information about this
                                        vendor
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
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                {isSubmitting ? "Creating..." : "Add Vendor"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </div>
        </div>
    );
}
