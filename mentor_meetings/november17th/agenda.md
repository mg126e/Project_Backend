# TA Meeting Agenda – November 17th

Meeting Time: 5:45 

**Agenda**

* \~5 minutes changes from last week, pivot from groups to partners  
* \~35 minutes for questions, reviewing our assignment, and getting feedback  
* \~5 minutes to discuss plans and action items

**Progress Report**  
We met up three times this past week to cover the changes we needed to make for our project idea. We met with Professor Jackson to brainstorm changes for our application, and landed on what we included in our problem framing assignment. We resubmitted the problem framing assignment, as well as our project pitch. We are currently working on functional design.  

**Questions**

* Our number and organization of concepts?  
  * How to set up **PasswordAuthentication** and **UserVerification** concepts?  
    * Should they be separate concepts that use a sync? Should user verifying just be an effect contained in a **register** action in the **PasswordAuthentication** concept? Should the register action be taken out of **PasswordAuthentication** and be solely contained in **UserVerification**?   
* How should we go about user verification?  
  * Send code to student’s email and verify it is correct  
  * Google sign in, which would get rid of our **PasswordAuthentication** concept?   
  * Use student ID somehow?  
* How to start with implementation in terms of setup? We cannot fork the backend repo again. 
* Feedback on our visual design study?

**Design changes**  
We made the huge design change of going from a run club based app to partnerships. This was a big shift and we thought about what features would most make sense with this type of app, which also affected which final features we ended up with.

**Issues**  
We initially struggled after needing to transition our problem, but met with Professor Jackson to also help us narrow down our ideas. 

**Plans and Decisions**

- We will complete Functional Design  
- We will continue to meet to discuss our plans

**Meeting Notes**
- Email verification
 - Check code generated is same code that user puts as input
- Do keep the password authentication concept
- Register would be a sync, two parts in both concepts
 - In PA, register is to add/log user and password
 - In EV, register should trigger the email to be sent to the user 
 - Check the email domain is from a Boston area and ends with .edu
 - This is sufficient in terms of security in combination with the code
- Can clone the backend repo or just copy and paste in the source code
- For checkpoints:
 - They will be graded on a check-/check/check+ basis
 - Can have features that may just be working on backend, just make note of it 
 - Can add a corresponding frontend even if may not be working
 - Don’t need to recopy problem framing, can just add a link to most recent version and specify if any changes were made
