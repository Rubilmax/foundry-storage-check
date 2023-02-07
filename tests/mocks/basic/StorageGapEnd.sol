// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {Types} from "./Types.sol";

contract Storage {
  bool _initialized;
  bool _initializing;
  uint256[9] __gap;
  bytes32 _gapStartVar;
  Types.Struct[] structs;
  address _owner;
  Types.TokenType token;
  Types.Struct[3] fixedStructs;
  Types.Struct myStruct;
}
