using QuintessenceWebsiteInterface.DTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace QuintessenceWebsiteInterface.INTERFACE
{
    public interface IAnswersDAL
    {
        public Task<long?> Submit(FormSubmissionDTO formSubmission);
        public Task<bool> SaveAnswers(List<AnswersDTO> answers);
        public Task<bool> MarkSubmissionComplete(long submissionId);  
    }
}
