# Frontend Changes Summary - Chat Thread Creation

## Overview
When a user clicks the message/chat button for a matched user, the frontend needs to get or create a chat thread before navigating to the chat page.

## New Endpoint

**Endpoint:** `POST /api/UserProfile/_getOrCreateThreadForMatchedUser`

**Request Body:**
```json
{
  "session": "your-session-token",
  "otherUser": "user-id-to-chat-with"
}
```

**Response (Success):**
```json
{
  "thread": "thread-id"
}
```

**Response (Error):**
```json
{
  "error": "Error message"
}
```

## Frontend Changes Required

### 1. Update Chat Button Click Handler

**Before:**
```typescript
const navigateToChat = (userId: string) => {
  navigate(`/chat/${userId}`);
};
```

**After:**
```typescript
const navigateToChat = async (userId: string) => {
  try {
    // Get or create thread for matched user
    const response = await fetch('/api/UserProfile/_getOrCreateThreadForMatchedUser', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        session: currentSession, 
        otherUser: userId 
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      console.error('Error getting/creating thread:', data.error);
      // Show error message to user
      alert('Unable to start chat: ' + data.error);
      return;
    }
    
    // Navigate to chat with thread ID
    navigate(`/chat/${data.thread}`);
  } catch (error) {
    console.error('Error navigating to chat:', error);
    alert('Unable to start chat. Please try again.');
  }
};
```

### 2. Update Chat Route (if needed)

If your chat route currently expects a user ID, update it to accept a thread ID instead:

**Before:**
```typescript
// Route: /chat/:userId
// Component expects userId
```

**After:**
```typescript
// Route: /chat/:threadId
// Component expects threadId
```

### 3. Update Chat Component

If your chat component currently loads by user ID, update it to load by thread ID:

**Before:**
```typescript
// Loads messages by finding thread between current user and other user
const loadChat = async (otherUserId: string) => {
  // Find thread between currentUser and otherUserId
  // Load messages
};
```

**After:**
```typescript
// Loads messages directly by thread ID
const loadChat = async (threadId: string) => {
  // Use threadId directly to load messages
  const response = await fetch('/api/Messaging/_getMessagesInThread', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      thread: threadId,
      user: currentUserId 
    })
  });
  // ... handle response
};
```

## Complete Example

Here's a complete example of how to update the chat button handler:

```typescript
// In PartnerMatchingListView or UserProfileCard component

const handleChatClick = async (otherUserId: string) => {
  try {
    // Step 1: Get or create thread
    const threadResponse = await fetch('/api/UserProfile/_getOrCreateThreadForMatchedUser', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        session: currentSession, 
        otherUser: otherUserId 
      })
    });
    
    const threadData = await threadResponse.json();
    
    if (threadData.error) {
      // Handle error
      console.error('Error:', threadData.error);
      alert('Unable to start chat: ' + threadData.error);
      return;
    }
    
    // Step 2: Navigate to chat with thread ID
    navigate(`/chat/${threadData.thread}`);
    
  } catch (error) {
    console.error('Error starting chat:', error);
    alert('Unable to start chat. Please try again.');
  }
};

// In JSX:
<button onClick={() => handleChatClick(profile.userId)}>
  💬 Chat
</button>
```

## Key Points

1. **Always call the endpoint first** - Don't navigate directly to `/chat/:userId`. Always get the thread ID first.

2. **Handle errors gracefully** - The endpoint may return errors if:
   - Users don't have an active match
   - Session is invalid
   - Network error occurs

3. **Use thread ID for navigation** - Navigate to `/chat/:threadId` instead of `/chat/:userId`

4. **Thread is created automatically** - The endpoint handles:
   - Creating a new thread if none exists
   - Returning existing thread if one exists
   - Restoring deleted threads

## Backend Behavior

The backend automatically:
- ✅ Checks if users have an active match (PartnerMatching, OneRunMatching, or SharedGoals)
- ✅ Returns existing thread if one exists
- ✅ Creates new thread if none exists
- ✅ Restores deleted thread if it was previously deleted
- ✅ Returns error if users don't have an active match

## Testing Checklist

- [ ] Chat button calls the new endpoint
- [ ] Navigation uses thread ID instead of user ID
- [ ] Error messages are displayed to user
- [ ] Existing chats work correctly
- [ ] New chats are created correctly
- [ ] Deleted chats are restored correctly

