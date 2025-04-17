module.exports = {
  signloginOtp(name, otp) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OTP Verification - ARBINOX</title>
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
            margin-top:30px
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
        p {
            color: #555;
            font-size: 16px;
            margin: 15px 0;
            line-height: 1.6;
        }
        .otp-code {
            display: inline-block;
            font-size: 26px;
            color: #FFFFFF;
            background-color: #584BFF;
            padding: 12px 20px;
            border-radius: 5px;
            font-weight: bold;
            letter-spacing: 2px;
            margin: 20px 0;
            text-align: center;
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
                <img src="https://res.cloudinary.com/dt3g0wfoh/image/upload/v1744800025/Frame_1597883771_nrpfjc.png" alt="MECAP" width="130px">
            </header>
            <h2>One Time Password (OTP) for ARBINOX Account Login</h2>
            <hr>
            <p>Dear ${name},</p>
            <p>Please use the following One Time Password (OTP) to log in to your ARBINOX account. The OTP is valid for 3 minutes.</p>
            <div class="">${otp}</div>
            <p>This OTP is essential for verifying the device from which you are attempting to access the application. For the security of your account, please refrain from sharing this OTP with anyone.</p>
            <p>Best regards,</p>
            <p>ARBINOX</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 ARBINOX. All rights reserved.</p>
            <p>Contact us at mecapdsc@gmail.com</p>
        </div>
    </div>
</body>
</html>
`;
  },
  forgotPassword(name, otp) {
    return `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verification - ARBINOX</title>
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

        p {
            color: #555;
            font-size: 16px;
            margin: 15px 0;
            line-height: 1.6;
        }

        .otp-code {
            display: inline-block;
            font-size: 26px;
            color: #FFFFFF;
            background-color: #584BFF;
            padding: 12px 20px;
            border-radius: 5px;
            font-weight: bold;
            letter-spacing: 2px;
            margin: 20px 0;
            text-align: center;
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
                <img src="https://res.cloudinary.com/dt3g0wfoh/image/upload/v1744800025/Frame_1597883771_nrpfjc.png" alt="MECAP" width="130px">
            </header>
            <h2>One Time Password (OTP) for ARBINOX Account Password Reset</h2>
            <hr>
            <p>Dear ${name},</p>
            <p>Please check your email for the One Time Password (OTP) ${otp} required to reset your password for your ARBINOX account. The OTP is valid for 3 minutes.</p>
            <p>This OTP is essential for verifying the device from which you are attempting to access the application. For the security of your account, please refrain from sharing this OTP with anyone.</p>
            <p>Best regards,</p>
            <p>ARBINOX</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 ARBINOX. All rights reserved.</p>
            <p>Contact us at mecapdsc@gmail.com</p>
        </div>
    </div>
</body>

</html>
`;
  },
  resendOtp(name, otp) {
    return ` <!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verification - ARBINOX</title>
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

        p {
            color: #555;
            font-size: 16px;
            margin: 15px 0;
            line-height: 1.6;
        }

        .otp-code {
            display: inline-block;
            font-size: 26px;
            color: #FFFFFF;
            background-color: #584BFF;
            padding: 12px 20px;
            border-radius: 5px;
            font-weight: bold;
            letter-spacing: 2px;
            margin: 20px 0;
            text-align: center;
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
                <img src="https://res.cloudinary.com/dt3g0wfoh/image/upload/v1744800025/Frame_1597883771_nrpfjc.png" alt="MECAP" width="130px">
            </header>
            <h2>One Time Password (OTP) for ARBINOX Account Verification</h2>
            <hr>
            <p>Dear ${name},</p>
            <p>Please check your email for the One Time Password (OTP) ${otp} required to verify your ARBINOX account. The OTP is valid for 3 minutes.</p>

            <p>This OTP is essential for verifying the device from which you are attempting to access the application. For the security of your account, please refrain from sharing this OTP with anyone.</p>
            
            
            <p> Best regards,</p>
            <p> ARBINOX</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 ARBINOX. All rights reserved.</p>
            <p>Contact us at mecapdsc@gmail.com</p>
        </div>
    </div>
</body>

</html>
`;
  },
  contactUS(email, mobile_no, name, message) {
    return ` <!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verification - ARBINOX</title>
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

        p {
            color: #555;
            font-size: 16px;
            margin: 15px 0;
            line-height: 1.6;
        }

        .otp-code {
            display: inline-block;
            font-size: 26px;
            color: #FFFFFF;
            background-color: #584BFF;
            padding: 12px 20px;
            border-radius: 5px;
            font-weight: bold;
            letter-spacing: 2px;
            margin: 20px 0;
            text-align: center;
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
                <img src="https://res.cloudinary.com/dt3g0wfoh/image/upload/v1744800025/Frame_1597883771_nrpfjc.png" alt="MECAP" width="130px">
            </header>
            <h2>Contact Us - ARBINOX</h2>
            <hr>
            <p><strong>Email:</strong> ${email}</p>
              <p><strong>Mobile No:</strong> ${mobile_no}</p>
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Message:</strong> ${message}</p>

            
              </br>
            <p> Best regards,</p>
            <p> ARBINOX</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 ARBINOX. All rights reserved.</p>
            <p>Contact us at mecapdsc@gmail.com</p>
        </div>
    </div>
</body>

</html>
`;
  },
  activeAccount(email) {
    return ` <!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verification - ARBINOX</title>
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

        p {
            color: #555;
            font-size: 16px;
            margin: 15px 0;
            line-height: 1.6;
        }

        .otp-code {
            display: inline-block;
            font-size: 26px;
            color: #FFFFFF;
            background-color: #584BFF;
            padding: 12px 20px;
            border-radius: 5px;
            font-weight: bold;
            letter-spacing: 2px;
            margin: 20px 0;
            text-align: center;
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
                <img src="https://res.cloudinary.com/dt3g0wfoh/image/upload/v1744800025/Frame_1597883771_nrpfjc.png" alt="MECAP" width="130px">
            </header>
            <h2>ARBINOX Account Reactivated - ARBINOX</h2>
            <hr>
            <p>Dear User's,</p>
                <p>
                  We would like to inform you that your ARBINOX account has been Reactivated. This email serves as a notification to inform you about the account Reactivation.
                </p>
                <p><strong>Email Address:</strong> ${email}</p>
                <p>
                  Thank you for your understanding and cooperation during your account activation period.
                </p>


            
            
            <p> Best regards,</p>
            <p> ARBINOX</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 ARBINOX. All rights reserved.</p>
            <p>Contact us at mecapdsc@gmail.com</p>
        </div>
    </div>
</body>

</html>
`;
  },
  inActiveAccount(email, reason, Adminemail) {
    return ` <!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verification - ARBINOX</title>
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

        p {
            color: #555;
            font-size: 16px;
            margin: 15px 0;
            line-height: 1.6;
        }

        .otp-code {
            display: inline-block;
            font-size: 26px;
            color: #FFFFFF;
            background-color: #584BFF;
            padding: 12px 20px;
            border-radius: 5px;
            font-weight: bold;
            letter-spacing: 2px;
            margin: 20px 0;
            text-align: center;
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
                <img src="https://res.cloudinary.com/dt3g0wfoh/image/upload/v1744800025/Frame_1597883771_nrpfjc.png" alt="MECAP" width="130px">
            </header>
            <h2>ARBINOX Account Suspended - ARBINOX</h2>
            <hr>
             <p>Dear User's,</p>
                <p>
                  We regret to inform you that your ARBINOX account has been temporarily suspended. This email serves as a notification to inform you about the account suspension. Below are the details:
                </p>
                <p><strong>Email Address:</strong> ${email}</p>
                <p><strong>Suspension Reason:</strong> ${reason}</p>
                <p>
                  During the suspension period, you will not be able to access your account or utilise the features and functionalities of ARBINOX. We understand that this may cause inconvenience, and we sincerely apologise for any disruption this may cause.
                </p>
                <p>
                  If you believe that the suspension has been made in error or if you have any concerns or questions regarding the account suspension, please contact our support team at mecapdsc@gmail.com. We will thoroughly review your case and provide the necessary assistance and resolution.
                </p>
                <p>
                  We value your participation, and we strive to maintain a secure and compliant environment for all users. Account suspensions are occasionally implemented to ensure the integrity of our platform and protect the interests of our users.
                </p>
                <p>
                  Thank you for your understanding and cooperation during this suspension period.
                </p>
            
            <p> Best regards,</p>
            <p> ARBINOX</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 ARBINOX. All rights reserved.</p>
            <p>Contact us at mecapdsc@gmail.com</p>
        </div>
    </div>
</body>

</html>
`;
  },
  insufficientBalance(name) {
    return ` <!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verification - ARBINOX</title>
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

        p {
            color: #555;
            font-size: 16px;
            margin: 15px 0;
            line-height: 1.6;
        }

        .otp-code {
            display: inline-block;
            font-size: 26px;
            color: #FFFFFF;
            background-color: #584BFF;
            padding: 12px 20px;
            border-radius: 5px;
            font-weight: bold;
            letter-spacing: 2px;
            margin: 20px 0;
            text-align: center;
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
                <img src="https://res.cloudinary.com/dt3g0wfoh/image/upload/v1744800025/Frame_1597883771_nrpfjc.png" alt="MECAP" width="130px">
            </header>
            <h2>Insufficient Balance - ARBINOX</h2>
            <hr>
             <p>Dear ${name},</p>
           <p> We regret to inform you that your recent attempt to execute a trade on your ARBINOX account failed due to insufficient balance.</p>

<p>To proceed with your trade, please add funds to your account.</p>
            
            
            <p> Best regards,</p>
            <p> ARBINOX</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 ARBINOX. All rights reserved.</p>
            <p>Contact us at mecapdsc@gmail.com</p>
        </div>
    </div>
</body>

</html>
`;
  },
  tradeClose(name, arbitrage_Name, symbol, capital, profit) {
    return ` <!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verification - ARBINOX</title>
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

        p {
            color: #555;
            font-size: 16px;
            margin: 15px 0;
            line-height: 1.6;
        }

        .otp-code {
            display: inline-block;
            font-size: 26px;
            color: #FFFFFF;
            background-color: #584BFF;
            padding: 12px 20px;
            border-radius: 5px;
            font-weight: bold;
            letter-spacing: 2px;
            margin: 20px 0;
            text-align: center;
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
                <img src="https://res.cloudinary.com/dt3g0wfoh/image/upload/v1744800025/Frame_1597883771_nrpfjc.png" alt="MECAP" width="130px">
            </header>
            <h2>Trade Successful - ARBINOX</h2>
            <hr>
            <p>Dear ${name},</p>
          <p>We are pleased to inform you that your recent trade executed on your ARBINOX account has been successfully completed.</p>
              <p><strong>Strategy Type:</strong> ${arbitrage_Name}</p>
               <p><strong>Symbol:</strong> ${symbol}</p>
              <p><strong>Capital:</strong> ${capital}</p>
              <p><strong>Profit:</strong> ${profit}</p>

<p>You can view the details of this transaction in your account under the "Trade History" section.</p>

<p>If you have any questions or need further assistance, please feel free to contact us.</p>

<p>Thank you for choosing ARBINOX for your trading needs</p>
  <p>Disclaimer: Past performance does not guarantee future results. Trading cryptocurrencies involves significant risk. Please seek professional financial advice before trading.</p>
            
            
            <p> Best regards,</p>
            <p> ARBINOX</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 ARBINOX. All rights reserved.</p>
            <p>Contact us at mecapdsc@gmail.com</p>
        </div>
    </div>
</body>

</html>
`;
  },
  inviteUser(email, password, websiteURL) {
    return ` <!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verification - ARBINOX</title>
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

        p {
            color: #555;
            font-size: 16px;
            margin: 15px 0;
            line-height: 1.6;
        }

        .otp-code {
            display: inline-block;
            font-size: 26px;
            color: #FFFFFF;
            background-color: #584BFF;
            padding: 12px 20px;
            border-radius: 5px;
            font-weight: bold;
            letter-spacing: 2px;
            margin: 20px 0;
            text-align: center;
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
                <img src="https://res.cloudinary.com/dt3g0wfoh/image/upload/v1744800025/Frame_1597883771_nrpfjc.png" alt="MECAP" width="130px">
            </header>
            <h2>Invitation to User - ARBINOX</h2>
            <hr>
            <p>Dear user,</p>
            <p>You have been appointed as a Sub Admin.</p>
            <p>To get started, please log in to the Admin Panel using the credentials provided below. Once logged in, you will have access to specific administrative functions based on your role.</p>
<p><strong>Email Address:</strong> ${email}</p>
              <p><strong>Password:</strong> ${password}</p>
            <p>If you have any questions or need assistance as you familiarise yourself with your new responsibilities, do not hesitate to reach out to us. </p>

            <p> Best regards,</p>
            <p> ARBINOX</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 ARBINOX. All rights reserved.</p>
            <p>Contact us at mecapdsc@gmail.com</p>
        </div>
    </div>
</body>

</html>
`;
  },

  paymentRequestCash() {
    return ` <!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verification - ARBINOX</title>
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

        p {
            color: #555;
            font-size: 16px;
            margin: 15px 0;
            line-height: 1.6;
        }

        .otp-code {
            display: inline-block;
            font-size: 26px;
            color: #FFFFFF;
            background-color: #584BFF;
            padding: 12px 20px;
            border-radius: 5px;
            font-weight: bold;
            letter-spacing: 2px;
            margin: 20px 0;
            text-align: center;
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
                <img src="https://res.cloudinary.com/dt3g0wfoh/image/upload/v1744800025/Frame_1597883771_nrpfjc.png" alt="MECAP" width="130px">
            </header>
            <h2>Your Subscription is Expiring Soon - ARBINOX</h2>
            <hr>
            <p>Dear User,</p>
           

<p>We wanted to remind you that your subscription is set to expire in a few days. To avoid any interruptions in your service, please take a moment to renew your subscription.</p>

<p>Here’s how to renew:</p>

<p>* Go to your profile: Log in and navigate to the profile section.</p>
<p>* Choose your payment plan: Select either Custom or Regular as your preferred subscription plan.</p>
<p>* Choose your payment type: Select either CARD or CRYPTO as your preferred payment method.</p>
<p>* Click the "Buy" button: Complete your renewal by clicking on the Buy button.</p>

            <p> Thank you for being a valued customer. Should you have any questions or need assistance, please do not hesitate to contact our customer support team.</p>
            <div style="margin: 40px 0 50px;">
                <!-- <a type="button" class="contactbutton" href="" target="_blank">Contact Us</a> -->
            </div>
            <p> Best regards,</p>
            <p> ARBINOX</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 ARBINOX. All rights reserved.</p>
            <p>Contact us at mecapdsc@gmail.com</p>
        </div>
    </div>
</body>

</html>
`;
  },

  newsletterSubscription() {
    return `<!DOCTYPE html>
    <html lang="en">
    
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to ARBINOX!</title>
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
                <img src="https://res.cloudinary.com/dt3g0wfoh/image/upload/v1744800025/Frame_1597883771_nrpfjc.png" alt="MECAP" width="130px">
            </header>
                <h2>Welcome to ARBINOX!</h2>
                <hr>
                <p><b>Dear User,</b></p>
                <p>We are excited to welcome you as a new subscriber to ARBINOX! You’ve successfully subscribed, and now you have full access to our exclusive resources, updates, and expert insights.</p>
    
                <p>As a valued member, you can now:</p>
                <ul>
                    <li>Receive real-time updates on the latest industry trends.</li>
                    <li>Access in-depth guides, tutorials, and expert advice.</li>
                    <li>Stay informed with personalized notifications and curated content.</li>
                    <li>Be the first to know about upcoming events, offers, and news.</li>
                </ul>
    
                <p>We are committed to providing you with the best content to keep you ahead of the game. If you have any questions or need assistance, feel free to reach out to our support team at any time.</p>
    
                <p>Thank you for choosing ARBINOX, and we look forward to a fruitful journey together.</p>
                
                <p>Best regards,</p>
                <p>ARBINOX</p>
            </div>
            <div class="footer">
                <p>&copy; 2024 ARBINOX. All rights reserved.</p>
            </div>
        </div>
    </body>
    
    </html>
    `;
  },
  newsletterSubscriptionAdmin(userEmail) {
    return `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to ARBINOX!</title>
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
                <img src="https://res.cloudinary.com/dt3g0wfoh/image/upload/v1744800025/Frame_1597883771_nrpfjc.png" alt="MECAP" width="130px">
            </header>
            <h2>New Subscription Alert</h2>
           
            
    <hr>
    <p><b>Dear Admin,</b></p>
    <p>A new user has successfully subscribed to ARBINOX.</p>

    <p><b>Subscriber's Email:</b> ${userEmail}</p>

    <p>Thank you for your attention,</p>
    <p>The ARBINOX Team</p>

        </div>
        <div class="footer">
            <p>&copy; 2024 ARBINOX. All rights reserved.</p>
        </div>
    </div>
</body>

</html>
`;
  },
};
