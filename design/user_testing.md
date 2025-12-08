# User Testing

**Task List Table** 

| Task Name | Instruction | Rationale |
| :---- | :---- | :---- |
| Account Creation | Create a RunBuddy account with your .edu email. | Tests friction points during account set-up and checks email verification |
| User Profile Set-up | Fill in your personal details, upload a profile picture, and add an emergency contact. | Checks if required fields feel relevant and not overwhelming for a beginner runner and helps identify drop-off risks |
| Explore Dashboard | Explore the main dashboard and navigation bar. Locate the two matching features and describe how they differ. | Shows whether the app makes it easy for user to form an accurate mental model of the its structure without prompting |
| Send Run Invite | Open the One Run Matching feature. Create and send a run invite. | Tests workflow clarity and identifies any issues with sending out invites |
| Accept Invite | Look at your pending invites and accept one run invitation.  | Again, tests workflow clarity and ensures that users understand the different statuses of invitations  |
| Explore Run | Open the now confirmed run, view details, and initiate a conversation with the other runner. | Tests understanding of run logistics and checks whether messaging feels integrated and intuitive enough |
| Cancel Run | Cancel the run and see whether the unmatched runner can still message you. | Checks whether status changes and communication permissions feel logical and predictable |
| Accept Different Invite | Return to One Run Matching and accept another run invite. Complete the same steps.  | Ensures that users can reliably repeat the invite workflow and understand the multiple invitations set-up |
| Complete Run | Mark the run as completed after finishing and return to the dashboard.  | Ensures that the post-run action is discoverable and the site still feels navigable upon ceasing interaction with One Run Matching |
| Browse Suggestions | Locate and open the Partner Matching feature. Browse through the recommendations. | Checks whether users can distinguish the long-term matching from the one-time matching flow. Shows whether the UI for browsing makes sense and feels enjoyable |
| Change Preferences | Change your pace and running distance preferences in your user profile and return to Partner Matching. | Ensures that users understand the preference settings and their impact on how match suggestions are generated |
| Explore Filtering | Filter your suggestions by gender. | Verify that filtering controls are also intuitive and that users understand their impact on viewable suggestions. |
| Accept/Reject Suggestions | Accept or reject some of the match suggestions. | Test whether users understand the mechanics and emotional tone of their interactions |
| Explore Match | After matching, start a conversation with them. | Ensures that messaging is easily accessible upon matching |
| Schedule Run | Schedule a run with your new match. | Verify that users understand that long-term matches translate into consistent, coordinated activity |
| Create a Shared Goal | Create a new shared goal with your match. Generate a series of steps for this goal and save them. | Tests that the goal-setting workflow is understandable and that the steps created by the LLM are meaningful to the user |
| Create a Milestone Map | Create a new shared map with your match. Create a milestone to commemorate your first run together.  | Tests that the map workflow is understandable and that users understand the intended purpose of the map |
| Log Out | Log out of your account. | Confirms that account controls are easily navigable from the dashboard. |

**User 1 Testing Summary**

The user generally found RunBuddy intuitive and easy to use, frequently noting that the navigation markers and workflows ‘made sense and felt self-explanatory’. The initial foundational tasks like account creation and profile set-up went smoothly without any appearance of hesitation or frustration on the user’s part; she observed that it just felt like the set-up process for any other app she would use and that it did not feel prohibitively long or complicated. While exploring the dashboard, she was able to accurately articulate what she thought the difference between the One Run Matching and Partner Matching features were, noting that the wording made it easy to comprehend without additional context.

There was some frustration when creating and sending an invite: The user expressed discomfort as she felt like she had to use her home address as a meeting location like one would for an Uber pick-up even though there was no indication that she had to do so. She appeared visibly frustrated when having to scroll through dates and times for the invite details. The app actually would have allowed the user to type the date but, evidently, this did not feel accessible to her. She also experienced momentary confusion when locating received pending invites, although she did vocalize that she liked the accepted run directly opening up with clear details. The user also observed that ‘the run details felt relevant and informative’.

