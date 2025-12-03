**concept** Messaging
**purpose** one user can send a message to other users to communicate about scheduled runs
**principle** a user may send messages to other users,
   users can view a history of messages for each thread;
   messages cannot be sent to users with whom there is no active connection


**state**
a set of Threads with
   a user UserA
   a user UserB
   a set of Messages

a set of Messages with	
   a Sender user
   a Timestamp
   a content String
   a delivered or read Status


**actions**

**startChat** (userA: UserA, userB: UserB): (thread: Thread)
   **requires** userA and userB  exist and are distinct; there is no existing thread between userA and userB
   **effects** creates and returns a new thread between userA and userB

**deleteChat** (initiator: User, userB: UserB, thread: Thread)
   **requires**  there is an existing thread between the initiator of the deletion and UserB
   **effects**  deletes the thread between the initiator and users only for the initiator

**sendMessage** (content: String, time: Time, thread: Thread, sender: User, userB: UserB): (message: Message)
   **requires**  there is an existing thread between the sender and UserBs; the content must not be empty 
   **effects**  creates a new message from UserA in the thread with a timestamp and sets its Status to ‘delivered’

**readMessage** (message: Message, thread: Thread, sender: User, userB: UserB, time: Timestamp)
   **requires**  there is an existing thread between sender and UserB; message exists and its Status is set to ‘delivered’
   **effects**  sets the Status of the message to ‘read’