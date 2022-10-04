// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.16;

contract Storage {
  struct Struct {
    bool a;
    uint32 b;
    uint32 c;
    uint32 d;
    address e;
  } // larger than 1 storage word => clashes with second word of ref struct

  bool _initialized;
  bool _initializing;
  uint256[10] __gap;
  Struct[] structs;
  address _owner;
  Struct myStruct;
}
