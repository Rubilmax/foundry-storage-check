// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract Storage {
  struct Struct {
    bool a;
    uint16 b;
    uint32 c;
    uint32 d;
    address e;
  } // smaller than 1 storage word => uses the free space from ref struct's first storage word

  bool _initialized;
  bool _initializing;
  uint256[10] __gap;
  Struct[] structs;
  address _owner;
  Struct myStruct;
}
