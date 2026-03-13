using DevTrack.Api.Models;

namespace DevTrack.Api.Services;

public sealed class ProjectProgressService : IProjectProgressService
{
    public int CalculateProgressPercentage(IEnumerable<TaskItem> tasks)
    {
        List<TaskItem> taskList = tasks.ToList();
        if (taskList.Count == 0)
        {
            return 0;
        }

        int completedCount = taskList.Count(task => task.Status == ProjectTaskStatus.Done);
        double percentage = (double)completedCount / taskList.Count * 100;
        return (int)Math.Round(percentage, MidpointRounding.AwayFromZero);
    }
}
