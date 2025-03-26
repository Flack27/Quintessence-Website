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
    public class FormContainer
    {
        private IFormDAL _formDal;

        public FormContainer(IFormDAL formDal)
        {
            _formDal = formDal;
        }

        public async Task<List<Form>> GetForms()
        {
            List<Form> forms = new List<Form>();
            List<FormDTO> formDtos = await _formDal.GetForms();

            if (formDtos == null) { return null; }

            foreach (var dto in formDtos)
            {
                forms.Add(new Form(dto));
            }

            return forms;
        }

        public async Task<Form?> GetForm(long formId)
        {
            var formDto = await _formDal.GetForm(formId);

            if (formDto == null) { return null; }

            var form = new Form(formDto);

            return form;
        }


        public async Task<Form?> GetActiveForm()
        {
            var formDTO = await _formDal.GetActiveForm();

            if (formDTO == null) { return null; }

            Form form = new Form(formDTO);

            return form;
        }

        public async Task<bool> SetActiveForm(long formId)
        {
            return await _formDal.SetActiveForm(formId);
        }

        public async Task<(ValidationResult validation, long formId)> AddForm(Form form)
        {
            FormValidator validator = new FormValidator();
            ValidationResult results = validator.Validate(form);

            if (!results.IsValid)
            {
                foreach (var failure in results.Errors)
                {
                    Console.WriteLine("Property " + failure.PropertyName + " failed validation. Error was: " + failure.ErrorMessage);
                }
                return (results, 0);
            }

            var formDto = new FormDTO
            {
                Title = form.Title,
                Description = form.Description
            };

            long? formId = await _formDal.AddForm(formDto);

            if (formId == null)
            {
                results.Errors.Add(new ValidationFailure("DAL", "Failed to add form to the database."));
                Console.WriteLine("Error: Failed to add form to the database.");
                return (results, 0);
            }

            return (new ValidationResult(), formId.Value);
        }

        public async Task<ValidationResult> UpdateForm(Form form)
        {
            FormUpdateValidator validator = new FormUpdateValidator();
            ValidationResult results = validator.Validate(form);

            if (!results.IsValid)
            {
                foreach (var failure in results.Errors)
                {
                    Console.WriteLine("Property " + failure.PropertyName + " failed validation. Error was: " + failure.ErrorMessage);
                }
                return results;
            }

            var formDto = new FormDTO
            {
                FormId = form.FormId.Value,
                Title = form.Title,
                Description = form.Description
            };

            bool success = await _formDal.UpdateForm(formDto);

            if (!success)
            {
                results.Errors.Add(new ValidationFailure("DAL", "Failed to update form to the database."));
                Console.WriteLine("Error: Failed to update form to the database.");
                return results;
            }

            return (new ValidationResult());
        }

        public async Task<bool> DeleteForm(long formId)
        {
            return await _formDal.DeleteForm(formId);
        }
    }
}
