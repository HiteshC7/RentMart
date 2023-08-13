const mongoose=require("mongoose")
const connectDB=()=>{
    mongoose.connect(process.env.DB_URI,{
        useNewUrlParser:true,
        useUnifiedTopology:true
    }).then(()=>{
        console.log("Connected")
    })
}
module.exports=connectDB

//"mongodb://127.0.0.1:27017/FinalProject"