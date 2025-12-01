**concept** OneRunMatching
**purpose** find a running partner for a one-time run in the near or immediate future
**principle** a user chooses a region and a specific meeting location in it;
   the user creates a run invite, which becomes visible to all users whose region is set to the same;
   other users may accept or decline the invite;
   once a user accepts, a run is scheduled for the inviter and accepter.

**state**
	a set of Users with
	   a region String
	   a set of run Invites
	   a set of scheduled Runs

	a set of run Invites with
	   a Sent flag
   a start Time
	   an Inviter user
	   a set of invitee Users
	   a meeting location String
   	   a running distance Number
	   an acceptance Status (accepted, declined, pending)

	a set of scheduled Runs with
	   a user UserA
	   a user UserB
   a Completed flag
	      
**actions** 

setRegion (user: User, region: String)
   **requires** user exists and the String is a valid region
   **effects** sets the user’s region to the given region String

createInvite (inviter: User, region: String, start: Time, distance: Number, location: String):
(invite: Invite)
   **requires** inviter exists, region and location are valid, start is a future time,  and distance is greater than zero
   **effects** creates a new run Invite with given details and Sent flag set to false

sendInvite (invite: Invite, invitees: Users)
   **requires** the invitees and invite exists, and its Sent flag is set to False
   **effects** sends Invite to all invitees (users in its associated region), sets Sent flag to True, sets Status to ‘pending’

deleteInvite (user: Inviter, invite: Invite)
   **requires** the invite exists and  the user is the Inviter for that invite
   **effects** remove Invite from the Inviter’s set of invites

acceptInvite (inviter: UserA, invite: Invite, accepter: UserB): (scheduledRun: Run)
   **requires** the invite exists, its Sent flag is true, and its acceptance status is false
   **effects** creates a new Run and the Status of the invite is set to ‘accepted’

declineInvite (invite: Invite, decliner: User)
   **requires** the invite exists, its Sent flag is true, and its acceptance Status is set to false
   **effects** sets invite Status to ‘declined’   

completeRun (user: User, run: Run)
   **requires** the run exists for the user and has not already been marked Completed
   **effects** sets the Completed flag of the run to true

cancelRun (initiator: UserA, userB: UserB, run: Run, time: Time)
   **requires** the run exists for all users and the initiator user, and is at a valid future time
   **effects** deletes the run from the set of runs for all users associated with that Run 

system expireInvite (start: Time): (invite: Invite)
   **requires** Start time for invite is in the past
   **effects** returns invite and removes it from set of invites