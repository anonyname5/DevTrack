using DevTrack.Api.Models;

namespace DevTrack.Api.Services;

public interface IProjectProgressService
{
    int CalculateProgressPercentage(IEnumerable<TaskItem> tasks);
}
