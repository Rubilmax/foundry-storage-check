export interface StorageVariable {
  astId: number;
  contract: string;
  label: string;
  offset: number;
  slot: string;
  type: string;
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

export interface StorageLayoutReport {
  storage: StorageVariable[];
  types: {
    [key: string]: StorageVariableType;
  };
}

export enum StorageLayoutDiffType {
  LABEL = "LABEL",
  TYPE_REMOVED = "TYPE_REMOVED",
  TYPE_CHANGED = "TYPE_CHANGED",
  SLOT = "SLOT",
  VARIABLE = "VARIABLE",
  VARIABLE_TYPE = "VARIABLE_TYPE",
}

export interface StorageLayoutDiffLocation {
  slot: string;
  offset: number;
}

export interface StorageLayoutDiffInfo {
  label: string;
  type: string;
}

export interface StorageLayoutDiff {
  type: StorageLayoutDiffType;
  location: StorageLayoutDiffLocation | string;
  src: StorageLayoutDiffInfo;
  cmp: StorageLayoutDiffInfo;
  parent?: string;
}
