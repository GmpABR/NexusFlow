namespace Backend.Models;

public class Attachment
{
    public int Id { get; set; }
    public int TaskCardId { get; set; }
    public TaskCard TaskCard { get; set; } = null!;
    public int UploadedById { get; set; }
    public User UploadedBy { get; set; } = null!;

    public string FileName { get; set; } = string.Empty;       // original display name
    public string StoragePath { get; set; } = string.Empty;    // Supabase storage path
    public string PublicUrl { get; set; } = string.Empty;      // CDN public URL
    public string ContentType { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
}
