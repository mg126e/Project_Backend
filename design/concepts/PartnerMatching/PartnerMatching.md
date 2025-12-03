**concept** PartnerMatching  
**purpose** match users with a long-term running partner based on running preferences and experience levels  
**principle** a user creates a profile with their personal details and preferences;  
  they are then presented with other users whose profiles indicate that they may align with theirs;  
   a user can accept or decline a match and a match only turns active when both users accept the other;  
   users can have multiple long-term running partner matches at the same time  
     
**state**  
a set of Users with  
   a Profile  
   a set of active Matches  
   a set of match Suggestions

a Profile with  
  a set of running Preferences

a set of running Preferences with  
	   a Pace selection   
	   a distance Number  
	   an experience Level  
	   a preferred Time of day

a set of match Suggestions with  
   a Recipient user  
   a Candidate user  
   an acceptance Status (accepted, declined, pending)

a set of active Matches with  
    a user UserA  
    a user UserB

**actions**

updatePreferences (user: User, preferenceSet: Preferences)  
   **requires** the user exists and has a profile  
   **effects** replaces the running preferences in the user’s profile with given ones

**system** suggestMatch (recipient: Recipient, candidate: Candidate): (suggestion: Suggestion)  
   **requires** the recipient and candidate exist and are distinct; both have profiles;  
	    there is no active match and no existing suggestions with any combination of  the users;  
	    at least three preferences must be the same for both users  
   **effects** creates and returns a new match Suggestion with Candidate to Recipient,  
	 sets Status to ‘pending’

acceptSuggestion (suggestion: Suggestion, recipient: Recipient, candidate: Candidate): (match: Match)  
   **requires** a Suggestion exists with recipient user being Recipient and candidate user being Candidate  
   **effects** set Status to ‘accepted’,  
creates and returns a new Match if Candidate has also accepted their suggestion of the Recipient

declineSuggestion (suggestion: Suggestion, recipient: Recipient, candidate: Candidate)  
   **requires** a Suggestion exists with recipient user being Recipient and candidate user being Candidate  
   **effects** set Status of suggestion to ‘declined’ and deletes it from recipient’s set of suggestions

unmatch (activeMatch: Match, user: UserA, user: UserB)  
   **requires** there exists an active Match between UserA and UserB  
   **effects** deletes the Match from UserA and UserB’s set of Matches
   
**Notes:** 

- suggestMatch is a **system** action as users have no direct control or interaction with this, since matches are automatically generated based on preference settings  
- The recipient user is the one who receives the suggestion and the candidate user is the one who is being suggested.  
- Any notion of a createPreferences action is subsumed by the updatePreferences since technically, users can also have no preferences set (presumably when they first create their account).
