// src/lib/parsers.ts

import * as XLSX from 'xlsx';
import { Client, Worker, Task, EntityType } from './types';

// --- Type Guards to check the structure of parsed objects ---

function isClient(obj: any): obj is Client {
    return 'ClientID' in obj && 'ClientName' in obj && 'PriorityLevel' in obj;
}

function isWorker(obj: any): obj is Worker {
    return 'WorkerID' in obj && 'WorkerName' in obj && 'Skills' in obj;
}

function isTask(obj: any): obj is Task {
    return 'TaskID' in obj && 'TaskName' in obj && 'Duration' in obj;
}

/**
 * Parses raw cell values into appropriate JavaScript types.
 * Handles comma-separated strings for arrays and JSON strings.
 * @param {string} key - The header key for the value.
 * @param {any} value - The raw value from the cell.
 * @returns {any} The parsed value.
 */
function parseValue(key: string, value: any): any {
    const lowerKey = key.toLowerCase().replace(/[^a-z0-9]/gi, '');
    if (typeof value !== 'string') return value;

    // Keys that should be parsed as arrays of strings
    const stringArrayKeys = ['requestedtaskids', 'skills', 'requiredskills'];
    if (stringArrayKeys.includes(lowerKey)) {
        return value.split(',').map(item => item.trim()).filter(Boolean);
    }

    // Keys that should be parsed as arrays of numbers
    const numberArrayKeys = ['availableslots', 'preferredphases'];
    if (numberArrayKeys.includes(lowerKey)) {
        try {
            // Handles both "[1,2,3]" and "1,2,3" formats
            const cleaned = value.replace(/[\[\]]/g, '');
            return cleaned.split(',').map(item => parseInt(item.trim(), 10)).filter(num => !isNaN(num));
        } catch {
            return []; // Return empty array if parsing fails
        }
    }
    
    // Keys that are JSON strings
    if (lowerKey === 'attributesjson') {
        try {
            // If it's already a valid JSON string from a previous edit, don't re-parse
            if (typeof JSON.parse(value) === 'object') {
                 return JSON.parse(value);
            }
        } catch {
            // This is the key change: return an object with the original bad value
            return { error: 'Invalid JSON format', originalValue: value };
        }
    }

    return value;
}


/**
 * Parses an uploaded CSV or XLSX file.
 * @param {File} file - The file to parse.
 * @returns {Promise<T[]>} A promise that resolves to an array of parsed objects.
 * @template T - The expected type of the parsed objects (Client, Worker, or Task).
 */
export async function parseFile<T>(file: File): Promise<T[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e: ProgressEvent<FileReader>) => {
            try {
                if (!e.target?.result) {
                    return reject(new Error("Failed to read file."));
                }
                const data = e.target.result;
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                
                const json = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { raw: false, defval: "" });

                const parsedData = json.map(row => {
                    const newRow: { [key: string]: any } = {};
                    for (const key in row) {
                        newRow[key] = parseValue(key, row[key]);
                    }
                    newRow.id = newRow.ClientID || newRow.WorkerID || newRow.TaskID || Math.random();
                    return newRow as T;
                });

                resolve(parsedData);

            } catch (error) {
                console.error("Error parsing file:", error);
                reject(new Error("The file is corrupted or in an unsupported format."));
            }
        };

        reader.onerror = (error) => {
            console.error("FileReader error:", error);
            reject(new Error("An error occurred while reading the file."));
        };

        reader.readAsArrayBuffer(file);
    });
}

/**
 * Determines the entity type based on the headers of the parsed data.
 * @param {any[]} data - The parsed data array.
 * @returns {EntityType | null} The determined entity type or null if not identifiable.
 */
export function identifyEntityType(data: any[]): EntityType | null {
    if (!data || data.length === 0) return null;
    const firstItem = data[0];
    if (isClient(firstItem)) return 'clients';
    if (isWorker(firstItem)) return 'workers';
    if (isTask(firstItem)) return 'tasks';
    return null;
}
