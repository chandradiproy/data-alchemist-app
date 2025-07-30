// src/lib/types.ts

// Represents a single validation error associated with a row and field.
export interface ValidationError {
  rowId: string | number;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

// Base interface for any data entity row.
// Includes the core data and any associated validation errors.
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
  id: string; // Unique ID for the rule
  type: RuleType;
  description: string; // User-provided or generated description
}

export interface CoRunRule extends BaseRule {
  type: 'coRun';
  taskIds: string[]; // Tasks that must run together
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
    pattern: string; // Regex
    ruleTemplate: string;
    parameters: Record<string, any>;
}

// Union of all possible business rule types
export type BusinessRule = CoRunRule | SlotRestrictionRule | LoadLimitRule | PhaseWindowRule | PatternMatchRule;

// Represents the final JSON configuration to be exported.
export interface ExportConfig {
  rules: BusinessRule[];
  prioritization: {
    [key: string]: number; // e.g., { PriorityLevel: 1.5, Fairness: 1.0 }
  };
}

// Represents the state of the entire application data
export interface AppData {
  clients: Client[];
  workers: Worker[];
  tasks: Task[];
  rules: BusinessRule[];
  validationErrors: ValidationError[];
}

// Defines the type of data entity.
export type EntityType = 'clients' | 'workers' | 'tasks';

// A generic Rule type for the UI before it's cast to a specific type
export interface Rule extends BaseRule {
    [key: string]: any;
}
