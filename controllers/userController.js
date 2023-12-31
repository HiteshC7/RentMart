const ErrorHandler = require("../utils/errorhandler")
const catchAsyncErrors = require("../middleware/catchAsyncErrors")
const User = require("../models/userModel")
const sendToken = require("../utils/jwtToken")
const sendEmail = require("../utils/sendEmail")
const crypto = require("crypto")
const cloudinary = require("cloudinary")

//Register a user
exports.registerUser = catchAsyncErrors(async (req, res, next) => {
    const myCloud = await cloudinary.v2.uploader.upload(req.body.avatar, {
        folder: "avatars",
        width: 150,
        crop: "scale"
    })
    const { name, email, password } = req.body
    const user = await User.create({ name, email, password, avatar: { public_id: myCloud.public_id, url: myCloud.secure_url } })

    sendToken(user, 201, res)
})

//User Login
exports.loginUser = catchAsyncErrors(async (req, res, next) => {
    const { email, password } = req.body

    //Checking if user has given both email and password
    if (!email || !password) {
        return next(new ErrorHandler("Please enter email & password", 400))
    }
    const user = await User.findOne({ email: email }).select("+password")
    if (!user) {
        return next(new ErrorHandler("Invalid email or password", 401))
    }
    const isPasswordMatched = await user.comparePassword(password)
    if (!isPasswordMatched) {
        return next(new ErrorHandler("Invalid email or password", 401))
    }
    sendToken(user, 200, res)
})

//User logout
exports.logout = catchAsyncErrors(async (req, res, next) => {
    res.cookie("token", null, {
        expires: new Date(Date.now()),
        httpOnly: true
    })

    res.status(200).json({
        success: true,
        message: "Logged out"
    })
})

//Forgot password
exports.forgotPassword = catchAsyncErrors(async (req, res, next) => {
    const user = await User.findOne({ email: req.body.email })

    if (!user) {
        return next(new ErrorHandler("User not found", 404))
    }

    //Get ResetPassword Token
    const resetToken = user.getResetPasswordToken()

    await user.save({ validateBeforeSave: false })

    const resetPasswordUrl = `${process.env.FRONTEND_URL}/password/reset/${resetToken}`

    const message = `Your password reset token is:- \n\n ${resetPasswordUrl} \n\nIf you have not requested for this email then please ignore it`

    try {
        await sendEmail({
            email: user.email,
            subject: `Rentmart password recovery`,
            message
        })

        res.status(200).json({
            success: true,
            message: `Email sent to ${user.email} successfully`
        })
    } catch (error) {
        user.resetPasswordToken = undefined
        user.resetPasswordExpire = undefined

        await user.save({ validateBeforeSave: false })

        return next(new ErrorHandler(error.message, 500))
    }
})


//Reset Password
exports.resetPassword = catchAsyncErrors(async (req, res, next) => {
    //Creating token hash
    const resetPasswordToken = crypto.createHash("sha256").update(req.params.token).digest("hex")
    const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() }
    })

    if (!user) {
        return next(new ErrorHandler("Reset password token is invalid or has been expired", 400))
    }

    if (req.body.password != req.body.confirmPassword) {
        return next(new ErrorHandler("Password does not match", 400))
    }

    user.password = req.body.password
    user.resetPasswordExpire = undefined
    user.resetPasswordToken = undefined

    await user.save()
    sendToken(user, 200, res)
})

//Get User Detail
exports.getUserDetail = catchAsyncErrors(async (req, res, next) => {

    const user = await User.findById(req.user.id)

    res.status(200).json({
        success: true,
        user
    })
})

//Update User Password
exports.updateUserPassword = catchAsyncErrors(async (req, res, next) => {

    const user = await User.findById(req.user.id).select("+password")

    const isPasswordMatched = await user.comparePassword(req.body.oldPassword)

    if (!isPasswordMatched) {
        return next(new ErrorHandler("Old password is incorrect", 400))
    }

    if (req.body.newPassword !== req.body.confirmPassword) {
        return next(new ErrorHandler("Password does not match", 400))
    }
    user.password = req.body.newPassword

    await user.save()

    sendToken(user, 200, res)
})

//Update User Profile
exports.updateUserProfile = catchAsyncErrors(async (req, res, next) => {

    const newUserData = {
        name: req.body.name,
        email: req.body.email
    }

    if (req.body.avatar !== "") {
        const user = await User.findById(req.user.id)
        const imageId = user.avatar.public_id
        await cloudinary.v2.uploader.destroy(imageId)
        const myCloud = await cloudinary.v2.uploader.upload(req.body.avatar, {
            folder: "avatars",
            width: 150,
            crop: "scale"
        })
        newUserData.avatar = {
            public_id: myCloud.public_id,
            url: myCloud.secure_url
        }
    }

    const user = await User.findByIdAndUpdate(req.user.id, newUserData, {
        new: true,
        runValidators: true,
        useFindAndModify: false
    })

    res.status(200).json({
        success: true
    })
})


//Get all users(admin)
exports.getAllUsers = catchAsyncErrors(async (req, res, next) => {
    const users = await User.find()

    res.status(200).json({
        success: true,
        users
    })
})

//Get single user detail(admin)
exports.getSingleUser = catchAsyncErrors(async (req, res, next) => {
    const user = await User.findById(req.params.id)

    if (!user) {
        return next(new ErrorHandler(`User does not exist with id:${req.params.id}`))
    }

    res.status(200).json({
        success: true,
        user
    })
})

//Update User Role(admin)
exports.updateUserRole = catchAsyncErrors(async (req, res, next) => {

    const newUserData = {
        name: req.body.name,
        email: req.body.email,
        role: req.body.role
    }
    let user=User.findById(req.params.id)
    if(!user)
    {
        return next(
            new ErrorHandler(`User does not exist with this Id.`)
        )
    }
     user = await User.findByIdAndUpdate(req.params.id, newUserData, {
        new: true,
        runValidators: true,
        useFindAndModify: false
    })

    res.status(200).json({
        success: true
    })
})

//Delete User (admin)
exports.deleteUser = catchAsyncErrors(async (req, res, next) => {

    const user = await User.findById(req.params.id)

    if (!user) {
        return next(new ErrorHandler("User does not exist", 400))
    }

    const imageId = user.avatar.public_id
    
    await cloudinary.v2.uploader.destroy(imageId)

    await user.deleteOne()

    res.status(200).json({
        success: true,
        message: "User deleted successfully"
    })
})