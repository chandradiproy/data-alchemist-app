// src/components/ExportButton.tsx
"use client";

import * as XLSX from 'xlsx';
import { AppData } from '../lib/types';
import { Button } from './ui/button';
import { Download } from 'lucide-react';

interface ExportButtonProps {
    appData: AppData;
    priorities: Record<string, number>;
    disabled: boolean;
}

export function ExportButton({ appData, priorities, disabled }: ExportButtonProps) {

    const handleExport = () => {
        try {
            // 1. Prepare rules.json
            const rulesConfig = {
                rules: appData.rules,
                prioritization: priorities,
            };
            const rulesJsonString = JSON.stringify(rulesConfig, null, 2);
            const rulesBlob = new Blob([rulesJsonString], { type: 'application/json' });
            downloadBlob(rulesBlob, 'rules.json');

            // 2. Prepare cleaned data files (CSV)
            // *** THE FIX IS HERE ***
            // We now pre-process the data to convert arrays to strings for CSV compatibility.
            const prepareForCsv = (data: any[]) => {
                return data.map(row => {
                    const newRow = { ...row };
                    // Remove the 'errors' property which shouldn't be in the export
                    delete newRow.errors;

                    for (const key in newRow) {
                        if (Array.isArray(newRow[key])) {
                            newRow[key] = newRow[key].join(',');
                        }
                         if (typeof newRow[key] === 'object' && newRow[key] !== null) {
                            // Handle the special case for malformed JSON
                            if (newRow[key].error) {
                                newRow[key] = newRow[key].originalValue;
                            } else {
                                newRow[key] = JSON.stringify(newRow[key]);
                            }
                        }
                    }
                    return newRow;
                });
            };

            downloadCsv(prepareForCsv(appData.clients), 'clients_cleaned.csv');
            downloadCsv(prepareForCsv(appData.workers), 'workers_cleaned.csv');
            downloadCsv(prepareForCsv(appData.tasks), 'tasks_cleaned.csv');

        } catch (error) {
            console.error("Export failed:", error);
            alert("An error occurred during the export process.");
        }
    };

    const downloadCsv = (data: any[], fileName: string) => {
        if (data.length === 0) return;
        const ws = XLSX.utils.json_to_sheet(data);
        const csvString = XLSX.utils.sheet_to_csv(ws);
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        downloadBlob(blob, fileName);
    };

    const downloadBlob = (blob: Blob, fileName: string) => {
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Button onClick={handleExport} disabled={disabled} size="lg">
            <Download className="mr-2 h-5 w-5" />
            Export Config & Data
        </Button>
    );
}
