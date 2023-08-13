const app=require("./app")
const connectDB=require("./database")
const dotenv=require("dotenv")
const cloudinary=require("cloudinary")

dotenv.config({path:"config/config.env"})

//Connecting to Database
connectDB()

cloudinary.config({
    cloud_name:process.env.CLOUDINARY_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET
})

//Handling uncaught exception
process.on("uncaughtException",(err)=>{
    console.log(`Error:${err.message}`)
    console.log("Shutting down the server due to Uncaught Exception")
    process.exit(1)
})



const server=app.listen(process.env.PORT,()=>{
    console.log(`Server is running at http://localhost:${process.env.PORT||4000}`)
})

//Unhandled Promise Rejections
process.on("unhandledRejection",err=>{
    console.log(`Error:${err.message}`)
    console.log("Shutting down the server due to Unhandled Promise Rejection")
    server.close(()=>{
        process.exit(1)
    })
})