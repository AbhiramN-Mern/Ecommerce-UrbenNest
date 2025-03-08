const express=require('express')
const app=express()
const path=require('path')
const env=require("dotenv").config()
const session=require('express-session')
const db =require('./config/db')
const userRouter=require('./routes/userRouter')
db()

app.use(express.json())
app.use(express.urlencoded({extended:true}))

app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{
        secure:false,
        httpOnly:true,
        maxAge:72*60*60*1000
    }
}))
app.use((req,res,next)=>{
    res.set('cache-control','no-store')
    next()
})

app.set('view engine','ejs')
app.set('views',[path.join(__dirname,'views/user'),path.join(__dirname,'views/admin')])
app.use(express.static(path.join(__dirname,'public')))

app.use('/',userRouter)

app.listen(process.env.PORT,()=>console.log(`Server started at http://localhost:${process.env.PORT}`))

module.exports=app
