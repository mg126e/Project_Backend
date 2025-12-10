# Gloria's Reflection

Working on this final project helped me continue to see the immense value of incremental development and the power of concept-driven design in a small team setting. Initially, I was eager to implement everything at once, but I quickly learned that, like the personal project, building concepts and testing each one at a time thoroughly before moving on is the best approach. It helps prevent smaller errors from turning into huge ones. The shift from run clubs to partnerships was also initially something I was unsure of, but it forced me to think a lot about modularity and separation of concerns.

Seeing how concepts like PasswordAuthentication and EmailVerification should be separate concepts was also helpful. It was also nice to see how after I implemented things on the frontend, certain actions didn't make sense to have, such as an setInitialized action for SharedGoals. Developing syncs was also something that, like the personal project, was a challenging part to think about, so continuing to work on that was helpful for my understanding of syncs and how different concepts can interact. The experience of working on creating a bucket in Google Cloud Storage for the profile picture uploading was also a helpful skill to learn, I hadn't ever used the GCS site before.

Overall, this experience taught me a lot about software development in a group setting and seeing again how quality in terms of code and thorough testing is more important than just quantity. 


# Marin's Reflection

Looking back on this project, I most enjoyed implementing the changes from user testing, the tweaks they prompted us to implement made a noticeable difference in smoothing the transition between matching and messaging as well as registration and profile creation.

One of the challenges I faced was the logic for automated email verification. Initially, it required all users to reload the page after verifying their email which interrupted the flow of registering. Before fixing this issue, we also implemented logic that restricts users from using the same email for multiple accounts. While necessary, this made debugging and registering difficult as I needed a new email “.edu” each time to test my updates. In the future I would prioritize thorough testing before implementing the final logic.

I used agentic coding techniques to ensure that API endpoints were correctly connected from the frontend to the backend and that the frontend paths conformed to the passthrough document. This approach helped me quickly identify and fix simple issues that stemmed from small typos or mismatched routes.

Overall, I feel that I’ve strengthened my design skills in terms of creating a project that is intuitive and smooth for the user to operate. I helped leverage logic in the backend and design choices in the frontend to make our features easy to use and accessible from the dashboard.

# Ananya's Reflection

I really enjoyed working on the User Testing assignment. It was so interesting to see how somebody with zero context about our app naturally reacted to it and explored its functionality from scratch. I also enjoyed implementing the Messaging concept in particular, although we initially ran into problems with the concept specification as we were overcomplicating it a bit when trying to fit it in the concept design framework we learnt.

I also think the implementation went well overall. We were able to use Context in a way that helped us identify what could be improved in our concept specifications before re-prompting it. We also used agentic coding tools to make the implementations more robust and structured, also allowing us to make more minor changes almost instantaneously which was a huge advantage, particularly when developing the front-end.
We struggled with the Functional Design assignment the most because a lot of the concepts appeared simple but were actually difficult to flesh out in practice. It felt more challenging to translate the high-level ideas into the precise, actionable specifications that were required for accurate implementations than we expected and we had to revise our concept specifications multiple times in the development process.

Despite this, I think the process ultimately improved our understanding of how important the concept design and structure is when planning the app’s behaviour before any kind of coding begins. Going forward, I want to continue improving my ability to write detailed functional specifications. I would also love to use the user testing framework outlined here in future apps I work on as I think it was really helpful in identifying points of improvement in the app.

Overall, I had a challenging but great experience working on this project! Collaboration was at the forefront; it was really interesting to see how we could balance working independently and in tandem to create a cohesive app that we are proud of!

