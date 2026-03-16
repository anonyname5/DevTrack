namespace DevTrack.Api.Models;

public enum TaskPriority
{
    Low = 0,
    Medium = 1,
    High = 2,
    Urgent = 3
}

public enum ProjectTaskStatus
{
    Backlog = 0,
    Todo = 1,
    InProgress = 2,
    Review = 3,
    Done = 4
}

public sealed class TaskItem
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    
    // Replacing IsCompleted with Status
    // public bool IsCompleted { get; set; } 
    public ProjectTaskStatus Status { get; set; } = ProjectTaskStatus.Todo;
    public TaskPriority Priority { get; set; } = TaskPriority.Medium;

    public int ProjectId { get; set; }
    public Project? Project { get; set; }
    
    public int? AssigneeId { get; set; }
    public OrganizationMember? Assignee { get; set; }

    public DateTime? DueDate { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public List<Comment> Comments { get; set; } = [];
    public List<Attachment> Attachments { get; set; } = [];
}
