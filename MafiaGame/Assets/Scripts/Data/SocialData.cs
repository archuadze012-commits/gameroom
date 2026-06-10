using System;
using System.Collections.Generic;

namespace Mafia.Data
{
    [Serializable]
    public class ChatMessage
    {
        public int id;
        public int userId;
        public string username;
        public string avatarUrl;
        public string message;
        public string timeAgo;
        public long timestamp;
        public bool isVip;
        public int replyToId;
        public string replyToUsername;
        public bool isMuted;
        public bool isSystemMessage;
    }

    [Serializable]
    public class PrivateMessage
    {
        public int id;
        public int fromId;
        public string fromUsername;
        public string fromAvatarUrl;
        public int toId;
        public string toUsername;
        public string message;
        public long timestamp;
        public bool isRead;
    }

    [Serializable]
    public class GangData
    {
        public int id;
        public string name;
        public string tag;
        public string description;
        public string logoUrl;
        public int leaderId;
        public string leaderName;
        public int memberCount;
        public int maxMembers;
        public long totalNetWorth;
        public int rank;
        public List<GangMember> members;
        public int unreadMessages;
    }

    [Serializable]
    public class GangMember
    {
        public int playerId;
        public string username;
        public string avatarUrl;
        public string role;
        public int level;
        public long contribution;
        public bool isOnline;
    }

    [Serializable]
    public class Notification
    {
        public int id;
        public string type;
        public string message;
        public string iconType;
        public long timestamp;
        public bool isRead;
        public string actionUrl;
    }

    [Serializable]
    public class NewsArticle
    {
        public int id;
        public string title;
        public string content;
        public string authorName;
        public long publishedAt;
        public bool isRead;
        public string category;
    }
}