After initiating a thread and canceling a run, she expressed surprise that she could no longer message the now unmatched runner—she noted that this felt restricting, as she may have wanted to contact them again to run at a different time. However, she did appreciate the concern for safety behind this functionality and understood that a user may want to unmatch with someone for non-amicable reasons. In Partner Matching, the user felt that there was a mismatch between the appearance and intended action of the thumbs-up request button. Adjusting pace preferences yielded a lower number of suggestions which she said felt ‘disappointing’ and wished there was more flexibility in match generation. 

Despite these observations, the user consistently remarked that the app was easy to navigate and once a feature was found, the flow felt logical with no need for external guidance. She described the overall experience as positive and indicated that she would recommend the app to her friends. 

**User 2 Testing Summary**

The user was able to recognize representative symbols like the calendar symbol to select a time and date to send an invite out. She felt she could easily navigate registering, verifying her email, and exploring the dashboard. The user hit issues in the transition between registering and going to put in her profile information. She looked to me for prompting and did not intuitively understand what her first actions should be. I suggested she go from the dashboard to her profile and after this instruction she was able to find the profile section without assistance. 

The user easily navigated from the profile section to the matching page but was unsure about the difference between “One Run Matching” and “Partner Matching”. She was able to understand the functions available in each matching sub-genre and created and accepted matches without prompting. The user felt that the messaging functionality was intuitive and quickly navigated to it via the buttons on the run details page.

Generally, the user expressed a desire for a “walk through” function for new users or more tests explaining the different features. However the user did express that navigating all the features was easy even if she did not intuitively distinguish their individual purposes. 

**Design Flaws/Opportunities**

1. **Flaw/Opportunity:** In Partner Matching, the intended action of the thumbs-up symbol felt unclear.  
   **Why it is occurring:** The user was confused about what the thumbs-up symbol meant, as it is typically used for a relatively more passive action as opposed to actually sending a request. They expressed a preference for a more descriptive button which would make it clear that they were about to directly interact with the other user.  
   **Ways to address:** Instead of a thumbs-up button or a symbol, we could simply use a button with text clarification that says ‘Send request’. This would eliminate the feeling of confusion about the purpose of the button.

2. **Flaw/Opportunity:** After initiating a conversation for a one-time run, navigating back to the run details was too long a process.  
   **Why it is occurring:** The user accepted a run and viewed the details before starting a conversation thread with the other runner. However, when they wanted to navigate back to the run details, there was no clear indicator of how to do so and they went all the way back through the Matches \> One Run Matching \> Current Runs \> View Details navigation flow.  
   **Ways to address:** We could add a ‘Return to run details’ button that appears in any One Run Matching-based message thread that leads the user directly back to the run details instead of forcing them to navigate from the app’s dashboard all over again.

1. **Flaw/ Opportunity:** Users hesitated when inputting their pace into their profiles.  
   **Why it is occurring:** Pace in terms of minutes/ miles appears ambiguous, particularly to new runners whose pace fluctuates depending on the length of the run as well as other factors. One of the user testers asked follow-up questions to determine how the information would be interpreted and ultimately reduced her pace by 30 seconds.  
   **Ways to address:** Allow a range to be entered as opposed to a stagnant time. This also broadens the pool of runners they are shown for partner matching as more runners may have an overlapping pace.

2. **Flaw/ Opportunity:** Ambiguous presentation of  “One Time Run” versus “Partner Matching”.  
   **Why it is occurring:** User was presented with the “One Time Run” and “Partner Matching” buttons and appeared confused about the impact of her choice and what they represented.  
   **Ways to address:** Add specific descriptors to distinguish between “One Time Run” and “Partner Matching” underneath the buttons with further instructions on each page to inform the user of the purpose of the pages and how they should navigate them.

