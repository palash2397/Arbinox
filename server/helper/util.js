import config from "config";
import jwt from 'jsonwebtoken';
import mailTemplet from "../helper/mailtemplet"
import nodemailer from 'nodemailer';
let nodemailerService = config.get('nodemailer.service')
let nodemailerUser = config.get('nodemailer.user')
let nodemailerPass = config.get('nodemailer.pass')
module.exports = {


  getOTP() {
    var otp = Math.floor(1000 + Math.random() * 9000);
    return otp;
  },

  getToken: async (payload) => {
    var token = await jwt.sign(payload, config.get('jwtsecret'), { expiresIn: "24h" })
    return token;
  },


  genBase64: async (data) => {
    return await qrcode.toDataURL(data);
  },

  signloignOtp: async (to, firstName, otp) => {
    try {
      let html = mailTemplet.signloginOtp(firstName, otp)
      var transporter = nodemailer.createTransport({
        service: nodemailerService,
        auth: {
          "user": nodemailerUser,
          "pass": nodemailerPass
        },
      });
      var mailOptions = {
        from: "<do_not_reply@gmail.com>",
        to: to,
        subject: 'One Time Password (OTP) for MECAP arbitrage Account Login',
        html: html
      };
      return await transporter.sendMail(mailOptions)
    } catch (error) {
      console.log("error ==>>>", error);
      throw error;
    }

  },
  signForgotOtp: async (to, firstName, otp) => {
    try {
      let html = mailTemplet.forgotPassword(firstName, otp)
      var transporter = nodemailer.createTransport({
        service: nodemailerService,
        auth: {
          "user": nodemailerUser,
          "pass": nodemailerPass
        },
      });
      var mailOptions = {
        from: "<do_not_reply@gmail.com>",
        to: to,
        subject: 'One Time Password (OTP) for MECAP arbitrage Account Reset Password',
        html: html
      };
      return await transporter.sendMail(mailOptions)
    } catch (error) {
      console.log("error ==>>>", error);
      throw error;
    }

  },
  signResendOtp: async (to, firstName, otp) => {
    try {
      let html = mailTemplet.resendOtp(firstName, otp)
      var transporter = nodemailer.createTransport({
        service: nodemailerService,
        auth: {
          "user": nodemailerUser,
          "pass": nodemailerPass
        },
      });
      var mailOptions = {
        from: "<do_not_reply@gmail.com>",
        to: to,
        subject: 'One Time Password (OTP) for MECAP arbitrage Account Verification',
        html: html
      };
      return await transporter.sendMail(mailOptions)
    } catch (error) {
      console.log("error ==>>>", error);
      throw error;
    }

  },

  contactUsendEmail: async (to, email, mobile, name, message) => {
    try {
      let html = mailTemplet.contactUS(email, mobile, name, message)
      var transporter = nodemailer.createTransport({
        service: nodemailerService,
        auth: {
          "user": nodemailerUser,
          "pass": nodemailerPass
        },
      });
      var mailOptions = {
        from: "<do_not_reply@gmail.com>",
        to: 'no-vishnu@mailinator.com',
        subject: 'Contact Us',
        html: html
      };
      return await transporter.sendMail(mailOptions)
    } catch (error) {
      console.log("error ==>>>", error);
      throw error;
    }

  },

  generateCode() {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < 10; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  },

  generateOrder() {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < 10; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return "ORD-" + result;
  },


  paginationFunction: (result, page, limit) => {
    let endIndex = page * limit;
    let startIndex = (page - 1) * limit;
    var resultArray = {}

    resultArray.page = page
    resultArray.limit = limit
    resultArray.remainingItems = result.length - endIndex

    if (result.length - endIndex < 0) {
      resultArray.remainingItems = 0

    }
    resultArray.count = result.length
    resultArray.results = result.slice(startIndex, endIndex)
    return resultArray
  },

  generatePassword: async () => {
    const alpha = 'abcdefghijklmnopqrstuvwxyz';
    const calpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const num = '1234567890';
    const specials = '!@#$%&*';
    const options = [alpha, alpha, alpha, calpha, calpha, num, num, specials];
    let opt, choose;
    let pass = "";
    for (let i = 0; i < 8; i++) {
      opt = Math.floor(Math.random() * options.length);
      choose = Math.floor(Math.random() * (options[opt].length));
      pass = pass + options[opt][choose];
      options.splice(opt, 1);
    }
    return pass
  },


  sendUserActiveEmail: async (userResult, adminResult) => {
    let html = mailTemplet.activeAccount(userResult.email)
    var transporter = nodemailer.createTransport({
      service: nodemailerService,
      auth: {
        "user": nodemailerUser,
        "pass": nodemailerPass
      },
    });
    var mailOptions = {
      from: "<do_not_reply@gmail.com>",
      to: userResult.email,
      subject: 'MECAP arbitrage Account Activated',
      html: html
    };
    return await transporter.sendMail(mailOptions)
  },

  sendUserblockEmail: async (userResult, adminResult, reason) => {
    let html = mailTemplet.inActiveAccount(userResult.email, reason, adminResult.email)
    var transporter = nodemailer.createTransport({
      service: nodemailerService,
      auth: {
        "user": nodemailerUser,
        "pass": nodemailerPass
      },
    });
    var mailOptions = {
      from: "<do_not_reply@gmail.com>",
      to: userResult.email,
      subject: 'MECAP arbitrage Account Suspended',
      html: html
    };
    return await transporter.sendMail(mailOptions)
  },

  generateOrderId(count) {
    var str = "" + count
    var pad = "00000"
    var ans = pad.substring(0, pad.length - str.length) + str
    return "SUB-" + ans;
  },

  sendEmailInsufficientBalance: async (userResult) => {
    let html = mailTemplet.insufficientBalance('User')
    var transporter = nodemailer.createTransport({
      service: nodemailerService,
      auth: {
        "user": nodemailerUser,
        "pass": nodemailerPass
      },
    });
    var mailOptions = {
      from: "<do_not_reply@gmail.com>",
      to: userResult.email,
      subject: 'Insufficient Balance',
      html: html
    };
    return await transporter.sendMail(mailOptions)
  },

  sendEmailCloseTrade: async (email, name, arbitrage_Name, symbol, capital, profit) => {
    let html = mailTemplet.tradeClose(name, arbitrage_Name, symbol, capital, profit)
    var transporter = nodemailer.createTransport({
      service: nodemailerService,
      auth: {
        "user": nodemailerUser,
        "pass": nodemailerPass
      },
    });
    var mailOptions = {
      from: "<do_not_reply@gmail.com>",
      to: email,
      subject: 'Trade completed successfully.',
      html: html
    };
    return await transporter.sendMail(mailOptions)
  },

  sendEmailCreadential: async (email, password, websiteURL) => {
    let html = mailTemplet.inviteUser(email, password, websiteURL)
    var transporter = nodemailer.createTransport({
      service: nodemailerService,
      auth: {
        "user": nodemailerUser,
        "pass": nodemailerPass
      },
    });
    var mailOptions = {
      from: "<do_not_reply@gmail.com>",
      to: email,
      subject: 'Invitation to Use MECAP arbitrage.',
      html: html
    };
    return await transporter.sendMail(mailOptions)
  },


  mailForExpCashPayment: async (to,) => {
    try {
      let html = mailTemplet.paymentRequestCash()
      var transporter = nodemailer.createTransport({
        service: nodemailerService,
        auth: {
          "user": nodemailerUser,
          "pass": nodemailerPass
        },
      });
      var mailOptions = {
        from: "<do_not_reply@gmail.com>",
        to: to,
        subject: 'Your Subscription is Expiring Soon – Renew Now!',
        html: html
      };
      return await transporter.sendMail(mailOptions)
    } catch (error) {
      console.log("error ==>>>", error);
      throw error;
    }

  },

  sendEmailForSubscribe: async (to) => {
    try {
      let html = mailTemplet.newsletterSubscription()
      var transporter = nodemailer.createTransport({
        service: nodemailerService,
        auth: {
          "user": nodemailerUser,
          "pass": nodemailerPass
        },
      });
      var mailOptions = {
        from: "<do_not_reply@gmail.com>",
        to: to,
        subject: 'Welcome to Mecap!',
        html: html
      };
      return await transporter.sendMail(mailOptions)
    } catch (error) {
      console.log("error ==>>>", error);
      throw error;
    }

  },
    
  sendEmailForSubscribeAdmin: async (to) => {
    try {
      let html = mailTemplet.newsletterSubscriptionAdmin(to)
      var transporter = nodemailer.createTransport({
        service: nodemailerService,
        auth: {
          "user": nodemailerUser,
          "pass": nodemailerPass
        },
      });
      var mailOptions = {
        from: "<do_not_reply@gmail.com>",
        to: "mecapdsc@gmail.com",
        subject: 'New Subscription Alert!',
        html: html
      };
      return await transporter.sendMail(mailOptions)
    } catch (error) {
      console.log("error ==>>>", error);
      throw error;
    }

  },
  sendMailContactus: async (to, name, userNames, emails, msg, telegramId) => {
    let html =
      `<!DOCTYPE html>
    <html lang="en">
    
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Mecap!</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
            }
    
            .main-container {
                max-width: 600px;
                margin: 0 auto;
                background: linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, #000000 36.2%);
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
            }
    
            .container {
                background: #FFFFFF;
                border-radius: 8px;
                padding: 25px;
                margin-top: 30px;
            }
    
            header {
                text-align: center;
                margin-bottom: 20px;
            }
    
            header img {
                width: 100px;
            }
    
            h2 {
                color: #584BFF;
                font-size: 20px;
                text-align: center;
                margin-bottom: 20px;
            }
    
            hr {
                border: none;
                border-top: 2px solid #f4f4f4;
                margin: 20px 0;
            }
    
            p, li {
                color: #555;
                font-size: 16px;
                margin: 15px 0;
                line-height: 1.6;
            }
    
            ul {
                padding-left: 20px;
            }
    
            .footer {
                font-size: 14px;
                color: #9B95FF;
                margin-top: 20px;
                text-align: center;
            }
    
            .footer p {
                margin: 5px 0;
            }
        </style>
    </head>
    
    <body>
        <div class="main-container">
            <div class="container">
                <header>
                    <img src="https://res.cloudinary.com/dyg2twlt1/image/upload/v1728993853/jzfmesrbmds3wrp4lolf.png" alt="Block1Tech" width="130px">
                </header>
                <h2>New User Query - MECAP</h2>
                <hr>
    <p><b>Dear <span id="userName">${name},</span></b></p>
    <p>We wanted to inform you that you have received a message from <b>${userNames}</b> regarding their inquiry.</p>
    
    <p>The details of the user's query are as follows:</p>
    
    <blockquote style="margin: 20px 0; padding: 15px; background-color: #f6f9fd; border-left: 4px solid #092147;">
        <p><i>"${msg}"</i></p>
    </blockquote>

    <p>For further communication, you may contact the user at:</p>
    <p><b>Email:</b> ${emails}</p>

                <p>Thank you for choosing Mecap, and we look forward to a fruitful journey together.</p>
                
                <p>Best regards,</p>
                <p>Mecap</p>
            </div>
            <div class="footer">
                <p>&copy; 2024 Mecap. All rights reserved.</p>
            </div>
        </div>
    </body>
    
    </html>
  `

    var transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // use SSL
      service: config.get("nodemailer.service"),
      auth: {
        user: config.get("nodemailer.user"),
        pass: config.get("nodemailer.pass"),
      },
    });

    var mailOptions = {
      from: "<do_not_reply@gmail.com>",
      to: to,
      subject: `User Query`,
      html: html,
    };
    return await transporter.sendMail(mailOptions);
  },
  sendMailContactusUser: async (to, name, msg) => {
    let html =
      `<!DOCTYPE html>
    <html lang="en">
    
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Mecap!</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
            }
    
            .main-container {
                max-width: 600px;
                margin: 0 auto;
                background: linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, #000000 36.2%);
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
            }
    
            .container {
                background: #FFFFFF;
                border-radius: 8px;
                padding: 25px;
                margin-top: 30px;
            }
    
            header {
                text-align: center;
                margin-bottom: 20px;
            }
    
            header img {
                width: 100px;
            }
    
            h2 {
                color: #584BFF;
                font-size: 20px;
                text-align: center;
                margin-bottom: 20px;
            }
    
            hr {
                border: none;
                border-top: 2px solid #f4f4f4;
                margin: 20px 0;
            }
    
            p, li {
                color: #555;
                font-size: 16px;
                margin: 15px 0;
                line-height: 1.6;
            }
    
            ul {
                padding-left: 20px;
            }
    
            .footer {
                font-size: 14px;
                color: #9B95FF;
                margin-top: 20px;
                text-align: center;
            }
    
            .footer p {
                margin: 5px 0;
            }
        </style>
    </head>
    
    <body>
        <div class="main-container">
            <div class="container">
                <header>
                    <img src="https://res.cloudinary.com/dyg2twlt1/image/upload/v1728993853/jzfmesrbmds3wrp4lolf.png" alt="Block1Tech" width="130px">
                </header>
                <h2>Thank You for Your Query - MECAP</h2>
                <hr>
 <p><b>Dear <span id="userName">${name},</span></b></p>
  <p>We have successfully received your query and our team is reviewing your message. You will hear from us soon.</p>

  <p><b>Your Query:</b></p>
  <blockquote style="margin: 20px 0; padding: 15px; background-color: #f6f9fd; border-left: 4px solid #092147;">
      <p>"${msg}"</p>
  </blockquote>

  <p>If you have any further information or questions, please feel free to reach out at any time. We are here to assist you.</p>

    
                <p>Thank you for choosing Mecap, and we look forward to a fruitful journey together.</p>
                
                <p>Best regards,</p>
                <p>Mecap</p>
            </div>
            <div class="footer">
                <p>&copy; 2024 Mecap. All rights reserved.</p>
            </div>
        </div>
    </body>
    
    </html>
  `

    var transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // use SSL
      service: config.get("nodemailer.service"),
      auth: {
        user: config.get("nodemailer.user"),
        pass: config.get("nodemailer.pass"),
      },
    });
    var mailOptions = {
      from: "<do_not_reply@gmail.com>",
      to: to,
      subject: `Query`,
      html: html,
    };
    return await transporter.sendMail(mailOptions);
  },

  sendMailReplyFromAdmin: async (to, name, msg, question) => {
    let html =
      `<!DOCTYPE html>
    <html lang="en">
    
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Mecap!</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
            }
    
            .main-container {
                max-width: 600px;
                margin: 0 auto;
                background: linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, #000000 36.2%);
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
            }
    
            .container {
                background: #FFFFFF;
                border-radius: 8px;
                padding: 25px;
                margin-top: 30px;
            }
    
            header {
                text-align: center;
                margin-bottom: 20px;
            }
    
            header img {
                width: 100px;
            }
    
            h2 {
                color: #584BFF;
                font-size: 20px;
                text-align: center;
                margin-bottom: 20px;
            }
    
            hr {
                border: none;
                border-top: 2px solid #f4f4f4;
                margin: 20px 0;
            }
    
            p, li {
                color: #555;
                font-size: 16px;
                margin: 15px 0;
                line-height: 1.6;
            }
    
            ul {
                padding-left: 20px;
            }
    
            .footer {
                font-size: 14px;
                color: #9B95FF;
                margin-top: 20px;
                text-align: center;
            }
    
            .footer p {
                margin: 5px 0;
            }
        </style>
    </head>
    
    <body>
        <div class="main-container">
            <div class="container">
                <header>
                    <img src="https://res.cloudinary.com/dyg2twlt1/image/upload/v1728993853/jzfmesrbmds3wrp4lolf.png" alt="Block1Tech" width="130px">
                </header>
                <h2>Response to Your Query - MECAP</h2>
                <hr>
 <p><b>Dear <span id="userName">${name},</span></b></p>
  <p>We are writing to inform you that your query has been addressed. Below is the response from our support team:</p>

  <p><b>Your Query:</b></p>
  <blockquote style="margin: 20px 0; padding: 15px; background-color: #f6f9fd; border-left: 4px solid #092147;">
      <p>"${question}"</p>
  </blockquote>

  <p><b>Admin Response:</b></p>
  <blockquote style="margin: 20px 0; padding: 15px; background-color: #f6f9fd; border-left: 4px solid #092147;">
      <p>${msg}</p>
  </blockquote>

  <p>We hope this resolves your query. If you have any further questions or need additional assistance, please don't hesitate to reach out.</p>
              
                
                <p>Best regards,</p>
                <p>Mecap</p>
            </div>
            <div class="footer">
                <p>&copy; 2024 Mecap. All rights reserved.</p>
            </div>
        </div>
    </body>
    
    </html>
  `

    var transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // use SSL
      service: config.get("nodemailer.service"),
      auth: {
        user: config.get("nodemailer.user"),
        pass: config.get("nodemailer.pass"),
      },
    });
    var mailOptions = {
      from: "<do_not_reply@gmail.com>",
      to: to,
      subject: `Query Reply`,
      html: html,
    };
    return await transporter.sendMail(mailOptions);
  },
}

