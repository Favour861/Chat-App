// making express available
var express = require('express');
const chat = express();

//connecting to port WHILE CONNECTED TO MY PHONE HOTSPOT
// const port = chat.listen(5000, '192.168.43.49', ()=>{
//     console.log("Listening at port: 5000");
// });
// connecting to port WHILE NOT-CONNECTED TO MY PHONE HOTSPOT
const port = chat.listen(5000, ()=>{
    console.log("Listening at port: 5000");
});

//setting engine
chat.set('view engine', 'ejs');

//middle wares
chat.use(express.static(__dirname+'/public'));

//requiring formidable and fs
var fm = require('formidable');
var fs = require('fs');

//Creating a method from formidable class
var form = new fm.IncomingForm();

//bodyParser
var bodyParser = require('body-parser');
chat.use(bodyParser.json());
chat.use(bodyParser.urlencoded({extended:true}));

//mongoose requirement
var mongoose = require('mongoose');

//setting promise
mongoose.Promise = global.Promise;

//connection to database
mongoose.connect("mongodb://localhost:27017/chatDB");

//index - onload
chat.get('/', (req, res)=>{
    res.render('index', {status: null});
})
//Load SignUp page
chat.get('/signUp.sqi', (req, res)=>{
    res.render('signUp', {status: null})
})

//User Schema
let userSchema = mongoose.Schema({
    fname: String,
    lname: String,
    phone: String,
    picture: String,
    uname: String,
    pwd: String
});
let users = mongoose.model("users", userSchema)

//Conversation Schema
let convSchema = mongoose.Schema({
    convId: String,
    // user1: String,
    // user2: String
});
let conversations = mongoose.model("conversation", convSchema)

//Message Schema
let msgSchema = mongoose.Schema({
    // msgId: String,
    msgC: String,
    sender: String,
    rcp: String,
    convId: String,
    time: String
})

let messages = mongoose.model("message", msgSchema)

//Group Message
let groupSchema = mongoose.Schema({
    // msgId: String,
    creator: String,
    name: String,
    timeCreated: String,
    picture: String
})

let groups = mongoose.model("group", groupSchema)

let grpMsgSchema = mongoose.Schema({
    // msgId: String,
    grpMsgC: String,
    grpId: String,
    sender: String,
    time: String
})

let grpMessages = mongoose.model("grpMessage", grpMsgSchema)
//Check phone number availability
chat.post('/checkPhone', (req, res)=>{
    let phone = req.body.phone;
    users.find({phone: phone}, (err, result)=>{
        console.log(result.length)
        if(result.length!==0){
            res.render("signUp", {status: "available"})
        }else{
            res.render("signUp", {status: "not available", phone: phone})
        }
    })

    //Route to registration page
    chat.get('/register/:uphone', (req,res)=>{
        let uphone = req.params.uphone;
        console.log(uphone)
        res.render('register', {state: "routed", phone: uphone})
    })
})


//Submitting registration details

chat.post('/registration.enter', (req, res)=>{

            form.parse(req, (err, fields, files)=>{
                let fname = fields.fname;
                let lname = fields.lname;
                let phone = fields.phone;
                let tmp = files.pix.path;
                let pix = files.pix.name;
                let uname = fields.uname;
                let pwd = fields.pwd;
                let img = "userImages/"+pix;
                let imgLink = "public/userImages/"+pix;
                users.find({phone: phone}, (err, result)=>{
                    console.log(result)
                    if(result.length==0){
                        fs.rename(tmp, imgLink, ()=>{
                            let newUser = {
                                fname: fname,
                                lname: lname,
                                phone: phone,
                                picture: img,
                                uname: uname,
                                pwd: pwd
                            }
                    
                            nUser = new users(newUser);
                            nUser.save().then(data=>{
                                res.render('register', {state: "successful"})
                            })
                        })
                    }else{
                        res.render('signUp', {status: "unsuccessful"})
                    }
                })
                //Loading Chat Page
                chat.get('/chat', (req,res)=>{
                    users.find({}, (err, result)=>{
                        groups.find({}, (err, groups)=>{
                            res.render('chatpage', {user: phone, users: result, groups: groups})
                        })
                    })
                })
            })
        
            
})
//Login in

