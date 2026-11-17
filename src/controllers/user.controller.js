import { userModel } from "../models/user.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { createHash } from "node:crypto";
import "dotenv/config";
import { sessionModel } from "../models/session.model.js";
import { decode } from "node:punycode";

export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const isAlreadyRegister = await userModel.findOne({
      $or: [{ username }, { email }],
    });

    if (isAlreadyRegister) {
      return res.status(409).json({
        message: "Account already exists.",
      });
    }

    const hashPassword = await bcrypt.hash(password, 10);

    const user = await userModel.create({
      username,
      password: hashPassword,
      email,
    });

    const refreshToken = jwt.sign(
        {
            id: user._id,
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "7d"
        }
    )


    const hashRefreshToken = createHash("sha256").update(refreshToken).digest("hex");

    const session = await sessionModel.create({
        user: user._id,
        refreshToken: hashRefreshToken,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
        revoked: false
    })

    const accessToken = jwt.sign(
      {
        id: user._id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "15m",
      },
    );

    

    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        socure: true,
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000
    })


    res.status(201).json({
        message: "User register successfully",
        users: {
            username,
            email,
        },
        accessToken
    })
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({
      message: "Registration failed.",
    });
  }
};


export const login = async (req, res) => {

    const {email, password} = req.body;

    const user = await userModel.findOne({email});

    if(!user){
        return res.status(401).json({
            message: 'Invalid email and password',
        })
    }


     const hashPassword = await bcrypt.hash(password, 10);

    if(!hashPassword){
        return res.status(401).json({
            message: "Invalid email and password",
        })
    }

    const refreshToken = jwt.sign(
        {
            id: user._id,
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "7d"
        }
    )

    const hashRefreshToken = createHash("sha256").update(refreshToken).digest("hex");

    const session = await sessionModel.create({
        user: user._id,
        refreshToken: hashRefreshToken,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
        revoked: false
    })

    const accessToken = jwt.sign(
        {
            id: user._id,
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "15m"
        }
    )

    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        socure: true,
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000
    })

    res.status(200).json({
        message: "Login successfully",
        users: {
            username: user.username,
            email: user.email,
        },
        accessToken,
        refreshToken
    })

}

export const getMe = async (req, res) => {
  try {
    
    const token = req.headers.authorization?.split(" ")[ 1 ];

    if(!token){
        return res.status(401).json({
            message: "Authorization token is missing.",
          });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await userModel.findById(decoded.id);
    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    return res.status(200).json({
      message: "User fetched successfully.",
      user: {
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        message: "Invalid or expired token.",
      });
    }

    console.error("Get user error:", error);
    return res.status(500).json({
      message: "Could not fetch user.",
    });
  }
};


export const refreshToken = async (req, res) => {
    
    const refreshToken = req.cookies.refreshToken;

    if(!refreshToken){
        return res.status(401).json({
            message: "Refresh token is missing.",
        }) 
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    const refreshTokenHash = createHash("sha256").update(refreshToken).digest("hex");

    const session = await sessionModel.findOne({
        refreshToken: refreshTokenHash,
        revoked: false
    })  

    if(!session){
        return res.status(404).json({
            message: "Session not found or revoked.",
        })
    }

    const accessToken = jwt.sign(
        {
            id: decoded.id
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "15m"
        }
    )

    const refreshTokenNew = jwt.sign(
        {
            id: decoded.id
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "7d"
        }
    )

    const newRefreshTokenHash = createHash("sha256").update(refreshTokenNew).digest("hex");

    session.refreshToken = newRefreshTokenHash;
    await session.save();
    
    res.status(200).json({
        accessToken: accessToken,
        refreshToken: refreshTokenNew
    })
}


export const logout = async (req, res) => {

    const refreshToken = req.cookies.refreshToken;

    if(!refreshToken){
        return res.status(409).json({
            message: "Refresh token not found",
        })
    }

    const refreshTokenHash = createHash("sha256").update(refreshToken).digest("hex");

    const session = await sessionModel.findOne(
        { 
            refreshToken: refreshTokenHash ,
            revoked: false
        }
    );

    if(!session){
        return res.status(404).json({
            message: "Session not found or already revoked",
        })
    }

    session.revoked = true;
    await session.save();

    res.clearCookie("refreshToken");

    return res.status(200).json({
        message: "Logged out successfully",
    })  

}

export const logoutAll = async (req, res) => {

    const refreshToken = req.cookies.refreshToken;

    if(!refreshToken){
        return res.status(400).json({
            message: "Refresh token not found",
        })
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    await sessionModel.updateMany({
        user: decode.id,
        revoked: false
    },{
        revoked: true
    })

    res.clearCookie("refreshToken")

    return res.status(200).json({
        message: "Logout from all deviced successfully",
    })
}