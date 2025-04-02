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

app.use((req, res, next) => {
    // Set the current user (if any) available for all views.
    res.locals.user = req.session.user ? req.session.user : null;
    // You can also set a default currentPage; individual jsroutes can override this if needed.
    res.locals.currentPage = 'default';
    next();
});

app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});

app.set('view engine','ejs')
app.set('views', [path.join(__dirname, 'views'),path.join(__dirname, 'views/admin'),path.join(__dirname, 'views/user')
]);
app.use(express.static(path.join(__dirname,'public')))

app.use('/',userRouter)
app.use('/admin',adminRouter)

// app.use((req, res, next) => {
//     // console.log(`404 - Route not found: ${req.originalUrl}`);
//     res.status(404).render('page-404');
// });

// // Global Error Handler (for errors thrown in controllers)
// app.use((err, req, res, next) => {
//     // console.error(`Error occurred: ${err.message}`, err.stack);

//     // Handle Mongoose CastError (e.g., invalid ObjectId)
//     if (err.name === 'CastError') {
//         return res.status(400).render('page-404', { 
//             errorMessage: 'Invalid ID provided' 
//         });
//     }

//     // Generic server error
//     res.status(500).render('page-404', { 
//         errorMessage: 'Something went wrong on the server' 
//     });
// });

app.listen(process.env.PORT,()=>console.log(`Server started at http://localhost:${process.env.PORT}`))

module.exports=app
