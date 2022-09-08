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
