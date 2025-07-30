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

  // Priority level from 1 (lowest) to 5 (highest).
  PriorityLevel: number;

  // Comma-separated list of TaskIDs the client has requested.
  RequestedTaskIDs: string[];

  // Group tag for applying group-based rules.
  GroupTag: string;

  // A flexible JSON object for any other metadata.
  AttributesJSON: Record<string, any>;
}

export interface Worker extends DataRow {
  WorkerID: string;
  WorkerName: string;

  // List of skills the worker possesses.
  Skills: string[];

  // Array of phase numbers when the worker is available.
  AvailableSlots: number[];

  // Maximum workload the worker can handle in a single phase.
  MaxLoadPerPhase: number;

  // Group tag for the worker.
  WorkerGroup: string;

  // Qualification level of the worker.
  QualificationLevel: number;
}

export interface Task extends DataRow {
  TaskID: string;
  TaskName: string;
  Category: string;

  // The number of phases the task requires to complete.
  Duration: number;

  // List of skills required to perform the task.
  RequiredSkills: string[];

  // List of phase numbers during which the task is preferred to be done.
  PreferredPhases: number[];

  // Maximum number of times this task can be run in parallel.
  MaxConcurrent: number;
}


// --- Rule and Configuration Interfaces ---

export type RuleType = 'coRun' | 'slotRestriction' | 'loadLimit' | 'phaseWindow' | 'patternMatch';

export interface BaseRule {
  id: string; // Unique ID for the rule
  type: RuleType;
  description: string; // User-provided description
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

// Add other rule types as they are defined...

export type BusinessRule = CoRunRule | SlotRestrictionRule | LoadLimitRule; // Union of all rule types

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
