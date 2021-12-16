# pairGen
Generates intersecting PancakeSwap and ApeSwap Pairs 

<!-- GETTING STARTED -->
## Getting Started

To get a local copy up and running follow these simple example steps.

### Prerequisites
* npm
  ```sh
  npm install web3 @ethersproject/solidity @ethersproject/address @pancakeswap/sdk
  ```
  
  ## Usage
 
 - Clone the repo.
 - Install packages
 - Uncomment line 99
 - Run queryPairsList('ape')
 - After that is finished
 - Run queryPairList('pancake')
 - Then run generateApePanPairs()
 - Then run generateWBNBPairs()
 - Thats it
 ### Things to note
 
 When running the pancake querylist you must set an optimal pair length, because it will take forever to get >500,000 pairs from pancake and crash because of node,the most i've ever gotten was 199,999 tokens in one go. you can be batch write the pancake pairs. for example if you set the pairlength to 100,000 when that is finished, update i to 100,000 then update the pairlength to 200,000
 
 I know this takes a bit of work but im too lazy rn to complete it, pull request are welcomed

