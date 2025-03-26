using QuintessenceWebsiteInterface.DTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace QuintessenceWebsiteBLL.CORE
{
    public class FormSubmission
    {
        private long submissionId;
        private long userId;
        private long formId;
        private DateTime submitDate;
        private bool? approved;
        private string? avatar;
        private string? userName;
        private string title;
        private string description;

        public FormSubmission(long submissionId, long userId, long formId, DateTime submitDate, bool approved, string? avatar, string? userName, string title, string description)
        {
            this.submissionId = submissionId;
            this.userId = userId;
            this.formId = formId;
            this.submitDate = submitDate;
            this.approved = approved;
            this.avatar = avatar;
            this.userName = userName;
            this.title = title;
            this.description = description;
               
        }

        public FormSubmission(FormSubmissionDTO dto)
        {
            submissionId = dto.SubmissionId;
            userId = dto.UserId;
            formId = dto.FormId;
            submitDate = dto.SubmitDate;
            approved = dto.Approved;
            avatar = dto.User.Avatar;
            userName = dto.User.DisplayName;
            title = dto.Form.Title; 
            description = dto.Form.Description;
        }


        public long SubmissionId { get {  return submissionId; } }

        [JsonConverter(typeof(JsonConverter))]
        public long UserId { get { return userId; } }
        public long FormId { get { return formId; } }
        public DateTime SubmitDate { get {  return submitDate; } }
        public bool? Approved { get { return approved; } }
        public string? Avatar { get { return avatar; } }
        public string? UserName { get { return userName; } } 
        public string Title { get { return title; } }
        public string Description { get { return description; } }
    }
}
