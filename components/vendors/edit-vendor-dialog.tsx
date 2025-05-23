"use client";

import * as React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";

import { VendorItem } from "@/app/(dashboard)/vendors/columns";
import { VendorContext } from "@/app/(dashboard)/vendors/vendor-context";

// Define the form schema using zod
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

interface EditVendorDialogProps {
    vendor: VendorItem;
    trigger: React.ReactNode;
}

export function EditVendorDialog({ vendor, trigger }: EditVendorDialogProps) {
    const [open, setOpen] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const vendorContext = React.useContext(VendorContext);

    // Initialize form with vendor data
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: vendor.name,
            contact: vendor.contact,
            email: vendor.email || "",
            address: vendor.address || "",
            city: vendor.city || "",
            notes: vendor.notes || "",
        },
    });

    // Update form values when vendor changes or dialog opens
    React.useEffect(() => {
        if (open) {
            form.reset({
                name: vendor.name,
                contact: vendor.contact,
                email: vendor.email || "",
                address: vendor.address || "",
                city: vendor.city || "",
                notes: vendor.notes || "",
            });
        }
    }, [vendor, form, open]);

    // Handle form submission
    const onSubmit = async (data: FormValues) => {
        setIsSubmitting(true);

        const toastId = toast.loading(`Updating ${vendor.name}...`);

        try {
            // Call API to update vendor
            const response = await fetch(`/api/vendors/${vendor.id}`, {
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

            const result = await response.json();
            const updatedVendor = result.vendor;

            // Apply optimistic update
            vendorContext.addOptimisticAction({
                type: "update",
                item: {
                    ...vendor, // Keep existing properties like activeOrders and totalPurchases
                    ...updatedVendor, // Update with the new data from API response
                    createdAt: vendor.createdAt, // Make sure to keep the dates if they're not in the response
                    updatedAt: new Date().toISOString(),
                },
            });

            // Success toast notification
            toast.success("Vendor updated successfully", {
                id: toastId,
                description: `${data.name}'s information has been updated.`,
            });

            // Close dialog
            setOpen(false);

            // Refresh vendor data
            await vendorContext.refreshVendors();
        } catch (error) {
            console.error("Error updating vendor:", error);
            toast.error("Failed to update vendor", {
                id: toastId,
                description:
                    error instanceof Error
                        ? error.message
                        : "An unexpected error occurred",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Edit Vendor</DialogTitle>
                    <DialogDescription>
                        Update the vendor information. Required fields are
                        marked with an asterisk (*).
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-4 py-2"
                    >
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-1">
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
                                        The name of the thread or fabric
                                        supplier company
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
                                    <FormLabel className="flex items-center gap-1">
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
                                        Primary contact number for ordering
                                        materials
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
                                        Email address for sending purchase
                                        orders and inquiries
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notes</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Enter additional information about thread types, quality, pricing, etc."
                                            className="resize-none"
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
                        <DialogFooter className="pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setOpen(false)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    "Save Changes"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
