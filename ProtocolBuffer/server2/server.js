var http=require('http')
            , admin = require("firebase-admin")
            , fs = require('fs')
            , path =require('path')
            , express = require('express')
            , app = express()
            , socketio=require('socket.io') // adding the socket in order for client and server interaction
            , io_client = require('socket.io-client') // allow the server to be like a client of another server
            , sizeof = require('object-sizeof')
            , protobuf = require('protocol-buffers');

// pass a proto file as a buffer/string or pass a parsed protobuf-schema object
var messages = protobuf(fs.readFileSync('../test.proto')); // create an instance of protocol buffer

// Join path from server to public folder
app.use(express.static(path.join(__dirname, 'public')));

// Creating the server
var server=http.createServer(app).listen(3001, function() {
    console.log("Listening at: http://localhost:3001")
});

// This socket listener will serve for its own clients
var io = socketio.listen(server);

// The information of this server
var server_info = {
    server_no:1,
    port_no:3001,
    wealth:3
}

// List of servers with their records
var servers = [server_info];
var connected_servers_info = [];

// Block and BlockChain library
var Block = require('./block.js')
var Chain = require('./blockchain.js')
var BlockChain = new Chain();

serverListener(3000);
// This socket connection makes the server become a client of another server
function serverListener(port){
    var socket = io_client.connect('http://localhost:'+port);
    connected_servers_info.push({
        socket: socket,
        port: port
    });
    socket.on('connect', function () {
        // socket connected
        socket.emit('join', server_info);
        socket.emit('socket_port', server_info.port_no)
    });

    socket.on('updateServerList', function(serverList){
        // update servers by assigning new list given
        servers = serverList;
        servers.forEach(s=>{
            if(s.port_no != server_info.port_no && connected_servers_info.map(data => data.port).includes(s.port_no)==false){
                serverListener(s.port_no);
            };
        });
        console.log('Updated Server List:\n',servers);
    });

    socket.on('updateBlockChain', function(blockChain){
        // update blockChain by assigning new blockChain given
        BlockChain = new Chain()
        BlockChain.chain = blockChain.chain;
    });
}

// Detect the connection of sockets which are listening to this server
io.on('connection', function (socket) {
    
    socket.num = socket.id
    socket.join(socket.num)
    
    socket.on('socket_port', function(port){
        socket.port = port;    
    });
    
    socket.on('join', function (data) {
    // data is the record which is send by a new node wants to join
    // check if the node is not in the array of records
    // if not, send a connection request
    // Use data (the input parameter) to generate a record for the new node and add it to the array of servers
    //send the list of servers
    // send the blockchain
        if(servers.filter(s => s.server_no == data.server_no).length == 0){
            servers.push(data);
            serverListener(data.port_no)
            socket.emit('updateServerList',servers);
            socket.emit('updateBlockChain', BlockChain);
            console.log('Updated Server List:\n',servers);
        }
    });
    
    // When a client clicks on the button for sending transactions
    socket.on('transacMade',function(data){
        console.log('> transaction is being verified...');
        console.log('==================================');
        console.log('From: '+data.sender);
        console.log('To: '+data.receiver);
        console.log('Amount: '+data.amount);
        console.log('Description: '+data.description);
        console.log('==================================');
        // call proof of stake
        var chosen_server_num = proofOfStake(servers.map(s => s.wealth));
        // then emit 'validate' to that server
        var buf_data = makeProtocolBufferObj(data);
        validate(servers[chosen_server_num].server_no, buf_data, socket.num);
        connected_servers_info.forEach(s=>{
           s.socket.emit('validate', chosen_server_num, buf_data, socket.num); 
        });
    });
    
    // Update the wealth of the server according to the number given
    // Every server should perform it after a validation is done by one of them
    // The fee for validating a transaction is 3 coins, which is why it increments by 3
    socket.on('updateWealth',function(server_num){
        console.log('received updateWealth');
        updateWealth(server_num)
    });
    
    // Validate the transaction using blockchain
    // The server called will act as a validator of a particular transaction 
    // It can be delegated by any server, including itself using proof of stake algorithm
    socket.on('validate', function(server_num, buf_data, socket_id){
        console.log('received validate')
        validate(server_num, buf_data, socket_id)
    });
    
    // Update every server's blockchain by adding the block according to the given data
    socket.on('updateBlockChain', function(block){
        console.log('received updateBlockChain')
        var new_block = new Block(block.timeStamp, block.data, block.prevHash);
        BlockChain.addBlock(new_block);
        BlockChain.printChain();
    });
    
    // When client is using one of the servers, the block with the data including the predefined open balance will be added to the blockchain
    socket.on('addClientBlockData', function(data){
        console.log('received addClientBlockData ', data.receiver)
        var client_first_block = new Block(Date(),data,'pre-hash will be done inside the module');
        BlockChain.addBlock(client_first_block);
        connected_servers_info.forEach(s=>{
           s.socket.emit('updateBlockChain', client_first_block); 
        });
        BlockChain.printChain();
    });
    
    socket.on('updateStatus', function(status,socket_id){
        console.log('received updateStatus')
        socket.to(socket_id).emit('updateStatus',status); 
    });
    
    socket.on('disconnect', function () {
    // find the record of the node and delete it
        connected_servers_info = connected_servers_info.filter(s => s.port != socket.port);
        servers = servers.filter(data => data.port_no != socket.port);
        console.log('Disconneted:\n', servers)
    });
});

