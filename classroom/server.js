const express = require("express");
const app = express();
const session = require("express-session");
port = 3000;

const sessionOptions = {secret: "mysecretstring", resave: false, saveUninitialized: true};

app.use(session(sessionOptions));

app.get("/register", (req,res) => { 
    let {name = "anonymous"} = req.query;
    req.session.name = name;
    res.redirect("/hello");
});

app.get("/hello", (req,res) => {
    res.send(`Hello ${req.session.name}`);
});


// app.get("/reqcount", (req, res) => {
//     if(req.session.count){
//         req.session.count++;
//     }
//     else{
//         req.session.count = 1;
//     }
//     res.send(`You sent a request ${req.session.count} times`);
//     res.send("You sent req x number of times");
// });

// app.get("/test", (req, res) => {
//     res.send("Test Successful !")
// });

app.listen(port, () => {
    console.log(`App is listening on port ${port}`);
});

