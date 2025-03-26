using QuintessenceWebsiteInterface.DTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace QuintessenceWebsiteInterface.INTERFACE
{
    public interface IFormDAL
    {
        public Task<List<FormDTO>> GetForms();
        public Task<FormDTO?> GetActiveForm();
        public Task<FormDTO?> GetForm(long id);
        public Task<bool> SetActiveForm(long formId);
        public Task<long?> AddForm(FormDTO formDTO);
        public Task<bool> UpdateForm(FormDTO formDTO);
        public Task<bool> DeleteForm(long id);
    }
}