function updateWealth(server_num){
    servers.forEach(s=>{
       if(s.server_no == server_num){
           s.wealth = s.wealth + 3;
       } 
    });
};

function validate(server_num, buf_data, socket_id){
    if(server_info.server_no == server_num){
        printObjSizeInBytes(buf_data);
        var data = readProtocolBufferObj(buf_data);
        // do validation using blockchain
        if(BlockChain.doesClientHaveMoney(data.sender, data.amount) == true){
            var new_block = new Block(Date(), data, 'pre-hash will be done inside the module');
            BlockChain.addBlock(new_block);
            BlockChain.printChain();
            // then inform all to updateWealth
            updateWealth(server_num);
            // inform client with 'Transaction Complete' message
            console.log('Transaction Complete')
            io.to(socket_id).emit('updateStatus', 'Transaction Complete');
            connected_servers_info.forEach(s=>{
                s.socket.emit('updateBlockChain', new_block); 
                s.socket.emit('updateWealth', server_num);
                s.socket.emit('updateStatus', 'Transaction Complete', socket_id);
            });
        }
        else{
            // inform client with 'Transaction Failure' message
            console.log('Transaction Failure')
            io.to(socket_id).emit('updateStatus', 'Transaction Failure');
            connected_servers_info.forEach(s=>{
                s.socket.emit('updateStatus', 'Transaction Failure', socket_id);
            });
        }
    }
};

////////////////

var choseServer = function (serverList){
    var i = -1;
    var totalCoins = 0;

    // Sums the server wealth of all connected servers
    var x;
    var sum = 0;

    for ( x = 0; x<serverList.length; x++){
        totalCoins += serverList[x];
    }

    // rand produces a random number between 1 and the totalCoins
    var rand = Math.floor((Math.random() * (totalCoins-2)) + 1);

    while (rand>0){
        i = i + 1;
        rand = rand - serverList[i];
    }
    return i;
};

function proofOfStake(serverList){
    var serversFreq = {};
    var N = 1000;
    var y;
    var select_server;

    for (y=0; y<N; y++){
        select_server = choseServer(serverList);
        if( !(select_server in serversFreq) ){
          serversFreq[select_server]=1;
        }
        else{
          serversFreq[select_server]+=1;
        }
    }
    
    // this will return which server has the highest wealth to validate the transaction
    var serversFreqArray = Object.values(serversFreq)
    var max = serversFreqArray.indexOf(Math.max(...serversFreqArray));
		return max;
}

// This function uses library 'object-sizeof' to measure the size of the object in bytes
function printObjSizeInBytes(obj){
    console.log('Object Size: ',sizeof(obj));
    fs.appendFile('../data.txt',sizeof(obj)+'\n',function(err){
        if(err){
            console.error(err);
        }
        console.log('Data Written.')
    });
}

function makeProtocolBufferObj(obj){
    // now lets encode the message (i.e. the object
    var buf = messages.Test.encode({
                                    sender:obj.sender,
                                    receiver: obj.receiver,
                                    amount:obj.amount,
                                    description:obj.description
                                   });
    console.log(buf); // should print a buffer
    return buf
}

function readProtocolBufferObj(obj){
    // now let decode the buffer
    var new_obj = messages.Test.decode(obj)
    return new_obj
}