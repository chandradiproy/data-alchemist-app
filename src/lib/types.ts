// src/lib/types.ts

// Represents a single validation error associated with a row and field.
export interface ValidationError {
  rowId: string | number;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

// --- NEW: Represents an AI-suggested fix for a validation error ---
export interface Correction {
  rowId: string | number;
  entityType: EntityType;
  field: string;
  newValue: string | number | any[];
  reason: string; // AI's explanation for the fix
}

// Base interface for any data entity row.
export interface DataRow {
  id: string | number;
  [key: string]: any;
  errors?: Omit<ValidationError, 'rowId'>[];
}

// --- Data Entity Interfaces ---
export interface Client extends DataRow {
  ClientID: string;
  ClientName: string;
  PriorityLevel: number;
  RequestedTaskIDs: string[];
  GroupTag: string;
  AttributesJSON: Record<string, any>;
}

export interface Worker extends DataRow {
  WorkerID: string;
  WorkerName: string;
  Skills: string[];
  AvailableSlots: number[];
  MaxLoadPerPhase: number;
  WorkerGroup: string;
  QualificationLevel: number;
}

export interface Task extends DataRow {
  TaskID: string;
  TaskName:string;
  Category: string;
  Duration: number;
  RequiredSkills: string[];
  PreferredPhases: number[];
  MaxConcurrent: number;
}

// --- Rule and Configuration Interfaces ---
export type RuleType = 'coRun' | 'slotRestriction' | 'loadLimit' | 'phaseWindow' | 'patternMatch';

export interface BaseRule {
  id: string;
  type: RuleType;
  description: string;
}

export interface CoRunRule extends BaseRule {
  type: 'coRun';
  taskIds: string[];
}

export interface SlotRestrictionRule extends BaseRule {
  type: 'slotRestriction';
  targetGroup: 'ClientGroup' | 'WorkerGroup';
  groupTag: string;
  minCommonSlots: number;
}

export interface LoadLimitRule extends BaseRule {
  type: 'loadLimit';
  workerGroup: string;
  maxSlotsPerPhase: number;
}

export interface PhaseWindowRule extends BaseRule {
  type: 'phaseWindow';
  taskId: string;
  allowedPhases: number[];
}

export interface PatternMatchRule extends BaseRule {
    type: 'patternMatch';
    pattern: string;
    ruleTemplate: string;
    parameters: Record<string, any>;
}

export type BusinessRule = CoRunRule | SlotRestrictionRule | LoadLimitRule | PhaseWindowRule | PatternMatchRule;

export interface ExportConfig {
  rules: BusinessRule[];
  prioritization: { [key: string]: number; };
}

export interface AppData {
  clients: Client[];
  workers: Worker[];
  tasks: Task[];
  rules: BusinessRule[];
  validationErrors: ValidationError[];
}

export type EntityType = 'clients' | 'workers' | 'tasks';

export interface Rule extends BaseRule {
    [key: string]: any;
}
