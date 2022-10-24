// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.16;

interface IERC20 {
  function decimals() external returns (uint256);

  function balanceOf(address owner) external returns (uint256);
}

contract Storage {
  bool _initialized;
  IERC20 asset;
}
