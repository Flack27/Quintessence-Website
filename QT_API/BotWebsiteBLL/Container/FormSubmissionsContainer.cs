using FluentValidation.Results;
using QuintessenceWebsiteBLL.CORE;
using QuintessenceWebsiteBLL.Fluent_Validation;
using QuintessenceWebsiteDAL.DAL;
using QuintessenceWebsiteInterface.DTO;
using QuintessenceWebsiteInterface.INTERFACE;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace QuintessenceWebsiteBLL.CONTAINERS
{
    public class FormSubmissionsContainer
    {
        private IFormSubmissionsDAL _formDal;

        public FormSubmissionsContainer(IFormSubmissionsDAL formDal)
        {
            _formDal = formDal;
        }

        public async Task<List<FormSubmission>> GetFormSubmissions()
        {
            List<FormSubmission> forms = new List<FormSubmission>();
            List<FormSubmissionDTO> formDtos = await _formDal.GetFormsSubmissions();
            if (formDtos == null) { return forms; }
            var sortedformDtos = formDtos.OrderByDescending(dto => dto.SubmitDate).ToList();
            foreach (var dto in sortedformDtos)
            {
                forms.Add(new FormSubmission(dto));
            }
            return forms;
        }

        public async Task<FormSubmission?> GetFormSubmission(long submissionId)
        {
            var formDto = await _formDal.GetFormsSubmission(submissionId);
            if (formDto == null) { return null; }
            return new FormSubmission(formDto);
        }

        public async Task<int> GetFormSubmissionCount()
        {
            return await _formDal.GetFormSubmissionsCount();
        }

        public async Task<bool> SaveFormsubmissionApproval(long submissionId, bool approved)
        {
            return await _formDal.SaveFormSubmissionApproval(submissionId, approved);
        }

        // New method for server-wide form stats
        public async Task<object> GetServerFormStats(DateTime start, DateTime end)
        {
            return await _formDal.GetServerFormSubmissionsData(start, end);
        }

        // New method to get submissions count for a specific time period
        public async Task<int> GetSubmissionsCountForPeriod(DateTime startDate, DateTime endDate)
        {
            return await _formDal.GetSubmissionsCountForPeriod(startDate, endDate);
        }
    }
}