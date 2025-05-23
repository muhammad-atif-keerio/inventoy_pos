"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { columns } from "./columns";
import { DataTable } from "./data-table";
import { DyeingAnalytics } from "./dyeing-analytics";
import { DyeingFormDialog } from "./dyeing-form-dialog";

// Client component for the dyeing page
export default function DyeingPage() {
    const triggerButton = (
        <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> Dye New Thread
        </Button>
    );

    const refreshPage = () => {
        window.location.reload();
    };

    return (
        <div className="flex flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <div className="flex items-center justify-between">
                    <Heading
                        title="Thread Dyeing"
                        description="Manage thread dyeing and view fabric inventory metrics"
                    />
                    <DyeingFormDialog
                        triggerButton={triggerButton}
                        onDyeingProcessCreated={refreshPage}
                    />
                </div>

                <Tabs defaultValue="data" className="w-full">
                    <TabsList className="grid w-[400px] grid-cols-2">
                        <TabsTrigger value="data">Data Entry</TabsTrigger>
                        <TabsTrigger value="analytics">
                            Fabric Metrics
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="data" className="space-y-4">
                        <DataTable columns={columns} />
                    </TabsContent>

                    <TabsContent value="analytics">
                        <DyeingAnalytics />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
