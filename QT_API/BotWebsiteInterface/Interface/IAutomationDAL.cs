using QuintessenceWebsiteInterface.DTO;

namespace QuintessenceWebsiteInterface.INTERFACE
{
    public interface IAutomationDAL
    {
        Task<List<AutomatedChecksDTO>?> GetAutomatedChecks();
        Task<bool> AddAutomatedCheck(AutomatedChecksDTO config);
        Task<bool> DeleteAutomatedCheck(int id);
    }
}