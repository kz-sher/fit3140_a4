const SHA256 = require('crypto-js/sha256');
class Block {
    constructor(timeStamp, data, prevHash = "") {
        this.timeStamp = timeStamp;
        this.data = data;
        this.prevHash = prevHash;
        this.hash = this.calculateHash();
    }
    calculateHash() {
        return SHA256(this.prevHash + this.timeStamp + JSON.stringify(this.data)).toString();
    }
}

module.exports = Block;