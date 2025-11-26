concept EmailVerification [User, Email, Code, Time]

purpose ensure only users with valid Boston-area .edu email 
addresses can complete registration and access the app

principle when a user registers, a verification code is sent 
to their email; they must submit that same code before their 
account is activated

state
  a set of EmailVerifications with
    user User
    email Email
    verificationCode Code
    isVerified Boolean
    codeSentAt Time

actions
  register (user: User, email: Email): ()
    requires user already exists in PasswordAuthentication
      and email domain is a valid Boston-area .edu domain
      and no active verification exists for this user
    effects generate verificationCode := fresh Code
      send verificationCode to email
      store EmailVerification { user, email, verificationCode, isVerified := false, codeSentAt := now }

  verifyCode (user: User, code: Code): ({ success: Boolean, error?: String })
    requires verification exists for user
      and verification is not expired
      and isVerified = false
    effects if code = verificationCode then
              set isVerified := true
              return { success: true }
            else
              return { success: false, error: "invalid code" }

  resendCode (user: User): ()
    requires verification exists for user
      and isVerified = false
    effects generate new verificationCode := fresh Code
      send verificationCode to stored email
      update verificationCode := new verificationCode
      update codeSentAt := now

queries
  _isEmailVerified (user: User): (isVerified: Boolean)
    effects return true when an EmailVerification exists for user with isVerified = true

  _getVerificationStatus (user: User):
    (email: Email, isVerified: Boolean, codeSentAt: Time)?
    effects return the EmailVerification record for user, or null if none exists

