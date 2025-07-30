// src/app/page.tsx
"use client";

import { useState, useMemo, useCallback } from 'react';
import { AppData, BusinessRule, EntityType, Client, Worker, Task } from '../lib/types';
import { parseFile, identifyEntityType } from '../lib/parsers';
import { validateAllData } from '../lib/validators';
import { FileUploadCard } from '../components/ui/FileUploadCard';
import { ValidationSummary } from '../components/ui/ValidationSummary';
import { DataTable } from '../components/DataTable';
import { getColumns } from '../components/Columns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Users, Briefcase, ListChecks } from 'lucide-react';
import { RuleBuilder } from '../components/RuleBuilder';
import { PrioritizationEditor } from '../components/PrioritizationEditor';
import { ExportButton } from '../components/ExportButton';

// Initial empty state for the application data
const initialAppData = {
  clients: [] as Client[],
  workers: [] as Worker[],
  tasks: [] as Task[],
  rules: [] as BusinessRule[],
};

const initialPriorities = {
    PriorityLevel: 75,
    RequestedTaskIds: 50,
    Fairness: 25,
}

export default function Home() {
  const [appData, setAppData] = useState<Omit<AppData, 'validationErrors'>>(initialAppData);
  const [priorities, setPriorities] = useState<Record<string, number>>(initialPriorities);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<EntityType>('clients');

  // Derived State with useMemo
  const processedData = useMemo(() => {
    const fullData = { ...appData, validationErrors: [] };
    const validationErrors = validateAllData(fullData);

    const clientsWithErrors = appData.clients.map(c => ({...c, errors: validationErrors.filter(e => e.rowId === c.ClientID)}));
    const workersWithErrors = appData.workers.map(w => ({...w, errors: validationErrors.filter(e => e.rowId === w.WorkerID)}));
    const tasksWithErrors = appData.tasks.map(t => ({...t, errors: validationErrors.filter(e => e.rowId === t.TaskID)}));

    return {
        clients: clientsWithErrors,
        workers: workersWithErrors,
        tasks: tasksWithErrors,
        validationErrors,
        rules: appData.rules,
    };
  }, [appData]);


  const handleFileUpload = async (file: File, entityType: EntityType) => {
    if (!file) return;
    setIsLoading(true);

    const isFirstUpload = appData.clients.length === 0 && appData.workers.length === 0 && appData.tasks.length === 0;

    try {
      const parsedData = await parseFile<any>(file);
      
      const identifiedType = identifyEntityType(parsedData);
      if (identifiedType && identifiedType !== entityType) {
          alert(`Warning: The file seems to be of type '${identifiedType}' but was uploaded as '${entityType}'. Please check the file content.`);
      }

      setAppData(prev => ({
        ...prev,
        [entityType]: parsedData,
      }));

      if (isFirstUpload) {
        setActiveTab(entityType);
      }

    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "An unknown error occurred during parsing.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileClear = (entityType: EntityType) => {
    setAppData(prev => ({
      ...prev,
      [entityType]: [],
    }));
  };

  const handleRulesChange = (rules: BusinessRule[]) => {
    setAppData(prev => ({ ...prev, rules }));
  };

  const handlePrioritiesChange = (newPriorities: Record<string, number>) => {
    setPriorities(newPriorities);
  };

  // This is the key change to fix the update bug
  const updateData = useCallback((entityType: EntityType, rowIndex: number, columnId: string, value: string) => {
    
    // This function intelligently parses the string back into the correct type
    const parseEditedValue = (key: string, val: string) => {
        const lowerKey = key.toLowerCase();
        
        const numericKeys = ['prioritylevel', 'maxloadperphase', 'qualificationlevel', 'duration', 'maxconcurrent'];
        if (numericKeys.includes(lowerKey)) {
            return parseInt(val, 10) || 0;
        }

        const stringArrayKeys = ['requestedtaskids', 'skills', 'requiredskills'];
        if (stringArrayKeys.includes(lowerKey)) {
            return val.split(',').map(item => item.trim()).filter(Boolean);
        }

        const numberArrayKeys = ['availableslots', 'preferredphases'];
        if (numberArrayKeys.includes(lowerKey)) {
            return val.split(',').map(item => parseInt(item.trim(), 10)).filter(num => !isNaN(num));
        }

        if (lowerKey === 'attributesjson') {
            try {
                return JSON.parse(val);
            } catch {
                return { error: 'Invalid JSON format', originalValue: val };
            }
        }

        return val; // Default to string
    };
    
    setAppData(prev => {
        const updatedEntityData = prev[entityType].map((row, index) => {
            if (index === rowIndex) {
                return {
                    ...row,
                    [columnId]: parseEditedValue(columnId, value),
                };
            }
            return row;
        });

        return {
            ...prev,
            [entityType]: updatedEntityData,
        };
    });
  }, []);
  
  const hasAnyData = appData.clients.length > 0 || appData.workers.length > 0 || appData.tasks.length > 0;
  const hasAllData = appData.clients.length > 0 && appData.workers.length > 0 && appData.tasks.length > 0;

  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12 bg-slate-50 font-sans">
      <div className="w-full max-w-7xl space-y-10">
        {/* Header Section */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-4xl font-bold text-slate-800 tracking-tight">
              Data Alchemist
            </h1>
            <p className="text-slate-500 mt-1">
              Forge your raw data into a perfectly configured resource plan.
            </p>
          </div>
           <div className="flex items-center gap-4">
             <ValidationSummary errors={processedData.validationErrors} />
             <ExportButton appData={processedData} priorities={priorities} disabled={!hasAllData} />
           </div>
        </header>

        {/* File Upload Section */}
        <section>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FileUploadCard
                    entityType="clients"
                    onFileUpload={handleFileUpload}
                    onFileClear={handleFileClear}
                    fileData={appData.clients}
                    isLoading={isLoading}
                />
                <FileUploadCard
                    entityType="workers"
                    onFileUpload={handleFileUpload}
                    onFileClear={handleFileClear}
                    fileData={appData.workers}
                    isLoading={isLoading}
                />
                <FileUploadCard
                    entityType="tasks"
                    onFileUpload={handleFileUpload}
                    onFileClear={handleFileClear}
                    fileData={appData.tasks}
                    isLoading={isLoading}
                />
            </div>
        </section>

        {/* Data Display Section */}
        {hasAnyData && (
            <section>
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as EntityType)} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="clients" disabled={appData.clients.length === 0}>
                            <Users className="mr-2 h-4 w-4" /> Clients ({appData.clients.length})
                        </TabsTrigger>
                        <TabsTrigger value="workers" disabled={appData.workers.length === 0}>
                            <Briefcase className="mr-2 h-4 w-4" /> Workers ({appData.workers.length})
                        </TabsTrigger>
                        <TabsTrigger value="tasks" disabled={appData.tasks.length === 0}>
                            <ListChecks className="mr-2 h-4 w-4" /> Tasks ({appData.tasks.length})
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="clients">
                        <DataTable columns={getColumns('clients')} data={processedData.clients} meta={{ updateData: (rowIndex: number, columnId: string, value: any) => updateData('clients', rowIndex, columnId, value) }} />
                    </TabsContent>
                    <TabsContent value="workers">
                        <DataTable columns={getColumns('workers')} data={processedData.workers} meta={{ updateData: (rowIndex: number, columnId: string, value: any) => updateData('workers', rowIndex, columnId, value) }}/>
                    </TabsContent>
                    <TabsContent value="tasks">
                        <DataTable columns={getColumns('tasks')} data={processedData.tasks} meta={{ updateData: (rowIndex: number, columnId: string, value: any) => updateData('tasks', rowIndex, columnId, value) }}/>
                    </TabsContent>
                </Tabs>
            </section>
        )}

        {/* Rules and Prioritization Section */}
        {hasAnyData && (
            <section className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3">
                    <RuleBuilder appData={processedData} onRulesChange={handleRulesChange} />
                </div>
                <div className="lg:col-span-2">
                    <PrioritizationEditor priorities={priorities} onPrioritiesChange={handlePrioritiesChange} />
                </div>
            </section>
        )}
      </div>
    </main>
  );
}
