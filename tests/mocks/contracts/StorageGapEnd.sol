// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.16;

contract Storage {
  struct Struct {
    bool a;
    uint256 b;
    uint16 c;
    uint16 d;
    address e;
  }

  bool _initialized;
  bool _initializing;
  uint256[9] __gap;
  bytes32 _gapStartVar;
  Struct[] structs;
  address _owner;
  Struct[3] fixedStructs;
  Struct myStruct;
}
