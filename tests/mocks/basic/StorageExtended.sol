// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {Types} from "./Types.sol";

contract Storage {
  bool _initialized;
  bool _initializing;
  uint256[10] __gap;
  Types.Struct[] structs;
  address _owner;
  Types.TokenType token;
  Types.Struct[3] fixedStructs;
  Types.Struct myStruct;
  uint8 added;
  address _testAddress;
}
