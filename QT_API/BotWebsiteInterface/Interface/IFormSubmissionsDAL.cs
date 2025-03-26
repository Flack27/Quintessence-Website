using QuintessenceWebsiteInterface.DTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace QuintessenceWebsiteInterface.INTERFACE
{
    public interface IFormSubmissionsDAL
    {
        public Task<List<FormSubmissionDTO>> GetFormsSubmissions();
        public Task<FormSubmissionDTO?> GetFormsSubmission(long submissionId);
        public Task<int> GetFormSubmissionsCount();
        public Task<bool> SaveFormSubmissionApproval(long submissionId, bool approved);

        public Task<List<dynamic>> GetServerFormSubmissionsData(DateTime startDate, DateTime endDate);
        public Task<int> GetSubmissionsCountForPeriod(DateTime startDate, DateTime endDate);
    }
}
