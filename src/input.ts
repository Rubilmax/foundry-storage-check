import { execSync } from "child_process";
import fs from "fs";

import * as parser from "@solidity-parser/parser";
import { ContractDefinition } from "@solidity-parser/parser/src/ast-types";

import {
  ParsedSource,
  StorageLayoutReport,
  StorageLayoutReportExact,
  StorageVariable,
  StorageVariableExact,
} from "./types";

const exactify = (variable: StorageVariable): StorageVariableExact => ({
  ...variable,
  slot: BigInt(variable.slot),
  offset: BigInt(variable.offset),
});

export const createLayout = (contract: string, cwd = ".") => {
  return execSync(`forge inspect ${contract} storage-layout`, {
    encoding: "utf-8",
    cwd,
  });
};

export const parseLayout = (content: string): StorageLayoutReportExact => {
  try {
    const layout: StorageLayoutReport = JSON.parse(content);

    return {
      storage: layout.storage.map(exactify),
      types: Object.fromEntries(
        Object.entries(layout.types).map(([name, type]) => [
          name,
          {
            ...type,
            members: type.members?.map(exactify),
            numberOfBytes: BigInt(type.numberOfBytes),
          },
        ])
      ),
    };
  } catch (error: any) {
    console.error("Error while parsing storage layout:", content);

    throw error;
  }
};

export const parseSource = (contract: string): ParsedSource => {
  const [path, contractName] = contract.split(":");

  const { children, tokens = [] } = parser.parse(fs.readFileSync(path, { encoding: "utf-8" }), {
    tolerant: true,
    tokens: true,
    loc: true,
  });

  const def = children.find(
    (child) => child.type === "ContractDefinition" && child.name === contractName
  ) as ContractDefinition | undefined;
  if (!def) throw Error(`Contract definition not found: ${contractName}`);

  return { path, def, tokens };
};
