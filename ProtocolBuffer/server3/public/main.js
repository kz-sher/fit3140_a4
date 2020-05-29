function dAppSystem(){
    this.checkSetup();
    
    // Link sections from index.html
    this.socket=io.connect();
    this.from=document.getElementById("from");
    this.to=document.getElementById("to");
    this.amount=document.getElementById("amount");
    this.desc=document.getElementById("desc");
    this.status=document.getElementById("status");
    this.transactionButton=document.getElementById("sendTransaction");
    
    // Initialize properties of firebase
    this.database=firebase.database();
    this.storage=firebase.storage();
    this.channel=1; //the channel the database refers to
    
    // Set an observer when send transaction processed
    this.transactionButton.addEventListener('click',this.sendTransaction.bind(this));
    
    // Set an observer listening to the status of the transaction made
    this.updateStatus();
    
    // Initialize first block's data as notifying the server what is the credit the client have
    this.initFirstBlockData();
}

// Checks that the Firebase SDK has been correctly setup and configured.
dAppSystem.prototype.checkSetup = function() {
    if (!window.firebase || !(firebase.app instanceof Function) || !firebase.app().options) {
    window.alert('You have not configured and imported the Firebase SDK. ' +
        'Make sure you go through the codelab setup instructions and make ' +
        'sure you are running the codelab using `firebase serve`');
    }
}

// Loads chat messages history and listens for upcoming ones.
dAppSystem.prototype.loadMessages = function() {
    // Reference to the /messages/ database path.
    this.messagesRef = this.database.ref(this.channel);
    // Make sure we remove all previous listeners.
    this.messagesRef.off();
};

// Detection of Sent Transaction
dAppSystem.prototype.sendTransaction = function() {
    
    var data =  {
                sender: this.from.value,
                receiver: this.to.value,
                amount: this.amount.value,
                description: this.desc.value
                };
    
    // Clear data fields
    this.from.value='';
    this.to.value='';
    this.amount.value='';
    this.desc.value='';
    
    this.socket.emit('transacMade', data);
}

dAppSystem.prototype.updateStatus = function(){
    this.socket.on('updateStatus', (status)=>{
        this.status.textContent=status;
        setTimeout(()=>{
            this.status.textContent='';
        }, 3000);
    });
}

dAppSystem.prototype.initFirstBlockData = function() {
    var data =  {
                sender: '-1',
                receiver: 'C3',
                amount: 150,
                description: 'Open Balance'
                };
    this.socket.emit('addClientBlockData', data);
}
    

// Action when someone enters the website 
window.onload = function() {
    window.dAppSystem = new dAppSystem();
}