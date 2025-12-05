# Project Report

## Design Summary

Our design evolved significantly from our original functional design submission in response to TA feedback, implementation challenges, and user testing insights. The major changes include:

### Run Clubs to Partnerships
The most significant change was our shift from a run club-based application to a partnership-focused platform. This huge shift, made after our initial submission and guided by Professor Jackson, made us rethink our main features and concept structure to better support one-on-one running partnerships rather than large club management.

### Concept Improvements

**PasswordAuthentication & EmailVerification:**
- Originally, we struggled with how to organize user authentication and verification. After meeting with our TA, we separated these into two distinct concepts connected via syncs.
- Added email storage to PasswordAuthentication to enable unique email enforcement during registration.
- Requiring successful email verification before the registration process is completed since this avoided errors where users could bypass the verification by refreshing their page and then logging in

**UserProfile:**
- Removed the `removeTag` action after realizing that allowing tag removal contradicted our safety principle since we want complete profiles for better matching.
- Changed emergency contact from one simple string to a structured object with `name` and `phone` fields for better data organization.
- Added queries for location-based and general profile discovery to support matching features.

### Key Learnings

Overall, our concepts and code went through many changes in order to best support our fundamental idea, which is to support college students in finding compatible running partners. We continued to develop our skills with creating syncs, writing concept specs, and learning best design practices.

## Reflection

### Gloria

Working on this final project helped me continue to see the immense value of incremental development and the power of concept-driven design in a small team setting. Initially, I was eager to implement everything at once, but I quickly learned that, like the personal project, building concept by concept—testing one at a time each thoroughly before moving on is the best approach. It helps prevent smaller errors from turning into huge ones. The shift from run clubs to partnerships was also initially something I was unsure of, but it forced me to think a lot about modularity and separation of concerns.

Seeing how concepts like PasswordAuthentication and EmailVerification should be separate concepts was also helpful. Developing syncs was also something that, like the personal project, was a challenging part to think about, so continuing to work on that was helpful for my understanding of syncs and how different concepts can interact. The experience of working on creating a bucket in Google Cloud Storage for the profile picture uploading was also a helpful skill to learn, I hadn't ever used the GCS site before.

Overall, this experience taught me a lot about software development in a group setting and seeing again how quality in terms of code and thorough testing is more important than just quantity. 

### Ananya



### Marin

