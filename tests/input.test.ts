import { expect } from "@jest/globals";

import { createLayout, parseLayout, parseSource } from "../src/input";

describe("Input checks", () => {
  it("should execute createLayout from a custom working directory", async () => {
    const layout = parseLayout(createLayout("StorageRef.sol:Storage", "tests/mocks/basic"));

    expect(Object.keys(layout.storage)).toHaveLength(8);
    expect(Object.keys(layout.types)).toHaveLength(9);
  });

  it("should execute parseLayout", async () => {
    const source = parseSource("tests/mocks/basic/StorageRef.sol:Storage");

    expect(source.def.name).toBe("Storage");
    expect(source.def.baseContracts).toHaveLength(0);
    expect(source.def.kind).toBe("contract");
    expect(source.def.type).toBe("ContractDefinition");
    expect(source.path).toBe("tests/mocks/basic/StorageRef.sol");
  });
});
