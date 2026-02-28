using System.Collections.Concurrent;

namespace Backend.Services;

public class PresenceTracker
{
    // Maps UserId to a HashSet of SignalR ConnectionIds
    // We use ConcurrentDictionary for thread safety, but the HashSet updates need locking
    private readonly ConcurrentDictionary<int, HashSet<string>> _onlineUsers = new();

    /// <summary>
    /// Called when a user connects. Returns true if this is their first connection.
    /// </summary>
    public bool UserConnected(int userId, string connectionId)
    {
        bool isFirstConnection = false;

        _onlineUsers.AddOrUpdate(
            userId,
            _ =>
            {
                isFirstConnection = true;
                return new HashSet<string> { connectionId };
            },
            (_, connections) =>
            {
                lock (connections)
                {
                    isFirstConnection = connections.Count == 0;
                    connections.Add(connectionId);
                }
                return connections;
            });

        return isFirstConnection;
    }

    /// <summary>
    /// Called when a user disconnects. Returns true if they have no more active connections.
    /// </summary>
    public bool UserDisconnected(int userId, string connectionId)
    {
        bool isOffline = false;

        if (_onlineUsers.TryGetValue(userId, out var connections))
        {
            lock (connections)
            {
                connections.Remove(connectionId);
                if (connections.Count == 0)
                {
                    isOffline = true;
                }
            }

            // Optional: Remove the dictionary entry if count is 0 to save memory, 
            // but keeping empty HashSets is fine and avoids race conditions on removal.
            if (isOffline)
            {
                _onlineUsers.TryRemove(userId, out _);
            }
        }

        return isOffline;
    }

    /// <summary>
    /// Returns an enumerable of all currently online user IDs.
    /// </summary>
    public IEnumerable<int> GetOnlineUsers()
    {
        return _onlineUsers.Keys;
    }
}
