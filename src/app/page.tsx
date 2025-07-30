// src/app/page.tsx
"use client";

import { useState, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { AppData, BusinessRule, EntityType, Client, Worker, Task, Correction } from '../lib/types';
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
import { AiAssistant } from '../components/AiAssistant';

const initialAppData = {
  clients: [] as Client[],
  workers: [] as Worker[],
  tasks: [] as Task[],
  rules: [] as BusinessRule[],
};

const initialPriorities = { PriorityLevel: 75, RequestedTaskIds: 50, Fairness: 25 };

export default function Home() {
  const [appData, setAppData] = useState<Omit<AppData, 'validationErrors'>>(initialAppData);
  const [priorities, setPriorities] = useState<Record<string, number>>(initialPriorities);
  const [isLoading, setIsLoading] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<EntityType>('clients');
  
  const [analysisFindings, setAnalysisFindings] = useState<string[]>([]);
  const [ruleSuggestions, setRuleSuggestions] = useState<BusinessRule[]>([]);
  const [correctionSuggestions, setCorrectionSuggestions] = useState<Correction[]>([]);

  const processedData: AppData = useMemo(() => {
    const fullData = { ...appData, validationErrors: [] };
    const validationErrors = validateAllData(fullData);
    const clientsWithErrors = appData.clients.map(c => ({...c, errors: validationErrors.filter(e => e.rowId === c.ClientID)}));
    const workersWithErrors = appData.workers.map(w => ({...w, errors: validationErrors.filter(e => e.rowId === w.WorkerID)}));
    const tasksWithErrors = appData.tasks.map(t => ({...t, errors: validationErrors.filter(e => e.rowId === t.TaskID)}));
    return { ...appData, clients: clientsWithErrors, workers: workersWithErrors, tasks: tasksWithErrors, validationErrors };
  }, [appData]);

  const handleFileUpload = async (file: File, entityType: EntityType) => {
    if (!file) return;
    setIsLoading(true);
    try {
      const parsedData = await parseFile<Client | Worker | Task>(file);
      setAppData(prev => ({ ...prev, [entityType]: parsedData }));
      toast.success(`${entityType.charAt(0).toUpperCase() + entityType.slice(1)} data loaded!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unknown parsing error.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileClear = (entityType: EntityType) => setAppData(prev => ({ ...prev, [entityType]: [] }));
  const handleRulesChange = (rules: BusinessRule[]) => setAppData(prev => ({ ...prev, rules }));
  const handleAddRule = (rule: BusinessRule) => setAppData(prev => ({ ...prev, rules: [...prev.rules, rule] }));
  const handlePrioritiesChange = (newPriorities: Record<string, number>) => setPriorities(newPriorities);

  const updateData = useCallback((entityType: EntityType, rowIndex: number, columnId: string, value: string) => {
    const parseEditedValue = (key: string, val: string) => {
        const lowerKey = key.toLowerCase();
        if (['prioritylevel', 'maxloadperphase', 'qualificationlevel', 'duration', 'maxconcurrent'].includes(lowerKey)) return parseInt(val, 10) || 0;
        if (['requestedtaskids', 'skills', 'requiredskills'].includes(lowerKey)) return val.split(',').map(item => item.trim()).filter(Boolean);
        if (['availableslots', 'preferredphases'].includes(lowerKey)) return val.split(',').map(item => parseInt(item.trim(), 10)).filter(num => !isNaN(num));
        if (lowerKey === 'attributesjson') { try { return JSON.parse(val); } catch { return { error: 'Invalid JSON', originalValue: val }; } }
        return val;
    };
    setAppData(prev => {
        const updatedEntityData = prev[entityType].map((row, index) => index === rowIndex ? { ...row, [columnId]: parseEditedValue(columnId, value) } : row);
        return { ...prev, [entityType]: updatedEntityData };
    });
  }, []);

  const handleApplyCorrection = useCallback((correction: Correction) => {
    const { entityType, rowId, field, newValue, correctionType } = correction;
    
    setAppData(prev => {
        const entityArray = prev[entityType];
        if (!entityArray) return prev;

        const rowIndex = entityArray.findIndex(row => row.id === rowId);
        if (rowIndex === -1) return prev;

        const updatedEntityArray = entityArray.map((row, index) => {
            if (index === rowIndex) {
                if (correctionType === 'APPEND' && Array.isArray(row[field])) {
                    // FIX: Explicitly type the Set to handle the union array type
                    const existingValues = new Set<string | number>(row[field] as (string | number)[]);
                    const newValues = Array.isArray(newValue) ? newValue : [newValue];
                    
                    newValues.forEach(val => {
                        if (typeof val === 'string' || typeof val === 'number') {
                            existingValues.add(val);
                        }
                    });
                    
                    return { ...row, [field]: Array.from(existingValues) };
                }
                return { ...row, [field]: newValue };
            }
            return row;
        });

        toast.success(`Fix applied to ${field} in row ${rowId}!`);
        return { ...prev, [entityType]: updatedEntityArray };
    });
  }, []);

  const runAiAssistant = async (mode: 'analysis' | 'suggestions' | 'correction') => {
    setIsAiLoading(true);
    toast.loading(`AI ${mode} in progress...`);
    
    let prompt = "";
    const dataContext = {
        counts: { client: appData.clients.length, worker: appData.workers.length, task: appData.tasks.length, rule: appData.rules.length },
        skillDistribution: (() => {
            const skillCount = new Map<string, number>();
            appData.workers.forEach(w => w.Skills.forEach(s => skillCount.set(s, (skillCount.get(s) || 0) + 1)));
            return Object.fromEntries(skillCount);
        })(),
        priorityDistribution: Object.fromEntries(appData.clients.map(c => [c.PriorityLevel, (appData.clients.filter(cl => cl.PriorityLevel === c.PriorityLevel).length)]).sort()),
        activeRules: appData.rules.map(r => r.description),
    };

    if (mode === 'analysis') {
        setAnalysisFindings([]);
        prompt = `You are an expert data analyst... Respond ONLY with the raw JSON array.`;
    } else if (mode === 'suggestions') {
        setRuleSuggestions([]);
        prompt = `You are an expert rule recommender... Respond ONLY with the raw JSON array.`;
    } else if (mode === 'correction') {
        setCorrectionSuggestions([]);
        const errorsToFix = processedData.validationErrors.slice(0, 5);
        if (errorsToFix.length === 0) {
            toast.dismiss();
            toast.success("No errors to fix!");
            setIsAiLoading(false);
            return;
        }
        prompt = `
            You are an expert data correction assistant. Given a list of validation errors, provide a structured JSON object with a suggested fix for each.
            Errors: ${JSON.stringify(errorsToFix)}
            For each error, find the corresponding entity type ('clients', 'workers', or 'tasks') based on the rowId prefix (C, W, or T).
            
            Determine if the fix should REPLACE the value or APPEND to an existing array.
            - Use 'APPEND' for list-based fields like 'RequiredSkills' when a value is missing.
            - Use 'REPLACE' for single-value fields like 'PriorityLevel' or for malformed data.
            
            Return a JSON array of correction objects with this schema: { "rowId": string, "entityType": string, "field": string, "newValue": any, "reason": string, "correctionType": "REPLACE" | "APPEND" }.
            Example for APPEND: [{"rowId": "T41", "entityType": "tasks", "field": "RequiredSkills", "newValue": ["writing"], "reason": "Add missing skill.", "correctionType": "APPEND"}]
            Example for REPLACE: [{"rowId": "C1", "entityType": "clients", "field": "PriorityLevel", "newValue": 5, "reason": "Priority must be 1-5.", "correctionType": "REPLACE"}]
            Respond ONLY with the raw JSON array.
        `;
    }

    try {
      const response = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
      if (!response.ok) throw new Error("AI request failed.");
      const result = await response.json();
      
      const match = result.text.match(/(\[.*\]|\{.*\})/s);
      if (!match) {
        throw new Error("AI response did not contain valid JSON.");
      }
      const jsonString = match[0];
      const parsedResult = JSON.parse(jsonString);

      if (mode === 'analysis') setAnalysisFindings(parsedResult);
      else if (mode === 'suggestions') setRuleSuggestions(parsedResult);
      else if (mode === 'correction') setCorrectionSuggestions(parsedResult);
      
      toast.dismiss();
      toast.success(`AI ${mode} complete!`);
    } catch (error) {
      console.error("AI Parsing Error:", error);
      toast.dismiss();
      toast.error(`Failed to get or parse AI ${mode}.`);
    } finally {
      setIsAiLoading(false);
    }
  };
  
  const hasAnyData = appData.clients.length > 0 || appData.workers.length > 0 || appData.tasks.length > 0;

  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12 bg-slate-50 font-sans">
      <div className="w-full max-w-7xl space-y-10">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div className="mb-4 sm:mb-0">
                <h1 className="text-4xl font-bold text-slate-800 tracking-tight">Data Alchemist</h1>
                <p className="text-slate-500 mt-1">Forge your raw data into a perfectly configured resource plan.</p>
            </div>
            <div className="flex items-center gap-4">
                <ValidationSummary errors={processedData.validationErrors} />
                <ExportButton appData={processedData} priorities={priorities} disabled={!hasAnyData} />
            </div>
        </header>

        <section>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FileUploadCard entityType="clients" onFileUpload={handleFileUpload} onFileClear={handleFileClear} fileData={appData.clients} isLoading={isLoading} />
                <FileUploadCard entityType="workers" onFileUpload={handleFileUpload} onFileClear={handleFileClear} fileData={appData.workers} isLoading={isLoading} />
                <FileUploadCard entityType="tasks" onFileUpload={handleFileUpload} onFileClear={handleFileClear} fileData={appData.tasks} isLoading={isLoading} />
            </div>
        </section>

        {hasAnyData && (
            <section>
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as EntityType)} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="clients" disabled={appData.clients.length === 0}><Users className="mr-2 h-4 w-4" /> Clients ({appData.clients.length})</TabsTrigger>
                        <TabsTrigger value="workers" disabled={appData.workers.length === 0}><Briefcase className="mr-2 h-4 w-4" /> Workers ({appData.workers.length})</TabsTrigger>
                        <TabsTrigger value="tasks" disabled={appData.tasks.length === 0}><ListChecks className="mr-2 h-4 w-4" /> Tasks ({appData.tasks.length})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="clients"><DataTable columns={getColumns('clients')} data={processedData.clients} meta={{ updateData: (rowIndex, columnId, value) => updateData('clients', rowIndex, columnId, value) }} /></TabsContent>
                    <TabsContent value="workers"><DataTable columns={getColumns('workers')} data={processedData.workers} meta={{ updateData: (rowIndex, columnId, value) => updateData('workers', rowIndex, columnId, value) }}/></TabsContent>
                    <TabsContent value="tasks"><DataTable columns={getColumns('tasks')} data={processedData.tasks} meta={{ updateData: (rowIndex, columnId, value) => updateData('tasks', rowIndex, columnId, value) }}/></TabsContent>
                </Tabs>
            </section>
        )}

        {hasAnyData && (
            <section className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3"><RuleBuilder appData={processedData} onRulesChange={handleRulesChange} /></div>
                <div className="lg:col-span-2"><PrioritizationEditor priorities={priorities} onPrioritiesChange={handlePrioritiesChange} /></div>
            </section>
        )}

        {hasAnyData && (
            <section>
                <AiAssistant 
                    onRunAssistant={runAiAssistant}
                    analysisFindings={analysisFindings}
                    ruleSuggestions={ruleSuggestions}
                    correctionSuggestions={correctionSuggestions}
                    validationErrors={processedData.validationErrors}
                    onAddRule={handleAddRule}
                    onApplyCorrection={handleApplyCorrection}
                    isLoading={isAiLoading}
                />
            </section>
        )}
      </div>
    </main>
  );
}
