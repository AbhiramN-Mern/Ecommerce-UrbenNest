const express=require('express')
const app=express()
// const router=require('express.router')
const path=require('path')
const passport=require('./config/passport')
const env=require("dotenv").config()
const session=require('express-session')
const db =require('./config/db')
const userRouter=require('./routes/userRouter')
const adminRouter=require('./routes/adminRouter')
db()

app.use(express.json())
app.use(express.urlencoded({extended:true}))

app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:false,
    cookie:{
        secure:false,
        httpOnly:true,
        maxAge:72*60*60*1000
    }
}))
app.use(passport.initialize())
app.use(passport.session())


app.use((req,res,next)=>{
    res.set('cache-control','no-store')
    next()
})

app.set('view engine','ejs')
app.set('views', [path.join(__dirname, 'views'),path.join(__dirname, 'views/admin'),path.join(__dirname, 'views/user')
]);
app.use(express.static(path.join(__dirname,'public')))

app.use('/',userRouter)
app.use('/admin',adminRouter)

app.use((req, res) => {
    res.status(404).render('page-404');
});

app.listen(process.env.PORT,()=>console.log(`Server started at http://localhost:${process.env.PORT}`))

module.exports=app
