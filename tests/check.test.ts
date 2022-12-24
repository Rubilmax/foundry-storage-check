import { expect } from "@jest/globals";

import { checkLayouts } from "../src/check";
import { formatDiff } from "../src/format";
import { createLayout, parseLayout, parseSource } from "../src/input";

describe("Storage layout checks", () => {
  describe("Basic storage", () => {
    const srcLayout = parseLayout(createLayout("tests/mocks/basic/StorageRef.sol:Storage"));

    it("should not raise diff when comparing source to source", async () => {
      const diffs = await checkLayouts(srcLayout, srcLayout);
      expect(diffs).toHaveLength(0);
    });

    it("should raise label diff when renaming variable", async () => {
      const contract = "tests/mocks/basic/StorageRenamed.sol:Storage";
      const cmpDef = parseSource(contract);
      const cmpLayout = parseLayout(createLayout(contract));

      const diffs = await checkLayouts(srcLayout, cmpLayout);
      expect(diffs).toHaveLength(1);
      expect(formatDiff(cmpDef, diffs[0]).message).toEqual(
        'variable "_initializing" was renamed to "_initialization". Is it intentional? (storage slot 0x0000000000000000000000000000000000000000000000000000000000000000, byte #1)'
      );
    });

    it("should not raise diff when variable added at start of gap slot", async () => {
      const contract = "tests/mocks/basic/StorageGapStart.sol:Storage";
      const cmpLayout = parseLayout(createLayout(contract));

      const diffs = await checkLayouts(srcLayout, cmpLayout);
      expect(diffs).toHaveLength(0);
    });

    it("should not raise diff when variable added at end of gap slot", async () => {
      const contract = "tests/mocks/basic/StorageGapEnd.sol:Storage";
      const cmpLayout = parseLayout(createLayout(contract));

      const diffs = await checkLayouts(srcLayout, cmpLayout);
      expect(diffs).toHaveLength(0);
    });

    it("should raise type diff when changing type of variable", async () => {
      const contract = "tests/mocks/basic/StorageChanged.sol:Storage";
      const cmpDef = parseSource(contract);
      const cmpLayout = parseLayout(createLayout(contract));

      const diffs = await checkLayouts(srcLayout, cmpLayout);
      expect(diffs).toHaveLength(1);
      expect(formatDiff(cmpDef, diffs[0]).message).toEqual(
        'variable "_owner" was of type "address" but is now "uint192" (storage slot 0x000000000000000000000000000000000000000000000000000000000000000c, byte #0)'
      );
    });

    it("should not raise diff when removing variable and not checking removals", async () => {
      const contract = "tests/mocks/basic/StorageRemoved.sol:Storage";
      const cmpLayout = parseLayout(createLayout(contract));

      const diffs = await checkLayouts(srcLayout, cmpLayout);
      expect(diffs).toHaveLength(0);
    });

    it("should not raise diff when removing variable and checking removals", async () => {
      const contract = "tests/mocks/basic/StorageRemoved.sol:Storage";
      const cmpDef = parseSource(contract);
      const cmpLayout = parseLayout(createLayout(contract));

      const diffs = await checkLayouts(srcLayout, cmpLayout, { checkRemovals: true });
      expect(diffs).toHaveLength(1);
      expect(formatDiff(cmpDef, diffs[0]).message).toEqual(
        'variable "added" of type "uint8" was removed (storage slot 0x0000000000000000000000000000000000000000000000000000000000000019, byte #0)'
      );
    });

    it("should not raise diff when extending storage", async () => {
      const contract = "tests/mocks/basic/StorageExtended.sol:Storage";
      const cmpLayout = parseLayout(createLayout(contract));

      const diffs = await checkLayouts(srcLayout, cmpLayout);
      expect(diffs).toHaveLength(0);
    });
  });

  describe("Struct storage", () => {
    const srcLayout = parseLayout(createLayout("tests/mocks/struct/StorageStructRef.sol:Storage"));

    it("should not raise diff when changing name of struct", async () => {
      const contract = "tests/mocks/struct/StorageStructRenamed.sol:Storage";
      const cmpLayout = parseLayout(createLayout(contract));

      const diffs = await checkLayouts(srcLayout, cmpLayout);
      expect(diffs).toHaveLength(0);
    });

    it("should raise label diff when switching struct variables", async () => {
      const contract = "tests/mocks/struct/StorageStructChanged.sol:Storage";
      const cmpDef = parseSource(contract);
      const cmpLayout = parseLayout(createLayout(contract));

      const diffs = await checkLayouts(srcLayout, cmpLayout);
      expect(diffs).toHaveLength(4);
      expect(formatDiff(cmpDef, diffs[0]).message).toEqual(
        'variable "(Storage.Struct myStruct).c" was renamed to "(Storage.Struct myStruct).d". Is it intentional? (storage slot 0x000000000000000000000000000000000000000000000000000000000000000f, byte #0)'
      );
      expect(formatDiff(cmpDef, diffs[1]).message).toEqual(
        'variable "(Storage.Struct myStruct).d" was renamed to "(Storage.Struct myStruct).c". Is it intentional? (storage slot 0x000000000000000000000000000000000000000000000000000000000000000f, byte #4)'
      );
      expect(formatDiff(cmpDef, diffs[2]).message).toEqual(
        'variable "(Storage.Struct structs).c" was renamed to "(Storage.Struct structs).d". Is it intentional? (storage slot 0x0175b7a638427703f0dbe7bb9bbf987a2551717b34e79f33b5b1008d1fa01dbb, byte #0)'
      );
      expect(formatDiff(cmpDef, diffs[3]).message).toEqual(
        'variable "(Storage.Struct structs).d" was renamed to "(Storage.Struct structs).c". Is it intentional? (storage slot 0x0175b7a638427703f0dbe7bb9bbf987a2551717b34e79f33b5b1008d1fa01dbb, byte #4)'
      );
    });

    it("should not raise diff when changing struct for smaller, free storage word", async () => {
      const contract = "tests/mocks/struct/StorageStructSmaller.sol:Storage";
      const cmpLayout = parseLayout(createLayout(contract));

      const diffs = await checkLayouts(srcLayout, cmpLayout);
      expect(diffs).toHaveLength(0);
    });

    it("should raise variable diff when using larger struct", async () => {
      const contract = "tests/mocks/struct/StorageStructLarger.sol:Storage";
      const cmpDef = parseSource(contract);
      const cmpLayout = parseLayout(createLayout(contract));

      const diffs = await checkLayouts(srcLayout, cmpLayout);
      expect(diffs).toHaveLength(2);
      expect(formatDiff(cmpDef, diffs[0]).message).toEqual(
        'variable "(Storage.Struct myStruct).b" of type "uint256" was replaced by variable "(Storage.Struct myStruct).e" of type "address" (storage slot 0x000000000000000000000000000000000000000000000000000000000000000e, byte #0)'
      );
      expect(formatDiff(cmpDef, diffs[1]).message).toEqual(
        'variable "(Storage.Struct structs).b" of type "uint256" was replaced by variable "(Storage.Struct structs).e" of type "address" (storage slot 0x0175b7a638427703f0dbe7bb9bbf987a2551717b34e79f33b5b1008d1fa01dba, byte #0)'
      );
    });

    it("should not raise diff when extending struct", async () => {
      const contract = "tests/mocks/struct/StorageStructExtended.sol:Storage";
      const cmpLayout = parseLayout(createLayout(contract));

      const diffs = await checkLayouts(srcLayout, cmpLayout);
      expect(diffs).toHaveLength(0);
    });
  });

  describe("Mapping storage", () => {
    const srcLayout = parseLayout(
      createLayout("tests/mocks/mapping/StorageMappingRef.sol:Storage")
    );

    it("should raise label diff when changing name of mapping", async () => {
      const contract = "tests/mocks/mapping/StorageMappingRenamed.sol:Storage";
      const cmpDef = parseSource(contract);
      const cmpLayout = parseLayout(createLayout(contract));

      const diffs = await checkLayouts(srcLayout, cmpLayout);
      expect(diffs).toHaveLength(1);
      expect(formatDiff(cmpDef, diffs[0]).message).toEqual(
        'variable "structOf" was renamed to "_structOf". Is it intentional? (storage slot 0x000000000000000000000000000000000000000000000000000000000000000d, byte #0)'
      );
    });

    it("should raise type diff when changing mapping", async () => {
      const contract = "tests/mocks/mapping/StorageMappingChanged.sol:Storage";
      const cmpDef = parseSource(contract);
      const cmpLayout = parseLayout(createLayout(contract));

      const diffs = await checkLayouts(srcLayout, cmpLayout);
      expect(diffs).toHaveLength(1);
      expect(formatDiff(cmpDef, diffs[0]).message).toEqual(
        'variable "nestedMapping[0]" was of type "mapping(address => mapping(uint256 => Storage.Struct))" but is now "mapping(uint256 => mapping(uint256 => Storage.Struct))" (storage slot 0xa6eef7e35abe7026729641147f7915573c7e97b47efa546f5f6e3230263bcb49, byte #0)'
      );
    });

    it("should raise type diff when extending mapping", async () => {
      const contract = "tests/mocks/mapping/StorageMappingExtended.sol:Storage";
      const cmpDef = parseSource(contract);
      const cmpLayout = parseLayout(createLayout(contract));

      const diffs = await checkLayouts(srcLayout, cmpLayout);
      expect(diffs).toHaveLength(2);
      expect(formatDiff(cmpDef, diffs[0]).message).toEqual(
        'variable "structOf" was of type "mapping(address => Storage.Struct)" but is now "mapping(address => mapping(address => Storage.Struct))" (storage slot 0x000000000000000000000000000000000000000000000000000000000000000d, byte #0)'
      );
      expect(formatDiff(cmpDef, diffs[1]).message).toEqual(
        'variable "(Storage.Struct structOf[0]).a" of type "bool" was replaced by variable "structOf[0]" of type "mapping(address => Storage.Struct)" (storage slot 0x81955a0a11e65eac625c29e8882660bae4e165a75d72780094acae8ece9a29ee, byte #0)'
      );
    });

    it("should not raise diff when renaming mapping struct", async () => {
      const contract = "tests/mocks/mapping/StorageMappingStructRenamed.sol:Storage";
      const cmpLayout = parseLayout(createLayout(contract));

      const diffs = await checkLayouts(srcLayout, cmpLayout);
      expect(diffs).toHaveLength(0);
    });

    it("should not raise diff when extended mapping struct", async () => {
      const contract = "tests/mocks/mapping/StorageMappingStructExtended.sol:Storage";
      const cmpLayout = parseLayout(createLayout(contract));

      const diffs = await checkLayouts(srcLayout, cmpLayout);
      expect(diffs).toHaveLength(0);
    });
  });

  describe("Interface storage", () => {
    const srcLayout = parseLayout(
      createLayout("tests/mocks/interface/StorageInterfaceRef.sol:Storage")
    );

    it("should not raise diff when extending interface", async () => {
      const contract = "tests/mocks/interface/StorageInterfaceExtended.sol:Storage";
      const cmpDef = parseSource(contract);
      const cmpLayout = parseLayout(createLayout(contract));

      const diffs = await checkLayouts(srcLayout, cmpLayout);
      expect(diffs).toHaveLength(0);
    });
  });
});
