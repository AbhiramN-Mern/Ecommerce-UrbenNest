const { log } = require('console')
const User=require('../models/userSchema')

const loadhomepage=async(req,res)=>{
    try{
        return res.render('home')
    }catch(error){
        console.log('Home Page NOt Found')
        res.status(500).send('server Error')
    }
}
const pageNotFound=async(req,res)=>{
    try{
        res.render('page-404')
    }catch(error){
        res.redirect('/pageNotFound')
    }
}

const loadsignup=async(req,res)=>{
    try{
        return res.render('signup')
    }catch(error){
        console.log('signup page not loading ')
        res.status(500).send('server error')
    }
}


const signup=async(req,res)=>{
    const {name,email,phone,password}=req.body
    try{
    const newUSer=new User({name,email,phone,password})
    console.log(newUSer)
    
    await newUSer.save()
    console.log('1')
    return res.redirect('/signup')
    }catch(error){
        console.log('Error for save user',error)
        res.status(500).send('internal server error')
    }
}

module.exports={
    loadhomepage,
    pageNotFound,
    loadsignup,signup
}