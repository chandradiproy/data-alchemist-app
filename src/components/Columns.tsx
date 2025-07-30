// src/components/Columns.tsx
"use client";

import { useState, useEffect } from 'react';
import { ColumnDef } from "@tanstack/react-table";
import { Client, Worker, Task, EntityType, DataRow } from "../lib/types";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { AlertTriangle } from "lucide-react";
import { cn } from "../lib/utils";
import { Input } from './ui/input';

// A generic cell component that wraps content with an error tooltip if needed
const CellWithTooltip = ({ row, cellKey, table }: { row: { original: DataRow, index: number }, cellKey: string, table: any }) => {
    const rawValue = row.original[cellKey];
    const error = row.original.errors?.find(e => e.field.toLowerCase() === cellKey.toLowerCase());

    // This is the key change for your suggestion #2
    let displayValue;
    if (cellKey === 'AttributesJSON' && rawValue?.error) {
        displayValue = rawValue.originalValue; // Show the original bad string
    } else if (Array.isArray(rawValue)) {
        displayValue = rawValue.join(', ');
    } else if (typeof rawValue === 'object' && rawValue !== null) {
        displayValue = JSON.stringify(rawValue);
    } else {
        displayValue = String(rawValue);
    }

    const [isEditing, setIsEditing] = useState(false);
    const [currentValue, setCurrentValue] = useState(displayValue);

    useEffect(() => {
        // Update internal state if the external data changes
        setCurrentValue(displayValue);
    }, [displayValue]);

    const handleDoubleClick = () => {
        setIsEditing(true);
    };

    const handleBlur = () => {
        setIsEditing(false);
        table.options.meta?.updateData(row.index, cellKey, currentValue);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCurrentValue(e.target.value);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleBlur();
        } else if (e.key === 'Escape') {
            setCurrentValue(displayValue); // Revert changes
            setIsEditing(false);
        }
    };

    const cellContent = isEditing ? (
        <Input
            value={currentValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            autoFocus
            className="w-full h-full p-1 -m-1 border-blue-500 ring-1 ring-blue-500 bg-white"
        />
    ) : (
        <div onDoubleClick={handleDoubleClick} className="truncate w-full h-full p-1 -m-1 cursor-pointer">
            {displayValue}
        </div>
    );

    if (error) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className={cn(
                        "flex items-center gap-2 rounded",
                        { "bg-red-100": error.severity === 'error' },
                        { "bg-amber-100": error.severity === 'warning' }
                    )}>
                        <div className="flex-grow">{cellContent}</div>
                        <AlertTriangle className={cn(
                            "h-4 w-4 flex-shrink-0",
                             { "text-red-600": error.severity === 'error' },
                             { "text-amber-600": error.severity === 'warning' }
                        )} />
                    </div>
                </TooltipTrigger>
                <TooltipContent className={cn(
                     { "border-red-300 bg-red-50 text-red-900": error.severity === 'error' },
                     { "border-amber-300 bg-amber-50 text-amber-900": error.severity === 'warning' }
                )}>
                    <p>{error.message}</p>
                </TooltipContent>
            </Tooltip>
        );
    }

    return <div onDoubleClick={handleDoubleClick} className="w-full">{cellContent}</div>;
};


// --- Column Definitions ---

const clientColumns: ColumnDef<Client>[] = [
    { accessorKey: "ClientID", header: "Client ID", cell: (props) => <CellWithTooltip row={props.row} cellKey="ClientID" table={props.table} /> },
    { accessorKey: "ClientName", header: "Name", cell: (props) => <CellWithTooltip row={props.row} cellKey="ClientName" table={props.table} /> },
    { accessorKey: "PriorityLevel", header: "Priority", cell: (props) => <CellWithTooltip row={props.row} cellKey="PriorityLevel" table={props.table} /> },
    { accessorKey: "RequestedTaskIDs", header: "Requested Tasks", cell: (props) => <CellWithTooltip row={props.row} cellKey="RequestedTaskIDs" table={props.table} /> },
    { accessorKey: "GroupTag", header: "Group", cell: (props) => <CellWithTooltip row={props.row} cellKey="GroupTag" table={props.table} /> },
    { accessorKey: "AttributesJSON", header: "Attributes", cell: (props) => <CellWithTooltip row={props.row} cellKey="AttributesJSON" table={props.table} /> },
];

const workerColumns: ColumnDef<Worker>[] = [
    { accessorKey: "WorkerID", header: "Worker ID", cell: (props) => <CellWithTooltip row={props.row} cellKey="WorkerID" table={props.table} /> },
    { accessorKey: "WorkerName", header: "Name", cell: (props) => <CellWithTooltip row={props.row} cellKey="WorkerName" table={props.table} /> },
    { accessorKey: "Skills", header: "Skills", cell: (props) => <CellWithTooltip row={props.row} cellKey="Skills" table={props.table} /> },
    { accessorKey: "AvailableSlots", header: "Available Slots", cell: (props) => <CellWithTooltip row={props.row} cellKey="AvailableSlots" table={props.table} /> },
    { accessorKey: "MaxLoadPerPhase", header: "Max Load", cell: (props) => <CellWithTooltip row={props.row} cellKey="MaxLoadPerPhase" table={props.table} /> },
    { accessorKey: "WorkerGroup", header: "Group", cell: (props) => <CellWithTooltip row={props.row} cellKey="WorkerGroup" table={props.table} /> },
    { accessorKey: "QualificationLevel", header: "Qualification", cell: (props) => <CellWithTooltip row={props.row} cellKey="QualificationLevel" table={props.table} /> },
];

const taskColumns: ColumnDef<Task>[] = [
    { accessorKey: "TaskID", header: "Task ID", cell: (props) => <CellWithTooltip row={props.row} cellKey="TaskID" table={props.table} /> },
    { accessorKey: "TaskName", header: "Name", cell: (props) => <CellWithTooltip row={props.row} cellKey="TaskName" table={props.table} /> },
    { accessorKey: "Category", header: "Category", cell: (props) => <CellWithTooltip row={props.row} cellKey="Category" table={props.table} /> },
    { accessorKey: "Duration", header: "Duration", cell: (props) => <CellWithTooltip row={props.row} cellKey="Duration" table={props.table} /> },
    { accessorKey: "RequiredSkills", header: "Required Skills", cell: (props) => <CellWithTooltip row={props.row} cellKey="RequiredSkills" table={props.table} /> },
    { accessorKey: "PreferredPhases", header: "Preferred Phases", cell: (props) => <CellWithTooltip row={props.row} cellKey="PreferredPhases" table={props.table} /> },
    { accessorKey: "MaxConcurrent", header: "Max Concurrent", cell: (props) => <CellWithTooltip row={props.row} cellKey="MaxConcurrent" table={props.table} /> },
];

// Helper function to get the correct column definitions based on the entity type
export function getColumns(entityType: EntityType): ColumnDef<any>[] {
    switch (entityType) {
        case 'clients':
            return clientColumns;
        case 'workers':
            return workerColumns;
        case 'tasks':
            return taskColumns;
        default:
            return [];
    }
}
