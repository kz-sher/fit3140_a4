const Block = require('./block.js')
class BlockChain {
    constructor() {
// the chain is an array with an initial block (genesis block)
        this.chain = [this.createGenesisBlock()];
    }
// create the first block. We call it the genesis block
    createGenesisBlock() {
        return new Block(Date(), "Start", "0");
    }
// return the latest block
    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }
// this function creates a new block and adds it to the chain
    addBlock(newBlock) {
//assign the pre hash
        newBlock.prevHash = this.getLatestBlock().hash;
// Now calculate the hash of the new block
        newBlock.hash = newBlock.calculateHash();
// push it to the chain
        this.chain.push(newBlock);
    }
// this boolean function checks if the chain is valid or not
    isChainValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const prevBlock = this.chain[i - 1];
            if (currentBlock.hash != currentBlock.calculateHash()) {
                return false;
            }
            if (currentBlock.prevHash != prevBlock.hash) {
                return false;
            }
            return true;

        }
    }
// check whether the client has enough balance by looping through the chain
    doesClientHaveMoney(transaction_maker, money){
        var credit = 0
        for (let i = 1; i < this.chain.length; i++){
            const currentBlock = this.chain[i]
            if(currentBlock.data.sender == transaction_maker){
                credit = credit - parseInt(currentBlock.data.amount);
            }
            if(currentBlock.data.receiver == transaction_maker){
                credit = credit + parseInt(currentBlock.data.amount);
            }
        }
        
        if(credit>=money){
            return true;
        }
        else{
            return false;
        }
    }
    
    printChain(){
        console.log('==Blockchain==')
        this.chain.slice(1,this.chain.length)
                .map(x=>[x.data.sender, x.data.receiver, x.data.amount])
                .forEach(y=>{
                    console.log(y+'\n')
                });
        console.log('==============')
    }
}

module.exports = BlockChain
