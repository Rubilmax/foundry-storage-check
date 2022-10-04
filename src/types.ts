import { ContractDefinition } from "@solidity-parser/parser/src/ast-types";
import { Token } from "@solidity-parser/parser/src/types";

export interface ParsedSource {
  path: string;
  def: ContractDefinition;
  tokens: Token[];
}

export interface StorageVariable {
  astId: number;
  contract: string;
  label: string;
  offset: number;
  slot: string;
  type: string;
}

export interface StorageVariableExact extends Omit<StorageVariable, "slot" | "offset"> {
  parent?: StorageVariableDetails; // populated only once mapping is built
  slot: bigint;
  offset: bigint;
}

export interface StorageVariableType {
  base?: string;
  encoding: string;
  label: string;
  members?: StorageVariable[];
  numberOfBytes: string;
  key?: string;
  value?: string;
}

export interface StorageVariableTypeExact
  extends Omit<StorageVariableType, "members" | "numberOfBytes"> {
  members?: StorageVariableExact[];
  numberOfBytes: bigint;
}

export interface StorageLayoutReport {
  storage: StorageVariable[];
  types: {
    [key: string]: StorageVariableType;
  };
}

export interface StorageLayoutReportExact {
  storage: StorageVariableExact[];
  types: {
    [key: string]: StorageVariableTypeExact;
  };
}

export enum StorageLayoutDiffType {
  LABEL = "LABEL",
  TYPE_REMOVED = "TYPE_REMOVED",
  TYPE_CHANGED = "TYPE_CHANGED",
  VARIABLE = "VARIABLE",
  VARIABLE_TYPE = "VARIABLE_TYPE",
}

export interface StorageLayoutDiffLocation {
  slot: bigint;
  offset: bigint;
}

export interface StorageVariableDetails extends StorageVariableExact {
  fullLabel: string;
  typeLabel: string;
  startByte: bigint;
}

export interface StorageLayoutDiff {
  type: StorageLayoutDiffType;
  location: StorageLayoutDiffLocation;
  src: StorageVariableDetails;
  cmp: StorageVariableDetails;
  parent?: string;
}

export interface FormattedStorageLayoutDiff {
  loc: {
    start: {
      line: number;
      column: number;
    };
    end: {
      line: number;
      column: number;
    };
  };
  type: StorageLayoutDiffType;
  message: string;
}
