using System;
using System.Collections.Generic;

namespace Backend.DTOs
{
    public class TaskActivityDto
    {
        public int Id { get; set; }
        public int TaskCardId { get; set; }
        public int UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string? UserAvatarUrl { get; set; }
        public string Action { get; set; } = string.Empty;
        public string Details { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; }
        public List<ActivityReactionDto> Reactions { get; set; } = new();
    }

    public class ActivityReactionDto
    {
        public int Id { get; set; }
        public string Emoji { get; set; } = string.Empty;
        public int UserId { get; set; }
        public string Username { get; set; } = string.Empty;
    }
}
