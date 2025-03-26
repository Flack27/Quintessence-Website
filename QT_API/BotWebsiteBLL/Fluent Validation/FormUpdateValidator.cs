using FluentValidation;
using QuintessenceWebsiteBLL.CORE;

namespace QuintessenceWebsiteBLL.Fluent_Validation
{
    public class FormUpdateValidator : AbstractValidator<Form>
    {
        public FormUpdateValidator()
        {
            RuleFor(form => form.FormId)
                .NotNull().WithMessage("Form id is required.");

            RuleFor(form => form.Title)
                .NotEmpty().WithMessage("Title is required.")
                .NotNull().WithMessage("Title cannot be null.")
                .MaximumLength(100).WithMessage("Title must be less than 100 characters.");

            RuleFor(form => form.Description)
                .NotNull().WithMessage("Description cannot be null.")
                .MaximumLength(500).WithMessage("Description must be less than 500 characters.");
        }
    }
}