chat.post('/login', (req,res)=>{
    let pn = req.body.phone;
    let pwd = req.body.pwd;
//Checking Login Credentials
    users.find({phone: pn, pwd: pwd}, (err, result)=>{
        // console.log(result)
        if(result.length==0){
            res.render('index', {status: "invalid"})
        }else{
            users.find({}, (err, result)=>{
                groups.find({}, (err, groups)=>{
                    res.render('chatpage', {user: pn, users: result, groups: groups})
                })
            })
        }
    })
})

//Conversation
chat.post('/conversation.sqi', (req, res)=>{
    let cUser = req.body.cUserId;
    let chatUser = req.body.chatUserId;
    let convId = cUser+chatUser;
    
        users.find({phone: chatUser}, (err, result)=>{
            let chtUser = result;
            messages.find({$or: [{sender: cUser, rcp: chatUser}, {sender: chatUser, rcp: cUser}]}, (err, result)=>{
                console.log(result);
                res.render('conversationpage', {chatUser: chtUser, user: cUser, msgList: result, convId: convId})
            })
        })

        

})
//Group Create

chat.post('/grpCreate', (req, res)=>{
    form.parse(req, (err, fields, files)=>{
        let grpName = fields.grpName;
        let grpCrtr = fields.creator;
        
        let date = new Date();
        let dy = date.getDay();
        let dt = date.getDate();
        let hr = date.getHours();
        let mn = date.getMinutes();
        let time = date.toLocaleString();

        let tmp = files.grpPix.path;
        let pix = files.grpPix.name;
        let img = "userImages/"+pix;
        let imgLink = "public/userImages/"+pix;

        fs.rename(tmp, imgLink, ()=>{
            let grp = {
                creator: grpCrtr,
                name: grpName,
                timeCreated: time,
                picture: img
            }
    
            nGrp = new groups(grp);
            nGrp.save().then(data=>{
                users.find({}, (err, result)=>{
                    groups.find({}, (err, groups)=>{
                        res.render('chatpage', {user: grpCrtr, users: result, groups: groups})
                    })
                })
            })
        })
        
    })
})
//Group Chat

chat.post('/groupchat.sqi', (req,res)=>{
    let grpId = req.body.groupId;
    let user = req.body.user;
    groups.find({_id: grpId}, (err, groups)=>{
        users.find({phone: groups[0].creator}, (err, crtr)=>{
            console.log(crtr)
            grpMessages.find({grpId: grpId}, (err, messages)=>{
                res.render('groupchat', {msg: messages, grpdt: groups, user: user, creator: crtr})
            })
        })
    })
})

//Group Delete

chat.post('/deletegrp.sqi', (req,res)=>{
    let grpId = req.body.grpId;
    let user = req.body.user;
    groups.deleteOne({_id: grpId}, (err, result)=>{
        console.log(err)
        console.log(result)
        grpMessages.deleteMany({grpId: grpId}, (err, result)=>{
            users.find({}, (err, result)=>{
                    groups.find({}, (err, groups)=>{
                        res.render('chatpage', {user: user, users: result, groups: groups})
                    })
            })
        })
    })
})
//socket io instantiation
let io = require('socket.io')(port);

//Socket

io.on('connection', (socket)=>{
    console.log("connected to socket");
    // socket.on('typing', (data)=>{
    //     io.sockets.emit('typing', {typist: data.cu})
    // })
    socket.on('new_grpmessage', (data)=>{
        let sender = data.sender;
        let message = data.message;
        let grpId = data.grpId;
        let date = new Date();
        let hr = date.getHours();
        let mn = date.getMinutes();
        let time = hr + ":" + mn;
        let newGrpMsg = {
            grpMsgC: message,
            grpId: grpId,
            sender: sender,
            time: time
        }
        let NGM = new grpMessages(newGrpMsg);
        NGM.save().then(data=>{
            io.sockets.emit('grpmessage_sent', {grpId: grpId, message: message, sender: sender, time: time})
        })
    })
    socket.on('new_message', (data)=>{
        let date = new Date();
        let hr = date.getHours();
        let mn = date.getMinutes();
        let time = hr + ":" + mn;
        let msg = {
            sender: data.sender,
            msgC: data.message,
            rcp: data.rcp,
            convId: data.convId,
            time: time
        }

        let newMsg = new messages(msg);
        socket.user={};
        socket.user.id=msg.rcp;
        console.log(msg)
        // users.find({phone: msg.sender}, {picture: 1}, (err, result)=>{
            newMsg.save().then(data=>{
                    io.sockets.emit('message_sent', {message: msg.msgC, sender: msg.sender, time: time, rcp: msg.rcp})
            })
        // })

    })

})