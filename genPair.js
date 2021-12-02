//Precomputes possible trading routes of interest for dual listed pair arbitrage
//Queries PCS and APESWAP for all pairs
//Then constructs a list of dual listed pairs and returns a intersection of both lists
var Web3 = require(  "web3");
var pkg = require('@pancakeswap/sdk')
var ethers = require( 'ethers');
var fs = require('fs');
var Tx = require('ethereumjs-tx').Transaction
var ethersSol = require( '@ethersproject/solidity')
var ethersAdd = require ('@ethersproject/address')
var uSDK = require ( '@pancakeswap/sdk');

const { INIT_CODE_HASH } = uSDK;
const { pack, keccak256 } = ethersSol;
const { getCreate2Address } = ethersAdd;


var productionServer = "ws://127.0.0.1:8546"; //Private GETH MainNet Node
try {
    var web3 = new Web3(productionServer); // same output as with option below
} catch (error) {
    console.log(error)
}

let apeMasterDB = require('./apePairs.json'); //assumes the program has already run
let panMasterDB = require('./pancakePairs.json'); //assumes the program has already run

var ABPairsWithIntersection = []
let {ERC20TransferABI, pancakeV2PairABI,PANCAKE_FACTORY_ABI,PANCAKE_ROUTER_ABI,APESwapFactoryABI} = require('./abi')



const PANCAKESWAP_ROUTERV2_ADDR = "0x10ED43C718714eb63d5aA57B78B54704E256024E"
const PANCAKESWAP_FACTORY_ADDRESS = "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73"
const WBNB_ERC20_ADDRESS = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"
const APESWAP_FACTORY_ADDRESS = "0x0841BD0B734E4F5853f0dD8d7Ea041c241fb0Da6"



var pairMaster = []
let intersectionDB = require('./intersectionAll.json');


const pancakeFactoryContract = new web3.eth.Contract(PANCAKE_FACTORY_ABI, PANCAKESWAP_FACTORY_ADDRESS)     
const apeswapFactoryContract = new web3.eth.Contract(APESwapFactoryABI, APESWAP_FACTORY_ADDRESS)     



var uniSet = new Set(panMasterDB) 

var tempSet = new Set()

console.time('setAdd')
uniSet.forEach((value)=>{
    tempSet.add(value.pairAddress)
})
console.timeEnd('setAdd')

function pairExists(_token0, _token1){
    return tempSet.has(getPairAddress(_token0, _token1))
}

function getPairAddress(_token0, _token1){
    return getCreate2Address(PANCAKESWAP_FACTORY_ADDRESS, keccak256(['bytes'], [pack(['address', 'address'], [_token0, _token1])]),INIT_CODE_HASH)    
}


function generateApePanPairs(){ //includes combo's of other stable pairs USDC's etc, no liquidity filtering, no weth only filtering
    let cached = panMasterDB.map(e=>e.pairAddress)
    for(let i = 0; i< apeMasterDB.length; i++){
           if(pairExists(apeMasterDB[i].pairToken0, apeMasterDB[i].pairToken1)){
                
                var index = cached.indexOf(getPairAddress(apeMasterDB[i].pairToken0, apeMasterDB[i].pairToken1))
                ABPairsWithIntersection.push({"ape":apeMasterDB[i], "pancake":panMasterDB[index], "order":"true"})
                console.log(i, ABPairsWithIntersection.length, "A")

            }
            if(pairExists(apeMasterDB[i].pairToken1, apeMasterDB[i].pairToken0)){
                
                var index = cached.indexOf(getPairAddress(apeMasterDB[i].pairToken1, apeMasterDB[i].pairToken0))

                ABPairsWithIntersection.push({"ape":apeMasterDB[i], "pancake":panMasterDB[index], "order":"false"})
                console.log(i, ABPairsWithIntersection.length, "B")

        }
    //}
}
    console.log('writing intersection')
    writeInterSectionPairList(ABPairsWithIntersection)
    console.log('done')
    setTimeout(function(){
        process.exit()
    },9000)
}


var debugPrint = false

generateApePanPairs()
//generateWBNBPairs()

//queryPairsList('ape')





function generateWBNBPairs(){ 
    for(let i = 0; i< intersectionDB.length; i++){
        if((intersectionDB[i].ape.pairToken0 == WBNB_ERC20_ADDRESS || intersectionDB[i].ape.pairToken1 == WBNB_ERC20_ADDRESS)){ //check if one of the tokens is WBNB, if yes abort 
            ABPairsWithIntersection.push(intersectionDB[i])
                console.log("x0", i, ABPairsWithIntersection.length)
            }
        }
       console.log('writing gen')
        writeInterSectionPairListWETHD(ABPairsWithIntersection)
        setTimeout(function(){
            process.exit()
        },9000)
    }


async function queryPairsList(dex){
    var factoryContract;
    var filename;
    var pairLength
    if(dex == 'pancake')
    {
        factoryContract = pancakeFactoryContract 
        filename = 'pancakePairs'
        pairLength = 5000 // batching purposes
    }
    else{
        factoryContract = apeswapFactoryContract
        filename = 'apePairs'
        pairLength = await factoryContract.methods.allPairsLength().call()
    }
    
    
    console.log(`Amount of Pairs: ${pairLength}`)
    console.time('query')
            for(let i = 0; i< pairLength; i++){ //set i to the last batch, batching to not go over nodejs GC limits for PCS
                try{
                 let pairAddress = await factoryContract.methods.allPairs(i).call()
                 var pairContract = new web3.eth.Contract(pancakeV2PairABI, pairAddress)           
                 let pairToken0 = await pairContract.methods.token0().call()
                 let pairToken1 = await pairContract.methods.token1().call()
                 let pair0 = await new web3.eth.Contract(ERC20TransferABI,pairToken0).methods
                 let pair1 = await new web3.eth.Contract(ERC20TransferABI,pairToken1).methods
                 let symbol0 =await pair0.symbol().call()
                 let symbol1 = await  pair1.symbol().call()
                 let decimal0 = await pair0.decimals().call()
                 let decimal1 = await pair1.decimals().call()
                 var toWrite = {"pairAddress":pairAddress, "pairToken0":pairToken0, "pairToken1":pairToken1, "decimals0":decimal0, "decimals1":decimal1,"symbol0":symbol0, "symbol1":symbol1}
                         pairMaster.push(toWrite)
                }
                catch(e){
                //console.log(e)
                continue
               
                }
                         
                     }

                    
                     console.timeEnd('query')
                     console.log('Done Querying Pairs')
                    writePairList(pairMaster,filename) //FOR PANCAKESWAP PLEASE BATCH THE WRITES FOR EXAMPLE SET i to stop for the first 100,000 tokens.
                     setTimeout(function(){
                         process.exit()
                     },5000)
    
       
        
           
               
               
               //process.exit(0)
   
        }

       



function writePairList(_pairMaster,name){
    fs.writeFile(`./${name}.json`,JSON.stringify(_pairMaster),function(err){
        if(err) throw err;
    })
}
function writeInterSectionPairList(_pairIntMaster){
    fs.writeFile('./intersectionAll.json',JSON.stringify(_pairIntMaster),function(err){
        if(err) throw err;
    })
}

function writeInterSectionPairListWETHD(_pairIntMaster){
    fs.writeFile('./intersectionWETH.json',JSON.stringify(_pairIntMaster),function(err){
        if(err) throw err;
    })
}

