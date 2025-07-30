// src/app/page.tsx
"use client";

import { useState, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
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
import { AiAssistant } from '../components/AiAssistant'; // Import the new component

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
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<EntityType>('clients');
  
  // State for the new AI Assistant
  const [analysisFindings, setAnalysisFindings] = useState<string[]>([]);
  const [ruleSuggestions, setRuleSuggestions] = useState<BusinessRule[]>([]);

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
          toast.error(`Warning: File seems to be '${identifiedType}' but uploaded as '${entityType}'.`);
      }
      setAppData(prev => ({ ...prev, [entityType]: parsedData }));
      if (isFirstUpload) setActiveTab(entityType);
      toast.success(`${entityType.charAt(0).toUpperCase() + entityType.slice(1)} data loaded!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unknown parsing error.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileClear = (entityType: EntityType) => {
    setAppData(prev => ({ ...prev, [entityType]: [] }));
  };

  const handleRulesChange = (rules: BusinessRule[]) => {
    setAppData(prev => ({ ...prev, rules }));
  };
  
  const handleAddRule = (rule: BusinessRule) => {
    setAppData(prev => ({ ...prev, rules: [...prev.rules, rule] }));
  }

  const handlePrioritiesChange = (newPriorities: Record<string, number>) => {
    setPriorities(newPriorities);
  };

  const updateData = useCallback((entityType: EntityType, rowIndex: number, columnId: string, value: string) => {
    const parseEditedValue = (key: string, val: string) => {
        const lowerKey = key.toLowerCase();
        if (['prioritylevel', 'maxloadperphase', 'qualificationlevel', 'duration', 'maxconcurrent'].includes(lowerKey)) return parseInt(val, 10) || 0;
        if (['requestedtaskids', 'skills', 'requiredskills'].includes(lowerKey)) return val.split(',').map(item => item.trim()).filter(Boolean);
        if (['availableslots', 'preferredphases'].includes(lowerKey)) return val.split(',').map(item => parseInt(item.trim(), 10)).filter(num => !isNaN(num));
        if (lowerKey === 'attributesjson') { try { return JSON.parse(val); } catch { return { error: 'Invalid JSON', originalValue: val }; } }
        return val;
    };
    setAppData(prev => ({
        ...prev,
        [entityType]: prev[entityType].map((row, index) => index === rowIndex ? { ...row, [columnId]: parseEditedValue(columnId, value) } : row),
    }));
  }, []);

  // --- ENHANCED AI ASSISTANT LOGIC ---
  const runAiAssistant = async (mode: 'analysis' | 'suggestions') => {
    setIsAiLoading(true);
    toast.loading(`AI ${mode === 'analysis' ? 'analysis' : 'suggestions'} in progress...`);

    // Create a more detailed data context for better AI insights
    const getSkillDistribution = () => {
        const skillCount = new Map<string, number>();
        appData.workers.forEach(w => w.Skills.forEach(s => skillCount.set(s, (skillCount.get(s) || 0) + 1)));
        return Object.fromEntries(skillCount);
    };

    const dataContext = {
      counts: { client: appData.clients.length, worker: appData.workers.length, task: appData.tasks.length, rule: appData.rules.length },
      skillDistribution: getSkillDistribution(),
      priorityDistribution: Object.fromEntries(appData.clients.map(c => [c.PriorityLevel, (appData.clients.filter(cl => cl.PriorityLevel === c.PriorityLevel).length)]).sort()),
      activeRules: appData.rules.map(r => r.description),
    };
    
    let prompt = "";
    if (mode === 'analysis') {
        setAnalysisFindings([]);
        prompt = `You are an expert data analyst for a resource allocation system. Analyze the following dataset summary for potential bottlenecks, strategic mismatches, or interesting patterns.
        Data Summary: ${JSON.stringify(dataContext, null, 2)}
        Provide a list of 3-5 bullet points highlighting your most important findings as actionable insights or warnings.
        Return your response as a JSON array of strings. Example: ["Finding 1", "Finding 2"]
        Respond ONLY with the raw JSON array.`;
    } else { // suggestions mode
        setRuleSuggestions([]);
        prompt = `You are an expert rule recommender. Analyze the following data summary and suggest 2-3 new business rules that would improve the configuration.
        Data Summary: ${JSON.stringify(dataContext, null, 2)}
        For each suggestion, provide a JSON object matching one of these schemas:
        1. Co-run: { "type": "coRun", "taskIds": ["T1", "T2"], "description": "Tasks T1 and T2 should run together." }
        2. Slot Restriction: { "type": "slotRestriction", "targetGroup": "WorkerGroup", "groupTag": "GroupA", "minCommonSlots": 1, "description": "Workers in GroupA should have 1 common slot." }
        Return your response as a JSON array of these rule objects. Example: [ { "type": "coRun", ... }, { "type": "slotRestriction", ... } ]
        Respond ONLY with the raw JSON array.`;
    }

    try {
      const response = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
      if (!response.ok) throw new Error("AI request failed.");
      const result = await response.json();
      const parsedResult = JSON.parse(result.text);

      if (mode === 'analysis') {
        setAnalysisFindings(parsedResult);
      } else {
        setRuleSuggestions(parsedResult);
      }
      toast.dismiss();
      toast.success(`AI ${mode} complete!`);
    } catch (error) {
      toast.dismiss();
      toast.error(`Failed to get AI ${mode}.`);
    } finally {
      setIsAiLoading(false);
    }
  };
  
  const hasAnyData = appData.clients.length > 0 || appData.workers.length > 0 || appData.tasks.length > 0;
  const hasAllData = appData.clients.length > 0 && appData.workers.length > 0 && appData.tasks.length > 0;

  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12 bg-slate-50 font-sans">
      <div className="w-full max-w-7xl space-y-10">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <h1 className="text-4xl font-bold text-slate-800 tracking-tight">Data Alchemist</h1>
            <p className="text-slate-500 mt-1">Forge your raw data into a perfectly configured resource plan.</p>
          </div>
           <div className="flex items-center gap-4">
             <ValidationSummary errors={processedData.validationErrors} />
             <ExportButton appData={processedData} priorities={priorities} disabled={!hasAllData} />
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
                    <TabsContent value="clients"><DataTable columns={getColumns('clients')} data={processedData.clients} meta={{ updateData }} /></TabsContent>
                    <TabsContent value="workers"><DataTable columns={getColumns('workers')} data={processedData.workers} meta={{ updateData }}/></TabsContent>
                    <TabsContent value="tasks"><DataTable columns={getColumns('tasks')} data={processedData.tasks} meta={{ updateData }}/></TabsContent>
                </Tabs>
            </section>
        )}

        {hasAnyData && (
            <section className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3"><RuleBuilder appData={processedData} onRulesChange={handleRulesChange} /></div>
                <div className="lg:col-span-2"><PrioritizationEditor priorities={priorities} onPrioritiesChange={handlePrioritiesChange} /></div>
            </section>
        )}

        {/* AI Assistant Section */}
        {hasAnyData && (
            <section>
                <AiAssistant 
                    onRunAssistant={runAiAssistant}
                    analysisFindings={analysisFindings}
                    ruleSuggestions={ruleSuggestions}
                    onAddRule={handleAddRule}
                    isLoading={isAiLoading}
                />
            </section>
        )}
      </div>
    </main>
  );
}
