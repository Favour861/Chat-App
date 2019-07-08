// making express available
var express = require('express');
const chat = express();

//connecting to port
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
    convId: String
})

let messages = mongoose.model("message", msgSchema)
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
                    users.find({},(err, result)=>{
                            res.render('chatpage', {user: phone, users: result}) 
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
                res.render('chatpage', {user: pn, users: result})
            })
        }
    })
})

//Conversation
chat.post('/conversation.sqi', (req, res)=>{
    let cUser = req.body.cUserId;
    let chatUser = req.body.chatUserId;
    let convId = cUser+chatUser;
    
    conversations.find({convId: {$regex: /.*${cUser}*./}, convId: {$regex: /.*${cUser}*./}}, (err, result)=>{
        if(result.length==0){
            let converse = {
                convId: convId, 
            }
            let newConv = new conversations(converse);
            newConv.save().then(data=>{
                users.find({phone: chatUser}, (err, result)=>{
                    let chtUser = result;
                    messages.find({convId: {$regex: /.*${cUser}*./}, convId: {$regex: /.*${cUser}*./}}, (err, result)=>{
                        console.log(result)
                        res.render('conversationpage', {chatUser: chtUser, user: cUser, msgList: result, convId: convId})
                    })
                })
            })
        }else{
            users.find({phone: chatUser}, (err, result)=>{
                let chtUser = result;
                messages.find({convId: {$regex: /.*${cUser}*./}, convId: {$regex: /.*${cUser}*./}}, (err, result)=>{
                    console.log(result)
                    res.render('conversationpage', {chatUser: chtUser, user: cUser, msgList: result, convId: convId})
                })
            })
        }
    })

})

//socket io instantiation
let io = require('socket.io')(port);

//Socket

io.on('connection', (socket)=>{
    console.log("connected to socket")
    socket.on('new_message', (data)=>{
        let msg = {
            sender: data.sender,
            msgC: data.message,
            convId: data.convId
        }

        let newMsg = new messages(msg);

        console.log(msg)
        users.find({phone: msg.sender}, {picture: 1}, (err, result)=>{
            newMsg.save().then(data=>{
                io.sockets.emit('message_sent', {message: msg.msgC, sender: msg.sender, pix: result[0].picture})
            })
        })

    })

})